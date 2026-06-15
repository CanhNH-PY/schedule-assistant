import { useEffect, useState } from 'react'
import { IconPlus, IconX, IconClock, IconCalendar, IconChevronUp, IconChevronDown } from './Icons'

const api = (window as any).electronAPI

interface Meeting {
  id: number
  title: string
  date: string
  start_time: string
  end_time: string
  location: string
  participants: string
  description: string
}

const EMPTY: Omit<Meeting, 'id'> = {
  title: '', date: new Date().toISOString().slice(0, 10),
  start_time: '09:00', end_time: '10:00',
  location: '', participants: '', description: '',
}

function duration(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) return ''
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(d: string) { return d === new Date().toISOString().slice(0, 10) }
function isSoon(d: string) {
  const diff = Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000)
  return diff >= 0 && diff <= 2
}

// Group meetings by date
function groupByDate(meetings: Meeting[]) {
  const map = new Map<string, Meeting[]>()
  for (const m of meetings) {
    if (!map.has(m.date)) map.set(m.date, [])
    map.get(m.date)!.push(m)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

interface FormProps {
  initial: Omit<Meeting, 'id'>
  onSave: (m: Omit<Meeting, 'id'>) => void
  onCancel: () => void
  accent?: string
}

function MeetingForm({ initial, onSave, onCancel, accent = '#7C3AED' }: FormProps) {
  const [form, setForm] = useState(initial)
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(form) }}
      className="p-4 rounded-2xl border space-y-3"
      style={{ backgroundColor: accent + '08', borderColor: accent + '25' }}
    >
      <input
        required autoFocus
        placeholder="Meeting title..."
        value={form.title} onChange={f('title')}
        className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
        style={{ borderColor: accent + '40' }}
      />

      {/* Date + Time */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Date</label>
          <input type="date" value={form.date} onChange={f('date')}
            className="w-full border rounded-xl px-2 py-2 text-xs bg-white"
            style={{ borderColor: accent + '40' }} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Start</label>
          <input type="time" value={form.start_time} onChange={f('start_time')}
            className="w-full border rounded-xl px-2 py-2 text-xs bg-white"
            style={{ borderColor: accent + '40' }} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">End</label>
          <input type="time" value={form.end_time} onChange={f('end_time')}
            className="w-full border rounded-xl px-2 py-2 text-xs bg-white"
            style={{ borderColor: accent + '40' }} />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Location</label>
        <input
          placeholder="Room / Google Meet / Teams link..."
          value={form.location} onChange={f('location')}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
          style={{ borderColor: accent + '40' }} />
      </div>

      {/* Participants */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Participants</label>
        <input
          placeholder="John, Jane, team@company.com..."
          value={form.participants} onChange={f('participants')}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
          style={{ borderColor: accent + '40' }} />
        <p className="text-xs text-gray-400 mt-1">Separate names with commas</p>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Description / Agenda</label>
        <textarea
          placeholder="Topics, agenda, notes..."
          value={form.description} onChange={f('description')}
          rows={2}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white resize-none"
          style={{ borderColor: accent + '40' }} />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit"
          className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: accent }}>
          Save Meeting
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}

interface CardProps {
  meeting: Meeting
  onEdit: () => void
  onDelete: () => void
  accent: string
}

function MeetingCard({ meeting: m, onEdit, onDelete, accent }: CardProps) {
  const dur    = duration(m.start_time, m.end_time)
  const today  = isToday(m.date)
  const soon   = isSoon(m.date)
  const parts  = m.participants ? m.participants.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <div
      className={'rounded-xl border p-3.5 transition-all hover:shadow-sm cursor-pointer ' + (today ? 'border-l-4' : '')}
      style={{
        borderColor: today ? accent : '#E5E7EB',
        borderLeftColor: today ? accent : undefined,
        backgroundColor: today ? accent + '06' : 'white',
      }}
      onClick={onEdit}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800">{m.title}</p>
            {today && <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: accent }}>TODAY</span>}
            {!today && soon && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">SOON</span>}
          </div>

          <div className="flex items-center gap-1 mt-1">
            <IconClock size={11} className="text-gray-400" />
            <p className="text-xs text-gray-500">{m.start_time} – {m.end_time}{dur ? ` · ${dur}` : ''}</p>
          </div>

          {m.location && (
            <div className="flex items-center gap-1 mt-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <p className="text-xs text-gray-500 truncate">{m.location}</p>
            </div>
          )}

          {parts.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {parts.slice(0, 4).map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {p.length > 12 ? p.slice(0, 12) + '…' : p}
                </span>
              ))}
              {parts.length > 4 && (
                <span className="text-xs text-gray-400">+{parts.length - 4}</span>
              )}
            </div>
          )}

          {m.description && (
            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{m.description}</p>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
        >
          <IconX size={15} />
        </button>
      </div>
    </div>
  )
}

