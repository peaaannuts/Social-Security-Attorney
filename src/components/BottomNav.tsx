import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/stats', label: '成績', icon: '📊' },
  { to: '/data', label: 'データ', icon: '🗂️' },
]

export default function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <span className="text-xl leading-none">{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
