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
    uncompleteTask: (taskId, date) => call('PATCH', `/api/daily-tasks/${taskId}/uncomplete`, { date }),
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
    completeStudy: (itemId, date) => call('PATCH', `/api/study-items/${itemId}/complete`, { date }),
    uncompleteStudy: (itemId, date) => call('PATCH', `/api/study-items/${itemId}/uncomplete`, { date }),

    // Meetings
    getMeetings: (date) =>
      call('GET', date ? `/api/meetings?date=${date}` : '/api/meetings'),
    getUpcomingMeetings: () => call('GET', '/api/meetings/upcoming'),
    createMeeting: (m) => call('POST', '/api/meetings', m),
    updateMeeting: (id, m) => call('PUT', `/api/meetings/${id}`, m),
    deleteMeeting: (id) => call('DELETE', `/api/meetings/${id}`),
    setMeetingAttended: (id, attended) => call('PATCH', `/api/meetings/${id}/attended`, { attended }),

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
    reopenWorkSession: () => call('POST', '/api/session/reopen'),

    // Events
    getEvents: () => call('GET', '/api/events'),
    createEvent: (ev) => call('POST', '/api/events', ev),
    updateEvent: (id, ev) => call('PUT', `/api/events/${id}`, ev),
    deleteEvent: (id) => call('DELETE', `/api/events/${id}`),

    // Projects
    getProjects: () => call('GET', '/api/projects'),
    createProject: (data) => call('POST', '/api/projects', data),
    updateProject: (id, data) => call('PUT', `/api/projects/${id}`, data),
    deleteProject: (id) => call('DELETE', `/api/projects/${id}`),
    getProjectTasks: (projectId) => call('GET', `/api/projects/${projectId}/tasks`),
    createProjectTask: (task) => call('POST', '/api/project-tasks', task),
    updateProjectTask: (id, task) => call('PUT', `/api/project-tasks/${id}`, task),
    deleteProjectTask: (id) => call('DELETE', `/api/project-tasks/${id}`),
    exportProjectPDF: () => Promise.resolve({ error: 'PDF export only available in desktop app' }),
    exportProjectExcel: () => Promise.resolve({ error: 'Excel export only available in desktop app' }),

    // Settings
    getSetting: (key) => call('GET', `/api/settings/${key}`),
    setSetting: (key, value) => call('PUT', `/api/settings/${key}`, { value }),

    // Reports
    getDayDetail: (date) => call('GET', `/api/reports/day/${date}`),
    getDailySummary: (date) => call('GET', `/api/reports/daily-summary/${date}`),
    getMonthlySummary: (year, month) =>
      call('GET', `/api/reports/monthly-summary/${year}/${month}`),
    getWeeklyReport: (start, end) =>
      call('GET', `/api/reports/weekly?start=${start}&end=${end}`),
  }
})()
