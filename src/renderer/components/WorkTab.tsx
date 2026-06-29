import { useEffect, useState } from 'react'
import { DailyTask, StrategicTask, PRIORITY_COLORS, Priority } from '../../types/index'
import {
  IconCheckCircle, IconTarget, IconPlus, IconX,
  IconChevronUp, IconChevronDown, IconClock, IconFlag, IconCalendar
} from './Icons'
import RepeatPicker, { RepeatValue } from './RepeatPicker'
import MeetingSection from './MeetingSection'
import SubtaskList from './SubtaskList'

const api = (window as any).electronAPI
const todayStr = () => new Date().toISOString().slice(0, 10)

const PRIORITY_OPTS: { value: Priority; label: string }[] = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]

const P_STYLE: Record<Priority, { dot: string; text: string }> = {
  high:   { dot: '#EF4444', text: '#EF4444' },
  medium: { dot: '#F59E0B', text: '#F59E0B' },
  low:    { dot: '#22C55E', text: '#22C55E' },
}

function Badge({ priority }: { priority: Priority }) {
  const s = P_STYLE[priority]
  const label = PRIORITY_OPTS.find(p => p.value === priority)?.label
  return (
    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: s.dot }} />
      {label}
    </span>
  )
}

const defaultDRepeat = (): RepeatValue => ({ repeat_type: 'daily', repeat_days: [1,2,3,4,5], repeat_dates: [] })
const defaultSRepeat = (): RepeatValue => ({ repeat_type: 'daily', repeat_days: [1,2,3,4,5], repeat_dates: [] })