export default function MeetingSection() {
  const [meetings, setMeetings]   = useState<Meeting[]>([])
  const [open, setOpen]           = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<number | null>(null)
  const [editData, setEditData]   = useState<Omit<Meeting,'id'> | null>(null)
  const [viewMode, setViewMode]   = useState<'upcoming' | 'all'>('upcoming')

  const accent = '#7C3AED'

  useEffect(() => { load() }, [])

  async function load() {
    const data = await api.getUpcomingMeetings()
    setMeetings(data || [])
  }

  async function handleCreate(form: Omit<Meeting,'id'>) {
    await api.createMeeting(form)
    setShowForm(false)
    load()
  }

  async function handleUpdate(form: Omit<Meeting,'id'>) {
    if (editId == null) return
    await api.updateMeeting(editId, form)
    setEditId(null); setEditData(null)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this meeting?')) return
    await api.deleteMeeting(id)
    setMeetings(p => p.filter(m => m.id !== id))
  }

  function startEdit(m: Meeting) {
    setEditId(m.id)
    setEditData({ title: m.title, date: m.date, start_time: m.start_time, end_time: m.end_time, location: m.location, participants: m.participants, description: m.description })
    setShowForm(false)
  }

  const todayCount = meetings.filter(m => isToday(m.date)).length
  const groups     = groupByDate(meetings)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50"
        style={{ background: 'linear-gradient(to right, #F5F3FF, #EDE9FE)' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent }}>
          <IconCalendar size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">Meetings</p>
          <p className="text-xs text-gray-500">
            {todayCount > 0 ? `${todayCount} today` : 'No meetings today'} · {meetings.length} upcoming
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setShowForm(v => !v); setEditId(null) }}
          className="flex items-center gap-1 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: accent }}
        >
          <IconPlus size={13} />
          <span>Add</span>
        </button>
        {open ? <IconChevronUp size={16} className="text-gray-400" /> : <IconChevronDown size={16} className="text-gray-400" />}
      </div>

      {open && (
        <div className="px-4 pb-4">
          {/* Add form */}
          {showForm && (
            <div className="mt-3">
              <MeetingForm
                initial={{ ...EMPTY, date: new Date().toISOString().slice(0,10) }}
                onSave={handleCreate}
                onCancel={() => setShowForm(false)}
                accent={accent}
              />
            </div>
          )}

          {/* Meeting list */}
          {meetings.length === 0 && !showForm ? (
            <div className="py-8 text-center">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <IconCalendar size={20} className="text-gray-300" />
              </div>
              <p className="text-gray-400 text-sm">No upcoming meetings.</p>
              <p className="text-gray-300 text-xs mt-0.5">Click Add to schedule one.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {groups.map(([date, dayMeetings]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={'text-xs font-bold px-2 py-1 rounded-lg ' + (isToday(date) ? 'text-white' : 'bg-gray-100 text-gray-500')}
                      style={isToday(date) ? { backgroundColor: accent } : {}}>
                      {isToday(date) ? 'Today' : fmtDate(date)}
                    </div>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400">{dayMeetings.length} meeting{dayMeetings.length > 1 ? 's' : ''}</span>
                  </div>

                  <div className="space-y-2">
                    {dayMeetings.map(m => (
                      editId === m.id && editData ? (
                        <div key={m.id} className="mt-1">
                          <MeetingForm
                            initial={editData}
                            onSave={handleUpdate}
                            onCancel={() => { setEditId(null); setEditData(null) }}
                            accent={accent}
                          />
                        </div>
                      ) : (
                        <MeetingCard
                          key={m.id}
                          meeting={m}
                          onEdit={() => startEdit(m)}
                          onDelete={() => handleDelete(m.id)}
                          accent={accent}
                        />
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
