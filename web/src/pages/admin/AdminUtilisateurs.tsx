import { useAdminUsers, useUpdateUser } from '../../lib/adminHooks'
import { IconCircleCheck, IconCirclePause } from '../../components/icons'

const PLAN_COLORS: Record<string, { bg: string; fg: string }> = {
  Aucun: { bg: 'var(--color-neutral-300)', fg: 'var(--color-neutral-800)' },
  Essai: { bg: 'var(--color-accent-200)', fg: 'var(--color-accent-800)' },
  Mensuel: { bg: 'var(--color-accent-2-200)', fg: 'var(--color-accent-2-800)' },
  Annuel: { bg: 'var(--color-accent-2-200)', fg: 'var(--color-accent-2-800)' },
}

export default function AdminUtilisateurs() {
  const { data } = useAdminUsers()
  const updateUser = useUpdateUser()

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 9 }}>
        <div className="stat-tile">
          <div className="value">{data?.stats.total ?? 0}</div>
          <div className="label">comptes</div>
        </div>
        <div className="stat-tile">
          <div className="value">{data?.stats.activeSubscriptions ?? 0}</div>
          <div className="label">abonnements actifs</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(data?.users ?? []).map((u) => {
          const colors = PLAN_COLORS[u.plan]
          return (
            <div key={u.id} className="catalog-row">
              <span className="expert-avatar" style={{ width: 38, height: 38, fontSize: 15 }}>{u.initial}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </div>
              </div>
              <button
                className="tag"
                style={{ border: 0, cursor: 'pointer', background: colors.bg, color: colors.fg }}
                onClick={() => updateUser.mutate({ id: u.id, cyclePlan: true })}
              >
                {u.plan}
              </button>
              <button
                style={{ border: 0, background: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: u.active ? 'var(--color-accent-2-700)' : 'var(--color-accent-700)' }}
                onClick={() => updateUser.mutate({ id: u.id, active: !u.active })}
              >
                {u.active ? <IconCircleCheck size={20} /> : <IconCirclePause size={20} />}
              </button>
            </div>
          )
        })}
      </div>
      <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        Touchez l'étiquette pour changer de formule, l'icône pour suspendre ou réactiver le compte.
      </div>
    </div>
  )
}