export default function WorkTab() {
  const [dailyTasks, setDailyTasks]     = useState<DailyTask[]>([])
  const [strategic, setStrategic]       = useState<StrategicTask[]>([])
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [dailyOpen, setDailyOpen]       = useState(true)
  const [stratOpen, setStratOpen]       = useState(true)
  const [completedGoalsOpen, setCompletedGoalsOpen] = useState(false)
  const [subtaskCounts, setSubtaskCounts] = useState<Record<number, { done: number; total: number }>>({})
  const [showDForm, setShowDForm]       = useState(false)
  const [showSForm, setShowSForm]       = useState(false)

  // Add forms
  const [dForm, setDForm] = useState({ title: '', priority: 'medium' as Priority, notify_time: '08:00' })
  const [dRepeat, setDRepeat] = useState<RepeatValue>(defaultDRepeat())
  const [sForm, setSForm] = useState({ title: '', priority: 'medium' as Priority, deadline: todayStr() })
  const [sRepeat, setSRepeat] = useState<RepeatValue>(defaultSRepeat())

  // Edit state — daily task
  const [editDId, setEditDId]     = useState<number | null>(null)
  const [editDForm, setEditDForm] = useState({ title: '', priority: 'medium' as Priority, notify_time: '08:00' })
  const [editDRepeat, setEditDRepeat] = useState<RepeatValue>(defaultDRepeat())

  // Edit state — strategic task
  const [editSId, setEditSId]     = useState<number | null>(null)
  const [editSForm, setEditSForm] = useState({ title: '', priority: 'medium' as Priority, deadline: todayStr() })
  const [editSRepeat, setEditSRepeat] = useState<RepeatValue>(defaultSRepeat())

  useEffect(() => { load() }, [])

  async function load() {
    const [tasks, sum, strats] = await Promise.all([
      api.getDailyTasks(),
      api.getDailySummary(todayStr()),
      api.getStrategicTasks(),
    ])
    const today = todayStr()
    setDailyTasks((tasks || []).filter((t: DailyTask) => {
      if (t.is_active !== 1) return false
      // Hide non-recurring tasks completed on a previous day
      if (!t.repeat_type && t.last_completed_date && t.last_completed_date < today) return false
      return true
    }))
    const done = new Set<number>(
      ((sum?.completed_tasks) || []).map((t: any) => Number(t.task_id))
    )
    for (const t of (tasks || [])) {
      if (t.completed_at) done.add(t.id)
    }
    setCompletedIds(done)
    setStrategic(strats || [])
  }

  function notifyPlan() { window.dispatchEvent(new CustomEvent('schedule-updated')) }

  async function complete(id: number) {
    await api.completeTask(id, todayStr())
    setCompletedIds(p => new Set([...p, id]))
    notifyPlan()
  }

  async function uncomplete(id: number) {
    await api.uncompleteTask(id, todayStr())
    setCompletedIds(p => { const s = new Set(p); s.delete(id); return s })
    notifyPlan()
  }

  async function deleteDaily(id: number) {
    if (!confirm('Remove this task?')) return
    await api.deleteDailyTask(id)
    setDailyTasks(p => p.filter(t => t.id !== id))
  }

  async function addDaily(e: React.FormEvent) {
    e.preventDefault()
    await api.createDailyTask({
      ...dForm,
      repeat_type:  dRepeat.repeat_type,
      repeat_days:  dRepeat.repeat_days.join(','),
      repeat_dates: dRepeat.repeat_dates.join(',') || null,
    })
    setDForm({ title: '', priority: 'medium', notify_time: '08:00' })
    setDRepeat(defaultDRepeat())
    setShowDForm(false)
    load()
  }

  function startEditDaily(task: DailyTask) {
    setEditDId(task.id)
    const rtype = (task.repeat_type as any) || 'daily'
    const days = task.repeat_days
      ? task.repeat_days.split(',').map(Number).filter(Boolean)
      : [1,2,3,4,5]
    const dates = (rtype === 'yearly' || !task.repeat_dates)
      ? []
      : task.repeat_dates.split(',').map(Number).filter(Boolean)
    const yearly_date = rtype === 'yearly' ? (task.repeat_dates || '') : ''
    setEditDForm({ title: task.title, priority: task.priority, notify_time: task.notify_time })
    setEditDRepeat({ repeat_type: rtype, repeat_days: days, repeat_dates: dates, yearly_date })
    setShowDForm(false)
  }

  async function saveEditDaily(e: React.FormEvent) {
    e.preventDefault()
    if (editDId == null) return
    await api.updateDailyTask(editDId, {
      ...editDForm,
      repeat_type:  editDRepeat.repeat_type,
      repeat_days:  editDRepeat.repeat_days.join(','),
      repeat_dates: editDRepeat.repeat_dates.join(',') || null,
    })
    setEditDId(null)
    load()
  }

  async function deleteStrat(id: number) {
    if (!confirm('Remove this goal?')) return
    await api.deleteStrategicTask(id)
    setStrategic(p => p.filter(t => t.id !== id))
  }

  async function updateProgress(id: number, progress: number) {
    await api.updateStrategicProgress(id, progress)
    setStrategic(p => p.map(t => t.id === id ? { ...t, progress } : t))
    notifyPlan()
  }

  async function addStrat(e: React.FormEvent) {
    e.preventDefault()
    await api.createStrategicTask({
      ...sForm,
      reminder_type: sRepeat.repeat_type,
      reminder_days: sRepeat.repeat_days.join(','),
    })
    setSForm({ title: '', priority: 'medium', deadline: todayStr() })
    setSRepeat(defaultSRepeat())
    setShowSForm(false)
    load()
  }

  function startEditStrat(task: StrategicTask) {
    setEditSId(task.id)
    const days = (task as any).reminder_days
      ? (task as any).reminder_days.split(',').map(Number).filter(Boolean)
      : [1,2,3,4,5]
    setEditSForm({ title: task.title, priority: task.priority, deadline: task.deadline })
    setEditSRepeat({ repeat_type: (task as any).reminder_type || 'daily', repeat_days: days, repeat_dates: [] })
    setShowSForm(false)
  }

  async function saveEditStrat(e: React.FormEvent) {
    e.preventDefault()
    if (editSId == null) return
    await api.updateStrategicTask(editSId, {
      ...editSForm,
      reminder_type: editSRepeat.repeat_type,
      reminder_days: editSRepeat.repeat_days.join(','),
    })
    setEditSId(null)
    load()
  }

  const doneCount       = dailyTasks.filter(t => completedIds.has(t.id)).length
  const dailyPct        = dailyTasks.length ? Math.round((doneCount / dailyTasks.length) * 100) : 0
  const activeStrategic    = strategic.filter(t => t.progress < 100)
  const completedStrategic = strategic.filter(t => t.progress >= 100)
  const stratAvg        = activeStrategic.length ? Math.round(activeStrategic.reduce((s, t) => s + t.progress, 0) / activeStrategic.length) : 0

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Tasks</p>
            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg">{dailyPct}%</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-800">{doneCount}</span>
            <span className="text-sm text-slate-400">/ {dailyTasks.length}</span>
          </div>
          <div className="mt-2.5 bg-slate-100 rounded-full h-1">
            <div className="bg-indigo-500 h-1 rounded-full transition-all" style={{ width: dailyPct + '%' }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Goals</p>
            <span className="text-xs font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-lg">{stratAvg}%</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-800">{activeStrategic.length}</span>
            <span className="text-sm text-slate-400">active</span>
          </div>
          <div className="mt-2.5 bg-slate-100 rounded-full h-1">
            <div className="bg-violet-500 h-1 rounded-full transition-all" style={{ width: stratAvg + '%' }} />
          </div>
        </div>
      </div>

      {/* Daily Tasks */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-50"
          onClick={() => setDailyOpen(o => !o)}
        >
          <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <IconCheckCircle size={14} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">Daily Tasks</p>
            <p className="text-xs text-slate-400">{doneCount} of {dailyTasks.length} done today</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setShowDForm(v => !v); setEditDId(null) }}
            className="flex items-center gap-1 text-indigo-600 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-colors"
          >
            <IconPlus size={12} />
            <span>Add</span>
          </button>
          {dailyOpen ? <IconChevronUp size={15} className="text-slate-300" /> : <IconChevronDown size={15} className="text-slate-300" />}
        </div>

        {dailyOpen && (
          <div className="px-4 pb-4">
            {/* Add form */}
            {showDForm && (
              <form onSubmit={addDaily} className="mt-3 p-3.5 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                <input
                  required autoFocus
                  placeholder="Task name..."
                  value={dForm.title}
                  onChange={e => setDForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <div className="flex gap-2">
                  <select
                    value={dForm.priority}
                    onChange={e => setDForm(p => ({ ...p, priority: e.target.value as Priority }))}
                    className="flex-1 border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input
                    type="time"
                    value={dForm.notify_time}
                    onChange={e => setDForm(p => ({ ...p, notify_time: e.target.value }))}
                    className="flex-1 border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
                <RepeatPicker value={dRepeat} onChange={setDRepeat} accentColor="#4F46E5" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700">Save</button>
                  <button type="button" onClick={() => setShowDForm(false)} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                </div>
              </form>
            )}

            {dailyTasks.length === 0 && !showDForm ? (
              <div className="py-7 text-center">
                <div className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-2">
                  <IconCheckCircle size={18} className="text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm">No tasks yet. Click Add to create one.</p>
              </div>
            ) : (
              <div className="space-y-2 mt-3">
                {dailyTasks.map(task => {
                  const done = completedIds.has(task.id)

                  // Inline edit form for this task
                  if (editDId === task.id) {
                    return (
                      <form key={task.id} onSubmit={saveEditDaily}
                        className="p-3.5 bg-indigo-50 rounded-xl space-y-3 border border-indigo-200">
                        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Edit Task</p>
                        <input
                          required autoFocus
                          value={editDForm.title}
                          onChange={e => setEditDForm(p => ({ ...p, title: e.target.value }))}
                          className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <div className="flex gap-2">
                          <select
                            value={editDForm.priority}
                            onChange={e => setEditDForm(p => ({ ...p, priority: e.target.value as Priority }))}
                            className="flex-1 border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
                          >
                            {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <input
                            type="time"
                            value={editDForm.notify_time}
                            onChange={e => setEditDForm(p => ({ ...p, notify_time: e.target.value }))}
                            className="flex-1 border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                        </div>
                        <RepeatPicker value={editDRepeat} onChange={setEditDRepeat} accentColor="#4F46E5" />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold">Save</button>
                          <button type="button" onClick={() => setEditDId(null)}
                            className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                        </div>
                      </form>
                    )
                  }

                  return (
                    <div key={task.id}
                      className={'px-3 py-2.5 rounded-xl border transition-all ' + (done ? 'bg-emerald-50/40 border-emerald-100/80' : 'bg-white border-slate-100 hover:border-indigo-200/60 hover:shadow-sm')}
                    >
                      {/* Top row */}
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => !done && startEditDaily(task)}>
                        <button
                          onClick={e => { e.stopPropagation(); !done && complete(task.id) }}
                          disabled={done}
                          className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ' + (done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-indigo-400')}
                        >
                          {done && <IconCheckCircle size={11} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={'text-sm font-medium ' + (done ? 'text-emerald-700' : 'text-slate-800')}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <div className="flex items-center gap-1">
                              <IconClock size={10} className="text-gray-400" />
                              <p className="text-xs text-gray-400">{task.notify_time}</p>
                            </div>
                            {task.repeat_type && task.repeat_type !== 'daily' && (
                              <span className="text-xs bg-indigo-50 text-indigo-500 border border-indigo-100 px-1.5 py-0.5 rounded-md font-medium">
                                {task.repeat_type === 'weekly'
                                  ? 'Weekly · ' + (task.repeat_days || '').split(',').map((d:string) => ['','M','T','W','T','F','S','S'][+d] || d).join('')
                                  : task.repeat_type === 'yearly'
                                  ? '🔁 Yearly · ' + (task.repeat_dates || '')
                                  : 'Monthly · ' + (task.repeat_dates || '').split(',').join(',')}
                              </span>
                            )}
                            {(!task.repeat_type || task.repeat_type === 'daily') && (
                              <span className="text-xs text-gray-400">Weekdays</span>
                            )}
                            {done && <span className="text-xs text-emerald-500 font-medium">Done today</span>}
                          </div>
                        </div>
                        <Badge priority={task.priority} />
                        {done && (
                          <button
                            title="Reopen task"
                            onClick={e => { e.stopPropagation(); uncomplete(task.id) }}
                            className="text-emerald-400 hover:text-amber-500 transition-colors ml-1 text-xs font-bold px-1.5 py-0.5 rounded border border-emerald-200 hover:border-amber-300"
                          >
                            ↩
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteDaily(task.id) }}
                          className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                        >
                          <IconX size={16} />
                        </button>
                      </div>
                      {/* Subtasks */}
                      <SubtaskList parentType="daily" parentId={task.id} accentColor="#4F46E5" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Strategic Goals */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-50"
          onClick={() => setStratOpen(o => !o)}
        >
          <div className="w-7 h-7 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <IconTarget size={14} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">Strategic Goals</p>
            <p className="text-xs text-slate-400">{activeStrategic.length} active · {stratAvg}% avg</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setShowSForm(v => !v); setEditSId(null) }}
            className="flex items-center gap-1 text-violet-600 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-violet-100 hover:bg-violet-50 transition-colors"
          >
            <IconPlus size={12} />
            <span>Add</span>
          </button>
          {stratOpen ? <IconChevronUp size={15} className="text-slate-300" /> : <IconChevronDown size={15} className="text-slate-300" />}
        </div>

        {stratOpen && (
          <div className="px-4 pb-4">
            {/* Add form */}
            {showSForm && (
              <form onSubmit={addStrat} className="mt-3 p-3.5 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                <input
                  required autoFocus
                  placeholder="Goal name..."
                  value={sForm.title}
                  onChange={e => setSForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <div className="flex gap-2">
                  <select
                    value={sForm.priority}
                    onChange={e => setSForm(p => ({ ...p, priority: e.target.value as Priority }))}
                    className="flex-1 border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input
                    type="date"
                    value={sForm.deadline}
                    onChange={e => setSForm(p => ({ ...p, deadline: e.target.value }))}
                    className="flex-1 border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
                <RepeatPicker value={sRepeat} onChange={setSRepeat} accentColor="#7C3AED" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-violet-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-violet-700">Save</button>
                  <button type="button" onClick={() => setShowSForm(false)} className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                </div>
              </form>
            )}

            {activeStrategic.length === 0 && !showSForm ? (
              <div className="py-7 text-center">
                <div className="w-9 h-9 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-2">
                  <IconTarget size={18} className="text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm">No active goals. Click Add to get started.</p>
              </div>
            ) : (
              <div className="space-y-2.5 mt-3">
                {activeStrategic.map(task => {
                  const daysLeft = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)
                  const overdue  = daysLeft < 0
                  const urgent   = !overdue && daysLeft <= 3

                  // Inline edit form for this goal
                  if (editSId === task.id) {
                    return (
                      <form key={task.id} onSubmit={saveEditStrat}
                        className="p-3.5 bg-violet-50 rounded-xl space-y-3 border border-violet-200">
                        <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide">Edit Goal</p>
                        <input
                          required autoFocus
                          value={editSForm.title}
                          onChange={e => setEditSForm(p => ({ ...p, title: e.target.value }))}
                          className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                        <div className="flex gap-2">
                          <select
                            value={editSForm.priority}
                            onChange={e => setEditSForm(p => ({ ...p, priority: e.target.value as Priority }))}
                            className="flex-1 border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white"
                          >
                            {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <input
                            type="date"
                            value={editSForm.deadline}
                            onChange={e => setEditSForm(p => ({ ...p, deadline: e.target.value }))}
                            className="flex-1 border border-violet-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                        </div>
                        <RepeatPicker value={editSRepeat} onChange={setEditSRepeat} accentColor="#7C3AED" />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 bg-violet-600 text-white py-2 rounded-xl text-sm font-semibold">Save</button>
                          <button type="button" onClick={() => setEditSId(null)}
                            className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                        </div>
                      </form>
                    )
                  }

                  const sc = subtaskCounts[task.id]

                  return (
                    <div key={task.id}
                      className="rounded-xl border border-slate-100 bg-white hover:shadow-sm hover:border-violet-200/60 transition-all overflow-hidden"
                    >
                      {/* Goal header — click to edit */}
                      <div
                        className="px-3.5 pt-3 pb-2.5 cursor-pointer"
                        onClick={() => startEditStrat(task)}
                      >
                        <div className="flex items-start gap-2 mb-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                              <Badge priority={task.priority} />
                              {sc && sc.total > 0 && (
                                <span className="text-xs text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-lg font-medium">
                                  {sc.done}/{sc.total} steps
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <IconCalendar size={10} className={overdue ? 'text-red-400' : urgent ? 'text-amber-500' : 'text-slate-300'} />
                              <p className={'text-xs ' + (overdue ? 'text-red-500 font-medium' : urgent ? 'text-amber-500 font-medium' : 'text-slate-400')}>
                                {overdue ? 'Overdue · ' + task.deadline : urgent ? daysLeft + 'd left · ' + task.deadline : task.deadline}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 mr-1">
                            <p className="text-xl font-bold text-violet-600 leading-none">{task.progress}<span className="text-xs font-normal text-slate-400">%</span></p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteStrat(task.id) }}
                            className="text-slate-200 hover:text-red-400 transition-colors mt-0.5"
                          >
                            <IconX size={15} />
                          </button>
                        </div>
                        <div className="bg-slate-100 rounded-full h-1.5 mb-2">
                          <div
                            className={'h-1.5 rounded-full transition-all ' + (task.progress >= 100 ? 'bg-emerald-500' : 'bg-violet-500')}
                            style={{ width: task.progress + '%' }}
                          />
                        </div>
                        <input
                          type="range" min={0} max={100} value={task.progress}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); updateProgress(task.id, Number(e.target.value)) }}
                          className="w-full accent-violet-500 h-1"
                        />
                      </div>

                      {/* Subtasks section — always visible, separated */}
                      <div className="border-t border-slate-100 px-3.5 pb-3">
                        <SubtaskList
                          parentType="strategic"
                          parentId={task.id}
                          accentColor="#7C3AED"
                          defaultOpen={true}
                          onCountChange={(done, total) =>
                            setSubtaskCounts(p => ({ ...p, [task.id]: { done, total } }))
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedStrategic.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
            onClick={() => setCompletedGoalsOpen(o => !o)}
            style={{ background: 'linear-gradient(to right, #F0FDF4, #ECFDF5)' }}
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <IconCheckCircle size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-700 text-sm">Completed Goals</p>
              <p className="text-xs text-gray-400">{completedStrategic.length} goals at 100%</p>
            </div>
            {completedGoalsOpen ? <IconChevronUp size={16} className="text-gray-400" /> : <IconChevronDown size={16} className="text-gray-400" />}
          </div>
          {completedGoalsOpen && (
            <div className="px-4 pb-4 space-y-2.5 mt-3">
              {completedStrategic.map(task => (
                <div key={task.id} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <IconCheckCircle size={13} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 line-through decoration-emerald-400">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.deadline} · <Badge priority={task.priority} /></p>
                  </div>
                  <button
                    onClick={() => deleteStrat(task.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <IconX size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meetings */}
      <MeetingSection />
    </div>
  )
}
