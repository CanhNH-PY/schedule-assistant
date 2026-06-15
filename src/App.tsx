import { useState } from 'react'

type Tab = 'work' | 'study' | 'unwind'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('work')

  return (
    <div className="flex flex-col h-screen">
      {/* Tab bar */}
      <nav className="flex border-b border-gray-200 bg-white shadow-sm">
        {(['work', 'study', 'unwind'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 font-semibold text-sm uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'work' ? 'Work' : tab === 'study' ? 'Study' : 'Unwind'}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'work' && <div className="text-gray-400">Tab Work — đang xây dựng...</div>}
        {activeTab === 'study' && <div className="text-gray-400">Tab Study — đang xây dựng...</div>}
        {activeTab === 'unwind' && <div className="text-gray-400">Tab Unwind — đang xây dựng...</div>}
      </main>
    </div>
  )
}
