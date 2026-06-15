import { useEffect, useRef, useState } from 'react'
import { IconPlus, IconX, IconCheckCircle, IconChevronDown, IconChevronUp } from './Icons'

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
  /** Callback fired when done-count changes (for badge in parent) */
  onCountChange?: (done: number, total: number) => void
}

export default function SubtaskList({ parentType, parentId, accentColor = '#4F46E5', onCountChange }: Props) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState('')
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
    <div className="mt-2" onClick={e => e.stopPropagation()}>
      {/* Toggle bar */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-1.5 w-full text-left group"
      >
        {/* Mini progress bar */}
        <div className="flex-1 bg-gray-100 rounded-full h-1 overflow-hidden">
          {total > 0 && (
            <div
              className="h-1 rounded-full transition-all"
              style={{ width: pct + '%', backgroundColor: accentColor }}
            />
          )}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: total > 0 ? accentColor : '#9CA3AF' }}>
          {total > 0 ? done + '/' + total + ' subtasks' : 'Add subtasks'}
        </span>
        <span className="text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0">
          {open ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-1 pl-1">
          {subtasks.map(s => (
            <div key={s.id} className="flex items-center gap-2 group/sub py-0.5">
              <button
                type="button"
                onClick={() => toggle(s.id)}
                className={'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ' +
                  (s.is_done ? 'border-transparent' : 'border-gray-300 hover:border-opacity-70')}
                style={s.is_done ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
              >
                {s.is_done === 1 && (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className={'text-xs flex-1 ' + (s.is_done ? 'line-through text-gray-400' : 'text-gray-600')}>
                {s.title}
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover/sub:opacity-100"
              >
                <IconX size={12} />
              </button>
            </div>
          ))}

          {/* Inline add */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
              <IconPlus size={10} className="text-gray-300" />
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder="Add a step..."
              className="flex-1 text-xs text-gray-600 bg-transparent border-b border-dashed border-gray-200 focus:border-gray-400 focus:outline-none py-0.5"
            />
            {input && (
              <button type="button" onClick={add}
                className="text-xs font-semibold px-2 py-0.5 rounded-md text-white flex-shrink-0"
                style={{ backgroundColor: accentColor }}>
                Add
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
