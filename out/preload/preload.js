"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Daily Tasks
  getDailyTasks: () => electron.ipcRenderer.invoke("db:getDailyTasks"),
  createDailyTask: (task) => electron.ipcRenderer.invoke("db:createDailyTask", task),
  completeTask: (taskId, date) => electron.ipcRenderer.invoke("db:completeTask", taskId, date),
  deleteDailyTask: (id) => electron.ipcRenderer.invoke("db:deleteDailyTask", id),
  // Strategic Tasks
  getStrategicTasks: () => electron.ipcRenderer.invoke("db:getStrategicTasks"),
  createStrategicTask: (task) => electron.ipcRenderer.invoke("db:createStrategicTask", task),
  updateStrategicProgress: (id, progress) => electron.ipcRenderer.invoke("db:updateStrategicProgress", id, progress),
  deleteStrategicTask: (id) => electron.ipcRenderer.invoke("db:deleteStrategicTask", id),
  // Study Items
  getStudyItems: () => electron.ipcRenderer.invoke("db:getStudyItems"),
  createStudyItem: (item) => electron.ipcRenderer.invoke("db:createStudyItem", item),
  updateStudyProgress: (id, progress) => electron.ipcRenderer.invoke("db:updateStudyProgress", id, progress),
  deleteStudyItem: (id) => electron.ipcRenderer.invoke("db:deleteStudyItem", id),
  // Work Session
  getTodaySession: () => electron.ipcRenderer.invoke("db:getTodaySession"),
  endWorkSession: () => electron.ipcRenderer.invoke("db:endWorkSession"),
  // Settings
  getSetting: (key) => electron.ipcRenderer.invoke("db:getSetting", key),
  setSetting: (key, value) => electron.ipcRenderer.invoke("db:setSetting", key, value),
  // Time summary
  getDailySummary: (date) => electron.ipcRenderer.invoke("db:getDailySummary", date),
  getMonthlySummary: (year, month) => electron.ipcRenderer.invoke("db:getMonthlySummary", year, month)
});
