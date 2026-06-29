const express = require('express')
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')

const app = express()
const PORT = process.env.PORT || 8080
const DB_PATH = process.env.DB_PATH || '/data/schedule.db'

app.use(express.json())

// ── DB helpers ────────────────────────────────────────────────────────────────
let db

function ensureDir(p) {
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function saveDb() {
  if (!db) return
  ensureDir(DB_PATH)
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()))
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] ?? null
}

function execute(sql, params = []) {
  db.run(sql, params)
  saveDb()
  return queryOne('SELECT last_insert_rowid() as id')?.id ?? 0
}

function today() { return new Date().toISOString().slice(0, 10) }
function nowTime() { return new Date().toTimeString().slice(0, 5) }

function runMigrations() {
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      priority    TEXT DEFAULT 'medium',
      notify_time TEXT NOT NULL,
      is_active   INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS daily_task_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id      INTEGER REFERENCES daily_tasks(id),
      log_date     TEXT NOT NULL,
      completed_at TEXT,
      notif_count  INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS strategic_tasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      priority     TEXT DEFAULT 'medium',
      deadline     TEXT NOT NULL,
      progress     INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS study_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT NOT NULL,
      parent_id   INTEGER REFERENCES study_items(id),
      title       TEXT NOT NULL,
      progress    INTEGER DEFAULT 0,
      notify_time TEXT,
      notify_days TEXT DEFAULT '1,2,3,4,5,6,7'
    );
    CREATE TABLE IF NOT EXISTS study_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id      INTEGER REFERENCES study_items(id),
      log_date     TEXT NOT NULL,
      completed_at TEXT,
      notif_count  INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS work_sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_date  TEXT NOT NULL,
      start_time    TEXT DEFAULT '09:00',
      end_time      TEXT,
      total_minutes INTEGER
    );
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      date         TEXT NOT NULL,
      start_time   TEXT NOT NULL,
      end_time     TEXT NOT NULL,
      location     TEXT DEFAULT '',
      participants TEXT DEFAULT '',
      description  TEXT DEFAULT '',
      created_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subtasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_type TEXT NOT NULL,
      parent_id   INTEGER NOT NULL,
      title       TEXT NOT NULL,
      is_done     INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS vacations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      destination TEXT NOT NULL,
      date_from   TEXT NOT NULL,
      date_to     TEXT NOT NULL,
      notes       TEXT DEFAULT '',
      emoji       TEXT DEFAULT '✈️',
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      date        TEXT NOT NULL,
      is_yearly   INTEGER DEFAULT 0,
      emoji       TEXT DEFAULT '🎉',
      notes       TEXT DEFAULT '',
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `)

  try { db.run(`ALTER TABLE daily_tasks ADD COLUMN repeat_type TEXT DEFAULT 'daily'`) } catch {}
  try { db.run(`ALTER TABLE daily_tasks ADD COLUMN repeat_days TEXT DEFAULT '1,2,3,4,5'`) } catch {}
  try { db.run(`ALTER TABLE daily_tasks ADD COLUMN repeat_dates TEXT`) } catch {}
  try { db.run(`ALTER TABLE strategic_tasks ADD COLUMN reminder_days TEXT DEFAULT '1,2,3,4,5'`) } catch {}
  try { db.run(`ALTER TABLE strategic_tasks ADD COLUMN reminder_type TEXT DEFAULT 'daily'`) } catch {}
  try { db.run(`ALTER TABLE meetings ADD COLUMN attended INTEGER DEFAULT NULL`) } catch {}

  const t = today()
  if (!queryOne('SELECT id FROM work_sessions WHERE session_date = ?', [t])) {
    execute('INSERT INTO work_sessions (session_date) VALUES (?)', [t])
  }

  saveDb()
}

async function initDb() {
  const wasmPath = path.join(__dirname, '../node_modules/sql.js/dist')
  const SQL = await initSqlJs({ locateFile: f => path.join(wasmPath, f) })

  ensureDir(DB_PATH)

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH))
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON;')
  runMigrations()
  console.log('[db] initialized:', DB_PATH)
}

// ── Repeat filter helper ──────────────────────────────────────────────────────
function repeatParams(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const isoDay = d.getDay() === 0 ? 7 : d.getDay()
  const dayOfMonth = d.getDate()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const mmdd = `${mm}-${dd}`
  const clause = `AND (
    dt.repeat_type IS NULL
    OR (dt.repeat_type = 'daily' AND ? BETWEEN 1 AND 5)
    OR (dt.repeat_type = 'weekly' AND instr(',' || dt.repeat_days || ',', ',' || ? || ',') > 0)
    OR (dt.repeat_type = 'monthly' AND instr(',' || dt.repeat_dates || ',', ',' || ? || ',') > 0)
    OR (dt.repeat_type = 'yearly' AND dt.repeat_dates = ?)
  )`
  return { clause, params: [isoDay, isoDay, dayOfMonth, mmdd] }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── Daily Tasks ───────────────────────────────────────────────────────────────
app.get('/api/daily-tasks', (_req, res) => {
  try {
    const t = today()
    const { clause, params } = repeatParams(t)
    res.json(queryAll(`
      SELECT dt.id, dt.title, dt.priority, dt.notify_time, dt.is_active,
             dt.repeat_type, dt.repeat_days, dt.repeat_dates,
             dtl.completed_at, dtl.id as log_id,
             (SELECT MAX(DATE(l2.completed_at)) FROM daily_task_logs l2
              WHERE l2.task_id = dt.id AND l2.completed_at IS NOT NULL) as last_completed_date
      FROM daily_tasks dt
      LEFT JOIN daily_task_logs dtl ON dt.id = dtl.task_id AND dtl.log_date = ?
      WHERE dt.is_active = 1 ${clause} ORDER BY dt.notify_time
    `, [t, ...params]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/daily-tasks', (req, res) => {
  try {
    const task = req.body
    const id = execute(
      `INSERT INTO daily_tasks (title, priority, notify_time, repeat_type, repeat_days, repeat_dates)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task.title, task.priority, task.notify_time,
       task.repeat_type || 'daily', task.repeat_days || '1,2,3,4,5,6,7', task.repeat_dates || null]
    )
    res.json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/daily-tasks/:id/complete', (req, res) => {
  try {
    const taskId = Number(req.params.id)
    const { date } = req.body
    const existing = queryOne('SELECT id FROM daily_task_logs WHERE task_id = ? AND log_date = ?', [taskId, date])
    if (existing) {
      execute(`UPDATE daily_task_logs SET completed_at = datetime('now') WHERE task_id = ? AND log_date = ?`, [taskId, date])
    } else {
      execute(`INSERT INTO daily_task_logs (task_id, log_date, completed_at) VALUES (?, ?, datetime('now'))`, [taskId, date])
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/daily-tasks/:id/uncomplete', (req, res) => {
  try {
    const taskId = Number(req.params.id)
    const { date } = req.body
    execute(`UPDATE daily_task_logs SET completed_at = NULL WHERE task_id = ? AND log_date = ?`, [taskId, date])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/daily-tasks/:id', (req, res) => {
  try {
    const task = req.body
    execute(
      `UPDATE daily_tasks SET title=?, priority=?, notify_time=?, repeat_type=?, repeat_days=?, repeat_dates=? WHERE id=?`,
      [task.title, task.priority, task.notify_time, task.repeat_type || 'daily',
       task.repeat_days || '1,2,3,4,5', task.repeat_dates || null, Number(req.params.id)]
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/daily-tasks/:id', (req, res) => {
  try {
    execute('UPDATE daily_tasks SET is_active = 0 WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Strategic Tasks ───────────────────────────────────────────────────────────
app.get('/api/strategic-tasks', (_req, res) => {
  try { res.json(queryAll('SELECT * FROM strategic_tasks ORDER BY deadline ASC')) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/strategic-tasks', (req, res) => {
  try {
    const task = req.body
    const id = execute(
      `INSERT INTO strategic_tasks (title, priority, deadline, reminder_type, reminder_days)
       VALUES (?, ?, ?, ?, ?)`,
      [task.title, task.priority, task.deadline,
       task.reminder_type || 'daily', task.reminder_days || '1,2,3,4,5']
    )
    res.json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/strategic-tasks/:id/progress', (req, res) => {
  try {
    execute('UPDATE strategic_tasks SET progress = ? WHERE id = ?', [req.body.progress, Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/strategic-tasks/:id', (req, res) => {
  try {
    const task = req.body
    execute(
      `UPDATE strategic_tasks SET title=?, priority=?, deadline=?, reminder_type=?, reminder_days=? WHERE id=?`,
      [task.title, task.priority, task.deadline, task.reminder_type || 'daily',
       task.reminder_days || '1,2,3,4,5', Number(req.params.id)]
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/strategic-tasks/:id', (req, res) => {
  try {
    execute('DELETE FROM strategic_tasks WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Study Items ───────────────────────────────────────────────────────────────
app.get('/api/study-items', (_req, res) => {
  try {
    const t = today()
    const d = new Date(t + 'T00:00:00')
    const isoDay = d.getDay() === 0 ? 7 : d.getDay()
    res.json(queryAll(`
      SELECT si.id, si.category, si.parent_id, si.title, si.progress,
             si.notify_time, si.notify_days,
             sl.completed_at, sl.id as log_id
      FROM study_items si
      LEFT JOIN study_logs sl ON si.id = sl.item_id AND sl.log_date = ?
      WHERE (',' || si.notify_days || ',') LIKE '%,' || ? || ',%'
      ORDER BY si.category, si.notify_time, si.title
    `, [t, String(isoDay)]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/study-items', (req, res) => {
  try {
    const item = req.body
    const id = execute(
      `INSERT INTO study_items (category, parent_id, title, notify_time, notify_days) VALUES (?, ?, ?, ?, ?)`,
      [item.category, item.parent_id ?? null, item.title,
       item.notify_time ?? null, item.notify_days ?? '1,2,3,4,5,6,7']
    )
    res.json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/study-items/:id/progress', (req, res) => {
  try {
    execute('UPDATE study_items SET progress = ? WHERE id = ?', [req.body.progress, Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/study-items/:id', (req, res) => {
  try {
    const item = req.body
    execute(
      `UPDATE study_items SET title=?, notify_time=?, notify_days=? WHERE id=?`,
      [item.title, item.notify_time ?? null, item.notify_days ?? '1,2,3,4,5,6,7', Number(req.params.id)]
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/study-items/:id', (req, res) => {
  try {
    execute('DELETE FROM study_items WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/study-items/:id/complete', (req, res) => {
  try {
    const id = Number(req.params.id)
    const date = req.body.date
    const existing = queryOne('SELECT id FROM study_logs WHERE item_id = ? AND log_date = ?', [id, date])
    if (existing) {
      execute(`UPDATE study_logs SET completed_at = datetime('now') WHERE item_id = ? AND log_date = ?`, [id, date])
    } else {
      execute(`INSERT INTO study_logs (item_id, log_date, completed_at) VALUES (?, ?, datetime('now'))`, [id, date])
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/study-items/:id/uncomplete', (req, res) => {
  try {
    const id = Number(req.params.id)
    const date = req.body.date
    execute(`UPDATE study_logs SET completed_at = NULL WHERE item_id = ? AND log_date = ?`, [id, date])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Meetings ──────────────────────────────────────────────────────────────────
app.get('/api/meetings/upcoming', (_req, res) => {
  try {
    res.json(queryAll(
      `SELECT * FROM meetings WHERE date >= ? ORDER BY date, start_time LIMIT 20`,
      [today()]
    ))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/meetings', (req, res) => {
  try {
    if (req.query.date) {
      res.json(queryAll('SELECT * FROM meetings WHERE date = ? ORDER BY start_time', [req.query.date]))
    } else {
      res.json(queryAll('SELECT * FROM meetings ORDER BY date, start_time'))
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/meetings', (req, res) => {
  try {
    const m = req.body
    const id = execute(
      `INSERT INTO meetings (title, date, start_time, end_time, location, participants, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [m.title, m.date, m.start_time, m.end_time, m.location || '', m.participants || '', m.description || '']
    )
    res.json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/meetings/:id', (req, res) => {
  try {
    const m = req.body
    execute(
      `UPDATE meetings SET title=?, date=?, start_time=?, end_time=?, location=?, participants=?, description=? WHERE id=?`,
      [m.title, m.date, m.start_time, m.end_time, m.location || '', m.participants || '', m.description || '', Number(req.params.id)]
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/meetings/:id', (req, res) => {
  try {
    execute('DELETE FROM meetings WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/meetings/:id/attended', (req, res) => {
  try {
    execute('UPDATE meetings SET attended = ? WHERE id = ?', [req.body.attended, Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Subtasks ──────────────────────────────────────────────────────────────────
app.get('/api/subtasks/:parentType/:parentId', (req, res) => {
  try {
    res.json(queryAll(
      'SELECT * FROM subtasks WHERE parent_type = ? AND parent_id = ? ORDER BY created_at ASC',
      [req.params.parentType, Number(req.params.parentId)]
    ))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/subtasks', (req, res) => {
  try {
    const { parentType, parentId, title } = req.body
    const id = execute(
      'INSERT INTO subtasks (parent_type, parent_id, title) VALUES (?, ?, ?)',
      [parentType, parentId, title]
    )
    res.json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/subtasks/:id/toggle', (req, res) => {
  try {
    execute('UPDATE subtasks SET is_done = CASE WHEN is_done = 1 THEN 0 ELSE 1 END WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/subtasks/:id', (req, res) => {
  try {
    execute('DELETE FROM subtasks WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Vacations ─────────────────────────────────────────────────────────────────
app.get('/api/vacations', (_req, res) => {
  try { res.json(queryAll('SELECT * FROM vacations ORDER BY date_from ASC')) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/vacations', (req, res) => {
  try {
    const v = req.body
    const id = execute(
      `INSERT INTO vacations (destination, date_from, date_to, notes, emoji) VALUES (?, ?, ?, ?, ?)`,
      [v.destination, v.date_from, v.date_to, v.notes || '', v.emoji || '✈️']
    )
    res.json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/vacations/:id', (req, res) => {
  try {
    const v = req.body
    execute(
      `UPDATE vacations SET destination=?, date_from=?, date_to=?, notes=?, emoji=? WHERE id=?`,
      [v.destination, v.date_from, v.date_to, v.notes || '', v.emoji || '✈️', Number(req.params.id)]
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/vacations/:id', (req, res) => {
  try {
    execute('DELETE FROM vacations WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Work Session ──────────────────────────────────────────────────────────────
app.get('/api/session/today', (_req, res) => {
  try { res.json(queryOne('SELECT * FROM work_sessions WHERE session_date = ?', [today()])) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/session/reopen', (_req, res) => {
  try {
    execute(`UPDATE work_sessions SET end_time = NULL, total_minutes = NULL WHERE session_date = ?`, [today()])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/session/end', (_req, res) => {
  try {
    const t = today()
    const et = nowTime()
    const [sh, sm] = [9, 0]
    const [eh, em] = et.split(':').map(Number)
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm)
    execute(
      `UPDATE work_sessions SET end_time = ?, total_minutes = ? WHERE session_date = ? AND end_time IS NULL`,
      [et, totalMinutes, t]
    )
    res.json({ ok: true, totalMinutes })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Events ────────────────────────────────────────────────────────────────────
app.get('/api/events', (_req, res) => {
  try { res.json(queryAll('SELECT * FROM events ORDER BY is_yearly ASC, date ASC')) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/events', (req, res) => {
  try {
    const ev = req.body
    const id = execute(
      `INSERT INTO events (title, date, is_yearly, emoji, notes) VALUES (?, ?, ?, ?, ?)`,
      [ev.title, ev.date, ev.is_yearly ? 1 : 0, ev.emoji || '🎉', ev.notes || '']
    )
    res.json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/events/:id', (req, res) => {
  try {
    const ev = req.body
    execute(
      `UPDATE events SET title=?, date=?, is_yearly=?, emoji=?, notes=? WHERE id=?`,
      [ev.title, ev.date, ev.is_yearly ? 1 : 0, ev.emoji || '🎉', ev.notes || '', Number(req.params.id)]
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/events/:id', (req, res) => {
  try {
    execute('DELETE FROM events WHERE id = ?', [Number(req.params.id)])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings/:key', (req, res) => {
  try {
    const row = queryOne('SELECT value FROM settings WHERE key = ?', [req.params.key])
    res.json(row?.value ?? null)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/settings/:key', (req, res) => {
  try {
    execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [req.params.key, req.body.value])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Reports ───────────────────────────────────────────────────────────────────
app.get('/api/reports/day/:date', (req, res) => {
  try {
    const date = req.params.date
    const { clause, params } = repeatParams(date)
    const tasks = queryAll(`
      SELECT dt.id, dt.title, dt.priority, dt.notify_time, dtl.completed_at
      FROM daily_tasks dt
      LEFT JOIN daily_task_logs dtl ON dt.id = dtl.task_id AND dtl.log_date = ?
      WHERE dt.is_active = 1 ${clause} ORDER BY dt.notify_time
    `, [date, ...params])
    const session = queryOne('SELECT * FROM work_sessions WHERE session_date = ?', [date])
    const meetings = queryAll('SELECT id, title, date, start_time, end_time, location, participants, description, attended FROM meetings WHERE date = ? ORDER BY start_time', [date])
    const studyItems = queryAll('SELECT * FROM study_items ORDER BY category, parent_id, title')
    res.json({ tasks, session, meetings, studyItems })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/reports/weekly', (req, res) => {
  try {
    const { start, end } = req.query
    const totalTasksRow = queryOne('SELECT COUNT(*) as total FROM daily_tasks WHERE is_active = 1')
    const totalTasks = totalTasksRow?.total ?? 0
    const completions = queryAll(
      `SELECT log_date, COUNT(*) as done FROM daily_task_logs
       WHERE log_date >= ? AND log_date <= ? AND completed_at IS NOT NULL GROUP BY log_date`,
      [start, end]
    )
    const sessions = queryAll(
      `SELECT session_date, start_time, end_time, total_minutes FROM work_sessions
       WHERE session_date >= ? AND session_date <= ?`,
      [start, end]
    )
    const meetings = queryAll(
      `SELECT date, COUNT(*) as total, SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as attended FROM meetings
       WHERE date >= ? AND date <= ? GROUP BY date`,
      [start, end]
    )
    res.json({ totalTasks, completions, sessions, meetings })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/reports/daily-summary/:date', (req, res) => {
  try {
    const date = req.params.date
    const completed = queryOne(
      `SELECT COUNT(*) as count FROM daily_task_logs WHERE log_date = ? AND completed_at IS NOT NULL`, [date]
    )
    const totalTasks = queryOne('SELECT COUNT(*) as count FROM daily_tasks WHERE is_active = 1')
    const session = queryOne('SELECT * FROM work_sessions WHERE session_date = ?', [date])
    const studyItems = queryAll('SELECT progress FROM study_items')
    const studyAvg = studyItems.length
      ? Math.round(studyItems.reduce((s, i) => s + i.progress, 0) / studyItems.length)
      : 0
    res.json({
      dailyTasksCompleted: completed?.count ?? 0,
      totalDailyTasks: totalTasks?.count ?? 0,
      workSessionMinutes: session?.total_minutes ?? null,
      sessionStart: session?.start_time ?? null,
      sessionEnd: session?.end_time ?? null,
      studyAvgProgress: studyAvg,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/reports/monthly-summary/:year/:month', (req, res) => {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const sessions = queryAll(
      `SELECT session_date, start_time, end_time, total_minutes FROM work_sessions WHERE session_date LIKE ?`,
      [`${prefix}%`]
    )
    const dailyCompletions = queryAll(
      `SELECT log_date, COUNT(*) as completed FROM daily_task_logs
       WHERE log_date LIKE ? AND completed_at IS NOT NULL GROUP BY log_date`,
      [`${prefix}%`]
    )
    const daysInMonth = new Date(year, month, 0).getDate()
    const dailyTaskCounts = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const pad = n => String(n).padStart(2, '0')
      const dateStr = `${year}-${pad(month)}-${pad(d)}`
      const { clause, params } = repeatParams(dateStr)
      const row = queryOne(
        `SELECT COUNT(*) as count FROM daily_tasks WHERE is_active = 1 ${clause}`, params
      )
      dailyTaskCounts[dateStr] = row?.count ?? 0
    }
    res.json({ sessions, dailyCompletions, dailyTaskCounts, totalTasks: 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Static files + SPA fallback ───────────────────────────────────────────────
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))

// ── Start ─────────────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => console.log(`[server] Schedule Assistant running on port ${PORT}`))
}).catch(err => {
  console.error('[server] Failed to initialize database:', err)
  process.exit(1)
})
