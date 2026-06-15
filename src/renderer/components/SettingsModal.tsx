import { useEffect, useState } from 'react'
import { IconX, IconBell, IconMail, IconCheck, IconInfo } from './Icons'

const api = (window as any).electronAPI

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ' + (on ? 'bg-indigo-600' : 'bg-gray-200')}
    >
      <span className={'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ' + (on ? 'left-5' : 'left-0.5')} />
    </button>
  )
}

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail]         = useState('')
  const [emailOn, setEmailOn]     = useState(true)
  const [notifyOn, setNotifyOn]   = useState(true)
  const [saved, setSaved]         = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    const [em, ee, ne] = await Promise.all([
      api.getSetting('email_address'),
      api.getSetting('email_enabled'),
      api.getSetting('notify_enabled'),
    ])
    setEmail(em || '')
    setEmailOn(ee !== '0')
    setNotifyOn(ne !== '0')
    setLoading(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await Promise.all([
      api.setSetting('email_address', email),
      api.setSetting('email_enabled', emailOn ? '1' : '0'),
      api.setSetting('notify_enabled', notifyOn ? '1' : '0'),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 text-lg">Settings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Notifications & preferences</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <IconX size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={save} className="p-5 space-y-5">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <>
              {/* Notifications section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconBell size={15} className="text-gray-500" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notifications</p>
                </div>
                <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Desktop reminders</p>
                      <p className="text-xs text-gray-400">Notify at scheduled task times</p>
                    </div>
                    <Toggle on={notifyOn} onToggle={() => setNotifyOn(v => !v)} />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Daily email summary</p>
                      <p className="text-xs text-gray-400">End-of-day report via email</p>
                    </div>
                    <Toggle on={emailOn} onToggle={() => setEmailOn(v => !v)} />
                  </div>
                </div>
              </div>

              {/* Email section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconMail size={15} className="text-gray-500" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email</p>
                </div>
                <input
                  type="email"
                  placeholder="your@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!emailOn}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                />
                {emailOn && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <IconInfo size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-400">Summary email sent weekdays at 17:30</p>
                  </div>
                )}
              </div>

              {/* App info */}
              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">About</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Application</span>
                    <span className="font-semibold text-gray-700">Schedule Assistant</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Version</span>
                    <span className="font-semibold text-gray-700">1.0.0</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Stack</span>
                    <span className="font-semibold text-gray-700">Electron · React · SQLite</span>
                  </div>
                </div>
              </div>

              {/* Save */}
              <button
                type="submit"
                className={'w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ' + (
                  saved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                )}
              >
                {saved ? <><IconCheck size={16} /> Saved!</> : 'Save Settings'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
