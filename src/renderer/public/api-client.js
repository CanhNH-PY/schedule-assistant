;(function () {
  // Skip if Electron preload already set this up
  if (window.electronAPI) return

  async function call(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } }
    if (body !== undefined) opts.body = JSON.stringify(body)
    const res = await fetch(url, opts)
    return res.json()
  }

  window.electronAPI = {
    // Daily Tasks
    getDailyTasks: () => call('GET', '/api/daily-tasks'),
    createDailyTask: (task) => call('POST', '/api/daily-tasks', task),
    completeTask: (taskId, date) => call('PATCH', `/api/daily-tasks/${taskId}/complete`, { date }),
    updateDailyTask: (id, task) => call('PUT', `/api/daily-tasks/${id}`, task),
    deleteDailyTask: (id) => call('DELETE', `/api/daily-tasks/${id}`),

    // Strategic Tasks
    getStrategicTasks: () => call('GET', '/api/strategic-tasks'),
    createStrategicTask: (task) => call('POST', '/api/strategic-tasks', task),
    updateStrategicProgress: (id, progress) => call('PUT', `/api/strategic-tasks/${id}/progress`, { progress }),
    updateStrategicTask: (id, task) => call('PUT', `/api/strategic-tasks/${id}`, task),
    deleteStrategicTask: (id) => call('DELETE', `/api/strategic-tasks/${id}`),

    // Study Items
    getStudyItems: () => call('GET', '/api/study-items'),
    createStudyItem: (item) => call('POST', '/api/study-items', item),
    updateStudyProgress: (id, progress) => call('PUT', `/api/study-items/${id}/progress`, { progress }),
    updateStudyItem: (id, item) => call('PUT', `/api/study-items/${id}`, item),
    deleteStudyItem: (id) => call('DELETE', `/api/study-items/${id}`),

    // Meetings
    getMeetings: (date) =>
      call('GET', date ? `/api/meetings?date=${date}` : '/api/meetings'),
    getUpcomingMeetings: () => call('GET', '/api/meetings/upcoming'),
    createMeeting: (m) => call('POST', '/api/meetings', m),
    updateMeeting: (id, m) => call('PUT', `/api/meetings/${id}`, m),
    deleteMeeting: (id) => call('DELETE', `/api/meetings/${id}`),

    // Subtasks
    getSubtasks: (parentType, parentId) =>
      call('GET', `/api/subtasks/${parentType}/${parentId}`),
    createSubtask: (parentType, parentId, title) =>
      call('POST', '/api/subtasks', { parentType, parentId, title }),
    toggleSubtask: (id) => call('PATCH', `/api/subtasks/${id}/toggle`),
    deleteSubtask: (id) => call('DELETE', `/api/subtasks/${id}`),

    // Vacations
    getVacations: () => call('GET', '/api/vacations'),
    createVacation: (v) => call('POST', '/api/vacations', v),
    updateVacation: (id, v) => call('PUT', `/api/vacations/${id}`, v),
    deleteVacation: (id) => call('DELETE', `/api/vacations/${id}`),

    // Work Session
    getTodaySession: () => call('GET', '/api/session/today'),
    endWorkSession: () => call('POST', '/api/session/end'),

    // Settings
    getSetting: (key) => call('GET', `/api/settings/${key}`),
    setSetting: (key, value) => call('PUT', `/api/settings/${key}`, { value }),

    // Reports
    getDayDetail: (date) => call('GET', `/api/reports/day/${date}`),
    getDailySummary: (date) => call('GET', `/api/reports/daily-summary/${date}`),
    getMonthlySummary: (year, month) =>
      call('GET', `/api/reports/monthly-summary/${year}/${month}`),
  }
})()
