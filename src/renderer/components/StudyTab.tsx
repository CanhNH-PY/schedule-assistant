import { useEffect, useState } from 'react'
import { StudyItem } from '../../types/index'
import {
  IconBook, IconLayers, IconPlus, IconX,
  IconChevronUp, IconChevronDown, IconActivity, IconEdit, IconClock,
} from './Icons'
import RepeatPicker, { RepeatValue } from './RepeatPicker'
import SubtaskList from './SubtaskList'

const api = (window as any).electronAPI
type Category = 'professional' | 'language' | 'other'

const CATS: { key: Category; label: string; accent: string; light: string }[] = [
  { key: 'professional', label: 'Professional', accent: '#2563EB', light: '#EFF6FF' },
  { key: 'language',     label: 'Language',     accent: '#059669', light: '#F0FDF4' },
  { key: 'other',        label: 'Other',        accent: '#D97706', light: '#FFFBEB' },
]

const defaultRepeat = (): RepeatValue => ({ repeat_type: 'daily', repeat_days: [1,2,3,4,5], repeat_dates: [] })

// ─── Inline item form (add or edit) ─────────────────────────────────────────

interface ItemFormProps {
  accent: string
  light: string
  initial?: { title: string; notify_time: string; repeat: RepeatValue }
  placeholder?: string
  label?: string
  onSave: (title: string, notify_time: string, repeat: RepeatValue) => void
  onCancel: () => void
}

function ItemForm({ accent, light, initial, placeholder = 'Title...', label = 'Save', onSave, onCancel }: ItemFormProps) {
  const [title, setTitle]       = useState(initial?.title ?? '')
  const [time, setTime]         = useState(initial?.notify_time ?? '')
  const [repeat, setRepeat]     = useState<RepeatValue>(initial?.repeat ?? defaultRepeat())

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(title, time, repeat) }}
      className="p-3.5 rounded-xl space-y-3 border mt-2"
      style={{ backgroundColor: light, borderColor: accent + '30' }}
    >
      <input
        required autoFocus
        placeholder={placeholder}
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
        style={{ borderColor: accent + '40' }}
      />
      <div>
        <label className="text-xs text-gray-500 block mb-1">Reminder time (optional)</label>
        <input
          type="time" value={time}
          onChange={e => setTime(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
          style={{ borderColor: accent + '40' }}
        />
      </div>
      <RepeatPicker value={repeat} onChange={setRepeat} accentColor={accent} />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 text-white py-2 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: accent }}>{label}</button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  )
}

// ─── Child skill card ────────────────────────────────────────────────────────

interface ChildCardProps {
  item: StudyItem
  accent: string
  light: string
  onUpdateProgress: (id: number, v: number) => void
  onEdit: (item: StudyItem) => void
  onDelete: (id: number) => void
  isEditing: boolean
  onSaveEdit: (title: string, time: string, repeat: RepeatValue) => void
  onCancelEdit: () => void
}

function ChildCard({ item, accent, light, onUpdateProgress, onEdit, onDelete, isEditing, onSaveEdit, onCancelEdit }: ChildCardProps) {
  if (isEditing) {
    const initRepeat: RepeatValue = {
      repeat_type: 'daily',
      repeat_days: item.notify_days ? item.notify_days.split(',').map(Number) : [1,2,3,4,5],
      repeat_dates: [],
    }
    return (
      <ItemForm
        accent={accent} light={light}
        initial={{ title: item.title, notify_time: item.notify_time || '', repeat: initRepeat }}
        label="Update"
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
      />
    )
  }

  return (
    <div className="p-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-all">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: accent }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{item.title}</p>
          {item.notify_time && (
            <div className="flex items-center gap-1 mt-0.5">
              <IconClock size={10} className="text-gray-400" />
              <p className="text-xs text-gray-400">{item.notify_time}</p>
            </div>
          )}
        </div>
        <span className="text-sm font-black flex-shrink-0" style={{ color: accent }}>{item.progress}%</span>
        <button onClick={() => onEdit(item)} className="text-gray-300 hover:text-blue-400 transition-colors" title="Edit">
          <IconEdit size={13} />
        </button>
        <button onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-400 transition-colors">
          <IconX size={13} />
        </button>
      </div>
      <div className="bg-gray-100 rounded-full h-1.5 mb-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: item.progress + '%', backgroundColor: accent }} />
      </div>
      <input
        type="range" min={0} max={100} value={item.progress}
        onChange={e => onUpdateProgress(item.id, Number(e.target.value))}
        className="w-full" style={{ accentColor: accent }}
      />
      <SubtaskList parentType="study" parentId={item.id} accentColor={accent} />
    </div>
  )
}

// ─── Parent subject card ─────────────────────────────────────────────────────

