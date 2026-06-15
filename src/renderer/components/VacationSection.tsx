import { useEffect, useState } from 'react'
import { IconPlus, IconX, IconCalendar, IconChevronUp, IconChevronDown } from './Icons'
import SubtaskList from './SubtaskList'

const api = (window as any).electronAPI

interface Vacation {
  id: number
  destination: string
  date_from: string
  date_to: string
  notes: string
  emoji: string
}

const EMOJIS = ['✈️','🏖️','🏔️','🗺️','🌏','🚢','🏕️','🎡','🏯','🌴']

const EMPTY: Omit<Vacation, 'id'> = {
  destination: '', date_from: '', date_to: '', notes: '', emoji: '✈️',
}

function today() { return new Date().toISOString().slice(0, 10) }

function daysUntil(dateFrom: string) {
  return Math.ceil((new Date(dateFrom + 'T00:00:00').getTime() - Date.now()) / 86400000)
}

function tripDuration(from: string, to: string) {
  const diff = Math.ceil((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000) + 1
  return diff
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function status(v: Vacation) {
  const t = today()
  if (t < v.date_from) return 'upcoming'
  if (t <= v.date_to)  return 'ongoing'
  return 'past'
}

interface FormProps {
  initial: Omit<Vacation, 'id'>
  onSave: (v: Omit<Vacation, 'id'>) => void
  onCancel: () => void
}

function VacationForm({ initial, onSave, onCancel }: FormProps) {
  const [form, setForm] = useState(initial)
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(form) }}
      className="p-4 rounded-2xl border border-teal-100 space-y-3 bg-teal-50"
    >
      {/* Emoji picker */}
      <div>
        <label className="text-xs text-gray-500 block mb-1.5">Trip icon</label>
        <div className="flex gap-1.5 flex-wrap">
          {EMOJIS.map(em => (
            <button
              key={em} type="button"
              onClick={() => setForm(p => ({ ...p, emoji: em }))}
              className={'w-9 h-9 rounded-xl text-lg transition-all border-2 ' + (form.emoji === em ? 'border-teal-500 bg-white shadow-sm scale-110' : 'border-transparent bg-white hover:border-teal-200')}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Destination */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Destination</label>
        <input
          required autoFocus
          placeholder="Paris, Da Nang, Tokyo..."
          value={form.destination} onChange={f('destination')}
          className="w-full border border-teal-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Departure</label>
          <input
            required type="date"
            value={form.date_from}
            onChange={e => {
              const from = e.target.value
              setForm(p => ({
                ...p,
                date_from: from,
                date_to: p.date_to < from ? from : p.date_to,
              }))
            }}
            className="w-full border border-teal-200 rounded-xl px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Return</label>
          <input
            required type="date"
            value={form.date_to} onChange={f('date_to')}
            min={form.date_from}
            className="w-full border border-teal-200 rounded-xl px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Notes (optional)</label>
        <textarea
          placeholder="Hotel, itinerary, things to pack..."
          value={form.notes} onChange={f('notes')}
          rows={2}
          className="w-full border border-teal-200 rounded-xl px-3 py-2 text-sm bg-white resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit"
          className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700">
          Save Trip
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
  vacation: Vacation
  onEdit: () => void
  onDelete: () => void
  // id passed separately so SubtaskList can stay mounted even during edit
}

function VacationCard({ vacation: v, onEdit, onDelete }: CardProps) {
  const st  = status(v)
  const dur = tripDuration(v.date_from, v.date_to)
  const left = daysUntil(v.date_from)

  const styles = {
    upcoming: { border: '#5EEAD4', bg: '#F0FDFA', badge: '#0D9488', badgeBg: '#CCFBF1', label: left === 0 ? 'Departing today!' : left + ' days to go', labelColor: '#0F766E' },
    ongoing:  { border: '#34D399', bg: '#F0FDF4', badge: '#059669', badgeBg: '#D1FAE5', label: 'Ongoing',   labelColor: '#065F46' },
    past:     { border: '#E5E7EB', bg: '#F9FAFB', badge: '#6B7280', badgeBg: '#F3F4F6', label: 'Completed', labelColor: '#6B7280' },
  }[st]

  return (
    <div
      className="rounded-xl border-2 p-4 cursor-pointer hover:shadow-md transition-all"
      style={{ borderColor: styles.border, backgroundColor: styles.bg }}
      onClick={onEdit}
    >
      <div className="flex items-start gap-3">
        {/* Emoji */}
        <div className="text-3xl flex-shrink-0 mt-0.5">{v.emoji}</div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-bold text-gray-800">{v.destination}</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: styles.badgeBg, color: styles.badge }}>
              {st === 'upcoming' ? 'Planned' : st === 'ongoing' ? 'On trip!' : 'Done'}
            </span>
          </div>

          {/* Date range */}
          <p className="text-xs text-gray-500 mt-1">
            {fmtDate(v.date_from)} → {fmtDate(v.date_to)} · {dur} day{dur > 1 ? 's' : ''}
          </p>

          {/* Countdown */}
          {st !== 'past' && (
            <p className="text-sm font-bold mt-1.5" style={{ color: styles.labelColor }}>
              {st === 'ongoing' ? '🌟 You\'re on vacation!' : '🗓 ' + styles.label}
            </p>
          )}

          {v.notes && (
            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{v.notes}</p>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <IconX size={15} />
        </button>
      </div>

      {/* Progress bar for ongoing */}
      {st === 'ongoing' && (() => {
        const total = tripDuration(v.date_from, v.date_to)
        const elapsed = Math.ceil((Date.now() - new Date(v.date_from + 'T00:00:00').getTime()) / 86400000) + 1
        const pct = Math.min(100, Math.round((elapsed / total) * 100))
        return (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-emerald-600 mb-1">
              <span>Day {elapsed} of {total}</span>
              <span>{pct}% done</span>
            </div>
            <div className="bg-emerald-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: pct + '%' }} />
            </div>
          </div>
        )
      })()}

      {/* Trip checklist */}
      <SubtaskList
        parentType="vacation"
        parentId={v.id}
        accentColor="#0D9488"
      />
    </div>
  )
}

export default function VacationSection() {
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [open, setOpen]           = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<number | null>(null)
  const [editData, setEditData]   = useState<Omit<Vacation,'id'> | null>(null)
  const [filter, setFilter]       = useState<'all' | 'upcoming' | 'past'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    const data = await api.getVacations()
    setVacations(data || [])
  }

  async function handleCreate(form: Omit<Vacation,'id'>) {
    await api.createVacation(form)
    setShowForm(false)
    load()
  }

  async function handleUpdate(form: Omit<Vacation,'id'>) {
    if (editId == null) return
    await api.updateVacation(editId, form)
    setEditId(null); setEditData(null)
    load()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this trip?')) return
    await api.deleteVacation(id)
    setVacations(p => p.filter(v => v.id !== id))
  }

  function startEdit(v: Vacation) {
    setEditId(v.id)
    setEditData({ destination: v.destination, date_from: v.date_from, date_to: v.date_to, notes: v.notes, emoji: v.emoji })
    setShowForm(false)
  }

  const now = today()
  const ongoing  = vacations.filter(v => v.date_from <= now && now <= v.date_to)
  const upcoming = vacations.filter(v => v.date_from > now)
  const past     = vacations.filter(v => v.date_to < now)

  const displayed = filter === 'upcoming'
    ? [...ongoing, ...upcoming]
    : filter === 'past'
    ? past
    : vacations

  const nextTrip = upcoming.sort((a,b) => a.date_from.localeCompare(b.date_from))[0]
  const nextLeft = nextTrip ? daysUntil(nextTrip.date_from) : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50"
        style={{ background: 'linear-gradient(to right, #F0FDFA, #CCFBF1)' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0 text-base">
          ✈️
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">My Trips</p>
          <p className="text-xs text-gray-500">
            {ongoing.length > 0
              ? '🌟 Currently on a trip!'
              : nextLeft !== null
              ? nextLeft === 0 ? 'Departing today!' : nextLeft + ' days until next trip'
              : 'No upcoming trips'}
            {' · '}{vacations.length} total
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setShowForm(v => !v); setEditId(null) }}
          className="flex items-center gap-1 bg-teal-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <IconPlus size={13} />
          <span>Add trip</span>
        </button>
        {open ? <IconChevronUp size={16} className="text-gray-400" /> : <IconChevronDown size={16} className="text-gray-400" />}
      </div>

      {open && (
        <div className="px-4 pb-4">
          {/* Add form */}
          {showForm && (
            <div className="mt-3">
              <VacationForm
                initial={{ ...EMPTY, date_from: today(), date_to: today() }}
                onSave={handleCreate}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {/* Filter tabs */}
          {vacations.length > 0 && !showForm && (
            <div className="flex gap-1 mt-3 mb-3">
              {(['all','upcoming','past'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={'px-3 py-1 rounded-full text-xs font-semibold transition-all ' + (filter === f ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                >
                  {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Past'}
                  {f === 'upcoming' && upcoming.length + ongoing.length > 0 && (
                    <span className="ml-1 bg-white bg-opacity-30 px-1 rounded-full">{upcoming.length + ongoing.length}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Trip list */}
          {vacations.length === 0 && !showForm ? (
            <div className="py-10 text-center">
              <p className="text-4xl mb-2">🌍</p>
              <p className="text-gray-400 text-sm font-medium">No trips planned yet.</p>
              <p className="text-gray-300 text-xs mt-0.5">Click "Add trip" to plan your next adventure!</p>
            </div>
          ) : (
            <div className="space-y-3 mt-1">
              {displayed.map(v => (
                editId === v.id && editData ? (
                  <div key={v.id}>
                    <VacationForm
                      initial={editData}
                      onSave={handleUpdate}
                      onCancel={() => { setEditId(null); setEditData(null) }}
                    />
                  </div>
                ) : (
                  <VacationCard
                    key={v.id}
                    vacation={v}
                    onEdit={() => startEdit(v)}
                    onDelete={() => handleDelete(v.id)}
                  />
                )
              ))}
              {displayed.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No trips in this category.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
