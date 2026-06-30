import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import * as dotenv from 'dotenv'
import { initDb, execute } from '../src/db/database'
import { registerIpcHandlers } from '../src/db/ipcHandlers'
import { startScheduler, stopScheduler } from './scheduler'

dotenv.config()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuiting = false

function getTrayIconPath(): string {
  if (process.env.NODE_ENV === 'development') {
    return join(__dirname, '../../build/icon.ico')
  }
  return join(__dirname, '../dist/icon.ico')
}

function showWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createTray() {
  const icon = nativeImage.createFromPath(getTrayIconPath())
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📋 Mở Schedule Assistant',
      click: showWindow,
    },
    { type: 'separator' },
    {
      label: 'Thoát hoàn toàn',
      click: () => {
        isQuiting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('Schedule Assistant — chạy nền')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', showWindow)
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
      webSecurity: false,
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

  // Đóng cửa sổ → ẩn vào tray, KHÔNG thoát app
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault()
      mainWindow?.hide()
      tray?.displayBalloon({
        title: 'Schedule Assistant',
        content: 'Vẫn đang chạy nền. Double-click vào icon dưới taskbar để mở lại.',
      })
    }
  })
}

// Xử lý deep link scheduleapp://complete?task_id=X&date=YYYY-MM-DD
function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'complete') {
      const taskId = parseInt(parsed.searchParams.get('task_id') ?? '0')
      const date = parsed.searchParams.get('date') ?? ''
      if (taskId && date) {
        execute(
          `UPDATE daily_task_logs SET completed_at = datetime('now')
           WHERE task_id = ? AND log_date = ? AND completed_at IS NULL`,
          [taskId, date]
        )
        mainWindow?.webContents.send('task:completed', { taskId, date })
      }
    }
  } catch (_) {}
}

app.whenReady().then(async () => {
  await initDb()
  registerIpcHandlers(ipcMain)
  createWindow()
  createTray()

  // Tự chạy cùng Windows (chạy nền khi khởi động máy)
  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })

  startScheduler(mainWindow, showWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  isQuiting = true
})

// Xử lý deep link trên Windows (second-instance)
app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find((arg) => arg.startsWith('scheduleapp://'))
  if (url) handleDeepLink(url)
  showWindow()
})

// Xử lý deep link trên macOS
app.on('open-url', (_event, url) => {
  handleDeepLink(url)
})

app.on('window-all-closed', () => {
  // KHÔNG quit — tray vẫn giữ app sống
  if (process.platform !== 'darwin' && isQuiting) {
    stopScheduler()
    app.quit()
  }
})
