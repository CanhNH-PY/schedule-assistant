import { useState } from 'react'
import WorkTab from './components/WorkTab'
import StudyTab from './components/StudyTab'
import UnwindTab from './components/UnwindTab'
import NotificationTab from './components/NotificationTab'
import ReportPanel from './components/ReportPanel'
import SettingsModal from './components/SettingsModal'
import { IconBriefcase, IconBook, IconSunset, IconBarChart, IconSettings } from './components/Icons'

type Tab = 'work' | 'study' | 'unwind' | 'notify'

const TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'work',   label: 'WORK',    color: '#4F46E5' },
  { key: 'study',  label: 'STUDY',   color: '#059669' },
  { key: 'unwind', label: 'UNWIND',  color: '#EA580C' },
  { key: 'notify', label: 'PLAN',    color: '#7C3AED' },
]

const TAB_GRADIENTS: Record<Tab, string> = {
  work:   'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  study:  'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
  unwind: 'linear-gradient(135deg, #EA580C 0%, #DC2626 100%)',
  notify: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
}

function IconBell({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function TabIcon({ tab, size = 18 }: { tab: Tab; size?: number }) {
  if (tab === 'work')   return <IconBriefcase size={size} />
  if (tab === 'study')  return <IconBook size={size} />
  if (tab === 'notify') return <IconBell size={size} />
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
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/55 text-xs font-semibold tracking-widest uppercase">{getGreeting()}</p>
              <h1 className="text-white font-bold text-xl tracking-tight mt-0.5">Schedule Assistant</h1>
              <p className="text-white/45 text-xs mt-0.5">{formatDate()}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all backdrop-blur-sm"
              >
                <IconBarChart size={13} />
                <span>Reports</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center justify-center transition-all"
              >
                <IconSettings size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar — segmented pill control */}
        <div className="mx-1 mb-3 mt-3 rounded-2xl p-1 flex gap-0.5" style={{ background: 'rgba(0,0,0,0.18)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold tracking-wider rounded-xl transition-all duration-150 ' + (
                activeTab === t.key
                  ? 'bg-white shadow-sm'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/10'
              )}
              style={activeTab === t.key ? { color: t.color } : {}}
            >
              <TabIcon tab={t.key} size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto px-3 py-3">
        {activeTab === 'work'   && <WorkTab />}
        {activeTab === 'study'  && <StudyTab />}
        {activeTab === 'unwind' && <UnwindTab />}
        {activeTab === 'notify' && <NotificationTab />}
      </main>

      {showReport   && <ReportPanel  onClose={() => setShowReport(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
