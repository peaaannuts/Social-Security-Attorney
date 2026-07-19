export type TabKey = 'home' | 'dashboard' | 'history' | 'settings'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'ホーム', icon: '🏠' },
  { key: 'dashboard', label: 'ダッシュボード', icon: '📊' },
  { key: 'history', label: '履歴', icon: '🕒' },
  { key: 'settings', label: '設定', icon: '⚙️' },
]

export function TabBar({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="mx-auto flex max-w-lg justify-around pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
              active === tab.key
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
