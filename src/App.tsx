import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import Drill from './pages/Drill'
import Stats from './pages/Stats'
import Data from './pages/Data'
import { ensureSeed } from './lib/seedInit'
import { useTheme } from './lib/theme'

export default function App() {
  const { theme, toggle } = useTheme()
  const [ready, setReady] = useState(false)
  const location = useLocation()
  const isDrill = location.pathname.startsWith('/drill')

  useEffect(() => {
    ensureSeed().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950">
        読み込み中…
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <main className="flex-1 px-4 pb-4 pt-3">
          <Routes>
            <Route path="/" element={<Home theme={theme} onToggleTheme={toggle} />} />
            <Route path="/drill" element={<Drill />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/data" element={<Data />} />
          </Routes>
        </main>
        {/* 演習中はナビを隠して集中・誤タップ防止 */}
        {!isDrill && <BottomNav />}
      </div>
    </div>
  )
}
