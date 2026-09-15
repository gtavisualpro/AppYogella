import { useNavigate } from 'react-router-dom'
import { usePractice } from '../lib/hooks'
import { IconVideo, IconLock, IconChevronRight } from '../components/icons'

const CIRC = 2 * Math.PI * 30

export default function Pratique() {
  const navigate = useNavigate()
  const { data } = usePractice(true)

  const weekly = data?.weekly ?? { sessionCount: 0, totalMinutes: 0, goalHours: 5, progressHours: 0 }
  const fraction = Math.min(1, weekly.progressHours / (weekly.goalHours || 1))
  const week = data?.week ?? []

  return (
    <div className="screen">
      <h1 style={{ fontSize: 25, margin: 0 }}>Ma pratique</h1>

      <div style={{ background: 'var(--color-surface)', borderRadius: 28, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>Cette semaine</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
              <div>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24 }}>{weekly.sessionCount}</span>{' '}
                <span style={{ fontSize: 13 }}>séance{weekly.sessionCount === 1 ? '' : 's'}</span>
              </div>
              <div>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24 }}>{weekly.totalMinutes}</span> <span style={{ fontSize: 13 }}>min</span>
              </div>
            </div>
          </div>
          <svg width="74" height="74" viewBox="0 0 74 74">
            <circle cx="37" cy="37" r="30" fill="none" stroke="var(--color-neutral-300)" strokeWidth="8" />
            <circle
              cx="37" cy="37" r="30" fill="none" stroke="var(--color-accent-2-600)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - fraction)} transform="rotate(-90 37 37)"
            />
          </svg>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--color-neutral-700)', marginBottom: 6 }}>
            <span>Objectif hebdomadaire</span>
            <span>
              {weekly.goalHours}h / {weekly.progressHours}h
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--color-neutral-300)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fraction * 100}%`, background: 'var(--color-accent-2-600)', borderRadius: 999 }} />
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Mes routines</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(data?.routines ?? []).map((r) => (
            <button key={r.id} className="list-row" onClick={() => navigate(`/programme/${r.id}`)}>
              <div className="thumb" style={{ width: 74, height: 58 }}>
                {r.locked ? <IconLock size={16} /> : <IconVideo size={18} />}
              </div>
              <div className="body">
                <div className="title">{r.title}</div>
                <div className="meta">{r.meta}</div>
              </div>
              <IconChevronRight size={17} className="chevron" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Cette semaine</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)', borderRadius: 26, padding: '16px 14px' }}>
          {week.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: 'var(--color-neutral-600)' }}>{d.label}</span>
              <span
                style={{
                  width: 26, height: 26, borderRadius: 999,
                  background: d.active ? 'var(--color-accent-2-500)' : 'var(--color-neutral-200)',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
