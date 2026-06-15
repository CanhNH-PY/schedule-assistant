"use strict";
const electron = require("electron");
const path = require("path");
const dotenv = require("dotenv");
const initSqlJs = require("sql.js");
const fs = require("fs");
const dateFns = require("date-fns");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const dotenv__namespace = /* @__PURE__ */ _interopNamespaceDefault(dotenv);
const cron__namespace = /* @__PURE__ */ _interopNamespaceDefault(cron);
const nodemailer__namespace = /* @__PURE__ */ _interopNamespaceDefault(nodemailer);
let db;
let dbPath;
async function initDb() {
  const userDataPath = electron.app.getPath("userData");
  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
  dbPath = path.join(userDataPath, "schedule.db");
  const wasmPath = path.join(__dirname, "../../node_modules/sql.js/dist");
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmPath, file)
  });
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run("PRAGMA foreign_keys = ON;");
  runMigrations();
  console.log("[db] Database khởi tạo tại:", dbPath);
}
function getDb() {
  if (!db) throw new Error("Database chưa được khởi tạo. Gọi initDb() trước.");
  return db;
}
function saveDb() {
  if (!db || !dbPath) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] ?? null;
}
function execute(sql, params = []) {
  db.run(sql, params);
  saveDb();
  const row = queryOne("SELECT last_insert_rowid() as id");
  return row?.id ?? 0;
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
  `);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const existing = queryOne("SELECT id FROM work_sessions WHERE session_date = ?", [today]);
  if (!existing) {
    execute("INSERT INTO work_sessions (session_date) VALUES (?)", [today]);
  }
  saveDb();
}
function registerIpcHandlers(ipcMain) {
  ipcMain.handle("db:getDailyTasks", () => {
    try {
      const today = dateFns.format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
      return queryAll(`
        SELECT dt.id, dt.title, dt.priority, dt.notify_time, dt.is_active,
               dtl.completed_at, dtl.id as log_id
        FROM daily_tasks dt
        LEFT JOIN daily_task_logs dtl ON dt.id = dtl.task_id AND dtl.log_date = ?
        WHERE dt.is_active = 1
        ORDER BY dt.notify_time
      `, [today]);
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:createDailyTask", (_e, task) => {
    try {
      const id = execute(
        "INSERT INTO daily_tasks (title, priority, notify_time) VALUES (?, ?, ?)",
        [task.title, task.priority, task.notify_time]
      );
      return { id };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:completeTask", (_e, taskId, date) => {
    try {
      const existing = queryOne(
        "SELECT id FROM daily_task_logs WHERE task_id = ? AND log_date = ?",
        [taskId, date]
      );
      if (existing) {
        execute(
          `UPDATE daily_task_logs SET completed_at = datetime('now') WHERE task_id = ? AND log_date = ?`,
          [taskId, date]
        );
      } else {
        execute(
          `INSERT INTO daily_task_logs (task_id, log_date, completed_at) VALUES (?, ?, datetime('now'))`,
          [taskId, date]
        );
      }
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:deleteDailyTask", (_e, id) => {
    try {
      execute("UPDATE daily_tasks SET is_active = 0 WHERE id = ?", [id]);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:getStrategicTasks", () => {
    try {
      return queryAll("SELECT * FROM strategic_tasks ORDER BY deadline ASC");
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:createStrategicTask", (_e, task) => {
    try {
      const id = execute(
        "INSERT INTO strategic_tasks (title, priority, deadline) VALUES (?, ?, ?)",
        [task.title, task.priority, task.deadline]
      );
      return { id };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:updateStrategicProgress", (_e, id, progress) => {
    try {
      execute("UPDATE strategic_tasks SET progress = ? WHERE id = ?", [progress, id]);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:deleteStrategicTask", (_e, id) => {
    try {
      execute("DELETE FROM strategic_tasks WHERE id = ?", [id]);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:getStudyItems", () => {
    try {
      return queryAll("SELECT * FROM study_items ORDER BY category, title");
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:createStudyItem", (_e, item) => {
    try {
      const id = execute(
        `INSERT INTO study_items (category, parent_id, title, notify_time, notify_days)
         VALUES (?, ?, ?, ?, ?)`,
        [
          item.category,
          item.parent_id ?? null,
          item.title,
          item.notify_time ?? null,
          item.notify_days ?? "1,2,3,4,5,6,7"
        ]
      );
      return { id };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:updateStudyProgress", (_e, id, progress) => {
    try {
      execute("UPDATE study_items SET progress = ? WHERE id = ?", [progress, id]);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:deleteStudyItem", (_e, id) => {
    try {
      execute("DELETE FROM study_items WHERE id = ?", [id]);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:getTodaySession", () => {
    try {
      const today = dateFns.format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
      return queryOne("SELECT * FROM work_sessions WHERE session_date = ?", [today]);
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:endWorkSession", () => {
    try {
      const today = dateFns.format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
      const nowTime = dateFns.format(/* @__PURE__ */ new Date(), "HH:mm");
      const [sh, sm] = "09:00".split(":").map(Number);
      const [eh, em] = nowTime.split(":").map(Number);
      const totalMinutes = eh * 60 + em - (sh * 60 + sm);
      execute(
        `UPDATE work_sessions SET end_time = ?, total_minutes = ?
         WHERE session_date = ? AND end_time IS NULL`,
        [nowTime, totalMinutes, today]
      );
      return { ok: true, totalMinutes };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:getSetting", (_e, key) => {
    try {
      const row = queryOne("SELECT value FROM settings WHERE key = ?", [key]);
      return row?.value ?? null;
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:setSetting", (_e, key, value) => {
    try {
      execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:getDailySummary", (_e, date) => {
    try {
      const completed = queryOne(
        `SELECT COUNT(*) as count FROM daily_task_logs
         WHERE log_date = ? AND completed_at IS NOT NULL`,
        [date]
      );
      const session = queryOne(
        "SELECT * FROM work_sessions WHERE session_date = ?",
        [date]
      );
      return {
        dailyTasksCompleted: completed?.count ?? 0,
        workSessionMinutes: session?.total_minutes ?? null,
        sessionEndTime: session?.end_time ?? null
      };
    } catch (e) {
      return { error: e.message };
    }
  });
  ipcMain.handle("db:getMonthlySummary", (_e, year, month) => {
    try {
      const prefix = `${year}-${String(month).padStart(2, "0")}`;
      const sessions = queryAll(
        `SELECT session_date, total_minutes FROM work_sessions
         WHERE session_date LIKE ? AND end_time IS NOT NULL`,
        [`${prefix}%`]
      );
      const lateStrategic = queryAll(
        `SELECT * FROM strategic_tasks WHERE deadline LIKE ? AND progress < 100`,
        [`${prefix}%`]
      );
      return { sessions, lateStrategic };
    } catch (e) {
      return { error: e.message };
    }
  });
}
function log(msg) {
  const line = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`;
  try {
    fs.appendFileSync(path.join(process.cwd(), "app.log"), line);
  } catch {
    console.error(line);
  }
}
async function sendEmail(options) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_TO } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_TO) {
    log("[email] SMTP chưa được cấu hình trong .env — bỏ qua gửi email");
    return;
  }
  const transporter = nodemailer__namespace.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? "587"),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  try {
    await transporter.sendMail({
      from: `"Schedule Assistant" <${SMTP_USER}>`,
      to: options.to ?? NOTIFY_TO,
      subject: options.subject,
      html: options.html
    });
    log(`[email] Đã gửi: ${options.subject}`);
  } catch (err) {
    log(`[email] Lỗi gửi mail: ${err.message}`);
  }
}
let tasks = [];
function isWorkday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}
function getCurrentTime() {
  return dateFns.format(/* @__PURE__ */ new Date(), "HH:mm");
}
function getCurrentDate() {
  return dateFns.format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
}
function startScheduler(win) {
  tasks.push(
    cron__namespace.schedule("* * * * *", async () => {
      if (!isWorkday(/* @__PURE__ */ new Date())) return;
      const now = getCurrentTime();
      const today = getCurrentDate();
      const activeTasks = queryAll("SELECT * FROM daily_tasks WHERE is_active = 1");
      for (const task of activeTasks) {
        const existing = queryOne(
          "SELECT id FROM daily_task_logs WHERE task_id = ? AND log_date = ?",
          [task.id, today]
        );
        if (!existing) {
          execute(
            "INSERT INTO daily_task_logs (task_id, log_date, notif_count) VALUES (?, ?, 0)",
            [task.id, today]
          );
        }
      }
      const firstNotif = queryAll(`
        SELECT dt.id, dt.title, dt.priority, dtl.id as log_id
        FROM daily_tasks dt
        JOIN daily_task_logs dtl ON dt.id = dtl.task_id
        WHERE dt.notify_time = ? AND dtl.log_date = ?
          AND dtl.completed_at IS NULL AND dtl.notif_count = 0
          AND dt.is_active = 1
      `, [now, today]);
      for (const task of firstNotif) {
        await sendDailyTaskEmail(task);
        execute(
          "UPDATE daily_task_logs SET notif_count = notif_count + 1 WHERE id = ?",
          [task.log_id]
        );
      }
      const nowMinutes = (/* @__PURE__ */ new Date()).getMinutes();
      if (nowMinutes === 0 || nowMinutes === 30) {
        const repeatNotif = queryAll(`
          SELECT dt.id, dt.title, dt.priority, dtl.id as log_id
          FROM daily_tasks dt
          JOIN daily_task_logs dtl ON dt.id = dtl.task_id
          WHERE dtl.log_date = ? AND dtl.completed_at IS NULL
            AND dtl.notif_count > 0 AND dt.is_active = 1
        `, [today]);
        for (const task of repeatNotif) {
          await sendDailyTaskEmail(task);
          execute(
            "UPDATE daily_task_logs SET notif_count = notif_count + 1 WHERE id = ?",
            [task.log_id]
          );
        }
      }
    })
  );
  tasks.push(
    cron__namespace.schedule("15 17 * * 1-5", async () => {
      if (!isWorkday(/* @__PURE__ */ new Date())) return;
      const urgentTasks = queryAll(`
        SELECT * FROM strategic_tasks
        WHERE progress < 100
      `);
      const now = Date.now();
      for (const task of urgentTasks) {
        const deadline = new Date(task.deadline).getTime();
        const daysLeft = Math.ceil((deadline - now) / (1e3 * 60 * 60 * 24));
        if (daysLeft <= 5) {
          await sendStrategicTaskEmail(task, daysLeft);
        }
      }
    })
  );
  tasks.push(
    cron__namespace.schedule("* * * * *", () => {
      const now = getCurrentTime();
      const todayNum = (/* @__PURE__ */ new Date()).getDay() || 7;
      const items = queryAll(
        `SELECT * FROM study_items WHERE category = 'language' AND notify_time = ?`,
        [now]
      );
      for (const item of items) {
        const days = item.notify_days.split(",").map(Number);
        if (days.includes(todayNum)) {
          new electron.Notification({
            title: "Schedule Assistant — Luyện tập ngoại ngữ",
            body: `Đã đến giờ luyện: ${item.title}`
          }).show();
        }
      }
    })
  );
  tasks.push(
    cron__namespace.schedule("30 17 * * 1-5", async () => {
      if (!isWorkday(/* @__PURE__ */ new Date())) return;
      const session = queryOne(
        "SELECT id FROM work_sessions WHERE session_date = ? AND end_time IS NULL",
        [getCurrentDate()]
      );
      if (session) {
        await sendEndOfDayEmail();
        new electron.Notification({
          title: "Schedule Assistant — Tan ca",
          body: "Đã 17:30 — Bạn có muốn kết thúc ca làm việc hôm nay?"
        }).show();
      }
    })
  );
  tasks.push(
    cron__namespace.schedule("30 18-23 * * 1-5", async () => {
      if (!isWorkday(/* @__PURE__ */ new Date())) return;
      const session = queryOne(
        "SELECT id FROM work_sessions WHERE session_date = ? AND end_time IS NULL",
        [getCurrentDate()]
      );
      if (session) await sendEndOfDayEmail();
    })
  );
  console.log("[scheduler] Tất cả cron jobs đã khởi động");
}
function stopScheduler() {
  tasks.forEach((t) => t.stop());
  tasks = [];
  console.log("[scheduler] Đã dừng tất cả cron jobs");
}
async function sendDailyTaskEmail(task) {
  const deepLink = `scheduleapp://complete?task_id=${task.id}&date=${getCurrentDate()}`;
  const priorityLabel = task.priority === "high" ? "Cao" : task.priority === "medium" ? "Trung bình" : "Thấp";
  await sendEmail({
    subject: `[Schedule Assistant] Nhắc việc: ${task.title}`,
    html: `
      <p>Bạn có công việc chưa hoàn thành: <strong>${task.title}</strong></p>
      <p>Mức độ: <strong>${priorityLabel}</strong></p>
      <p><a href="${deepLink}">→ Bấm đây để đánh dấu hoàn thành</a></p>
    `
  });
}
async function sendStrategicTaskEmail(task, daysLeft) {
  await sendEmail({
    subject: `[Schedule Assistant] Cập nhật tiến độ: ${task.title} — còn ${daysLeft} ngày`,
    html: `
      <p>Deadline: <strong>${task.deadline}</strong></p>
      <p>Tiến độ hiện tại: <strong>${task.progress}%</strong></p>
      <p>Còn lại: <strong>${daysLeft} ngày</strong></p>
    `
  });
}
async function sendEndOfDayEmail() {
  await sendEmail({
    subject: "[Schedule Assistant] Đã đến giờ tan ca",
    html: `
      <p>Đã đến giờ kết thúc ca làm việc hôm nay.</p>
      <p>Mở app và bấm <strong>"Kết thúc ca"</strong> để ghi nhận giờ làm việc.</p>
    `
  });
}
dotenv__namespace.config();
let mainWindow = null;
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    electron.app.setAsDefaultProtocolClient("scheduleapp", process.execPath, [process.argv[1]]);
  }
} else {
  electron.app.setAsDefaultProtocolClient("scheduleapp");
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
      // cần cho iframe MSN Weather
    },
    titleBarStyle: "default",
    title: "Schedule Assistant"
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}
function handleDeepLink(url) {
  const parsed = new URL(url);
  if (parsed.hostname === "complete") {
    const taskId = parseInt(parsed.searchParams.get("task_id") ?? "0");
    const date = parsed.searchParams.get("date") ?? "";
    if (taskId && date) {
      const db2 = getDb();
      db2.prepare(`
        UPDATE daily_task_logs SET completed_at = datetime('now')
        WHERE task_id = ? AND log_date = ? AND completed_at IS NULL
      `).run(taskId, date);
      mainWindow?.webContents.send("task:completed", { taskId, date });
    }
  }
}
electron.app.whenReady().then(async () => {
  await initDb();
  registerIpcHandlers(electron.ipcMain);
  createWindow();
  startScheduler();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("second-instance", (_event, commandLine) => {
  const url = commandLine.find((arg) => arg.startsWith("scheduleapp://"));
  if (url) handleDeepLink(url);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
electron.app.on("open-url", (_event, url) => {
  handleDeepLink(url);
});
electron.app.on("window-all-closed", () => {
  stopScheduler();
  if (process.platform !== "darwin") electron.app.quit();
});
