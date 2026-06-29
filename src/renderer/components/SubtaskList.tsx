import { useEffect, useRef, useState } from 'react'
import { IconPlus, IconX } from './Icons'

const api = (window as any).electronAPI

interface Subtask {
  id: number
  title: string
  is_done: number
}

interface Props {
  parentType: string
  parentId: number
  accentColor?: string
  defaultOpen?: boolean
  onCountChange?: (done: number, total: number) => void
}

export default function SubtaskList({
  parentType,
  parentId,
  accentColor = '#4F46E5',
  defaultOpen = false,
  onCountChange,
}: Props) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [input, setInput]       = useState('')
  const [open, setOpen]         = useState(defaultOpen)
  const inputRef                = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [parentId])

  async function load() {
    const data = await api.getSubtasks(parentType, parentId)
    const list = data || []
    setSubtasks(list)
    onCountChange?.(list.filter((s: Subtask) => s.is_done).length, list.length)
  }

  async function add() {
    const t = input.trim()
    if (!t) return
    await api.createSubtask(parentType, parentId, t)
    setInput('')
    inputRef.current?.focus()
    load()
  }

  async function toggle(id: number) {
    await api.toggleSubtask(id)
    setSubtasks(p => {
      const next = p.map(s => s.id === id ? { ...s, is_done: s.is_done ? 0 : 1 } : s)
      onCountChange?.(next.filter(s => s.is_done).length, next.length)
      return next
    })
  }

  async function remove(id: number) {
    await api.deleteSubtask(id)
    setSubtasks(p => {
      const next = p.filter(s => s.id !== id)
      onCountChange?.(next.filter(s => s.is_done).length, next.length)
      return next
    })
  }

  const done  = subtasks.filter(s => s.is_done).length
  const total = subtasks.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="mt-2.5" onClick={e => e.stopPropagation()}>
      {/* Header row */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-2 w-full text-left mb-1"
      >
        {total > 0 ? (
          <>
            <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
              <div
                className="h-1 rounded-full transition-all"
                style={{ width: pct + '%', backgroundColor: accentColor }}
              />
            </div>
            <span className="text-xs font-medium flex-shrink-0" style={{ color: accentColor }}>
              {done}/{total}
            </span>
          </>
        ) : (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <IconPlus size={10} />
            Add subtasks
          </span>
        )}
        {total > 0 && (
          <span className="text-slate-300 flex-shrink-0 text-xs">
            {open ? '▲' : '▼'}
          </span>
        )}
      </button>

      {/* Subtask list */}
      {open && (
        <div className="space-y-1 border-t border-slate-100 pt-2 mt-1">
          {subtasks.map(s => (
            <div key={s.id} className="flex items-center gap-2 group/sub py-0.5 px-1 rounded-lg hover:bg-slate-50 transition-colors">
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className={'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ' +
                  (s.is_done ? 'border-transparent' : 'border-slate-300 hover:border-opacity-70')}
                style={s.is_done ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
              >
                {s.is_done === 1 && (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className={'text-xs flex-1 ' + (s.is_done ? 'text-slate-400' : 'text-slate-600 font-medium')}>
                {s.title}
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover/sub:opacity-100"
              >
                <IconX size={11} />
              </button>
            </div>
          ))}

          {/* Inline add input */}
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
              <IconPlus size={10} className="text-slate-300" />
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder="Add a step... (Enter to save)"
              className="flex-1 text-xs text-slate-600 bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400 focus:outline-none py-0.5 placeholder:text-slate-300"
            />
            {input && (
              <button type="button" onClick={add}
                className="text-xs font-semibold px-2 py-0.5 rounded-lg text-white flex-shrink-0"
                style={{ backgroundColor: accentColor }}>
                Add
              </button>
            )}
          </div>
        </div>
      )}

      {/* When collapsed but has subtasks, show inline add on hover */}
      {!open && (
        <div
          className="flex items-center gap-2 px-1 py-0.5 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={e => { e.stopPropagation(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        >
          <IconPlus size={10} className="text-slate-300" />
          <span className="text-xs text-slate-300">Add step</span>
        </div>
      )}
    </div>
  )
}
