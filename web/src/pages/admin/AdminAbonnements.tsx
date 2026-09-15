import { useState } from 'react'
import { useAdminPlans, useUpdatePlan, useUpdateSettings, useAdminStats } from '../../lib/adminHooks'

const TRIAL_OPTIONS = [
  { label: 'Aucun', days: 0 },
  { label: '7 jours', days: 7 },
  { label: '14 jours', days: 14 },
]

export default function AdminAbonnements() {
  const { data } = useAdminPlans()
  const { data: stats } = useAdminStats()
  const updatePlan = useUpdatePlan()
  const updateSettings = useUpdateSettings()
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--color-accent-2-100)', border: '1px solid var(--color-accent-2-300)', borderRadius: 28, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-accent-2-800)' }}>
          Revenus récurrents
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 30, color: 'var(--color-accent-2-900)' }}>{stats?.mrr ?? '—'}</span>
          <span style={{ fontSize: 13, color: 'var(--color-accent-2-800)' }}>/ mois estimés</span>
        </div>
        <div style={{ display: 'flex', gap: 18, fontSize: 12.5, color: 'var(--color-accent-2-800)' }}>
          <span>{stats?.activeCount ?? 0} abonnées actives</span>
          <span>{stats?.trialCount ?? 0} en essai</span>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>Formules</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(data?.plans ?? []).map((p) => (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 26, background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.title}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {p.subscriberCount} abonnées · {p.active ? 'en vente' : 'retirée de la vente'}
                </div>
              </div>
              <input
                className="input"
                style={{ width: 78, textAlign: 'center', background: 'var(--color-surface)' }}
                value={priceDrafts[p.key] ?? p.price}
                onChange={(e) => setPriceDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
                onBlur={(e) => updatePlan.mutate({ key: p.key, price: e.target.value })}
              />
              <button
                className="switch"
                style={{ background: p.active ? 'var(--color-accent-2-600)' : 'var(--color-neutral-400)', justifyContent: p.active ? 'flex-end' : 'flex-start' }}
                onClick={() => updatePlan.mutate({ key: p.key, active: !p.active })}
              >
                <span className="knob" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>Essai gratuit</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {TRIAL_OPTIONS.map((t) => (
            <button
              key={t.label}
              className={`pill${data?.trialDays === t.days ? ' active' : ''}`}
              style={{ flex: 1, textAlign: 'center', padding: '10px 0' }}
              onClick={() => updateSettings.mutate({ trialDays: t.days })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
