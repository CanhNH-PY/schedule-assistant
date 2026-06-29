# Schedule Assistant — Project Context

## Tổng quan
Ứng dụng quản lý lịch trình cá nhân với 3 tab: **Work**, **Study**, **Unwind**.
Hỗ trợ 2 deployment mode: **Electron desktop app** và **Web app (GreenNode AgentBase)**.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Desktop:** Electron 31 + electron-vite
- **Database:** sql.js (SQLite via WebAssembly) — lưu local file `schedule.db`
- **Web backend:** Express.js (`server/index.js`) — port 8080
- **Build web:** `vite.web.config.js`

## Cấu trúc quan trọng

```
electron/main.ts          # Electron main process entry
electron/preload.ts       # contextBridge — expose electronAPI
electron/scheduler.ts     # Cron jobs, email notifications
src/db/database.ts        # sql.js wrapper (initDb, execute, queryAll, queryOne)
src/db/ipcHandlers.ts     # IPC handlers cho tất cả db operations
src/renderer/components/  # React components (WorkTab, StudyTab, UnwindTab, ...)
src/renderer/public/api-client.js  # Web shim: set window.electronAPI via fetch
server/index.js           # Express REST API (mirror của ipcHandlers, dùng cho web)
```

## Dual Mode Architecture
- **Electron:** renderer gọi `window.electronAPI.xxx()` → IPC → main process → sql.js
- **Web:** `api-client.js` set `window.electronAPI` bằng fetch calls tới Express server
- `api-client.js` chỉ set nếu `window.electronAPI` chưa có (Electron preload ưu tiên)

## Database Schema (sql.js SQLite)
Tables: `daily_tasks`, `daily_task_logs`, `strategic_tasks`, `study_items`,
`work_sessions`, `meetings`, `subtasks`, `vacations`, `events`, `settings`

- `daily_tasks.repeat_type`: `'daily' | 'weekly' | 'monthly' | 'yearly'`
- `daily_tasks.repeat_dates`: lưu `MM-DD` khi `repeat_type='yearly'`
- `events.is_yearly`: 1 = lưu date dạng `MM-DD`, 0 = lưu `YYYY-MM-DD`

## GreenNode Deployment
- **Runtime ID:** `runtime-2f0604db-6ad3-4519-96b9-09f3004861f0`
- **Endpoint:** `https://endpoint-da9309d2-075f-4a6f-9cdc-4bc7016b1d4d.agentbase-runtime.aiplatform.vngcloud.vn`
- **Registry:** `vcr.vngcloud.vn/111480-abp112034`
- **Latest image:** `vcr.vngcloud.vn/111480-abp112034/schedule-assistant:v20260616-2`
- **Flavor:** `runtime-s2-general-2x4`, PUBLIC network, min/max replicas: 1

## GitHub
- **Repo:** https://github.com/CanhNH-PY/schedule-assistant
- **Branch:** main

## Chạy locally

```powershell
# Web version
npm run start:web        # node server/index.js → http://localhost:8080

# Docker
docker run -p 8080:8080 vcr.vngcloud.vn/111480-abp112034/schedule-assistant:v20260616-2

# Electron (QUAN TRỌNG: phải unset ELECTRON_RUN_AS_NODE trước)
$env:ELECTRON_RUN_AS_NODE = $null
npm run dev
```

## Lưu ý quan trọng

### ELECTRON_RUN_AS_NODE
Claude Code CLI set `ELECTRON_RUN_AS_NODE=1` trong môi trường. Biến này khiến
`electron.exe` chạy như plain Node.js → app crash. **Luôn unset trước khi chạy Electron.**

### Deploy lên GreenNode
```bash
# Build image
docker build --platform linux/amd64 -t vcr.vngcloud.vn/111480-abp112034/schedule-assistant:<tag> .

# Login + push
bash .claude/skills/agentbase/scripts/cr.sh credentials docker-login
docker push vcr.vngcloud.vn/111480-abp112034/schedule-assistant:<tag>

# Update runtime
bash .claude/skills/agentbase/scripts/runtime.sh update runtime-2f0604db-6ad3-4519-96b9-09f3004861f0 \
  --image vcr.vngcloud.vn/111480-abp112034/schedule-assistant:<tag> \
  --flavor runtime-s2-general-2x4 --from-cr
```

### Không được làm
- KHÔNG read `.greennode.json` hoặc `.env` trực tiếp — dùng helper scripts
- KHÔNG set `GREENNODE_CLIENT_ID`, `GREENNODE_CLIENT_SECRET`, `GREENNODE_AGENT_IDENTITY`, `GREENNODE_ENDPOINT_URL` trong env file (auto-injected)
- KHÔNG commit `node_modules/electron/dist/electron.exe` lên Git (172MB, vượt limit)

## Features đã implement
- WorkTab: daily tasks, meetings, strategic tasks, work session, subtasks
- StudyTab: study items theo category, progress tracking
- UnwindTab: vacations, events (yearly/one-time), upcoming holidays
- Repeat types: daily, weekly, monthly, **yearly** (dùng `repeat_dates` dạng `MM-DD`)
- Reopen Session: mở lại work session đã complete
- EventSection: personal events với countdown, emoji picker
