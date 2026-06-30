import { BrowserWindow, Notification } from 'electron'
import * as cron from 'node-cron'
import { queryAll, queryOne, execute } from '../src/db/database'
import { sendEmail } from '../src/db/emailHelper'
import { format } from 'date-fns'

let tasks: cron.ScheduledTask[] = []

// ── Public holidays (Vietnam) ─────────────────────────────────────────────────
const HOLIDAYS = new Set([
  '2026-09-02',
  '2027-01-01', '2027-01-17', '2027-01-18', '2027-01-19',
  '2027-01-20', '2027-01-21', '2027-01-22', '2027-01-23',
  '2027-04-21', '2027-04-30', '2027-05-01',
])

function isHoliday(dateStr: string): boolean {
  return HOLIDAYS.has(dateStr)
}

function isWeekend(date: Date): boolean {
  const d = date.getDay()
  return d === 0 || d === 6   // 0=Sun, 6=Sat
}

// 1=Mon … 7=Sun  (matches our repeat_days convention)
function todayDow(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

function getCurrentTime(): string { return format(new Date(), 'HH:mm') }
function getCurrentDate(): string  { return format(new Date(), 'yyyy-MM-dd') }

/**
 * Returns true if a task should trigger today based on its repeat settings.
 * "daily"   → weekdays only, no holidays
 * "weekly"  → today's DOW is in repeat_days
 * "monthly" → today's date number is in repeat_dates
 */
function shouldRunToday(task: {
  repeat_type?: string
  repeat_days?: string
  repeat_dates?: string
}): boolean {
  const today   = getCurrentDate()
  const now     = new Date()
  const type    = task.repeat_type || 'daily'

  if (isHoliday(today)) return false  // Never on holidays

  if (type === 'daily') {
    return !isWeekend(now)             // Mon–Fri, no holidays
  }
  if (type === 'weekly') {
    const days = (task.repeat_days || '1,2,3,4,5').split(',').map(Number)
    return days.includes(todayDow())
  }
  if (type === 'monthly') {
    const dates = (task.repeat_dates || '').split(',').map(Number).filter(Boolean)
    return dates.includes(now.getDate())
  }
  return false
}

export function startScheduler(win: BrowserWindow | null, showWindow?: () => void) {

  // ── Every minute: Daily Task notifications ───────────────────────────────
  tasks.push(
    cron.schedule('* * * * *', async () => {
      const now   = getCurrentTime()
      const today = getCurrentDate()

      const activeTasks = queryAll(
        'SELECT * FROM daily_tasks WHERE is_active = 1'
      )

      for (const task of activeTasks) {
        if (!shouldRunToday(task)) continue

        // Ensure log row exists
        const existing = queryOne(
          'SELECT id FROM daily_task_logs WHERE task_id = ? AND log_date = ?',
          [task.id, today]
        )
        if (!existing) {
          execute(
            'INSERT INTO daily_task_logs (task_id, log_date, notif_count) VALUES (?, ?, 0)',
            [task.id, today]
          )
        }

        // First notification at scheduled time
        if (task.notify_time === now) {
          const log = queryOne(
            'SELECT * FROM daily_task_logs WHERE task_id = ? AND log_date = ?',
            [task.id, today]
          )
          if (log && !log.completed_at && log.notif_count === 0) {
            new Notification({
              title: 'Schedule Assistant',
              body:  `Task reminder: ${task.title}`,
            }).show()
            await sendDailyTaskEmail(task)
            execute(
              'UPDATE daily_task_logs SET notif_count = notif_count + 1 WHERE id = ?',
              [log.id]
            )
          }
        }

        // Repeat every 30 min if not done
        const m = new Date().getMinutes()
        if (m === 0 || m === 30) {
          const log = queryOne(
            'SELECT * FROM daily_task_logs WHERE task_id = ? AND log_date = ?',
            [task.id, today]
          )
          if (log && !log.completed_at && log.notif_count > 0) {
            await sendDailyTaskEmail(task)
            execute(
              'UPDATE daily_task_logs SET notif_count = notif_count + 1 WHERE id = ?',
              [log.id]
            )
          }
        }
      }
    })
  )

  // ── Every minute: Study item notifications ───────────────────────────────
  tasks.push(
    cron.schedule('* * * * *', async () => {
      if (isHoliday(getCurrentDate())) return
      const now   = getCurrentTime()
      const today = getCurrentDate()
      const dow   = todayDow()

      const items = queryAll(
        `SELECT si.* FROM study_items si
         WHERE si.notify_time IS NOT NULL
           AND (',' || si.notify_days || ',') LIKE '%,' || ? || ',%'`,
        [String(dow)]
      )

      for (const item of items) {
        // Ensure study_logs row exists for today
        const existing = queryOne(
          'SELECT id FROM study_logs WHERE item_id = ? AND log_date = ?',
          [item.id, today]
        )
        if (!existing) {
          execute(
            'INSERT INTO study_logs (item_id, log_date) VALUES (?, ?)',
            [item.id, today]
          )
        }

        const log = queryOne(
          'SELECT * FROM study_logs WHERE item_id = ? AND log_date = ?',
          [item.id, today]
        )
        if (!log || log.completed_at) continue  // Skip if already done today

        // First notification at scheduled time
        if (item.notify_time === now && log.notif_count === 0) {
          new Notification({
            title: 'Schedule Assistant — Study',
            body:  `Time to study: ${item.title}`,
          }).show()
          await sendStudyEmail(item)
          execute(
            'UPDATE study_logs SET notif_count = notif_count + 1 WHERE id = ?',
            [log.id]
          )
        }

        // Repeat every 30 min if not done yet
        const m = new Date().getMinutes()
        if ((m === 0 || m === 30) && log.notif_count > 0) {
          await sendStudyEmail(item)
          execute(
            'UPDATE study_logs SET notif_count = notif_count + 1 WHERE id = ?',
            [log.id]
          )
        }
      }
    })
  )

  // ── 11:50 weekdays: Buổi sáng check-in ──────────────────────────────────
  tasks.push(
    cron.schedule('50 11 * * 1-5', () => {
      if (isHoliday(getCurrentDate())) return
      const today = getCurrentDate()
      const done = (queryOne(
        `SELECT COUNT(*) as c FROM daily_task_logs WHERE log_date = ? AND completed_at IS NOT NULL`, [today]
      ) as any)?.c ?? 0
      const total = (queryOne(
        `SELECT COUNT(*) as c FROM daily_tasks WHERE is_active = 1`, []
      ) as any)?.c ?? 0
      const notif = new Notification({
        title: '📋 Schedule Assistant — 11:50',
        body: total > 0
          ? `Buổi sáng: đã hoàn thành ${done}/${total} tasks. Click để cập nhật.`
          : 'Đã đến 11:50 — Click để cập nhật tiến độ công việc.',
        silent: false,
      })
      notif.on('click', () => { if (showWindow) showWindow() })
      notif.show()
    })
  )

  // ── 17:20 weekdays: Cuối ngày check-in ───────────────────────────────────
  tasks.push(
    cron.schedule('20 17 * * 1-5', () => {
      if (isHoliday(getCurrentDate())) return
      const today = getCurrentDate()
      const done = (queryOne(
        `SELECT COUNT(*) as c FROM daily_task_logs WHERE log_date = ? AND completed_at IS NOT NULL`, [today]
      ) as any)?.c ?? 0
      const total = (queryOne(
        `SELECT COUNT(*) as c FROM daily_tasks WHERE is_active = 1`, []
      ) as any)?.c ?? 0
      const notif = new Notification({
        title: '📋 Schedule Assistant — 17:20',
        body: total > 0
          ? `Cuối ngày: ${done}/${total} tasks hoàn thành. Click để tổng kết.`
          : 'Đã đến 17:20 — Click để cập nhật và kết thúc ngày làm việc.',
        silent: false,
      })
      notif.on('click', () => { if (showWindow) showWindow() })
      notif.show()
    })
  )

  // ── 17:15 weekdays: Strategic Task deadline reminders ────────────────────
  tasks.push(
    cron.schedule('15 17 * * 1-5', async () => {
      const today = getCurrentDate()
      if (isHoliday(today)) return

      const urgentTasks = queryAll(
        'SELECT * FROM strategic_tasks WHERE progress < 100'
      )
      const now = Date.now()
      for (const task of urgentTasks) {
        // Respect reminder_days if set
        if (task.reminder_days) {
          const days = (task.reminder_days as string).split(',').map(Number)
          if (!days.includes(todayDow())) continue
        }
        const daysLeft = Math.ceil((new Date(task.deadline as string).getTime() - now) / 86400000)
        if (daysLeft <= 5) {
          await sendStrategicTaskEmail(task, daysLeft)
        }
      }
    })
  )

  // ── 17:30 weekdays: End-of-day reminder ─────────────────────────────────
  tasks.push(
    cron.schedule('30 17 * * 1-5', async () => {
      const today = getCurrentDate()
      if (isHoliday(today)) return
      const session = queryOne(
        'SELECT id FROM work_sessions WHERE session_date = ? AND end_time IS NULL',
        [today]
      )
      if (session) {
        new Notification({
          title: 'Schedule Assistant',
          body:  "It's 17:30 — ready to end your work session?",
        }).show()
        await sendEndOfDayEmail()
      }
    })
  )

  // ── 18:30–23:30 hourly: Repeat end-of-day reminder ──────────────────────
  tasks.push(
    cron.schedule('30 18-23 * * 1-5', async () => {
      const today = getCurrentDate()
      if (isHoliday(today)) return
      const session = queryOne(
        'SELECT id FROM work_sessions WHERE session_date = ? AND end_time IS NULL',
        [today]
      )
      if (session) await sendEndOfDayEmail()
    })
  )

  console.log('[scheduler] All cron jobs started')
}

export function stopScheduler() {
  tasks.forEach(t => t.stop())
  tasks = []
  console.log('[scheduler] All cron jobs stopped')
}

// ── Email helpers ─────────────────────────────────────────────────────────────

async function sendDailyTaskEmail(task: any) {
  const link  = `scheduleapp://complete?task_id=${task.id}&date=${getCurrentDate()}`
  const pLabel = task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'
  await sendEmail({
    subject: `[Schedule Assistant] Reminder: ${task.title}`,
    html: `
      <p>You have a pending task: <strong>${task.title}</strong></p>
      <p>Priority: <strong>${pLabel}</strong></p>
      <p><a href="${link}">→ Click to mark as complete</a></p>
    `,
  })
}

async function sendStrategicTaskEmail(task: any, daysLeft: number) {
  await sendEmail({
    subject: `[Schedule Assistant] Goal deadline: ${task.title} — ${daysLeft} days left`,
    html: `
      <p>Deadline: <strong>${task.deadline}</strong></p>
      <p>Current progress: <strong>${task.progress}%</strong></p>
      <p>Time remaining: <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong></p>
    `,
  })
}

async function sendStudyEmail(item: any) {
  await sendEmail({
    subject: `[Schedule Assistant] Study reminder: ${item.title}`,
    html: `
      <p>Time to study: <strong>${item.title}</strong></p>
      <p>Category: <strong>${item.category}</strong></p>
      <p>Current mastery: <strong>${item.progress}%</strong></p>
    `,
  })
}

async function sendEndOfDayEmail() {
  await sendEmail({
    subject: '[Schedule Assistant] End of workday',
    html: `
      <p>It's time to wrap up for the day.</p>
      <p>Open the app and click <strong>"End Work Session"</strong> to log your hours.</p>
    `,
  })
}
