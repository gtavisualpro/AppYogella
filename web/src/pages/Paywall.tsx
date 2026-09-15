import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { usePlans } from '../lib/hooks'
import { useToast } from '../lib/ToastContext'
import { api, ApiError } from '../lib/api'
import { IconX, IconLock, IconCheck } from '../components/icons'

const PERKS = [
  'Plus de 300 cours vidéo',
  'Programmes guidés complets',
  'Téléchargement hors connexion',
  'Nouveaux cours chaque semaine',
]

export default function Paywall() {
  const navigate = useNavigate()
  const flash = useToast()
  const { data } = usePlans()
  const [plan, setPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL')

  const checkout = useMutation({
    mutationFn: () => api.post<{ url: string }>('/api/subscription/checkout', { plan }),
    onSuccess: (res) => {
      window.location.href = res.url
    },
    onError: (err) => flash(err instanceof ApiError ? err.message : 'Une erreur est survenue'),
  })

  const plans = data?.plans ?? []
  const selected = plans.find((p) => p.key === plan)

  return (
    <div className="screen" style={{ padding: '6px 22px 30px', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="icon-btn"
          style={{ width: 34, height: 34, background: 'var(--color-neutral-200)', border: 0 }}
          onClick={() => navigate(-1)}
        >
          <IconX size={16} />
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            width: 64, height: 64, borderRadius: 999, background: 'var(--color-accent-600)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconLock size={28} />
        </span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>Accès illimité</h1>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-neutral-700)' }}>
          Tous les cours, programmes et auto-massages, sans limite et hors connexion.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {plans.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlan(p.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '16px 18px', borderRadius: 26, cursor: 'pointer',
              background: plan === p.key ? 'var(--color-accent-100)' : 'var(--color-neutral-100)',
              border: `2px solid ${plan === p.key ? 'var(--color-accent-500)' : 'var(--color-divider)'}`,
              textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
            }}
          >
            <span
              style={{
                width: 22, height: 22, borderRadius: 999, border: `2px solid ${plan === p.key ? 'var(--color-accent-500)' : 'var(--color-divider)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
              }}
            >
              {plan === p.key && <span style={{ width: 11, height: 11, borderRadius: 999, background: 'var(--color-accent-600)' }} />}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{p.title}</div>
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                {p.key === 'ANNUAL' ? 'Sans engagement · 2 mois offerts' : 'Sans engagement'}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>{p.price}</div>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '2px 4px' }}>
        {PERKS.map((k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <IconCheck size={18} style={{ color: 'var(--color-accent-2-600)' }} />
            <span>{k}</span>
          </div>
        ))}
      </div>
      <button
        className="btn btn-primary"
        style={{ padding: 15, fontSize: 15, width: '100%' }}
        disabled={checkout.isPending || !selected}
        onClick={() => checkout.mutate()}
      >
        {selected ? `Continuer — ${selected.price} / ${plan === 'ANNUAL' ? 'an' : 'mois'}` : 'Continuer'}
      </button>
      <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--color-neutral-600)', lineHeight: 1.5 }}>
        Sans engagement, résiliable à tout moment.
        <br />
        Renouvellement automatique.
      </div>
    </div>
  )
}
