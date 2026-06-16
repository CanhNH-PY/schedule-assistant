import { contextBridge, ipcRenderer } from 'electron'

// Expose IPC to renderer qua window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // Daily Tasks
  getDailyTasks: () => ipcRenderer.invoke('db:getDailyTasks'),
  createDailyTask: (task: object) => ipcRenderer.invoke('db:createDailyTask', task),
  completeTask: (taskId: number, date: string) => ipcRenderer.invoke('db:completeTask', taskId, date),
  deleteDailyTask: (id: number) => ipcRenderer.invoke('db:deleteDailyTask', id),

  // Strategic Tasks
  getStrategicTasks: () => ipcRenderer.invoke('db:getStrategicTasks'),
  createStrategicTask: (task: object) => ipcRenderer.invoke('db:createStrategicTask', task),
  updateStrategicProgress: (id: number, progress: number) => ipcRenderer.invoke('db:updateStrategicProgress', id, progress),
  deleteStrategicTask: (id: number) => ipcRenderer.invoke('db:deleteStrategicTask', id),

  // Study Items
  getStudyItems: () => ipcRenderer.invoke('db:getStudyItems'),
  createStudyItem: (item: object) => ipcRenderer.invoke('db:createStudyItem', item),
  updateStudyProgress: (id: number, progress: number) => ipcRenderer.invoke('db:updateStudyProgress', id, progress),
  updateStudyItem: (id: number, item: object) => ipcRenderer.invoke('db:updateStudyItem', id, item),
  deleteStudyItem: (id: number) => ipcRenderer.invoke('db:deleteStudyItem', id),

  // Daily Task edit
  updateDailyTask: (id: number, task: object) => ipcRenderer.invoke('db:updateDailyTask', id, task),

  // Strategic Task edit
  updateStrategicTask: (id: number, task: object) => ipcRenderer.invoke('db:updateStrategicTask', id, task),

  // Meetings
  getMeetings: (date?: string) => ipcRenderer.invoke('db:getMeetings', date),
  getUpcomingMeetings: () => ipcRenderer.invoke('db:getUpcomingMeetings'),
  createMeeting: (m: object) => ipcRenderer.invoke('db:createMeeting', m),
  updateMeeting: (id: number, m: object) => ipcRenderer.invoke('db:updateMeeting', id, m),
  deleteMeeting: (id: number) => ipcRenderer.invoke('db:deleteMeeting', id),

  // Subtasks
  getSubtasks: (parentType: string, parentId: number) => ipcRenderer.invoke('db:getSubtasks', parentType, parentId),
  createSubtask: (parentType: string, parentId: number, title: string) => ipcRenderer.invoke('db:createSubtask', parentType, parentId, title),
  toggleSubtask: (id: number) => ipcRenderer.invoke('db:toggleSubtask', id),
  deleteSubtask: (id: number) => ipcRenderer.invoke('db:deleteSubtask', id),

  // Vacations
  getVacations: () => ipcRenderer.invoke('db:getVacations'),
  createVacation: (v: object) => ipcRenderer.invoke('db:createVacation', v),
  updateVacation: (id: number, v: object) => ipcRenderer.invoke('db:updateVacation', id, v),
  deleteVacation: (id: number) => ipcRenderer.invoke('db:deleteVacation', id),

  // Work Session
  getTodaySession: () => ipcRenderer.invoke('db:getTodaySession'),
  endWorkSession: () => ipcRenderer.invoke('db:endWorkSession'),
  reopenWorkSession: () => ipcRenderer.invoke('db:reopenWorkSession'),

  // Events
  getEvents: () => ipcRenderer.invoke('db:getEvents'),
  createEvent: (ev: object) => ipcRenderer.invoke('db:createEvent', ev),
  updateEvent: (id: number, ev: object) => ipcRenderer.invoke('db:updateEvent', id, ev),
  deleteEvent: (id: number) => ipcRenderer.invoke('db:deleteEvent', id),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),

  // Day detail
  getDayDetail: (date: string) => ipcRenderer.invoke('db:getDayDetail', date),

  // Time summary
  getDailySummary: (date: string) => ipcRenderer.invoke('db:getDailySummary', date),
  getMonthlySummary: (year: number, month: number) => ipcRenderer.invoke('db:getMonthlySummary', year, month),
})
