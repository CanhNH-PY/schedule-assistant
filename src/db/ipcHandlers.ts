import { IpcMain } from 'electron'
import { queryAll, queryOne, execute } from './database'
import { format } from 'date-fns'

// Build repeat-aware WHERE clause parameters for a given date
function repeatParams(dateStr: string): { clause: string; params: any[] } {
  const d = new Date(dateStr + 'T00:00:00')
  const isoDay = d.getDay() === 0 ? 7 : d.getDay() // 1=Mon…7=Sun
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

function buildReportHTML(project: any, tasks: any[]): string {
  const statusColor: Record<string, string> = {
    'Complete':    'background:#4ADE80;color:#166534',
    'In Progress': 'background:#60A5FA;color:#1E3A8A',
    'Not Started': 'background:#FCD34D;color:#78350F',
    'Overdue':     'background:#FCA5A5;color:#991B1B',
    'On Hold':     'background:#FDBA74;color:#7C2D12',
  }
  const priorityColor: Record<string, string> = {
    'High':   'background:#FEE2E2;color:#991B1B',
    'Medium': 'background:#FEF9C3;color:#854D0E',
    'Low':    'background:#DCFCE7;color:#166534',
  }
  const statuses = ['Not Started', 'In Progress', 'Complete', 'Overdue', 'On Hold']
  const total = tasks.length
  const statusCounts = Object.fromEntries(statuses.map(s => [s, tasks.filter(t => t.status === s).length]))

  const rows = tasks.map(t => {
    const dur = t.start_date && t.end_date
      ? Math.max(0, Math.round((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000))
      : ''
    return `<tr>
      <td>${t.task_name}</td>
      <td>${t.assigned_to || ''}</td>
      <td>${(t.start_date || '').slice(5).replace('-','/')}</td>
      <td>${(t.end_date || '').slice(5).replace('-','/')}</td>
      <td style="text-align:center">${dur}</td>
      <td><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;${statusColor[t.status]||''}">${t.status}</span></td>
      <td><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;${priorityColor[t.priority]||''}">${t.priority}</span></td>
      <td>${t.comments || ''}</td>
    </tr>`
  }).join('')

  const summaryRows = statuses.map(s => `
    <tr>
      <td><span style="padding:2px 8px;border-radius:3px;font-size:10px;font-weight:bold;${statusColor[s]}">${s}</span></td>
      <td style="text-align:center">${statusCounts[s]}</td>
      <td style="text-align:center">${total ? Math.round((statusCounts[s]/total)*100) : 0}%</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;margin:0;padding:20px;font-size:12px;color:#1F2937}
    .title{background:#1E3A5F;color:white;padding:10px 16px;font-size:16px;font-weight:bold;margin-bottom:16px;letter-spacing:1px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#1E3A5F;color:white;padding:8px 6px;text-align:left;font-size:11px;font-weight:bold}
    td{padding:6px;border-bottom:1px solid #E5E7EB;vertical-align:middle;font-size:11px}
    tr:nth-child(even) td{background:#F9FAFB}
    .section-title{font-weight:bold;font-size:13px;margin:16px 0 8px;color:#1E3A5F;border-bottom:2px solid #1E3A5F;padding-bottom:4px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .total-row td{font-weight:bold;background:#F3F4F6!important}
  </style></head><body>
    <div class="title">MẪU BÁO CÁO DỰ ÁN — ${project.name}</div>
    <table>
      <thead><tr>
        <th>TASK NAME</th><th>ASSIGNED TO</th><th>START DATE</th><th>END DATE</th>
        <th>DURATION</th><th>STATUS</th><th>PRIORITY</th><th>COMMENTS</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="grid2">
      <div>
        <div class="section-title">TÌNH TRẠNG HOÀN THÀNH %</div>
        <table style="width:100%">
          <thead><tr><th>STATUS</th><th>COUNT</th><th>%</th></tr></thead>
          <tbody>
            ${summaryRows}
            <tr class="total-row"><td>TOTAL</td><td style="text-align:center">${total}</td><td style="text-align:center">100%</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <div class="section-title">NGÂN SÁCH</div>
        <table style="width:auto">
          <tbody>
            <tr><td style="background:#4ADE80;color:#166534;font-weight:bold;padding:4px 12px">Kế hoạch</td><td style="padding:4px 16px">${Number(project.budget_planned).toLocaleString()}</td></tr>
            <tr><td style="background:#60A5FA;color:#1E3A8A;font-weight:bold;padding:4px 12px">Thực tế</td><td style="padding:4px 16px">${Number(project.budget_actual).toLocaleString()}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </body></html>`
}

export function registerIpcHandlers(ipcMain: IpcMain) {
  // --- Daily Tasks ---
  ipcMain.handle('db:getDailyTasks', () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { clause, params } = repeatParams(today)
      return queryAll(`
        SELECT dt.id, dt.title, dt.priority, dt.notify_time, dt.is_active,
               dt.repeat_type, dt.repeat_days, dt.repeat_dates,
               dtl.completed_at, dtl.id as log_id,
               (SELECT MAX(DATE(l2.completed_at)) FROM daily_task_logs l2
                WHERE l2.task_id = dt.id AND l2.completed_at IS NOT NULL) as last_completed_date
        FROM daily_tasks dt
        LEFT JOIN daily_task_logs dtl ON dt.id = dtl.task_id AND dtl.log_date = ?
        WHERE dt.is_active = 1 ${clause}
        ORDER BY dt.notify_time
      `, [today, ...params])
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

  ipcMain.handle('db:uncompleteTask', (_e, taskId: number, date: string) => {
    try {
      execute(
        `UPDATE daily_task_logs SET completed_at = NULL WHERE task_id = ? AND log_date = ?`,
        [taskId, date]
      )
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
      const today = format(new Date(), 'yyyy-MM-dd')
      const d = new Date(today + 'T00:00:00')
      const isoDay = d.getDay() === 0 ? 7 : d.getDay()
      return queryAll(`
        SELECT si.id, si.category, si.parent_id, si.title, si.progress,
               si.notify_time, si.notify_days,
               sl.completed_at, sl.id as log_id
        FROM study_items si
        LEFT JOIN study_logs sl ON si.id = sl.item_id AND sl.log_date = ?
        WHERE (',' || si.notify_days || ',') LIKE '%,' || ? || ',%'
        ORDER BY si.category, si.notify_time, si.title
      `, [today, String(isoDay)])
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:completeStudy', (_e, itemId: number, date: string) => {
    try {
      const existing = queryOne('SELECT id FROM study_logs WHERE item_id = ? AND log_date = ?', [itemId, date])
      if (existing) {
        execute(`UPDATE study_logs SET completed_at = datetime('now') WHERE item_id = ? AND log_date = ?`, [itemId, date])
      } else {
        execute(`INSERT INTO study_logs (item_id, log_date, completed_at) VALUES (?, ?, datetime('now'))`, [itemId, date])
      }
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:uncompleteStudy', (_e, itemId: number, date: string) => {
    try {
      execute(`UPDATE study_logs SET completed_at = NULL WHERE item_id = ? AND log_date = ?`, [itemId, date])
      return { ok: true }
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

  ipcMain.handle('db:reopenWorkSession', () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      execute(
        `UPDATE work_sessions SET end_time = NULL, total_minutes = NULL WHERE session_date = ?`,
        [today]
      )
      return { ok: true }
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

  ipcMain.handle('db:setMeetingAttended', (_e, id: number, attended: number | null) => {
    try {
      execute('UPDATE meetings SET attended = ? WHERE id = ?', [attended, id])
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

  // --- Events ---
  ipcMain.handle('db:getEvents', () => {
    try {
      return queryAll('SELECT * FROM events ORDER BY is_yearly ASC, date ASC')
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createEvent', (_e, ev: any) => {
    try {
      const id = execute(
        `INSERT INTO events (title, date, is_yearly, emoji, notes) VALUES (?, ?, ?, ?, ?)`,
        [ev.title, ev.date, ev.is_yearly ? 1 : 0, ev.emoji || '🎉', ev.notes || '']
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateEvent', (_e, id: number, ev: any) => {
    try {
      execute(
        `UPDATE events SET title=?, date=?, is_yearly=?, emoji=?, notes=? WHERE id=?`,
        [ev.title, ev.date, ev.is_yearly ? 1 : 0, ev.emoji || '🎉', ev.notes || '', id]
      )
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteEvent', (_e, id: number) => {
    try {
      execute('DELETE FROM events WHERE id = ?', [id])
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

  // --- Projects ---
  ipcMain.handle('db:getProjects', () => {
    try {
      return queryAll('SELECT * FROM projects ORDER BY created_at DESC')
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createProject', (_e, data: any) => {
    try {
      const id = execute(
        'INSERT INTO projects (name, budget_planned, budget_actual) VALUES (?,?,?)',
        [data.name, data.budget_planned || 0, data.budget_actual || 0]
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateProject', (_e, id: number, data: any) => {
    try {
      execute(
        'UPDATE projects SET name=?, budget_planned=?, budget_actual=? WHERE id=?',
        [data.name, data.budget_planned || 0, data.budget_actual || 0, id]
      )
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteProject', (_e, id: number) => {
    try {
      execute('DELETE FROM project_tasks WHERE project_id = ?', [id])
      execute('DELETE FROM projects WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:getProjectTasks', (_e, projectId: number) => {
    try {
      return queryAll('SELECT * FROM project_tasks WHERE project_id = ? ORDER BY sort_order, id', [projectId])
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:createProjectTask', (_e, task: any) => {
    try {
      const id = execute(
        `INSERT INTO project_tasks (project_id, task_name, assigned_to, start_date, end_date, status, priority, comments, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [task.project_id, task.task_name, task.assigned_to||'', task.start_date||'', task.end_date||'',
         task.status||'Not Started', task.priority||'High', task.comments||'', task.sort_order||0]
      )
      return { id }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:updateProjectTask', (_e, id: number, task: any) => {
    try {
      execute(
        `UPDATE project_tasks SET task_name=?, assigned_to=?, start_date=?, end_date=?, status=?, priority=?, comments=?, sort_order=? WHERE id=?`,
        [task.task_name, task.assigned_to||'', task.start_date||'', task.end_date||'',
         task.status||'Not Started', task.priority||'High', task.comments||'', task.sort_order||0, id]
      )
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:deleteProjectTask', (_e, id: number) => {
    try {
      execute('DELETE FROM project_tasks WHERE id = ?', [id])
      return { ok: true }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:exportProjectPDF', async (_e, projectId: number) => {
    try {
      const { dialog, BrowserWindow } = require('electron')
      const { writeFileSync } = require('fs')

      const project = queryOne('SELECT * FROM projects WHERE id = ?', [projectId])
      if (!project) return { error: 'Project not found' }
      const tasks = queryAll('SELECT * FROM project_tasks WHERE project_id = ? ORDER BY sort_order, id', [projectId])

      const { filePath } = await dialog.showSaveDialog({
        title: 'Save PDF Report',
        defaultPath: `${project.name}-report.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      })
      if (!filePath) return { cancelled: true }

      const html = buildReportHTML(project, tasks)

      const win = new BrowserWindow({ show: false, width: 1400, height: 900 })
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      await new Promise(r => setTimeout(r, 800))
      const pdfData = await win.webContents.printToPDF({ landscape: true, pageSize: 'A4', printBackground: true })
      win.destroy()
      writeFileSync(filePath, pdfData)
      return { success: true, filePath }
    } catch (e: any) { return { error: e.message } }
  })

  ipcMain.handle('db:exportProjectExcel', async (_e, projectId: number) => {
    try {
      const { dialog } = require('electron')
      const XLSX = require('xlsx')

      const project = queryOne('SELECT * FROM projects WHERE id = ?', [projectId])
      if (!project) return { error: 'Project not found' }
      const tasks = queryAll('SELECT * FROM project_tasks WHERE project_id = ? ORDER BY sort_order, id', [projectId])

      const { filePath } = await dialog.showSaveDialog({
        title: 'Save Excel Report',
        defaultPath: `${project.name}-report.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      })
      if (!filePath) return { cancelled: true }

      const wb = XLSX.utils.book_new()

      // Main task sheet
      const taskRows: any[][] = [
        ['TASK NAME', 'ASSIGNED TO', 'START DATE', 'END DATE', 'DURATION (days)', 'STATUS', 'PRIORITY', 'COMMENTS']
      ]
      for (const t of tasks) {
        const dur = t.start_date && t.end_date
          ? Math.max(0, Math.round((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86400000))
          : ''
        taskRows.push([t.task_name, t.assigned_to, t.start_date, t.end_date, dur, t.status, t.priority, t.comments])
      }

      const ws = XLSX.utils.aoa_to_sheet(taskRows)
      ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Tasks')

      // Summary sheet
      const statusCounts: Record<string, number> = {}
      const statuses = ['Not Started', 'In Progress', 'Complete', 'Overdue', 'On Hold']
      for (const s of statuses) statusCounts[s] = tasks.filter((t: any) => t.status === s).length
      const total = tasks.length

      const summaryRows = [
        ['STATUS', 'COUNT', '%'],
        ...statuses.map(s => [s, statusCounts[s], total ? Math.round((statusCounts[s] / total) * 100) + '%' : '0%']),
        ['TOTAL', total, '100%'],
        [],
        ['NGÂN SÁCH', ''],
        ['Kế hoạch', project.budget_planned],
        ['Thực tế', project.budget_actual],
      ]
      const ws2 = XLSX.utils.aoa_to_sheet(summaryRows)
      ws2['!cols'] = [{ wch: 15 }, { wch: 8 }, { wch: 8 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

      XLSX.writeFile(wb, filePath)
      return { success: true, filePath }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Day Detail ---
  ipcMain.handle('db:getDayDetail', (_e, date: string) => {
    try {
      const { clause, params } = repeatParams(date)
      const tasks = queryAll(`
        SELECT dt.id, dt.title, dt.priority, dt.notify_time,
               dtl.completed_at
        FROM daily_tasks dt
        LEFT JOIN daily_task_logs dtl ON dt.id = dtl.task_id AND dtl.log_date = ?
        WHERE dt.is_active = 1 ${clause}
        ORDER BY dt.notify_time
      `, [date, ...params])
      const session  = queryOne('SELECT * FROM work_sessions WHERE session_date = ?', [date])
      const meetings = queryAll('SELECT id, title, date, start_time, end_time, location, participants, description, attended FROM meetings WHERE date = ? ORDER BY start_time', [date])
      const studyItems = queryAll('SELECT * FROM study_items ORDER BY category, parent_id, title')
      return { tasks, session, meetings, studyItems }
    } catch (e: any) { return { error: e.message } }
  })

  // --- Weekly Report ---
  ipcMain.handle('db:getWeeklyReport', (_e, startDate: string, endDate: string) => {
    try {
      const tasks = queryAll('SELECT COUNT(*) as total FROM daily_tasks WHERE is_active = 1')
      const totalTasks = tasks[0]?.total ?? 0
      const completions = queryAll(
        `SELECT log_date, COUNT(*) as done FROM daily_task_logs
         WHERE log_date >= ? AND log_date <= ? AND completed_at IS NOT NULL
         GROUP BY log_date`,
        [startDate, endDate]
      )
      const sessions = queryAll(
        `SELECT session_date, start_time, end_time, total_minutes FROM work_sessions
         WHERE session_date >= ? AND session_date <= ?`,
        [startDate, endDate]
      )
      const meetings = queryAll(
        `SELECT date, COUNT(*) as total, SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as attended FROM meetings
         WHERE date >= ? AND date <= ? GROUP BY date`,
        [startDate, endDate]
      )
      return { totalTasks, completions, sessions, meetings }
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
      // Build day-aware task counts for each day of the month
      const daysInMonth = new Date(year, month, 0).getDate()
      const dailyTaskCounts: Record<string, number> = {}
      for (let d = 1; d <= daysInMonth; d++) {
        const pad = (n: number) => String(n).padStart(2, '0')
        const dateStr = `${year}-${pad(month)}-${pad(d)}`
        const { clause, params } = repeatParams(dateStr)
        const row = queryOne(
          `SELECT COUNT(*) as count FROM daily_tasks WHERE is_active = 1 ${clause}`,
          params
        )
        dailyTaskCounts[dateStr] = row?.count ?? 0
      }
      return {
        sessions,
        dailyCompletions,
        dailyTaskCounts,
        totalTasks: 0, // deprecated — use dailyTaskCounts instead
      }
    } catch (e: any) { return { error: e.message } }
  })
}
