import { useEffect, useState } from 'react'
import {
  IconX, IconChevronLeft, IconChevronRight,
  IconCheckCircle, IconTimer, IconBook, IconActivity, IconTrophy, IconCalendar, IconClock,
} from './Icons'
import ProjectReport from './ProjectReport'

const api = (window as any).electronAPI

type View = 'daily' | 'weekly' | 'monthly' | 'project'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function pad(n: number) { return String(n).padStart(2, '0') }
function isoDate(y: number, m: number, d: number) { return `${y}-${pad(m)}-${pad(d)}` }
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }
function firstDayOfMonth(y: number, m: number) {
  const d = new Date(y, m - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}
function formatDur(min: number) {
  if (!min) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}
function fmtFullDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function todayStr() { return new Date().toISOString().slice(0, 10) }

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconCheck({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconBarChart({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}
function IconMapPin({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

// ── Day Detail Component ──────────────────────────────────────────────────────
function DayDetail({ date, compact = false }: { date: string; compact?: boolean }) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getDayDetail(date).then((d: any) => { setDetail(d); setLoading(false) })
  }, [date])

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-400 mt-2">Loading...</p>
      </div>
    )
  }

  if (!detail || detail.error) {
    return <p className="text-center text-gray-400 text-sm py-6">No data for this day.</p>
  }

  const tasks: any[]   = detail.tasks || []
  const session: any   = detail.session
  const meetings: any[] = detail.meetings || []
  const studyItems: any[] = detail.studyItems || []

  const doneTasks    = tasks.filter(t => t.completed_at)
  const missedTasks  = tasks.filter(t => !t.completed_at)
  const taskPct      = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0
  const sessionMin   = session?.total_minutes || 0

  const topStudy     = studyItems.filter((i: any) => !i.parent_id)
  const studyAvg     = topStudy.length
    ? Math.round(topStudy.reduce((s: number, p: any) => {
        const ch = studyItems.filter((c: any) => c.parent_id === p.id)
        return s + (ch.length ? ch.reduce((a: number, c: any) => a + c.progress, 0) / ch.length : p.progress)
      }, 0) / topStudy.length)
    : 0

  // KPI: Meeting attendance
  const attendedMeetings = meetings.filter((m: any) => m.attended === 1).length
  const totalMeetings    = meetings.length
  const meetingKpi       = totalMeetings > 0 ? Math.round((attendedMeetings / totalMeetings) * 100) : 100

  // Score formula (weighted): Tasks 50% + Session 30% (8h=full) + Meetings 20%
  // Study is overall progress (not daily), excluded from day score
  const sessionScore = Math.min(30, Math.round((sessionMin / 480) * 30))
  const meetingScore = totalMeetings > 0 ? Math.round((attendedMeetings / totalMeetings) * 20) : 20
  const score = Math.min(100, Math.round(taskPct * 0.5 + sessionScore + meetingScore))

  const scoreGradient = score >= 85
    ? 'from-emerald-500 to-teal-600'
    : score >= 65
    ? 'from-indigo-500 to-purple-600'
    : score >= 40
    ? 'from-amber-500 to-orange-500'
    : 'from-gray-400 to-gray-500'

  const scoreLabel = score >= 85 ? 'Outstanding!' : score >= 65 ? 'Great work!' : score >= 40 ? 'Good progress.' : 'Keep going!'

  // Study by category
  const cats = [
    { key: 'professional', label: 'Professional', color: '#3B82F6' },
    { key: 'language',     label: 'Language',     color: '#10B981' },
    { key: 'other',        label: 'Other',        color: '#F97316' },
  ]

  return (
    <div className="space-y-3">
      {/* Score card */}
      <div className={'rounded-2xl bg-gradient-to-br ' + scoreGradient + ' p-4 text-white'}>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-center flex-shrink-0">
            <p className="text-5xl font-black leading-none">{score}</p>
            <p className="text-white/60 text-xs mt-0.5">/ 100</p>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">{scoreLabel}</p>
            <p className="text-white/60 text-xs mt-0.5">Performance score for the day</p>
            {/* Score bar */}
            <div className="mt-2 bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: score + '%' }} />
            </div>
          </div>
        </div>
        {/* KPI grid */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-sm font-black text-white">{taskPct}%</p>
            <p className="text-white/60 text-xs leading-tight">Tasks</p>
            <p className="text-white/40" style={{ fontSize: 9 }}>50pts</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-sm font-black text-white">{sessionMin > 0 ? formatDur(sessionMin) : '—'}</p>
            <p className="text-white/60 text-xs leading-tight">Session</p>
            <p className="text-white/40" style={{ fontSize: 9 }}>30pts</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-sm font-black text-white">{totalMeetings > 0 ? `${attendedMeetings}/${totalMeetings}` : '—'}</p>
            <p className="text-white/60 text-xs leading-tight">Meetings</p>
            <p className="text-white/40" style={{ fontSize: 9 }}>20pts</p>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <IconCheckCircle size={13} className="text-blue-600" />
          </div>
          <p className="font-bold text-gray-800 text-sm flex-1">Daily Tasks</p>
          <span className="text-xs font-bold text-blue-600">{doneTasks.length}/{tasks.length}</span>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-100 rounded-full h-2 mb-3">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: taskPct + '%' }} />
        </div>

        {tasks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No tasks configured.</p>
        ) : (
          <div className="space-y-1.5">
            {/* Done */}
            {doneTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 py-1 px-2 bg-emerald-50 rounded-lg">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <IconCheck size={9} className="text-white" />
                </div>
                <span className="flex-1 text-xs text-gray-700 truncate font-medium">{t.title}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {t.completed_at && (
                    <span className="text-xs text-emerald-500 font-semibold">
                      {String(t.completed_at).slice(11, 16)}
                    </span>
                  )}
                  <span className={'text-xs px-1.5 py-0.5 rounded font-semibold ' +
                    (t.priority === 'high' ? 'bg-red-100 text-red-600' :
                     t.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500')}>
                    {t.priority}
                  </span>
                </div>
              </div>
            ))}
            {/* Missed */}
            {missedTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 py-1 px-2 rounded-lg opacity-50">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                <span className="flex-1 text-xs text-gray-400 truncate line-through">{t.title}</span>
                <span className="text-xs text-gray-300 flex-shrink-0">{t.notify_time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Work Session */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <IconTimer size={13} className="text-orange-600" />
          </div>
          <p className="font-bold text-gray-800 text-sm flex-1">Work Session</p>
          {sessionMin > 0 && (
            <span className="text-xs font-bold text-orange-600">{formatDur(sessionMin)}</span>
          )}
        </div>
        {session ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-xs text-gray-400 mb-0.5">Start</p>
              <p className="text-sm font-black text-gray-800">{session.start_time}</p>
            </div>
            <div className={'rounded-xl p-2.5 ' + (session.end_time ? 'bg-gray-50' : 'bg-blue-50')}>
              <p className={'text-xs mb-0.5 ' + (session.end_time ? 'text-gray-400' : 'text-blue-400')}>
                {session.end_time ? 'End' : 'Ongoing'}
              </p>
              <p className={'text-sm font-black ' + (session.end_time ? 'text-gray-800' : 'text-blue-600')}>
                {session.end_time || '…'}
              </p>
            </div>
            <div className="bg-orange-50 rounded-xl p-2.5">
              <p className="text-xs text-orange-400 mb-0.5">Duration</p>
              <p className="text-sm font-black text-orange-600">{formatDur(sessionMin)}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-3">No session recorded.</p>
        )}
      </div>

      {/* Meetings */}
      {meetings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <IconCalendar size={13} className="text-violet-600" />
            </div>
            <p className="font-bold text-gray-800 text-sm flex-1">Meetings</p>
            <span className="text-xs text-violet-500 font-bold">
              {attendedMeetings}/{totalMeetings} attended · {meetingKpi}%
            </span>
          </div>
          <div className="space-y-2">
            {meetings.map((m: any) => (
              <div key={m.id} className={'p-2.5 rounded-xl border ' + (
                m.attended === 1 ? 'bg-emerald-50 border-emerald-100' :
                m.attended === 0 ? 'bg-red-50 border-red-100' :
                'bg-violet-50 border-violet-100'
              )}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">{m.title}</p>
                      {m.attended === 1 && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">✓ Attended</span>}
                      {m.attended === 0 && <span className="text-xs font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">✗ Skipped</span>}
                      {m.attended === null && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Unconfirmed</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <IconClock size={10} className="text-violet-400" />
                      <p className="text-xs text-violet-600 font-medium">{m.start_time} – {m.end_time}</p>
                    </div>
                    {m.location && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <IconMapPin size={10} className="text-gray-400" />
                        <p className="text-xs text-gray-400 truncate">{m.location}</p>
                      </div>
                    )}
                    {m.participants && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">👥 {m.participants}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Progress */}
      {topStudy.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <IconBook size={13} className="text-emerald-600" />
            </div>
            <p className="font-bold text-gray-800 text-sm flex-1">Study Progress <span className="font-normal text-gray-400 text-xs">(overall)</span></p>
            <span className="text-xs font-bold text-emerald-600">{studyAvg}% avg</span>
          </div>

          {cats.map(cat => {
            const catParents = topStudy.filter((i: any) => i.category === cat.key)
            if (catParents.length === 0) return null
            return (
              <div key={cat.key} className="mb-3 last:mb-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat.label}</p>
                <div className="space-y-2">
                  {catParents.map((parent: any) => {
                    const children = studyItems.filter((c: any) => c.parent_id === parent.id)
                    if (children.length > 0) {
                      // Show parent with children expanded
                      const parentAvg = Math.round(children.reduce((a: number, c: any) => a + c.progress, 0) / children.length)
                      return (
                        <div key={parent.id} className="rounded-xl border border-gray-100 overflow-hidden">
                          {/* Parent row */}
                          <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: cat.color + '10' }}>
                            <p className="text-xs font-bold flex-1" style={{ color: cat.color }}>{parent.title}</p>
                            <span className="text-xs font-black" style={{ color: cat.color }}>{parentAvg}%</span>
                          </div>
                          {/* Children */}
                          <div className="px-3 py-2 space-y-2">
                            {children.map((child: any) => (
                              <div key={child.id}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                  <span className="text-xs text-gray-600 flex-1 truncate">{child.title}</span>
                                  <span className="text-xs font-semibold" style={{ color: cat.color }}>{child.progress}%</span>
                                </div>
                                <div className="bg-gray-100 rounded-full h-1 ml-3">
                                  <div className="h-1 rounded-full transition-all" style={{ width: child.progress + '%', backgroundColor: cat.color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    // Standalone (no children)
                    return (
                      <div key={parent.id}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-700 flex-1 truncate font-medium">{parent.title}</span>
                          <span className="text-xs font-semibold" style={{ color: cat.color }}>{parent.progress}%</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: parent.progress + '%', backgroundColor: cat.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Daily View (with date nav) ────────────────────────────────────────────────
function DailyReport() {
  const [date, setDate] = useState(todayStr())

  function shift(days: number) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + days)
    const next = d.toISOString().slice(0, 10)
    if (next <= todayStr()) setDate(next)
  }

  const isToday = date === todayStr()

  return (
    <div className="p-5 space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-3 py-2.5">
        <button onClick={() => shift(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
          <IconChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-800 text-sm">
            {isToday ? 'Today' : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <button
          onClick={() => shift(1)}
          disabled={isToday}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <IconChevronRight size={16} className="text-gray-600" />
        </button>
      </div>

      <DayDetail date={date} />
    </div>
  )
}

// ── Monthly Report Table (MISA style) ─────────────────────────────────────────
const MONTH_STATUS = {
  excellent: { label: 'Excellent', rowBg: '#E2EFDA', cellBg: '#70AD47', cellText: '#fff' },
  good:      { label: 'Good',      rowBg: '#FFFFC7', cellBg: '#FFD966', cellText: '#333' },
  fair:      { label: 'Fair',      rowBg: '#FCE4D6', cellBg: '#ED7D31', cellText: '#fff' },
  missed:    { label: 'Missed',    rowBg: '#FFDEDE', cellBg: '#FF5252', cellText: '#fff' },
  weekend:   { label: 'Weekend',   rowBg: '#F5F5F5', cellBg: '#BDBDBD', cellText: '#fff' },
  future:    { label: '—',         rowBg: '#FAFAFA', cellBg: '#E0E0E0', cellText: '#999' },
  nodata:    { label: 'No data',   rowBg: '#F9FAFB', cellBg: '#D1D5DB', cellText: '#fff' },
}
const DOW_VN = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật']

function getDayStatus(dateStr: string, today: string, completionMap: Record<string,number>, dailyTaskCounts: Record<string,number>, sessionMap: Record<string,any>) {
  const dow = new Date(dateStr+'T00:00:00').getDay() // 0=Sun, 6=Sat
  if (dateStr > today) return 'future'
  if (dow === 0 || dow === 6) return 'weekend'
  const done     = completionMap[dateStr] || 0
  const dayTotal = dailyTaskCounts[dateStr] ?? 0
  if (dayTotal === 0) return 'nodata'
  const pct = (done / dayTotal) * 100
  if (pct >= 100) return 'excellent'
  if (pct >= 50)  return 'good'
  if (pct > 0)    return 'fair'
  return 'missed'
}

// ── Monthly View ──────────────────────────────────────────────────────────────
function MonthlyReport() {
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth() + 1)
  const [monthData, setMonthData] = useState<any>(null)
  const [loadingMonth, setLoadingMonth] = useState(true)
  const [selectedDay, setSelectedDay]   = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'calendar'|'report'>('calendar')

  useEffect(() => { loadMonth() }, [year, month])

  async function loadMonth() {
    setLoadingMonth(true)
    setSelectedDay(null)
    const res = await api.getMonthlySummary(year, month)
    setMonthData(res)
    setLoadingMonth(false)
  }

  function prevMonth() { if (month === 1) { setYear(y=>y-1); setMonth(12) } else setMonth(m=>m-1) }
  function nextMonth() { if (month === 12) { setYear(y=>y+1); setMonth(1) } else setMonth(m=>m+1) }

  const days       = daysInMonth(year, month)
  const firstDow   = firstDayOfMonth(year, month)
  const today      = todayStr()

  const completionMap: Record<string, number> = {}
  const sessionMap:    Record<string, { minutes: number; end: string }> = {}
  const dailyTaskCounts: Record<string, number> = {}

  if (monthData) {
    for (const c of (monthData.dailyCompletions || [])) completionMap[c.log_date] = c.completed
    for (const s of (monthData.sessions || []))          sessionMap[s.session_date] = { minutes: s.total_minutes || 0, end: s.end_time }
    if (monthData.dailyTaskCounts) Object.assign(dailyTaskCounts, monthData.dailyTaskCounts)
  }

  const totalWorkDays = Object.keys(sessionMap).filter(d => sessionMap[d].end).length
  const totalMinutes  = Object.values(sessionMap).reduce((s, v) => s + (v.minutes || 0), 0)
  const totalDone     = Object.values(completionMap).reduce((s, v) => s + v, 0)
  const successDays   = Object.keys(completionMap).filter(d => {
    const dt = dailyTaskCounts[d] ?? 0
    return dt > 0 && (completionMap[d] || 0) >= dt
  }).length

  function dayStyle(dateStr: string) {
    const isPast   = dateStr < today
    const isToday  = dateStr === today
    const isFuture = dateStr > today
    if (isFuture) return { bg: 'bg-gray-50', text: 'text-gray-300', ring: '' }
    const done     = completionMap[dateStr] || 0
    const dayTotal = dailyTaskCounts[dateStr] ?? 0
    const pct      = dayTotal > 0 ? (done / dayTotal) * 100 : 0
    const ring = isToday ? ' ring-2 ring-indigo-400 ring-inset' : ''
    if (dayTotal === 0 || (done === 0 && isPast)) return { bg: 'bg-gray-50', text: 'text-gray-400', ring }
    if (pct >= 100) return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring }
    if (pct >= 50)  return { bg: 'bg-amber-50',   text: 'text-amber-700',   ring }
    return               { bg: 'bg-red-50',     text: 'text-red-600',     ring }
  }

  const selDateStr = selectedDay ? isoDate(year, month, selectedDay) : null

  // Build rows for MISA report table
  const reportRows = Array.from({ length: days }, (_, i) => {
    const day     = i + 1
    const dateStr = isoDate(year, month, day)
    const jsDay   = new Date(dateStr+'T00:00:00').getDay()
    const dowIdx  = jsDay === 0 ? 6 : jsDay - 1
    const done    = completionMap[dateStr] || 0
    const total   = dailyTaskCounts[dateStr] ?? 0
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0
    const sess    = sessionMap[dateStr]
    const status  = getDayStatus(dateStr, today, completionMap, dailyTaskCounts, sessionMap)
    return { day, dateStr, dowIdx, done, total, pct, sess, status }
  })

  // Status counts for summary
  const statusSummary = Object.fromEntries(
    Object.keys(MONTH_STATUS).map(k => [k, reportRows.filter(r => r.status === k).length])
  )

  return (
    <div className="p-5 space-y-4">
      {/* Month nav + view toggle */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
          <IconChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-black text-gray-800 text-xl">{MONTHS[month - 1]}</p>
          <p className="text-xs text-gray-400 font-medium">{year}</p>
        </div>
        <button onClick={nextMonth} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
          <IconChevronRight size={16} className="text-gray-600" />
        </button>
        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          <button onClick={() => setViewMode('calendar')}
            className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (viewMode==='calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            📅 <span>Lịch</span>
          </button>
          <button onClick={() => setViewMode('report')}
            className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (viewMode==='report' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            📊 <span>Report</span>
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
          <p className="text-2xl font-black text-blue-600">{totalDone}</p>
          <p className="text-xs text-blue-400 font-semibold mt-0.5">Tasks Done</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
          <p className="text-2xl font-black text-emerald-600">{successDays}</p>
          <p className="text-xs text-emerald-400 font-semibold mt-0.5">Perfect Days</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
          <p className="text-2xl font-black text-orange-600">{totalWorkDays}</p>
          <p className="text-xs text-orange-400 font-semibold mt-0.5">Work Days</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
          <p className="text-2xl font-black text-purple-600">{formatDur(totalMinutes)}</p>
          <p className="text-xs text-purple-400 font-semibold mt-0.5">Total Time</p>
        </div>
      </div>

      {loadingMonth ? (
        <div className="py-8 text-center">
          <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : viewMode === 'calendar' ? (
        <>
          {/* Calendar grid */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DOW.map(d => (
                <div key={d} className="text-center py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={'e' + i} className="bg-white h-11" />
              ))}
              {Array.from({ length: days }).map((_, i) => {
                const day     = i + 1
                const dateStr = isoDate(year, month, day)
                const style    = dayStyle(dateStr)
                const hasSess  = !!sessionMap[dateStr]
                const isSelected = selectedDay === day
                const done     = completionMap[dateStr] || 0
                const dayTotal = dailyTaskCounts[dateStr] ?? 0

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={'h-11 flex flex-col items-center justify-center gap-0.5 relative transition-all ' + style.bg + style.ring + (isSelected ? ' scale-90' : '')}
                  >
                    <span className={'text-xs font-bold ' + style.text}>{day}</span>
                    {done > 0 && dayTotal > 0 && <span className="text-xs leading-none" style={{ fontSize: 8, color: style.text.includes('emerald') ? '#059669' : style.text.includes('amber') ? '#D97706' : '#DC2626' }}>{done}/{dayTotal}</span>}
                    {hasSess && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-orange-400 rounded-full" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 justify-center flex-wrap">
            {[
              { color: 'bg-emerald-500', label: 'All done' },
              { color: 'bg-amber-400',   label: 'Partial' },
              { color: 'bg-red-400',     label: 'Missed' },
              { color: 'bg-gray-300',    label: 'No data' },
              { color: 'bg-orange-400',  label: 'Session' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <span className={'w-2 h-2 rounded-full ' + l.color} />
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>

          {/* Selected day detail */}
          {selDateStr && (
            <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-indigo-50 flex items-center justify-between"
                style={{ background: 'linear-gradient(to right, #EEF2FF, #F5F3FF)' }}>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{fmtFullDate(selDateStr)}</p>
                  <p className="text-xs text-indigo-400">Full day report</p>
                </div>
                <button onClick={() => setSelectedDay(null)}
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                  <IconX size={13} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <DayDetail date={selDateStr} compact />
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── MISA Report Table ── */
        <>
          {/* Header */}
          <div className="px-4 py-2.5 font-bold text-white text-sm tracking-widest" style={{ background: '#1F3864' }}>
            BÁO CÁO HIỆU SUẤT — THÁNG {String(month).padStart(2,'0')}/{year}
          </div>

          {/* Daily table */}
          <div className="border border-slate-300 overflow-hidden rounded-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead>
                  <tr style={{ background: '#1F3864', color: '#fff' }}>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 w-12">DATE</th>
                    <th className="px-3 py-2 text-left font-bold border-r border-blue-800 w-20">DAY</th>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 w-20">TASKS</th>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 w-16">%</th>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 w-24">WORK TIME</th>
                    <th className="px-3 py-2 text-center font-bold w-24">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map(({ day, dateStr, dowIdx, done, total, pct, sess, status }) => {
                    const s = MONTH_STATUS[status as keyof typeof MONTH_STATUS]
                    const isToday = dateStr === today
                    return (
                      <tr key={day} style={{ background: s.rowBg }}
                        className={'border-b border-slate-200' + (isToday ? ' outline outline-2 outline-indigo-400 outline-offset-[-2px]' : '')}>
                        <td className="px-3 py-1.5 text-center border-r border-slate-200 font-bold text-slate-700">
                          {String(day).padStart(2,'0')}/{String(month).padStart(2,'0')}
                        </td>
                        <td className="px-3 py-1.5 border-r border-slate-200 text-slate-600">{DOW_VN[dowIdx]}</td>
                        <td className="px-3 py-1.5 text-center border-r border-slate-200 font-medium text-slate-700">
                          {total > 0 ? `${done}/${total}` : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-center border-r border-slate-200">
                          {total > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 bg-white/60 rounded-full h-1.5 border border-slate-200">
                                <div className="h-1.5 rounded-full" style={{ width: pct+'%', background: s.cellBg }} />
                              </div>
                              <span className="font-bold w-7 text-right" style={{ color: s.cellBg }}>{pct}%</span>
                            </div>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-center border-r border-slate-200 text-slate-600">
                          {sess?.end ? formatDur(sess.minutes) : sess ? <span className="text-blue-500">ongoing</span> : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-xs"
                            style={{ background: s.cellBg, color: s.cellText }}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* Status breakdown */}
            <div className="border border-slate-300 overflow-hidden rounded-sm">
              <div className="px-3 py-2 font-bold text-slate-800 uppercase tracking-wide text-xs" style={{ background: '#D9E1F2' }}>
                TÌNH TRẠNG NGÀY TRONG THÁNG
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: '#1F3864', color: '#fff' }}>
                    <th className="px-3 py-1.5 text-left font-bold border-r border-blue-800">STATUS</th>
                    <th className="px-3 py-1.5 text-center font-bold border-r border-blue-800 w-14">COUNT</th>
                    <th className="px-3 py-1.5 text-center font-bold w-12">%</th>
                  </tr>
                </thead>
                <tbody>
                  {(['excellent','good','fair','missed','nodata'] as const).map(k => {
                    const s = MONTH_STATUS[k]
                    const cnt = statusSummary[k] || 0
                    const workdays = reportRows.filter(r => r.status !== 'weekend' && r.status !== 'future').length
                    return (
                      <tr key={k} style={{ background: s.rowBg }} className="border-b border-slate-200">
                        <td className="px-3 py-1.5 border-r border-slate-200">
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-xs"
                            style={{ background: s.cellBg, color: s.cellText }}>{s.label}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center border-r border-slate-200 font-medium">{cnt}</td>
                        <td className="px-3 py-1.5 text-center text-slate-500">
                          {workdays > 0 ? Math.round(cnt/workdays*100) : 0}%
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: '#D9E1F2' }} className="font-bold border-t-2 border-slate-300">
                    <td className="px-3 py-1.5 border-r border-slate-200">TOTAL</td>
                    <td className="px-3 py-1.5 text-center border-r border-slate-200">{days}</td>
                    <td className="px-3 py-1.5 text-center">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Work time summary */}
            <div className="border border-slate-300 overflow-hidden rounded-sm self-start">
              <div className="px-3 py-2 font-bold text-slate-800 uppercase tracking-wide text-xs" style={{ background: '#D9E1F2' }}>
                THỐNG KÊ THÁNG
              </div>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {[
                    { label: 'Tasks hoàn thành', value: String(totalDone), bg: '#E2EFDA', color: '#375623' },
                    { label: 'Ngày hoàn hảo',    value: String(successDays), bg: '#E2EFDA', color: '#375623' },
                    { label: 'Ngày làm việc',    value: String(totalWorkDays), bg: '#DDEBF7', color: '#1F497D' },
                    { label: 'Tổng thời gian',   value: formatDur(totalMinutes), bg: '#DDEBF7', color: '#1F497D' },
                    { label: 'TB giờ/ngày',      value: totalWorkDays > 0 ? formatDur(Math.round(totalMinutes/totalWorkDays)) : '—', bg: '#FFF2CC', color: '#7F6000' },
                  ].map(({ label, value, bg, color }) => (
                    <tr key={label} style={{ background: bg }} className="border-b border-slate-200">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-medium" style={{ color }}>{label}</td>
                      <td className="px-3 py-1.5 text-right font-bold" style={{ color }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Weekly Report ─────────────────────────────────────────────────────────────
function WeeklyReport() {
  const [weekData, setWeekData] = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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

  const { start, end, days } = getWeekRange()
  const today = todayStr()

  useEffect(() => {
    api.getWeeklyReport(start, end).then((d: any) => { setWeekData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="p-5 py-10 text-center">
      <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
    </div>
  )

  const totalTasks: number = weekData?.totalTasks ?? 0
  const completionMap: Record<string, number> = {}
  const sessionMap: Record<string, any> = {}
  const meetingMap: Record<string, { total: number; attended: number }> = {}

  for (const c of (weekData?.completions || [])) completionMap[c.log_date] = Number(c.done)
  for (const s of (weekData?.sessions   || [])) sessionMap[s.session_date] = s
  for (const m of (weekData?.meetings   || [])) meetingMap[m.date] = { total: Number(m.total), attended: Number(m.attended) }

  const pastDays = days.filter(d => d <= today)
  const weekDone = pastDays.reduce((s, d) => s + (completionMap[d] || 0), 0)
  const weekTotal = pastDays.length * totalTasks
  const weekPct  = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0
  const weekMinutes = days.reduce((s, d) => s + (sessionMap[d]?.total_minutes || 0), 0)
  const workDays = days.filter(d => sessionMap[d]?.end_time).length

  return (
    <div className="p-5 space-y-4">
      {/* Weekly summary */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 text-white">
        <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-3">Weekly Performance</p>
        <div className="flex items-center gap-4 mb-3">
          <div>
            <p className="text-5xl font-black leading-none">{weekPct}%</p>
            <p className="text-white/60 text-xs mt-0.5">Task completion</p>
          </div>
          <div className="flex-1">
            <div className="bg-white/20 rounded-full h-2.5 mt-1">
              <div className="bg-white h-2.5 rounded-full" style={{ width: weekPct + '%' }} />
            </div>
            <p className="text-white/60 text-xs mt-1">{weekDone} of {weekTotal} tasks done</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-sm font-black">{workDays}/5</p>
            <p className="text-white/60 text-xs">Work Days</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-sm font-black">{formatDur(weekMinutes)}</p>
            <p className="text-white/60 text-xs">Total Time</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-sm font-black">{totalTasks}</p>
            <p className="text-white/60 text-xs">Daily Tasks</p>
          </div>
        </div>
      </div>

      {/* Day rows */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className="text-center py-2 text-xs font-bold text-gray-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {days.map((dateStr) => {
            const isFuture = dateStr > today
            const isToday  = dateStr === today
            const done     = completionMap[dateStr] || 0
            const pct      = totalTasks > 0 ? (done / totalTasks) * 100 : 0
            const hasSess  = !!sessionMap[dateStr]?.end_time
            const isSelected = selectedDay === dateStr
            const dayNum   = new Date(dateStr + 'T00:00:00').getDate()

            const bg = isFuture ? 'bg-white'
              : pct >= 100 ? 'bg-emerald-50'
              : pct >= 50  ? 'bg-amber-50'
              : done > 0   ? 'bg-red-50'
              : 'bg-gray-50'

            const textColor = isFuture ? 'text-gray-300'
              : pct >= 100 ? 'text-emerald-700'
              : pct >= 50  ? 'text-amber-700'
              : done > 0   ? 'text-red-600'
              : 'text-gray-400'

            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && setSelectedDay(isSelected ? null : dateStr)}
                disabled={isFuture}
                className={`h-14 flex flex-col items-center justify-center gap-0.5 relative transition-all ${bg} ${isSelected ? 'ring-2 ring-inset ring-indigo-500' : ''} ${isToday ? 'ring-2 ring-inset ring-indigo-300' : ''}`}
              >
                <span className={`text-xs font-bold ${textColor}`}>{dayNum}</span>
                {!isFuture && totalTasks > 0 && (
                  <span className="text-xs leading-none font-semibold" style={{ fontSize: 9, color: pct >= 100 ? '#059669' : pct >= 50 ? '#D97706' : done > 0 ? '#DC2626' : '#9CA3AF' }}>
                    {done}/{totalTasks}
                  </span>
                )}
                {hasSess && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-orange-400 rounded-full" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center flex-wrap">
        {[
          { color: 'bg-emerald-500', label: 'All done' },
          { color: 'bg-amber-400',   label: 'Partial' },
          { color: 'bg-red-400',     label: 'Missed' },
          { color: 'bg-orange-400',  label: 'Session' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className={'w-2 h-2 rounded-full ' + l.color} />
            <span className="text-xs text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-indigo-50 flex items-center justify-between"
            style={{ background: 'linear-gradient(to right, #EEF2FF, #F5F3FF)' }}>
            <div>
              <p className="font-bold text-gray-800 text-sm">{fmtFullDate(selectedDay)}</p>
              <p className="text-xs text-indigo-400">Day breakdown</p>
            </div>
            <button onClick={() => setSelectedDay(null)}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <IconX size={13} className="text-gray-500" />
            </button>
          </div>
          <div className="p-4">
            <DayDetail date={selectedDay} compact />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function ReportPanel({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('daily')

  const viewLabels: Record<View, string> = {
    daily:   'Daily breakdown',
    weekly:  'This week',
    monthly: 'Monthly overview',
    project: 'Project report',
  }

  const isWideView = view === 'monthly' || view === 'project'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div
        className={'bg-white w-full rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 '
          + (isWideView ? 'sm:max-w-5xl max-h-[95vh]' : 'sm:max-w-lg max-h-[90vh]')}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2E4D8A 100%)' }}>
          <div className="px-6 pt-5 pb-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <IconBarChart size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-black text-white text-lg leading-tight">Performance</h2>
                  <p className="text-white/60 text-xs">{viewLabels[view]}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <IconX size={16} className="text-white" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {([
                { v: 'daily',   label: 'Daily',   icon: '📅' },
                { v: 'weekly',  label: 'Weekly',  icon: '📆' },
                { v: 'monthly', label: 'Monthly', icon: '🗓️' },
                { v: 'project', label: 'Project', icon: '📋' },
              ] as { v: View; label: string; icon: string }[]).map(({ v, label, icon }) => (
                <button key={v} onClick={() => setView(v)}
                  className={'flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 '
                    + (view === v
                      ? 'bg-white text-gray-900 border-white'
                      : 'text-white/60 hover:text-white/90 border-transparent hover:bg-white/10')}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 bg-gray-50">
          {view === 'daily'   && <DailyReport />}
          {view === 'weekly'  && <WeeklyReport />}
          {view === 'monthly' && <MonthlyReport />}
          {view === 'project' && <ProjectReport />}
        </div>
      </div>
    </div>
  )
}
