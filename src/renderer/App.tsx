import { useState } from 'react'
import WorkTab from './components/WorkTab'
import StudyTab from './components/StudyTab'
import UnwindTab from './components/UnwindTab'
import ReportPanel from './components/ReportPanel'
import SettingsModal from './components/SettingsModal'
import { IconBriefcase, IconBook, IconSunset, IconBarChart, IconSettings } from './components/Icons'

type Tab = 'work' | 'study' | 'unwind'

const TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'work',   label: 'WORK',   color: '#4F46E5' },
  { key: 'study',  label: 'STUDY',  color: '#059669' },
  { key: 'unwind', label: 'UNWIND', color: '#EA580C' },
]

const TAB_GRADIENTS: Record<Tab, string> = {
  work:   'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  study:  'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
  unwind: 'linear-gradient(135deg, #EA580C 0%, #DC2626 100%)',
}

function TabIcon({ tab, size = 18 }: { tab: Tab; size?: number }) {
  if (tab === 'work') return <IconBriefcase size={size} />
  if (tab === 'study') return <IconBook size={size} />
  return <IconSunset size={size} />
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('work')
  const [showReport, setShowReport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex flex-col h-screen" style={{ background: '#F1F5F9' }}>
      {/* Header */}
      <div className="flex-shrink-0 shadow-lg" style={{ background: TAB_GRADIENTS[activeTab] }}>
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-xs font-medium tracking-wide">{getGreeting()}</p>
              <h1 className="text-white font-black text-xl tracking-tight leading-none mt-0.5">Schedule Assistant</h1>
              <p className="text-white/50 text-xs mt-1">{formatDate()}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all"
              >
                <IconBarChart size={14} />
                <span>Reports</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 bg-white/15 hover:bg-white/25 text-white rounded-xl flex items-center justify-center transition-all"
              >
                <IconSettings size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-3 pb-0 gap-0.5 mt-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-widest rounded-t-xl transition-all ' + (
                activeTab === t.key
                  ? 'bg-white/20 text-white border-b-2 border-white'
                  : 'text-white/45 hover:text-white/70 hover:bg-white/10'
              )}
            >
              <TabIcon tab={t.key} size={14} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        {activeTab === 'work'   && <WorkTab />}
        {activeTab === 'study'  && <StudyTab />}
        {activeTab === 'unwind' && <UnwindTab />}
      </main>

      {showReport   && <ReportPanel  onClose={() => setShowReport(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
