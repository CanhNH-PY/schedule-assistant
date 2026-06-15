import { useEffect, useState } from 'react'
import { IconRefresh } from './Icons'

interface WeatherData {
  temperature: number
  apparent: number
  humidity: number
  windSpeed: number
  code: number
}

const WMO: Record<number, { label: string; icon: string; gradient: string }> = {
  0:  { label: 'Clear Sky',       icon: '☀️',  gradient: 'from-amber-400 to-orange-500' },
  1:  { label: 'Mostly Clear',    icon: '🌤️',  gradient: 'from-sky-400 to-blue-500' },
  2:  { label: 'Partly Cloudy',   icon: '⛅',   gradient: 'from-slate-400 to-blue-400' },
  3:  { label: 'Overcast',        icon: '☁️',  gradient: 'from-gray-400 to-slate-500' },
  45: { label: 'Foggy',           icon: '🌫️',  gradient: 'from-gray-300 to-slate-400' },
  51: { label: 'Light Drizzle',   icon: '🌦️',  gradient: 'from-sky-500 to-blue-600' },
  61: { label: 'Light Rain',      icon: '🌧️',  gradient: 'from-blue-500 to-indigo-600' },
  63: { label: 'Moderate Rain',   icon: '🌧️',  gradient: 'from-blue-600 to-indigo-700' },
  65: { label: 'Heavy Rain',      icon: '🌧️',  gradient: 'from-blue-700 to-indigo-800' },
  80: { label: 'Rain Showers',    icon: '🌦️',  gradient: 'from-sky-500 to-blue-600' },
  95: { label: 'Thunderstorm',    icon: '⛈️',  gradient: 'from-gray-700 to-slate-800' },
}

function getInfo(code: number) {
  if (WMO[code]) return WMO[code]
  if (code >= 51 && code <= 57)  return WMO[51]
  if (code >= 61 && code <= 67)  return WMO[63]
  if (code >= 80 && code <= 82)  return WMO[80]
  if (code >= 95)                return WMO[95]
  return { label: 'Unknown', icon: '🌡️', gradient: 'from-gray-400 to-gray-500' }
}

export default function WeatherWidget() {
  const [weather, setWeather]   = useState<WeatherData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [updatedAt, setUpdated] = useState('')

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true); setError(false)
    try {
      const res = await window.fetch(
        'https://api.open-meteo.com/v1/forecast' +
        '?latitude=10.8231&longitude=106.6297' +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
        '&timezone=Asia%2FBangkok&forecast_days=1'
      )
      const data = await res.json()
      const c = data.current
      setWeather({
        temperature: Math.round(c.temperature_2m),
        apparent:    Math.round(c.apparent_temperature),
        humidity:    c.relative_humidity_2m,
        windSpeed:   Math.round(c.wind_speed_10m),
        code:        c.weather_code,
      })
      const n = new Date()
      setUpdated(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`)
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 p-5 animate-pulse h-36">
        <div className="h-3 bg-white/30 rounded-full w-1/2 mb-4" />
        <div className="h-10 bg-white/30 rounded-full w-1/3 mb-3" />
        <div className="h-2 bg-white/20 rounded-full w-2/3" />
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-gray-400 to-gray-600 p-5 text-white">
        <p className="font-semibold text-sm mb-1">Failed to load weather</p>
        <p className="text-white/70 text-xs mb-4">Check your internet connection</p>
        <button onClick={fetch} className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg font-semibold transition-colors">
          <IconRefresh size={13} />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  const info = getInfo(weather.code)

  return (
    <div className={'rounded-2xl bg-gradient-to-br ' + info.gradient + ' p-5 text-white shadow-lg'}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Ho Chi Minh City</p>
          <p className="text-white/50 text-xs mt-0.5">Updated at {updatedAt}</p>
        </div>
        <button onClick={fetch} className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition-colors">
          <IconRefresh size={14} className="text-white" />
        </button>
      </div>

      <div className="flex items-center gap-5 mb-5">
        <span className="text-7xl leading-none">{info.icon}</span>
        <div>
          <div className="flex items-start">
            <span className="text-5xl font-black leading-none">{weather.temperature}</span>
            <span className="text-xl font-bold mt-1 ml-0.5">°C</span>
          </div>
          <p className="text-white font-bold text-base mt-1">{info.label}</p>
          <p className="text-white/60 text-xs">Feels like {weather.apparent}°C</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/20">
        <div className="text-center">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Humidity</p>
          <p className="text-white font-bold text-sm mt-1">💧 {weather.humidity}%</p>
        </div>
        <div className="text-center border-x border-white/20">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Wind</p>
          <p className="text-white font-bold text-sm mt-1">💨 {weather.windSpeed} km/h</p>
        </div>
        <div className="text-center">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Condition</p>
          <p className="text-white font-bold text-xs mt-1">{info.label}</p>
        </div>
      </div>
    </div>
  )
}
