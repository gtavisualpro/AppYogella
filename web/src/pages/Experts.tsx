import { useNavigate } from 'react-router-dom'
import { useExperts } from '../lib/hooks'
import { IconChevronLeft } from '../components/icons'

export default function Experts() {
  const navigate = useNavigate()
  const { data: experts } = useExperts()

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconChevronLeft size={17} />
        </button>
        <h1 style={{ fontSize: 22, margin: 0 }}>Nos experts</h1>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(experts ?? []).map((e) => (
          <div key={e.id} className="expert-row">
            <div className="expert-avatar">{e.initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{e.name}</div>
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{e.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
