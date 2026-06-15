import { useEffect, useState } from 'react'
import { WorkSession } from '../../types/index'
import WeatherWidget from './WeatherWidget'
import VacationSection from './VacationSection'
import { IconTimer, IconFlag, IconCalendar } from './Icons'

const api = (window as any).electronAPI

const HOLIDAYS = [
  { name: "National Day (Sep 2)",     date: '2026-09-02', days_off: 2 },
  { name: "New Year's Day 2027",      date: '2027-01-01', days_off: 1 },
  { name: "Lunar New Year 2027",      date: '2027-01-17', days_off: 7 },
  { name: "Hung Kings Festival",      date: '2027-04-21', days_off: 1 },
  { name: "Reunification & Labor Day",date: '2027-04-30', days_off: 2 },
]

function formatDur(min: number) {
  if (!min) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

export default function UnwindTab() {
  const [session, setSession] = useState<WorkSession | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding]   = useState(false)

  useEffect(() => { loadSession() }, [])

  useEffect(() => {
    if (!session || session.end_time) return
    const [sh, sm] = session.start_time.split(':').map(Number)
    const startMin = sh * 60 + sm
    const tick = () => {
      const n = new Date()
      setElapsed(Math.max(0, n.getHours() * 60 + n.getMinutes() - startMin))
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [session])

  async function loadSession() {
    const s = await api.getTodaySession()
    setSession(s)
  }

  async function endSession() {
    setEnding(true)
    await api.endWorkSession()
    await loadSession()
    setEnding(false)
  }

  const now = new Date()
  const upcoming = HOLIDAYS
    .map(h => ({ ...h, daysLeft: Math.ceil((new Date(h.date).getTime() - now.getTime()) / 86400000) }))
    .filter(h => h.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3)

  const done = !!session?.end_time
  const totalMin = done ? (session?.total_minutes || 0) : elapsed

  return (
    <div className="space-y-3">
      {/* Work Session */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50" style={{ background: 'linear-gradient(to right, #FFF7ED, #FEF3C7)' }}>
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <IconTimer size={15} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-800 text-sm">Today's Work Session</p>
            <p className="text-xs text-gray-500">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {!done && session && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-600 font-semibold">Active</span>
            </div>
          )}
        </div>

        <div className="px-4 py-4">
          {session ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Start</p>
                  <p className="text-base font-black text-gray-800">{session.start_time}</p>
                </div>
                <div className={'rounded-xl p-3 text-center ' + (done ? 'bg-gray-50' : 'bg-blue-50')}>
                  <p className={'text-xs mb-1 ' + (done ? 'text-gray-400' : 'text-blue-400')}>{done ? 'End' : 'Elapsed'}</p>
                  <p className={'text-base font-black ' + (done ? 'text-gray-800' : 'text-blue-600')}>
                    {done ? session.end_time : formatDur(elapsed)}
                  </p>
                </div>
                <div className={'rounded-xl p-3 text-center ' + (done ? 'bg-emerald-50' : 'bg-orange-50')}>
                  <p className={'text-xs mb-1 ' + (done ? 'text-emerald-400' : 'text-orange-400')}>Total</p>
                  <p className={'text-base font-black ' + (done ? 'text-emerald-600' : 'text-orange-600')}>{formatDur(totalMin)}</p>
                </div>
              </div>

              {!done ? (
                <button
                  onClick={endSession}
                  disabled={ending}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <IconFlag size={15} />
                  <span>{ending ? 'Saving...' : 'End Work Session'}</span>
                </button>
              ) : (
                <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                  <p className="text-emerald-700 font-bold text-sm">Session complete — {formatDur(session.total_minutes || 0)}</p>
                  <p className="text-emerald-500 text-xs mt-0.5">Great work today! Time to rest.</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No session data for today.</p>
          )}
        </div>
      </div>

      {/* Weather */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50" style={{ background: 'linear-gradient(to right, #F0F9FF, #E0F2FE)' }}>
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Weather</p>
            <p className="text-xs text-gray-500">Ho Chi Minh City, Vietnam</p>
          </div>
        </div>
        <div className="p-4">
          <WeatherWidget />
        </div>
      </div>

      {/* Vacations / Trips */}
      <VacationSection />

      {/* Upcoming Holidays */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50" style={{ background: 'linear-gradient(to right, #FEFCE8, #FEF3C7)' }}>
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
            <IconCalendar size={15} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Upcoming Public Holidays</p>
            <p className="text-xs text-gray-500">Vietnam national holidays</p>
          </div>
        </div>

        <div className="px-4 py-4 space-y-2.5">
          {upcoming.map((h, i) => {
            const hot  = h.daysLeft <= 7
            const warm = h.daysLeft <= 30
            const bgColor = hot ? '#FEF2F2' : warm ? '#FFFBEB' : '#F9FAFB'
            const numColor = hot ? '#DC2626' : warm ? '#D97706' : '#374151'
            const borderColor = hot ? '#FECACA' : warm ? '#FDE68A' : '#E5E7EB'

            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3.5 rounded-xl border"
                style={{ backgroundColor: bgColor, borderColor }}
              >
                <div className="text-center w-14 flex-shrink-0">
                  <p className="text-2xl font-black leading-none" style={{ color: numColor }}>{h.daysLeft}</p>
                  <p className="text-xs mt-0.5" style={{ color: numColor + 'aa' }}>days</p>
                </div>
                <div className="w-px h-10 bg-current opacity-10" style={{ color: numColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{h.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{h.date} · {h.days_off} day{h.days_off > 1 ? 's' : ''} off</p>
                </div>
                {i === 0 && (
                  <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ backgroundColor: numColor + '15', color: numColor }}>
                    Next
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
