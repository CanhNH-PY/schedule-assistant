const DAYS = ['M','T','W','T','F','S','S']
const DAY_FULL = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export type RepeatType = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RepeatValue {
  repeat_type: RepeatType
  repeat_days: number[]    // 1=Mon … 7=Sun
  repeat_dates: number[]   // 1–31 for monthly
  yearly_date?: string     // 'MM-DD' for yearly, e.g. '03-15'
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
  if (v.repeat_type === 'yearly') {
    if (!v.yearly_date) return 'Select date'
    const [mm, dd] = v.yearly_date.split('-').map(Number)
    return `Every year on ${MONTHS[mm - 1]} ${dd}`
  }
  return ''
}

export default function RepeatPicker({ value, onChange, accentColor = '#4F46E5' }: Props) {
  function setType(t: RepeatType) {
    onChange({ ...value, repeat_type: t })
  }

  function setYearlyDate(mm: number, dd: number) {
    const pad = (n: number) => String(n).padStart(2, '0')
    onChange({ ...value, yearly_date: `${pad(mm)}-${pad(dd)}` })
  }

  const [ym, yd] = value.yearly_date
    ? value.yearly_date.split('-').map(Number)
    : [new Date().getMonth() + 1, new Date().getDate()]

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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {(['daily','weekly','monthly','yearly'] as RepeatType[]).map(t => (
          <button
            key={t} type="button"
            onClick={() => setType(t)}
            className={'flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ' + (
              value.repeat_type === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'daily' ? 'Daily' : t === 'weekly' ? 'Weekly' : t === 'monthly' ? 'Monthly' : 'Yearly'}
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

      {/* Yearly: month + day picker */}
      {value.repeat_type === 'yearly' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={ym}
              onChange={e => setYearlyDate(Number(e.target.value), yd)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={yd}
              onChange={e => setYearlyDate(ym, Number(e.target.value))}
              className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-xs">🔁</span>
            <p className="text-xs text-gray-500">{repeatLabel(value)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
