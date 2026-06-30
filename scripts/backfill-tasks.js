// Backfill daily_task_logs: mark all active tasks as complete for June 22–30
// Also inspect study items
const fs = require('fs')
const path = require('path')

const dbPath = path.join(process.env.APPDATA, 'schedule-assistant', 'schedule.db')
const initSqlJs = require('../node_modules/sql.js/dist/sql-wasm.js')
const wasmPath  = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm')

;(async () => {
  const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(wasmPath) })
  const db  = new SQL.Database(fs.readFileSync(dbPath))

  const exec = (sql, params = []) => db.run(sql, params)
  const all  = (sql, params = []) => {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  }

  // Show active tasks
  const tasks = all('SELECT id, title, notify_time FROM daily_tasks WHERE is_active = 1')
  console.log(`\nActive tasks (${tasks.length}):`)
  tasks.forEach(t => console.log(`  [${t.id}] ${t.title} @ ${t.notify_time}`))

  // Working days June 22–30 (skip Sat=27, Sun=28)
  const targetDates = [
    '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26',
    '2026-06-29', '2026-06-30',
  ]

  console.log(`\nBackfilling ${tasks.length} tasks × ${targetDates.length} days...`)

  let inserted = 0, updated = 0
  for (const date of targetDates) {
    for (const task of tasks) {
      const existing = all(
        'SELECT id, completed_at FROM daily_task_logs WHERE task_id = ? AND log_date = ?',
        [task.id, date]
      )
      const completedAt = `${date} ${task.notify_time || '09:00'}:00`
      if (existing.length === 0) {
        exec(
          `INSERT INTO daily_task_logs (task_id, log_date, completed_at, notif_count)
           VALUES (?, ?, ?, 1)`,
          [task.id, date, completedAt]
        )
        inserted++
      } else if (!existing[0].completed_at) {
        exec(
          `UPDATE daily_task_logs SET completed_at = ? WHERE task_id = ? AND log_date = ?`,
          [completedAt, task.id, date]
        )
        updated++
      } else {
        process.stdout.write('.')
      }
    }
  }

  // Verify
  const check = all(
    `SELECT log_date, COUNT(*) as done
     FROM daily_task_logs
     WHERE log_date BETWEEN '2026-06-22' AND '2026-06-30'
       AND completed_at IS NOT NULL
     GROUP BY log_date ORDER BY log_date`
  )
  console.log(`\n\nResult (inserted=${inserted}, updated=${updated}):`)
  check.forEach(r => console.log(`  ${r.log_date}: ${r.done} tasks completed`))

  // Save back to file
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
  console.log('\nDatabase saved.')
  db.close()
})()