interface ParentCardProps {
  parent: StudyItem
  children: StudyItem[]
  accent: string
  light: string
  onUpdateProgress: (id: number, v: number) => void
  onDelete: (id: number) => void
  onAddChild: (parentId: number, title: string, time: string, repeat: RepeatValue) => void
  onEditItem: (item: StudyItem) => void
  editingId: number | null
  onSaveEdit: (id: number, title: string, time: string, repeat: RepeatValue) => void
  onCancelEdit: () => void
}

function ParentCard({
  parent, children, accent, light,
  onUpdateProgress, onDelete, onAddChild,
  onEditItem, editingId, onSaveEdit, onCancelEdit,
}: ParentCardProps) {
  const [open, setOpen]         = useState(true)
  const [showChildForm, setShowChildForm] = useState(false)

  const avgProgress = children.length
    ? Math.round(children.reduce((s, c) => s + c.progress, 0) / children.length)
    : parent.progress

  const isEditingParent = editingId === parent.id

  return (
    <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: accent + '30' }}>
      {/* Parent header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        style={{ background: `linear-gradient(to right, ${light}, white)` }}
      >
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent }}>
            <IconLayers size={11} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{parent.title}</p>
            <p className="text-xs text-gray-400">{children.length} skill{children.length !== 1 ? 's' : ''} · {avgProgress}% avg</p>
          </div>
          {/* Mini progress bar */}
          <div className="w-20 bg-gray-200 rounded-full h-1.5 flex-shrink-0">
            <div className="h-1.5 rounded-full transition-all" style={{ width: avgProgress + '%', backgroundColor: accent }} />
          </div>
          <span className="text-xs font-black flex-shrink-0" style={{ color: accent }}>{avgProgress}%</span>
          {open ? <IconChevronUp size={14} className="text-gray-400" /> : <IconChevronDown size={14} className="text-gray-400" />}
        </button>
        <button onClick={() => onEditItem(parent)} className="text-gray-300 hover:text-blue-400 transition-colors flex-shrink-0" title="Edit subject">
          <IconEdit size={13} />
        </button>
        <button
          onClick={() => { setShowChildForm(v => !v); setOpen(true) }}
          className="flex items-center gap-0.5 text-white text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0"
          style={{ backgroundColor: accent }}
          title="Add skill"
        >
          <IconPlus size={11} />
          <span>Skill</span>
        </button>
        <button onClick={() => onDelete(parent.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
          <IconX size={14} />
        </button>
      </div>

      {/* Edit parent form */}
      {isEditingParent && (
        <div className="px-3 pb-3">
          <ItemForm
            accent={accent} light={light}
            initial={{
              title: parent.title,
              notify_time: parent.notify_time || '',
              repeat: { repeat_type: 'daily', repeat_days: parent.notify_days ? parent.notify_days.split(',').map(Number) : [1,2,3,4,5], repeat_dates: [] },
            }}
            label="Update subject"
            onSave={(t, time, rep) => onSaveEdit(parent.id, t, time, rep)}
            onCancel={onCancelEdit}
          />
        </div>
      )}

      {/* Children */}
      {open && !isEditingParent && (
        <div className="px-3 pb-3 space-y-2 pt-2">
          {showChildForm && (
            <ItemForm
              accent={accent} light={light}
              placeholder="Skill name (e.g. Listening, Reading...)"
              label="Add skill"
              onSave={(t, time, rep) => { onAddChild(parent.id, t, time, rep); setShowChildForm(false) }}
              onCancel={() => setShowChildForm(false)}
            />
          )}

          {children.length === 0 && !showChildForm ? (
            <div className="py-3 text-center">
              <p className="text-xs text-gray-400">No skills yet — click <strong>Skill</strong> to add one.</p>
            </div>
          ) : (
            children.map(child => (
              <ChildCard
                key={child.id}
                item={child}
                accent={accent} light={light}
                onUpdateProgress={onUpdateProgress}
                onEdit={onEditItem}
                onDelete={onDelete}
                isEditing={editingId === child.id}
                onSaveEdit={(t, time, rep) => onSaveEdit(child.id, t, time, rep)}
                onCancelEdit={onCancelEdit}
              />
            ))
          )}

          {/* Parent's own progress if no children */}
          {children.length === 0 && !showChildForm && (
            <div className="mt-1">
              <div className="bg-gray-100 rounded-full h-1.5 mb-1">
                <div className="h-1.5 rounded-full transition-all" style={{ width: parent.progress + '%', backgroundColor: accent }} />
              </div>
              <input
                type="range" min={0} max={100} value={parent.progress}
                onChange={e => onUpdateProgress(parent.id, Number(e.target.value))}
                className="w-full" style={{ accentColor: accent }}
              />
              <SubtaskList parentType="study" parentId={parent.id} accentColor={accent} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main StudyTab ───────────────────────────────────────────────────────────

export default function StudyTab() {
  const [items, setItems]         = useState<StudyItem[]>([])
  const [openCats, setOpenCats]   = useState<Set<Category>>(new Set(['professional', 'language', 'other']))
  const [showForm, setShowForm]   = useState<Category | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await api.getStudyItems()
    setItems(data || [])
  }

  function toggleCat(cat: Category) {
    setOpenCats(prev => {
      const n = new Set(prev)
      n.has(cat) ? n.delete(cat) : n.add(cat)
      return n
    })
  }

  async function addParent(cat: Category, title: string, time: string, repeat: RepeatValue) {
    await api.createStudyItem({
      title, category: cat, parent_id: null,
      notify_time: time || null,
      notify_days: repeat.repeat_days.join(','),
    })
    setShowForm(null)
    load()
  }

  async function addChild(parentId: number, cat: Category, title: string, time: string, repeat: RepeatValue) {
    await api.createStudyItem({
      title, category: cat, parent_id: parentId,
      notify_time: time || null,
      notify_days: repeat.repeat_days.join(','),
    })
    load()
  }

  async function saveEdit(id: number, title: string, time: string, repeat: RepeatValue) {
    await api.updateStudyItem(id, {
      title,
      notify_time: time || null,
      notify_days: repeat.repeat_days.join(','),
    })
    setEditingId(null)
    load()
  }

  async function updateProgress(id: number, progress: number) {
    await api.updateStudyProgress(id, progress)
    setItems(p => p.map(i => i.id === id ? { ...i, progress } : i))
  }

  async function remove(id: number) {
    // also remove children
    const children = items.filter(i => i.parent_id === id)
    for (const c of children) await api.deleteStudyItem(c.id)
    await api.deleteStudyItem(id)
    load()
  }

  const allTopLevel  = items.filter(i => !i.parent_id)
  const overallAvg   = allTopLevel.length
    ? Math.round(allTopLevel.reduce((s, i) => {
        const children = items.filter(c => c.parent_id === i.id)
        const avg = children.length
          ? children.reduce((a, c) => a + c.progress, 0) / children.length
          : i.progress
        return s + avg
      }, 0) / allTopLevel.length)
    : 0

  return (
    <div className="space-y-3">
      {/* Overall summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <IconActivity size={15} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Overall Learning Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: overallAvg + '%' }} />
              </div>
              <span className="text-sm font-black text-emerald-600">{overallAvg}%</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gray-800">{allTopLevel.length}</p>
            <p className="text-xs text-gray-400">subjects</p>
          </div>
        </div>
      </div>

      {CATS.map(cat => {
        const parents   = items.filter(i => i.category === cat.key && !i.parent_id)
        const open      = openCats.has(cat.key)

        // category average = avg of parent avg (which may include children)
        const catAvg = parents.length ? Math.round(parents.reduce((s, p) => {
          const ch = items.filter(c => c.parent_id === p.id)
          return s + (ch.length ? ch.reduce((a,c) => a + c.progress, 0) / ch.length : p.progress)
        }, 0) / parents.length) : 0

        return (
          <div key={cat.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Category header */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50"
              style={{ background: `linear-gradient(to right, ${cat.light}, white)` }}
              onClick={() => toggleCat(cat.key)}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.accent }}>
                <IconBook size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{cat.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500">{parents.length} subject{parents.length !== 1 ? 's' : ''}</p>
                  {parents.length > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-gray-200 rounded-full h-1">
                          <div className="h-1 rounded-full" style={{ width: catAvg + '%', backgroundColor: cat.accent }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: cat.accent }}>{catAvg}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setShowForm(showForm === cat.key ? null : cat.key) }}
                className="flex items-center gap-1 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: cat.accent }}
              >
                <IconPlus size={13} />
                <span>Subject</span>
              </button>
              {open ? <IconChevronUp size={16} className="text-gray-400" /> : <IconChevronDown size={16} className="text-gray-400" />}
            </div>

            {open && (
              <div className="px-4 pb-4">
                {/* Add subject form */}
                {showForm === cat.key && (
                  <ItemForm
                    accent={cat.accent} light={cat.light}
                    placeholder="Subject name (e.g. IELTS, Python, Japanese...)"
                    label="Add subject"
                    onSave={(t, time, rep) => addParent(cat.key, t, time, rep)}
                    onCancel={() => setShowForm(null)}
                  />
                )}

                {parents.length === 0 && showForm !== cat.key ? (
                  <div className="py-8 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                      <IconBook size={18} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 text-sm">No subjects yet.</p>
                    <p className="text-gray-300 text-xs mt-0.5">Click <strong>Subject</strong> to add one.</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-3">
                    {parents.map(parent => {
                      const children = items.filter(i => i.parent_id === parent.id)
                      return (
                        <ParentCard
                          key={parent.id}
                          parent={parent}
                          children={children}
                          accent={cat.accent}
                          light={cat.light}
                          onUpdateProgress={updateProgress}
                          onDelete={remove}
                          onAddChild={(pid, t, time, rep) => addChild(pid, cat.key, t, time, rep)}
                          onEditItem={item => setEditingId(editingId === item.id ? null : item.id)}
                          editingId={editingId}
                          onSaveEdit={saveEdit}
                          onCancelEdit={() => setEditingId(null)}
                        />
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
