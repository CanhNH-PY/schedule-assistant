import { useEffect, useState, useCallback } from 'react'
import { IconCheckCircle, IconCalendar, IconClock, IconTarget, IconChevronDown, IconChevronUp } from './Icons'

const api = (window as any).electronAPI

function pad(n: number) { return String(n).padStart(2, '0') }
function todayStr() { return new Date().toISOString().slice(0, 10) }

function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const start = mon.toISOString().slice(0, 10)
  const end   = sun.toISOString().slice(0, 10)
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return { start, end, days }
}

function formatDur(min: number) {
  if (!min) return '0m'
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

function dayLabel(dateStr: string) {
  const today = todayStr()
  const tomorrow = tomorrowStr()
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function priorityDot(p: string) {
  if (p === 'high')   return '#EF4444'
  if (p === 'medium') return '#F59E0B'
  return '#22C55E'
}

// ── Tomorrow Panel ─────────────────────────────────────────────────────────────
function TomorrowPanel({ refreshKey }: { refreshKey: number }) {
  const [data, setData]         = useState<any>(null)
  const [strategic, setStrategic] = useState<any[]>([])
  const [localProgress, setLocalProgress] = useState<Record<number, number>>({})
  const [loading, setLoading]   = useState(true)
  const tomorrow = tomorrowStr()

  const load = useCallback(async () => {
    setLoading(true)
    const [d, strats] = await Promise.all([
      api.getDayDetail(tomorrow),
      api.getStrategicTasks(),
    ])
    setData(d)
    // Show strategic tasks with deadline within 7 days and progress < 100
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 7)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const soon = (strats || []).filter((t: any) => t.deadline && t.deadline <= cutoffStr && t.progress < 100)
    setStrategic(soon)
    const prog: Record<number, number> = {}
    for (const t of (strats || [])) prog[t.id] = t.progress
    setLocalProgress(prog)
    setLoading(false)
  }, [tomorrow])

  useEffect(() => { load() }, [load, refreshKey])

  async function handleProgress(id: number, val: number) {
    setLocalProgress(p => ({ ...p, [id]: val }))
    await api.updateStrategicProgress(id, val)
    window.dispatchEvent(new CustomEvent('schedule-updated'))
    if (val >= 100) setStrategic(p => p.filter(t => t.id !== id))
  }

  if (loading) return (
    <div className="py-8 text-center">
      <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
    </div>
  )

  const tasks: any[]    = data?.tasks || []
  const meetings: any[] = data?.meetings || []
  const tomorrowLabel = new Date(tomorrow + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-3">
      {/* Date badge */}
      <div className="flex items-center gap-2 px-1 mb-1">
        <div className="w-1.5 h-5 rounded-full bg-indigo-500 flex-shrink-0" />
        <p className="text-sm font-semibold text-slate-700">{tomorrowLabel}</p>
      </div>

      {/* Daily tasks tomorrow */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-50">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <IconCheckCircle size={13} className="text-indigo-600" />
          </div>
          <p className="font-semibold text-slate-800 text-sm flex-1">Daily Tasks</p>
          <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg">
            {tasks.length}
          </span>
        </div>
        <div className="px-4 py-3">
          {tasks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No tasks scheduled for tomorrow.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-2.5 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: priorityDot(t.priority) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{t.title}</p>
                    {t.notify_time && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <IconClock size={9} className="text-slate-400" />
                        <span className="text-xs text-slate-400">{t.notify_time}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{t.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Strategic goals — upcoming deadline */}
      {strategic.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-50">
            <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <IconTarget size={13} className="text-violet-600" />
            </div>
            <p className="font-semibold text-slate-800 text-sm flex-1">Goals — upcoming deadline</p>
            <span className="text-xs font-semibold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-lg">
              {strategic.length}
            </span>
          </div>
          <div className="px-4 py-3 space-y-3">
            {strategic.map((t: any) => {
              const prog = localProgress[t.id] ?? t.progress
              const daysLeft = Math.ceil((new Date(t.deadline + 'T00:00:00').getTime() - Date.now()) / 86400000)
              const overdue  = daysLeft < 0
              return (
                <div key={t.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-medium text-slate-700 flex-1 truncate">{t.title}</p>
                    <span className={'text-xs font-semibold px-1.5 py-0.5 rounded-lg flex-shrink-0 ' + (overdue ? 'bg-red-50 text-red-500' : daysLeft <= 2 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500')}>
                      {overdue ? 'Overdue' : daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                    </span>
                    <span className="text-sm font-bold text-violet-600 flex-shrink-0">{prog}%</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-1.5 mb-1.5">
                    <div className="h-1.5 rounded-full transition-all bg-violet-500" style={{ width: prog + '%' }} />
                  </div>
                  <input
                    type="range" min={0} max={100} value={prog}
                    onChange={e => handleProgress(t.id, Number(e.target.value))}
                    className="w-full accent-violet-500 h-1"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Meetings tomorrow */}
      {meetings.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-50">
            <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <IconCalendar size={13} className="text-violet-600" />
            </div>
            <p className="font-semibold text-slate-800 text-sm flex-1">Meetings</p>
            <span className="text-xs font-semibold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-lg">
              {meetings.length}
            </span>
          </div>
          <div className="px-4 py-3 space-y-2">
            {meetings.map((m: any) => (
              <div key={m.id} className="flex items-start gap-2.5 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{m.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <IconClock size={9} className="text-slate-400" />
                    <p className="text-xs text-slate-400">{m.start_time} – {m.end_time}</p>
                    {m.location && <span className="text-xs text-slate-400 truncate">· {m.location}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Weekly Overview ────────────────────────────────────────────────────────────
function WeeklyOverview({ refreshKey }: { refreshKey: number }) {
  const [weekData, setWeekData]     = useState<any>(null)
  const [strategic, setStrategic]   = useState<any[]>([])
  const [localProgress, setLocalProgress] = useState<Record<number, number>>({})
  const [dayDetails, setDayDetails] = useState<Record<string, any>>({})
  const [loading, setLoading]       = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const { start, end, days } = getWeekRange()
  const today = todayStr()

  const load = useCallback(async () => {
    setLoading(true)
    const [wd, strats] = await Promise.all([
      api.getWeeklyReport(start, end),
      api.getStrategicTasks(),
    ])
    setWeekData(wd)
    const active = (strats || []).filter((t: any) => t.progress < 100)
    setStrategic(active)
    const prog: Record<number, number> = {}
    for (const t of (strats || [])) prog[t.id] = t.progress
    setLocalProgress(prog)
    setDayDetails({})
    setLoading(false)
  }, [start, end])

  useEffect(() => { load() }, [load, refreshKey])

  async function handleProgress(id: number, val: number) {
    setLocalProgress(p => ({ ...p, [id]: val }))
    await api.updateStrategicProgress(id, val)
    window.dispatchEvent(new CustomEvent('schedule-updated'))
    if (val >= 100) setStrategic(p => p.filter(t => t.id !== id))
  }

  async function toggleDay(dateStr: string) {
    if (expandedDay === dateStr) { setExpandedDay(null); return }
    setExpandedDay(dateStr)
    if (!dayDetails[dateStr]) {
      const d = await api.getDayDetail(dateStr)
      setDayDetails(p => ({ ...p, [dateStr]: d }))
    }
  }

  if (loading) return (
    <div className="py-8 text-center">
      <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
    </div>
  )

  const completionMap: Record<string, number> = {}
  const sessionMap: Record<string, any>       = {}
  const meetingMap: Record<string, { total: number; attended: number }> = {}

  for (const c of (weekData?.completions || [])) completionMap[c.log_date] = Number(c.done)
  for (const s of (weekData?.sessions   || [])) sessionMap[s.session_date] = s
  for (const m of (weekData?.meetings   || [])) meetingMap[m.date] = { total: Number(m.total), attended: Number(m.attended) }

  const pastDays   = days.filter(d => d <= today)
  const weekDone   = pastDays.reduce((s, d) => s + (completionMap[d] || 0), 0)
  const weekMinutes = days.reduce((s, d) => s + (sessionMap[d]?.total_minutes || 0), 0)
  const workDays   = days.filter(d => sessionMap[d]?.end_time).length

  // Group strategic by deadline proximity
  const thisWeek = strategic.filter(t => t.deadline && t.deadline <= end)
  const nextWeek = strategic.filter(t => !t.deadline || t.deadline > end)

  return (
    <div className="space-y-3">
      {/* Weekly summary */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-4 text-white">
        <p className="text-white/60 text-xs font-semibold tracking-wide uppercase mb-3">This Week</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold">{weekDone}</p>
            <p className="text-white/60 text-xs mt-0.5">Tasks Done</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold">{workDays}</p>
            <p className="text-white/60 text-xs mt-0.5">Work Days</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold">{formatDur(weekMinutes)}</p>
            <p className="text-white/60 text-xs mt-0.5">Total Time</p>
          </div>
        </div>
      </div>

      {/* Day-by-day — daily tasks */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <p className="font-semibold text-slate-800 text-sm">Daily Tasks</p>
          <p className="text-xs text-slate-400 mt-0.5">Tap a day to see details</p>
        </div>
        <div className="divide-y divide-slate-50">
          {days.map((dateStr) => {
            const isFuture   = dateStr > today
            const isToday    = dateStr === today
            const done       = completionMap[dateStr] || 0
            const sess       = sessionMap[dateStr]
            const mtg        = meetingMap[dateStr]
            const isExpanded = expandedDay === dateStr
            const detail     = dayDetails[dateStr]

            const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
            const dayNum  = new Date(dateStr + 'T00:00:00').getDate()

            return (
              <div key={dateStr}>
                <button
                  onClick={() => !isFuture && toggleDay(dateStr)}
                  disabled={isFuture}
                  className={'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ' + (
                    isToday ? 'bg-indigo-50/60' : isFuture ? 'opacity-35 cursor-default' : 'hover:bg-slate-50'
                  )}
                >
                  <div className={'w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ' + (isToday ? 'bg-indigo-600' : 'bg-slate-100')}>
                    <span className={'text-xs font-semibold leading-none ' + (isToday ? 'text-white/70' : 'text-slate-400')}>{dayName}</span>
                    <span className={'text-sm font-bold leading-tight ' + (isToday ? 'text-white' : 'text-slate-700')}>{dayNum}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={'text-xs font-semibold ' + (isToday ? 'text-indigo-700' : 'text-slate-600')}>
                        {isToday ? 'Today' : isFuture ? dayName : dayLabel(dateStr)}
                      </p>
                      {mtg && (
                        <span className="text-xs text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-lg font-medium">
                          {mtg.total} mtg
                        </span>
                      )}
                    </div>
                    {!isFuture && done > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">{done} tasks completed</p>
                    )}
                    {isFuture && (
                      <p className="text-xs text-slate-400 mt-0.5">Upcoming</p>
                    )}
                  </div>

                  {sess?.total_minutes > 0 && (
                    <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg font-semibold flex-shrink-0">
                      {formatDur(sess.total_minutes)}
                    </span>
                  )}
                  {!isFuture && (
                    isExpanded
                      ? <IconChevronUp size={14} className="text-slate-300 flex-shrink-0" />
                      : <IconChevronDown size={14} className="text-slate-300 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 pt-0 bg-slate-50/60 border-t border-slate-100">
                    {!detail ? (
                      <div className="py-3 text-center">
                        <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-2">
                        {(detail.tasks || []).length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-2">No tasks found.</p>
                        ) : (
                          (detail.tasks || []).map((t: any) => (
                            <div key={t.id} className={'flex items-center gap-2 py-1.5 px-2.5 rounded-xl ' + (t.completed_at ? 'bg-emerald-50' : 'bg-white border border-slate-100')}>
                              <div className={'w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ' + (t.completed_at ? 'bg-emerald-500' : 'border-2 border-slate-200')}>
                                {t.completed_at && <IconCheckCircle size={9} className="text-white" />}
                              </div>
                              <span className={'flex-1 text-xs font-medium truncate ' + (t.completed_at ? 'text-emerald-700' : 'text-slate-600')}>
                                {t.title}
                              </span>
                              {t.completed_at && (
                                <span className="text-xs text-emerald-500 font-medium flex-shrink-0">
                                  {String(t.completed_at).slice(11, 16)}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Strategic goals — this week deadline */}
      {(thisWeek.length > 0 || nextWeek.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="font-semibold text-slate-800 text-sm">Strategic Goals</p>
            <p className="text-xs text-slate-400 mt-0.5">Progress syncs with WORK tab</p>
          </div>
          <div className="px-4 py-3 space-y-4">
            {thisWeek.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Due this week</p>
                <div className="space-y-3">
                  {thisWeek.map((t: any) => {
                    const prog = localProgress[t.id] ?? t.progress
                    const daysLeft = Math.ceil((new Date(t.deadline + 'T00:00:00').getTime() - Date.now()) / 86400000)
                    return (
                      <div key={t.id}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          <p className="text-sm font-medium text-slate-700 flex-1 truncate">{t.title}</p>
                          <span className={'text-xs font-semibold px-1.5 py-0.5 rounded-lg ' + (daysLeft < 0 ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600')}>
                            {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                          </span>
                          <span className="text-sm font-bold text-violet-600 flex-shrink-0 w-9 text-right">{prog}%</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-1.5 mb-1.5">
                          <div className="h-1.5 rounded-full transition-all bg-violet-500" style={{ width: prog + '%' }} />
                        </div>
                        <input type="range" min={0} max={100} value={prog}
                          onChange={e => handleProgress(t.id, Number(e.target.value))}
                          className="w-full accent-violet-500 h-1" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {nextWeek.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">In progress</p>
                <div className="space-y-3">
                  {nextWeek.map((t: any) => {
                    const prog = localProgress[t.id] ?? t.progress
                    return (
                      <div key={t.id}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-300 flex-shrink-0" />
                          <p className="text-sm font-medium text-slate-700 flex-1 truncate">{t.title}</p>
                          <span className="text-sm font-bold text-violet-600 flex-shrink-0 w-9 text-right">{prog}%</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-1.5 mb-1.5">
                          <div className="h-1.5 rounded-full transition-all bg-violet-400" style={{ width: prog + '%' }} />
                        </div>
                        <input type="range" min={0} max={100} value={prog}
                          onChange={e => handleProgress(t.id, Number(e.target.value))}
                          className="w-full accent-violet-500 h-1" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function NotificationTab() {
  const [view, setView]         = useState<'tomorrow' | 'week'>('tomorrow')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1)
    window.addEventListener('schedule-updated', handler)
    return () => window.removeEventListener('schedule-updated', handler)
  }, [])

  return (
    <div className="space-y-3">
      {/* View switcher */}
      <div className="flex bg-white rounded-2xl border border-slate-100 p-1 shadow-sm">
        {([
          { key: 'tomorrow', label: 'Tomorrow' },
          { key: 'week',     label: 'This Week' },
        ] as const).map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className={'flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ' +
              (view === v.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
            {v.label}
          </button>
        ))}
      </div>

      {view === 'tomorrow'
        ? <TomorrowPanel refreshKey={refreshKey} />
        : <WeeklyOverview refreshKey={refreshKey} />}
    </div>
  )
}
