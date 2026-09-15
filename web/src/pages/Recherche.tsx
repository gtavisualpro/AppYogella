import { useMemo, useState } from 'react'
import { useCourses } from '../lib/hooks'
import { CourseRow } from '../components/CourseRow'
import { IconSearch, IconX, IconMenu } from '../components/icons'
import { Loader } from '../components/Loader'

const TABS = ['Tout', 'Yoga', 'Auto-massages', 'Comprendre son corps']

export default function Recherche() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('Tout')
  const { data: courses, isPending } = useCourses({ search: query || undefined, universe: tab === 'Tout' ? undefined : tab })

  const groups = useMemo(() => {
    const list = courses ?? []
    if (tab !== 'Tout') return [{ title: tab, items: list }]
    const byUniverse = new Map<string, typeof list>()
    for (const c of list) {
      if (!byUniverse.has(c.universe)) byUniverse.set(c.universe, [])
      byUniverse.get(c.universe)!.push(c)
    }
    return [...byUniverse.entries()].map(([title, items]) => ({ title, items }))
  }, [courses, tab])

  if (isPending) return <Loader />

  return (
    <div className="screen-tight">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: 'var(--color-surface)', borderRadius: 999, padding: '11px 16px' }}>
          <IconSearch size={17} strokeWidth={2.6} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un cours"
            style={{ flex: 1, minWidth: 0, border: 0, background: 'none', outline: 'none', fontSize: 14, color: 'var(--color-text)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
              <IconX size={16} strokeWidth={2.6} />
            </button>
          )}
        </div>
        <span
          style={{ width: 42, height: 42, borderRadius: 999, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
        >
          <IconMenu size={17} />
        </span>
      </div>

      <div className="pill-row" style={{ padding: '0 20px' }}>
        {TABS.map((t) => (
          <button key={t} className={`pill${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groups.map((g) => (
          <div key={g.title}>
            <div className="section-title-row">
              <h2 style={{ fontSize: 17 }}>{g.title}</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {g.items.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <div className="text-muted">Aucun résultat pour cette recherche.</div>}
      </div>
    </div>
  )
}
