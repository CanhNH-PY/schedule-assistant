import { useEffect, useState } from 'react'
import { StudyItem } from '../../types/index'
import {
  IconBook, IconPlus, IconX, IconChevronUp, IconChevronDown, IconClock,
} from './Icons'
import RepeatPicker, { RepeatValue } from './RepeatPicker'
import SubtaskList from './SubtaskList'

const api = (window as any).electronAPI
type Category = 'professional' | 'language' | 'other'

const CATS: { key: Category; label: string; accent: string; bg: string; icon: string }[] = [
  { key: 'professional', label: 'Professional', accent: '#2563EB', bg: 'bg-blue-50',   icon: '💼' },
  { key: 'language',     label: 'Language',     accent: '#059669', bg: 'bg-emerald-50', icon: '🌐' },
  { key: 'other',        label: 'Other',        accent: '#D97706', bg: 'bg-amber-50',   icon: '📚' },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }

function repeatLabel(days: string): string {
  const nums = days.split(',').map(Number)
  const weekdays = [1, 2, 3, 4, 5]
  const weekend  = [6, 7]
  if (nums.length === 7) return 'Everyday'
  if (weekdays.every(d => nums.includes(d)) && nums.length === 5) return 'Weekdays'
  if (weekend.every(d => nums.includes(d)) && nums.length === 2) return 'Weekends'
  return ['', 'M', 'T', 'W', 'T', 'F', 'S', 'S'].filter((_, i) => nums.includes(i)).join('')
}

// ── Add form ───────────────────────────────────────────────────────────────────
interface AddFormProps {
  accent: string
  onSave: (title: string, time: string, repeat: RepeatValue) => void
  onCancel: () => void
}
function AddForm({ accent, onSave, onCancel }: AddFormProps) {
  const [title,  setTitle]  = useState('')
  const [time,   setTime]   = useState('08:00')
  const [repeat, setRepeat] = useState<RepeatValue>({
    repeat_type: 'daily', repeat_days: [1,2,3,4,5], repeat_dates: [],
  })
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(title, time, repeat) }}
      className="mt-3 p-3.5 rounded-xl space-y-3 border border-slate-100"
      style={{ backgroundColor: accent + '08' }}>
      <input required autoFocus placeholder="Topic / skill name..."
        value={title} onChange={e => setTitle(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300" />
      <input type="time" value={time} onChange={e => setTime(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white" />
      <RepeatPicker value={repeat} onChange={setRepeat} accentColor={accent} />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 text-white py-2 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: accent }}>Save</button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-slate-200 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
      </div>
    </form>
  )
}

