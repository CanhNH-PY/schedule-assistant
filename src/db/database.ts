import initSqlJs, { Database } from 'sql.js'
import { join } from 'path'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

let db: Database
let dbPath: string

export async function initDb() {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) mkdirSync(userDataPath, { recursive: true })

  dbPath = join(userDataPath, 'schedule.db')

  // Trỏ đến file wasm của sql.js
  const wasmPath = join(__dirname, '../node_modules/sql.js/dist')
  const SQL = await initSqlJs({
    locateFile: (file: string) => join(wasmPath, file),
  })

  // Load db từ file nếu đã tồn tại, hoặc tạo mới
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON;')
  runMigrations()
  console.log('[db] Database khởi tạo tại:', dbPath)
}

export function getDb(): Database {
  if (!db) throw new Error('Database chưa được khởi tạo. Gọi initDb() trước.')
  return db
}

// Lưu database xuống disk sau mỗi thao tác ghi
export function saveDb() {
  if (!db || !dbPath) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

// Helper: query nhiều rows
export function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

// Helper: query một row
export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params)
  return rows[0] ?? null
}

// Helper: thực thi lệnh ghi (INSERT/UPDATE/DELETE)
export function execute(sql: string, params: any[] = []): number {
  db.run(sql, params)
  saveDb()
  // Trả về lastInsertRowid
  const row = queryOne('SELECT last_insert_rowid() as id')
  return row?.id ?? 0
}

function runMigrations() {
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      priority     TEXT CHECK(priority IN ('high','medium','low')) DEFAULT 'medium',
      notify_time  TEXT NOT NULL,
      is_active    INTEGER DEFAULT 1,
      created_at   TEXT DEFAULT (datetime('now'))
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
      priority     TEXT CHECK(priority IN ('high','medium','low')) DEFAULT 'medium',
      deadline     TEXT NOT NULL,
      progress     INTEGER DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      category     TEXT CHECK(category IN ('professional','language','other')) NOT NULL,
      parent_id    INTEGER REFERENCES study_items(id),
      title        TEXT NOT NULL,
      progress     INTEGER DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
      notify_time  TEXT,
      notify_days  TEXT DEFAULT '1,2,3,4,5,6,7'
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
  `)

  // Tạo work session cho hôm nay nếu chưa có
  const today = new Date().toISOString().slice(0, 10)
  const existing = queryOne('SELECT id FROM work_sessions WHERE session_date = ?', [today])
  if (!existing) {
    execute('INSERT INTO work_sessions (session_date) VALUES (?)', [today])
  }

  db.run(`
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
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_type TEXT NOT NULL,
      parent_id   INTEGER NOT NULL,
      title       TEXT NOT NULL,
      is_done     INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS vacations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      destination TEXT NOT NULL,
      date_from   TEXT NOT NULL,
      date_to     TEXT NOT NULL,
      notes       TEXT DEFAULT '',
      emoji       TEXT DEFAULT '✈️',
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `)

  // Add new columns (safe on existing DB)
  try { db.run(`ALTER TABLE daily_tasks ADD COLUMN repeat_type TEXT DEFAULT 'daily'`) } catch {}
  try { db.run(`ALTER TABLE daily_tasks ADD COLUMN repeat_days TEXT DEFAULT '1,2,3,4,5'`) } catch {}
  try { db.run(`ALTER TABLE daily_tasks ADD COLUMN repeat_dates TEXT`) } catch {}
  try { db.run(`ALTER TABLE strategic_tasks ADD COLUMN reminder_days TEXT DEFAULT '1,2,3,4,5'`) } catch {}
  try { db.run(`ALTER TABLE strategic_tasks ADD COLUMN reminder_type TEXT DEFAULT 'daily'`) } catch {}

  saveDb()
}
