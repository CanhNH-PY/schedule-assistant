import { useEffect, useState } from 'react'

const api = (window as any).electronAPI

const EMOJIS = ['🎂','🎉','🎊','💍','🏆','🎓','🌟','❤️','🎁','🥂','🌸','🎈','🎵','🏅','🌻']

interface Event {
  id: number
  title: string
  date: string      // YYYY-MM-DD for one-time, MM-DD for yearly
  is_yearly: number
  emoji: string
  notes: string
}

function daysUntil(date: string, isYearly: boolean): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!isYearly) {
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - today.getTime()) / 86400000)
  }

  // Yearly: find next occurrence
  const [mm, dd] = date.split('-').map(Number)
  const thisYear = new Date(today.getFullYear(), mm - 1, dd)
  thisYear.setHours(0, 0, 0, 0)
  if (thisYear >= today) return Math.ceil((thisYear.getTime() - today.getTime()) / 86400000)
  const nextYear = new Date(today.getFullYear() + 1, mm - 1, dd)
  return Math.ceil((nextYear.getTime() - today.getTime()) / 86400000)
}

function nextDate(date: string, isYearly: boolean): string {
  if (!isYearly) return date
  const [mm, dd] = date.split('-').map(Number)
  const year = new Date()
  const thisYear = new Date(year.getFullYear(), mm - 1, dd)
  const base = thisYear >= new Date(new Date().setHours(0,0,0,0))
    ? thisYear
    : new Date(year.getFullYear() + 1, mm - 1, dd)
  return base.toISOString().slice(0, 10)
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function EventSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [open, setOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const blankForm = () => ({
    title: '', date: new Date().toISOString().slice(0, 10),
    is_yearly: false, emoji: '🎉', notes: '',
    mm: String(new Date().getMonth() + 1).padStart(2, '0'),
    dd: String(new Date().getDate()).padStart(2, '0'),
  })
  const [form, setForm] = useState(blankForm())

  useEffect(() => { load() }, [])

  async function load() {
    const rows = await api.getEvents()
    setEvents(rows || [])
  }

  function startEdit(ev: Event) {
    setEditId(ev.id)
    const isYearly = !!ev.is_yearly
    const [mm, dd] = isYearly ? ev.date.split('-') : ['', '']
    setForm({
      title: ev.title,
      date: isYearly ? new Date().toISOString().slice(0, 10) : ev.date,
      is_yearly: isYearly,
      emoji: ev.emoji,
      notes: ev.notes,
      mm: mm || String(new Date().getMonth() + 1).padStart(2, '0'),
      dd: dd || String(new Date().getDate()).padStart(2, '0'),
    })
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      title: form.title,
      date: form.is_yearly ? `${form.mm}-${form.dd}` : form.date,
      is_yearly: form.is_yearly ? 1 : 0,
      emoji: form.emoji,
      notes: form.notes,
    }
    if (editId != null) {
      await api.updateEvent(editId, payload)
    } else {
      await api.createEvent(payload)
    }
    setForm(blankForm())
    setShowForm(false)
    setEditId(null)
    load()
  }

  async function remove(id: number) {
    if (!confirm('Remove this event?')) return
    await api.deleteEvent(id)
    setEvents(p => p.filter(e => e.id !== id))
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm(blankForm())
  }

  const sorted = [...events].sort((a, b) => {
    const da = daysUntil(a.date, !!a.is_yearly)
    const db = daysUntil(b.date, !!b.is_yearly)
    return da - db
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50"
        onClick={() => setOpen(o => !o)}
        style={{ background: 'linear-gradient(to right, #FFF1F2, #FDF2F8)' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
          style={{ background: '#F43F5E' }}>
          <span className="text-white text-xs font-bold">★</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Personal Events</p>
          <p className="text-xs text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''} · birthdays, anniversaries...</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setShowForm(v => !v); setEditId(null); setForm(blankForm()) }}
          className="flex items-center gap-1 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ background: '#F43F5E' }}
        >
          <span>+</span>
          <span>Add</span>
        </button>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round">
          {open ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
        </svg>
      </div>

      {open && (
        <div className="px-4 pb-4">
          {/* Form */}
          {showForm && (
            <form onSubmit={save} className="mt-3 p-3.5 rounded-xl space-y-3 border"
              style={{ background: '#FFF1F2', borderColor: '#FECDD3' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#F43F5E' }}>
                {editId ? 'Edit Event' : 'New Event'}
              </p>

              {/* Emoji picker */}
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(em => (
                  <button key={em} type="button"
                    onClick={() => setForm(p => ({ ...p, emoji: em }))}
                    className={'w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all border ' + (
                      form.emoji === em ? 'border-pink-400 bg-pink-100 scale-110' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    )}>
                    {em}
                  </button>
                ))}
              </div>

              <input
                required autoFocus
                placeholder="Event name... (e.g. Mom's Birthday)"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                style={{ borderColor: '#FECDD3' }}
              />

              {/* Yearly toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    className={'w-10 h-5 rounded-full relative transition-colors ' + (form.is_yearly ? 'bg-pink-500' : 'bg-gray-300')}
                    onClick={() => setForm(p => ({ ...p, is_yearly: !p.is_yearly }))}
                  >
                    <div className={'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ' + (form.is_yearly ? 'left-5' : 'left-0.5')} />
                  </div>
                  <span className="text-xs font-medium text-gray-600">Repeats yearly</span>
                </label>
                <span className="text-xs text-gray-400">{form.is_yearly ? '🔁 Every year' : '📅 One-time'}</span>
              </div>

              {/* Date input */}
              {form.is_yearly ? (
                <div className="flex gap-2">
                  <select
                    value={form.mm}
                    onChange={e => setForm(p => ({ ...p, mm: e.target.value }))}
                    className="flex-1 border rounded-xl px-3 py-2 text-sm bg-white" style={{ borderColor: '#FECDD3' }}
                  >
                    {MONTHS_SHORT.map((m, i) => (
                      <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={form.dd}
                    onChange={e => setForm(p => ({ ...p, dd: e.target.value }))}
                    className="w-24 border rounded-xl px-3 py-2 text-sm bg-white" style={{ borderColor: '#FECDD3' }}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white" style={{ borderColor: '#FECDD3' }}
                />
              )}

              <input
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white" style={{ borderColor: '#FECDD3' }}
              />

              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 text-white py-2 rounded-xl text-sm font-semibold"
                  style={{ background: '#F43F5E' }}>
                  Save
                </button>
                <button type="button" onClick={cancelForm}
                  className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {sorted.length === 0 && !showForm ? (
            <div className="py-8 text-center">
              <p className="text-3xl mb-2">🎂</p>
              <p className="text-gray-400 text-sm">No events yet. Add birthdays, anniversaries...</p>
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              {sorted.map(ev => {
                const isYearly = !!ev.is_yearly
                const days = daysUntil(ev.date, isYearly)
                const isToday = days === 0
                const isPast = !isYearly && days < 0
                const nd = nextDate(ev.date, isYearly)
                const [yyyy, mm2, dd2] = nd.split('-').map(Number)
                const dateLabel = `${MONTHS_SHORT[mm2 - 1]} ${dd2}${isYearly ? '' : ', ' + yyyy}`

                return (
                  <div key={ev.id}
                    className={'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ' + (
                      isPast ? 'opacity-50 bg-gray-50 border-gray-100' :
                      isToday ? 'border-pink-300 bg-pink-50' :
                      'bg-white border-gray-100 hover:border-pink-200 hover:shadow-sm'
                    )}
                    onClick={() => startEdit(ev)}
                  >
                    <span className="text-2xl flex-shrink-0">{ev.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={'text-sm font-semibold ' + (isPast ? 'text-gray-400 line-through' : 'text-gray-800')}>
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">{dateLabel}</span>
                        {isYearly && <span className="text-xs bg-pink-50 text-pink-400 border border-pink-100 px-1.5 py-0.5 rounded-md">🔁 Yearly</span>}
                        {ev.notes && <span className="text-xs text-gray-400 truncate max-w-[120px]">{ev.notes}</span>}
                      </div>
                    </div>
                    {isToday ? (
                      <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 bg-pink-500 text-white animate-pulse">
                        TODAY! 🎉
                      </span>
                    ) : !isPast ? (
                      <div className="text-center flex-shrink-0">
                        <p className="text-xl font-black" style={{ color: days <= 7 ? '#F43F5E' : days <= 30 ? '#F59E0B' : '#6B7280' }}>{days}</p>
                        <p className="text-xs text-gray-400">days</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 flex-shrink-0">Past</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); remove(ev.id) }}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