// ── Edit form (inline, same as WorkTab) ────────────────────────────────────────
interface EditFormProps {
  accent: string
  item: StudyItem
  onSave: (title: string, time: string, repeat: RepeatValue, progress: number) => void
  onCancel: () => void
}
function EditForm({ accent, item, onSave, onCancel }: EditFormProps) {
  const [title,    setTitle]    = useState(item.title)
  const [time,     setTime]     = useState(item.notify_time || '08:00')
  const [progress, setProgress] = useState(item.progress)
  const [repeat,   setRepeat]   = useState<RepeatValue>({
    repeat_type: 'daily',
    repeat_days: item.notify_days ? item.notify_days.split(',').map(Number) : [1,2,3,4,5],
    repeat_dates: [],
  })
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(title, time, repeat, progress) }}
      className="p-3.5 rounded-xl space-y-3 border"
      style={{ backgroundColor: accent + '08', borderColor: accent + '30' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>Edit Topic</p>
      <input required autoFocus value={title} onChange={e => setTitle(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none" />
      <input type="time" value={time} onChange={e => setTime(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white" />
      <RepeatPicker value={repeat} onChange={setRepeat} accentColor={accent} />
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Mastery</label>
          <span className="text-xs font-bold" style={{ color: accent }}>{progress}%</span>
        </div>
        <input type="range" min={0} max={100} value={progress}
          onChange={e => setProgress(Number(e.target.value))}
          className="w-full h-1" style={{ accentColor: accent }} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 text-white py-2 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: accent }}>Save</button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-slate-200 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
      </div>
    </form>
  )
}

// ── Main StudyTab ──────────────────────────────────────────────────────────────
export default function StudyTab() {
  const [items,        setItems]        = useState<StudyItem[]>([])
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [openCats,     setOpenCats]     = useState<Set<Category>>(new Set(['professional','language','other']))
  const [showForm,     setShowForm]     = useState<Category | null>(null)
  const [editingId,    setEditingId]    = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const data: StudyItem[] = (await api.getStudyItems()) || []
    setItems(data)
    setCompletedIds(new Set(data.filter(i => !!i.completed_at).map(i => i.id)))
  }

  function toggleCat(cat: Category) {
    setOpenCats(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n })
  }

  async function complete(id: number) {
    setCompletedIds(prev => new Set([...prev, id]))
    await api.completeStudy(id, todayStr())
  }

  async function uncomplete(id: number) {
    setCompletedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    await api.uncompleteStudy(id, todayStr())
  }

  async function addItem(cat: Category, title: string, time: string, repeat: RepeatValue) {
    await api.createStudyItem({
      title, category: cat, parent_id: null,
      notify_time: time || null,
      notify_days: repeat.repeat_days.join(','),
    })
    setShowForm(null)
    load()
  }

  async function saveEdit(id: number, title: string, time: string, repeat: RepeatValue, progress: number) {
    await api.updateStudyItem(id, {
      title, notify_time: time || null, notify_days: repeat.repeat_days.join(','),
    })
    await api.updateStudyProgress(id, progress)
    setEditingId(null)
    load()
  }

  async function remove(id: number) {
    if (!confirm('Remove this topic?')) return
    const children = items.filter(i => i.parent_id === id)
    for (const c of children) await api.deleteStudyItem(c.id)
    await api.deleteStudyItem(id)
    load()
  }

  // Summary
  const doneCount = completedIds.size
  const totalCount = items.length
  const dailyPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Learning — Today</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-800">{doneCount}</span>
            <span className="text-sm text-slate-400">/ {totalCount} done</span>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg ml-1">{dailyPct}%</span>
          </div>
        </div>
        <div className="w-24">
          <div className="bg-slate-100 rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: dailyPct + '%' }} />
          </div>
        </div>
      </div>

      {/* Category sections */}
      {CATS.map(cat => {
        const catItems  = items.filter(i => i.category === cat.key)
        const open      = openCats.has(cat.key)
        const catDone   = catItems.filter(i => completedIds.has(i.id)).length

        return (
          <div key={cat.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Section header — same pattern as WorkTab */}
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-50"
              onClick={() => toggleCat(cat.key)}>
              <div className={'w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ' + cat.bg}>
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{cat.label}</p>
                <p className="text-xs text-slate-400">{catDone} of {catItems.length} done today</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setShowForm(showForm === cat.key ? null : cat.key); setEditingId(null) }}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors"
                style={{ color: cat.accent, borderColor: cat.accent + '30', backgroundColor: cat.accent + '10' }}
              >
                <IconPlus size={12} />
                <span>Add</span>
              </button>
              {open ? <IconChevronUp size={15} className="text-slate-300" /> : <IconChevronDown size={15} className="text-slate-300" />}
            </div>

            {open && (
              <div className="px-4 pb-4">
                {/* Add form */}
                {showForm === cat.key && (
                  <AddForm
                    accent={cat.accent}
                    onSave={(t, time, rep) => addItem(cat.key, t, time, rep)}
                    onCancel={() => setShowForm(null)}
                  />
                )}

                {catItems.length === 0 && showForm !== cat.key ? (
                  <div className="py-7 text-center">
                    <div className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-2">
                      <IconBook size={17} className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm">No topics scheduled today.</p>
                    <p className="text-slate-300 text-xs mt-0.5">Click <strong>Add</strong> to schedule one.</p>
                  </div>
                ) : (
                  <div className="space-y-2 mt-3">
                    {catItems.map(item => {
                      const done = completedIds.has(item.id)

                      // Inline edit form — same as WorkTab
                      if (editingId === item.id) {
                        return (
                          <div key={item.id}>
                            <EditForm
                              accent={cat.accent}
                              item={item}
                              onSave={(t, time, rep, prog) => saveEdit(item.id, t, time, rep, prog)}
                              onCancel={() => setEditingId(null)}
                            />
                          </div>
                        )
                      }

                      return (
                        <div key={item.id}
                          className={'px-3 py-2.5 rounded-xl border transition-all ' +
                            (done
                              ? 'bg-emerald-50/40 border-emerald-100/80'
                              : 'bg-white border-slate-100 hover:border-slate-200/80 hover:shadow-sm')}
                        >
                          {/* Task row — identical layout to WorkTab */}
                          <div className="flex items-center gap-3 cursor-pointer"
                            onClick={() => !done && setEditingId(item.id)}>
                            {/* Circle checkbox */}
                            <button
                              onClick={e => { e.stopPropagation(); done ? uncomplete(item.id) : complete(item.id) }}
                              className={
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ' +
                                (done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400')
                              }
                            >
                              {done && (
                                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>

                            {/* Title + meta */}
                            <div className="flex-1 min-w-0">
                              <p className={'text-sm font-medium ' + (done ? 'text-emerald-700' : 'text-slate-800')}>
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {item.notify_time && (
                                  <div className="flex items-center gap-1">
                                    <IconClock size={10} className="text-gray-400" />
                                    <span className="text-xs text-gray-400">{item.notify_time}</span>
                                  </div>
                                )}
                                <span className="text-xs text-gray-400">
                                  {repeatLabel(item.notify_days || '1,2,3,4,5')}
                                </span>
                                {item.progress > 0 && (
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                                    style={{ color: cat.accent, backgroundColor: cat.accent + '12' }}>
                                    {item.progress}%
                                  </span>
                                )}
                                {done && <span className="text-xs text-emerald-500 font-medium">Done today</span>}
                                {item.parent_id && <span className="text-xs text-slate-300">sub-topic</span>}
                              </div>
                            </div>

                            {/* Undo — same as WorkTab */}
                            {done && (
                              <button
                                title="Reopen"
                                onClick={e => { e.stopPropagation(); uncomplete(item.id) }}
                                className="text-emerald-400 hover:text-amber-500 transition-colors text-xs font-bold px-1.5 py-0.5 rounded border border-emerald-200 hover:border-amber-300"
                              >↩</button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={e => { e.stopPropagation(); remove(item.id) }}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <IconX size={16} />
                            </button>
                          </div>

                          {/* SubtaskList always visible below (same as WorkTab) */}
                          <SubtaskList parentType="study" parentId={item.id}
                            accentColor={cat.accent} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
