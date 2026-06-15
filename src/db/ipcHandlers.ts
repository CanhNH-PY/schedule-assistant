import { IpcMain } from 'electron'
import { queryAll, queryOne, execute } from './database'
import { format } from 'date-fns'

export function registerIpcHandlers(ipcMain: IpcMain) {
  // --- Daily Tasks ---
  ipcMain.handle('db:getDailyTasks', () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      return queryAll(`
        SELECT dt.id, dt.title, dt.priority, dt.notify_time, dt.is_active,
               dtl.completed_at, dtl.id as log_id
        FROM daily_tasks dt
        LEFT JOIN daily_task_logs dtl ON dt.id = dtl.task_id AND dtl.log_date = ?
        WHERE dt.is_active = 1
        ORDER BY dt.notify_time
      `, [today])
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createDailyTask', (_e, task: any) => {
    try {
      const id = execute(
        `INSERT INTO daily_tasks (title, priority, notify_time, repeat_type, repeat_days, repeat_dates)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          task.title, task.priority, task.notify_time,
          task.repeat_type  || 'daily',
          task.repeat_days  || '1,2,3,4,5,6,7',
          task.repeat_dates || null,
        ]
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:completeTask', (_e, taskId: number, date: string) => {
    try {
      const existing = queryOne(
        'SELECT id FROM daily_task_logs WHERE task_id = ? AND log_date = ?',
        [taskId, date]
      )
      if (existing) {
        execute(
          `UPDATE daily_task_logs SET completed_at = datetime('now') WHERE task_id = ? AND log_date = ?`,
          [taskId, date]
        )
      } else {
        execute(
          `INSERT INTO daily_task_logs (task_id, log_date, completed_at) VALUES (?, ?, datetime('now'))`,
          [taskId, date]
        )
      }
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteDailyTask', (_e, id: number) => {
    try {
      execute('UPDATE daily_tasks SET is_active = 0 WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Strategic Tasks ---
  ipcMain.handle('db:getStrategicTasks', () => {
    try {
      return queryAll('SELECT * FROM strategic_tasks ORDER BY deadline ASC')
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createStrategicTask', (_e, task: any) => {
    try {
      const id = execute(
        `INSERT INTO strategic_tasks (title, priority, deadline, reminder_type, reminder_days)
         VALUES (?, ?, ?, ?, ?)`,
        [
          task.title, task.priority, task.deadline,
          task.reminder_type || 'daily',
          task.reminder_days || '1,2,3,4,5',
        ]
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateStrategicProgress', (_e, id: number, progress: number) => {
    try {
      execute('UPDATE strategic_tasks SET progress = ? WHERE id = ?', [progress, id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteStrategicTask', (_e, id: number) => {
    try {
      execute('DELETE FROM strategic_tasks WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Study Items ---
  ipcMain.handle('db:getStudyItems', () => {
    try {
      return queryAll('SELECT * FROM study_items ORDER BY category, title')
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createStudyItem', (_e, item: any) => {
    try {
      const id = execute(
        `INSERT INTO study_items (category, parent_id, title, notify_time, notify_days)
         VALUES (?, ?, ?, ?, ?)`,
        [item.category, item.parent_id ?? null, item.title,
         item.notify_time ?? null, item.notify_days ?? '1,2,3,4,5,6,7']
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateStudyItem', (_e, id: number, item: any) => {
    try {
      execute(
        `UPDATE study_items SET title=?, notify_time=?, notify_days=? WHERE id=?`,
        [item.title, item.notify_time ?? null, item.notify_days ?? '1,2,3,4,5,6,7', id]
      )
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateStudyProgress', (_e, id: number, progress: number) => {
    try {
      execute('UPDATE study_items SET progress = ? WHERE id = ?', [progress, id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteStudyItem', (_e, id: number) => {
    try {
      execute('DELETE FROM study_items WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Work Session ---
  ipcMain.handle('db:getTodaySession', () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      return queryOne('SELECT * FROM work_sessions WHERE session_date = ?', [today])
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:endWorkSession', () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const nowTime = format(new Date(), 'HH:mm')
      const [sh, sm] = '09:00'.split(':').map(Number)
      const [eh, em] = nowTime.split(':').map(Number)
      const totalMinutes = (eh * 60 + em) - (sh * 60 + sm)
      execute(
        `UPDATE work_sessions SET end_time = ?, total_minutes = ?
         WHERE session_date = ? AND end_time IS NULL`,
        [nowTime, totalMinutes, today]
      )
      return { ok: true, totalMinutes }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Meetings ---
  ipcMain.handle('db:getMeetings', (_e, date?: string) => {
    try {
      if (date) return queryAll('SELECT * FROM meetings WHERE date = ? ORDER BY start_time', [date])
      return queryAll('SELECT * FROM meetings ORDER BY date, start_time')
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:getUpcomingMeetings', () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      return queryAll(
        `SELECT * FROM meetings WHERE date >= ? ORDER BY date, start_time LIMIT 20`,
        [today]
      )
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createMeeting', (_e, m: any) => {
    try {
      const id = execute(
        `INSERT INTO meetings (title, date, start_time, end_time, location, participants, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [m.title, m.date, m.start_time, m.end_time, m.location || '', m.participants || '', m.description || '']
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateMeeting', (_e, id: number, m: any) => {
    try {
      execute(
        `UPDATE meetings SET title=?, date=?, start_time=?, end_time=?, location=?, participants=?, description=? WHERE id=?`,
        [m.title, m.date, m.start_time, m.end_time, m.location || '', m.participants || '', m.description || '', id]
      )
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteMeeting', (_e, id: number) => {
    try {
      execute('DELETE FROM meetings WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateDailyTask', (_e, id: number, task: any) => {
    try {
      execute(
        `UPDATE daily_tasks SET title=?, priority=?, notify_time=?, repeat_type=?, repeat_days=?, repeat_dates=? WHERE id=?`,
        [task.title, task.priority, task.notify_time, task.repeat_type || 'daily', task.repeat_days || '1,2,3,4,5', task.repeat_dates || null, id]
      )
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateStrategicTask', (_e, id: number, task: any) => {
    try {
      execute(
        `UPDATE strategic_tasks SET title=?, priority=?, deadline=?, reminder_type=?, reminder_days=? WHERE id=?`,
        [task.title, task.priority, task.deadline, task.reminder_type || 'daily', task.reminder_days || '1,2,3,4,5', id]
      )
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Subtasks ---
  ipcMain.handle('db:getSubtasks', (_e, parentType: string, parentId: number) => {
    try {
      return queryAll(
        'SELECT * FROM subtasks WHERE parent_type = ? AND parent_id = ? ORDER BY created_at ASC',
        [parentType, parentId]
      )
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createSubtask', (_e, parentType: string, parentId: number, title: string) => {
    try {
      const id = execute(
        'INSERT INTO subtasks (parent_type, parent_id, title) VALUES (?, ?, ?)',
        [parentType, parentId, title]
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:toggleSubtask', (_e, id: number) => {
    try {
      execute('UPDATE subtasks SET is_done = CASE WHEN is_done = 1 THEN 0 ELSE 1 END WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteSubtask', (_e, id: number) => {
    try {
      execute('DELETE FROM subtasks WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Vacations ---
  ipcMain.handle('db:getVacations', () => {
    try {
      return queryAll('SELECT * FROM vacations ORDER BY date_from ASC')
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createVacation', (_e, v: any) => {
    try {
      const id = execute(
        `INSERT INTO vacations (destination, date_from, date_to, notes, emoji) VALUES (?, ?, ?, ?, ?)`,
        [v.destination, v.date_from, v.date_to, v.notes || '', v.emoji || '✈️']
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateVacation', (_e, id: number, v: any) => {
    try {
      execute(
        `UPDATE vacations SET destination=?, date_from=?, date_to=?, notes=?, emoji=? WHERE id=?`,
        [v.destination, v.date_from, v.date_to, v.notes || '', v.emoji || '✈️', id]
      )
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteVacation', (_e, id: number) => {
    try {
      execute('DELETE FROM vacations WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Settings ---
  ipcMain.handle('db:getSetting', (_e, key: string) => {
    try {
      const row = queryOne('SELECT value FROM settings WHERE key = ?', [key])
      return row?.value ?? null
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:setSetting', (_e, key: string, value: string) => {
    try {
      execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Day Detail ---
  ipcMain.handle('db:getDayDetail', (_e, date: string) => {
    try {
      const tasks = queryAll(`
        SELECT dt.id, dt.title, dt.priority, dt.notify_time,
               dtl.completed_at
        FROM daily_tasks dt
        LEFT JOIN daily_task_logs dtl ON dt.id = dtl.task_id AND dtl.log_date = ?
        WHERE dt.is_active = 1
        ORDER BY dt.notify_time
      `, [date])
      const session  = queryOne('SELECT * FROM work_sessions WHERE session_date = ?', [date])
      const meetings = queryAll('SELECT * FROM meetings WHERE date = ? ORDER BY start_time', [date])
      const studyItems = queryAll('SELECT * FROM study_items ORDER BY category, parent_id, title')
      return { tasks, session, meetings, studyItems }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Summary ---
  ipcMain.handle('db:getDailySummary', (_e, date: string) => {
    try {
      const completed = queryOne(
        `SELECT COUNT(*) as count FROM daily_task_logs
         WHERE log_date = ? AND completed_at IS NOT NULL`, [date]
      )
      const totalTasks = queryOne(
        'SELECT COUNT(*) as count FROM daily_tasks WHERE is_active = 1'
      )
      const session = queryOne(
        'SELECT * FROM work_sessions WHERE session_date = ?', [date]
      )
      const studyItems = queryAll('SELECT progress FROM study_items')
      const studyAvg = studyItems.length
        ? Math.round(studyItems.reduce((s: number, i: any) => s + i.progress, 0) / studyItems.length)
        : 0
      return {
        dailyTasksCompleted: completed?.count ?? 0,
        totalDailyTasks: totalTasks?.count ?? 0,
        workSessionMinutes: session?.total_minutes ?? null,
        sessionStart: session?.start_time ?? null,
        sessionEnd: session?.end_time ?? null,
        studyAvgProgress: studyAvg,
      }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:getMonthlySummary', (_e, year: number, month: number) => {
    try {
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const sessions = queryAll(
        `SELECT session_date, start_time, end_time, total_minutes FROM work_sessions
         WHERE session_date LIKE ?`, [`${prefix}%`]
      )
      const dailyCompletions = queryAll(
        `SELECT log_date, COUNT(*) as completed
         FROM daily_task_logs
         WHERE log_date LIKE ? AND completed_at IS NOT NULL
         GROUP BY log_date`, [`${prefix}%`]
      )
      const totalTasks = queryOne(
        'SELECT COUNT(*) as count FROM daily_tasks WHERE is_active = 1'
      )
      return {
        sessions,
        dailyCompletions,
        totalTasks: totalTasks?.count ?? 0,
      }
    } catch (e: any) { return { error: e.message } }
  })
}
