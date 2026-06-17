# Schedule Assistant

> Ứng dụng quản lý lịch trình cá nhân toàn diện — Work, Study, Unwind

[![GreenNode AgentBase](https://img.shields.io/badge/Deployed%20on-GreenNode%20AgentBase-blue)](https://endpoint-da9309d2-075f-4a6f-9cdc-4bc7016b1d4d.agentbase-runtime.aiplatform.vngcloud.vn)

## Demo

**Web App (GreenNode AgentBase):**
👉 https://endpoint-da9309d2-075f-4a6f-9cdc-4bc7016b1d4d.agentbase-runtime.aiplatform.vngcloud.vn

---

## Tính năng

### Work Tab — Quản lý công việc hằng ngày
- Tạo task với lịch lặp linh hoạt: **Daily / Weekly / Monthly / Yearly**
- Theo dõi tiến độ hoàn thành từng ngày
- Ghi nhận giờ làm việc (Work Session) — bắt đầu/kết thúc/mở lại
- Lên lịch họp (Meeting) và nhắc nhở qua notification + email
- Quản lý subtask cho từng công việc

### Study Tab — Kế hoạch học tập
- Phân loại theo danh mục: Chuyên môn / Ngoại ngữ / Khác
- Theo dõi % tiến độ từng mục
- Lên lịch nhắc nhở học định kỳ (theo ngày trong tuần)

### Unwind Tab — Cân bằng cuộc sống
- Lên kế hoạch nghỉ phép / du lịch với emoji và ghi chú
- Sự kiện cá nhân quan trọng: sinh nhật, kỷ niệm (lặp hằng năm hoặc một lần)
- Countdown đến sự kiện tiếp theo
- Xem lịch nghỉ lễ Việt Nam sắp tới

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Desktop | Electron 31 |
| Database | sql.js (SQLite via WebAssembly) |
| Web Backend | Express.js (Node.js) |
| Build | electron-vite + Vite |
| Deployment | GreenNode AgentBase (Docker) |
| Container Registry | GreenNode Container Registry |

---

## Kiến trúc

```
schedule-assistant/
├── electron/           # Electron main process
│   ├── main.ts         # App entry point
│   ├── preload.ts      # Context bridge (IPC)
│   └── scheduler.ts    # Cron jobs & notifications
├── src/
│   ├── db/
│   │   ├── database.ts     # sql.js SQLite wrapper
│   │   └── ipcHandlers.ts  # IPC event handlers
│   ├── renderer/           # React frontend
│   │   ├── components/
│   │   │   ├── WorkTab.tsx
│   │   │   ├── StudyTab.tsx
│   │   │   ├── UnwindTab.tsx
│   │   │   ├── EventSection.tsx
│   │   │   └── ...
│   │   └── public/
│   │       └── api-client.js  # Web API shim
│   └── types/index.ts
├── server/
│   └── index.js        # Express web server (GreenNode deployment)
├── Dockerfile
└── vite.web.config.js  # Web-only build config
```

**Dual deployment strategy:**
- **Desktop (Electron):** IPC calls giữa renderer và main process qua contextBridge
- **Web (GreenNode):** Fetch API calls tới Express REST server, `api-client.js` shim tự động chọn đúng mode

---

## Chạy locally

### Web version (Docker)

```bash
docker run -p 8080:8080 vcr.vngcloud.vn/111480-abp112034/schedule-assistant:v20260616-2
```

Mở trình duyệt: http://localhost:8080

### Web version (Node.js)

```bash
npm install
npm run start:web
```

Mở trình duyệt: http://localhost:8080

### Desktop version (Electron)

```bash
npm install
npm run dev
```

> **Lưu ý Windows:** Nếu dùng terminal có `ELECTRON_RUN_AS_NODE=1` (e.g. Claude Code), cần unset trước: `$env:ELECTRON_RUN_AS_NODE = $null`

---

## Build & Deploy

### Build web image

```bash
npm run build:web
docker build --platform linux/amd64 -t schedule-assistant:latest .
```

### Deploy lên GreenNode AgentBase

```bash
# Login registry
bash .claude/skills/agentbase/scripts/cr.sh credentials docker-login

# Push image
docker push vcr.vngcloud.vn/<repo>/schedule-assistant:<tag>

# Update runtime
bash .claude/skills/agentbase/scripts/runtime.sh update <runtime-id> \
  --image vcr.vngcloud.vn/<repo>/schedule-assistant:<tag> \
  --from-cr
```

---

## Database

Dùng **sql.js** (SQLite compiled to WebAssembly) — không cần cài đặt database ngoài.

- **Desktop:** Lưu file `schedule.db` tại `userData` directory của máy
- **Web/Docker:** Lưu tại `/data/schedule.db` trong container

**Tables:** `daily_tasks`, `daily_task_logs`, `strategic_tasks`, `study_items`, `work_sessions`, `meetings`, `subtasks`, `vacations`, `events`, `settings`

---

## Tác giả

**CanhNH-PY** — Built for GreenNode AgentBase Competition
