const DAYS = ['M','T','W','T','F','S','S']
const DAY_FULL = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export type RepeatType = 'daily' | 'weekly' | 'monthly'

export interface RepeatValue {
  repeat_type: RepeatType
  repeat_days: number[]    // 1=Mon … 7=Sun
  repeat_dates: number[]   // 1–31 for monthly
}

interface Props {
  value: RepeatValue
  onChange: (v: RepeatValue) => void
  accentColor?: string
}

function repeatLabel(v: RepeatValue): string {
  if (v.repeat_type === 'daily') return 'Weekdays, no holidays'
  if (v.repeat_type === 'weekly') {
    if (v.repeat_days.length === 0) return 'Select days'
    if (v.repeat_days.length === 7) return 'Every day'
    if (v.repeat_days.length === 5 && !v.repeat_days.includes(6) && !v.repeat_days.includes(7))
      return 'Mon – Fri'
    return v.repeat_days.map(d => DAY_FULL[d - 1]).join(', ')
  }
  if (v.repeat_type === 'monthly') {
    if (v.repeat_dates.length === 0) return 'Select dates'
    return 'Every month on: ' + v.repeat_dates.join(', ')
  }
  return ''
}

export default function RepeatPicker({ value, onChange, accentColor = '#4F46E5' }: Props) {
  function setType(t: RepeatType) {
    onChange({ ...value, repeat_type: t })
  }

  function toggleDay(d: number) {
    const next = value.repeat_days.includes(d)
      ? value.repeat_days.filter(x => x !== d)
      : [...value.repeat_days, d].sort((a, b) => a - b)
    onChange({ ...value, repeat_days: next })
  }

  function toggleDate(d: number) {
    const next = value.repeat_dates.includes(d)
      ? value.repeat_dates.filter(x => x !== d)
      : [...value.repeat_dates, d].sort((a, b) => a - b)
    onChange({ ...value, repeat_dates: next })
  }

  return (
    <div className="space-y-2.5">
      <label className="text-xs text-gray-500 font-medium block">Repeat schedule</label>

      {/* Type selector */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
        {(['daily','weekly','monthly'] as RepeatType[]).map(t => (
          <button
            key={t} type="button"
            onClick={() => setType(t)}
            className={'flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ' + (
              value.repeat_type === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'daily' ? 'Weekdays' : t === 'weekly' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      {/* Daily: info only */}
      {value.repeat_type === 'daily' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
          <span className="text-xs">📅</span>
          <p className="text-xs text-gray-500">Runs Mon–Fri, skips weekends & public holidays</p>
        </div>
      )}

      {/* Weekly: day picker */}
      {value.repeat_type === 'weekly' && (
        <div>
          <div className="flex gap-1">
            {DAYS.map((d, i) => {
              const num = i + 1
              const on  = value.repeat_days.includes(num)
              const isWeekend = num >= 6
              return (
                <button
                  key={i} type="button"
                  onClick={() => toggleDay(num)}
                  className={'flex-1 py-2 rounded-lg text-xs font-bold border transition-all ' + (
                    on
                      ? 'text-white border-transparent'
                      : isWeekend
                        ? 'bg-orange-50 text-orange-300 border-orange-100 hover:border-orange-300'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  )}
                  style={on ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                  title={DAY_FULL[i]}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1.5 pl-0.5">{repeatLabel(value)}</p>
        </div>
      )}

      {/* Monthly: date grid */}
      {value.repeat_type === 'monthly' && (
        <div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
              const on = value.repeat_dates.includes(d)
              return (
                <button
                  key={d} type="button"
                  onClick={() => toggleDate(d)}
                  className={'py-1.5 rounded-lg text-xs font-semibold border transition-all ' + (
                    on ? 'text-white border-transparent' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  )}
                  style={on ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1.5 pl-0.5">{repeatLabel(value)}</p>
        </div>
      )}
    </div>
  )
}
