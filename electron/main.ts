import { app, BrowserWindow, ipcMain, protocol, Notification } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import * as dotenv from 'dotenv'
import { initDb, getDb } from '../src/db/database'
import { registerIpcHandlers } from '../src/db/ipcHandlers'
import { startScheduler, stopScheduler } from './scheduler'

dotenv.config()

let mainWindow: BrowserWindow | null = null

// Đăng ký deep link protocol scheduleapp://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('scheduleapp', process.execPath, [process.argv[1]])
  }
} else {
  app.setAsDefaultProtocolClient('scheduleapp')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // cần cho iframe MSN Weather
    },
    titleBarStyle: 'default',
    title: 'Schedule Assistant',
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

// Xử lý deep link scheduleapp://complete?task_id=X&date=YYYY-MM-DD
function handleDeepLink(url: string) {
  const parsed = new URL(url)
  if (parsed.hostname === 'complete') {
    const taskId = parseInt(parsed.searchParams.get('task_id') ?? '0')
    const date = parsed.searchParams.get('date') ?? ''
    if (taskId && date) {
      const db = getDb()
      db.prepare(`
        UPDATE daily_task_logs SET completed_at = datetime('now')
        WHERE task_id = ? AND log_date = ? AND completed_at IS NULL
      `).run(taskId, date)
      mainWindow?.webContents.send('task:completed', { taskId, date })
    }
  }
}

app.whenReady().then(async () => {
  // Khởi tạo database (async vì sql.js dùng WebAssembly)
  await initDb()

  // Đăng ký IPC handlers
  registerIpcHandlers(ipcMain)

  createWindow()

  // Khởi động scheduler (cron jobs)
  startScheduler(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Xử lý deep link trên Windows (second-instance)
app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find((arg) => arg.startsWith('scheduleapp://'))
  if (url) handleDeepLink(url)
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Xử lý deep link trên macOS
app.on('open-url', (_event, url) => {
  handleDeepLink(url)
})

app.on('window-all-closed', () => {
  stopScheduler()
  if (process.platform !== 'darwin') app.quit()
})
