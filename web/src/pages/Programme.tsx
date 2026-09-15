import { useNavigate, useParams } from 'react-router-dom'
import { useProgram } from '../lib/hooks'
import { useGatedOpen } from '../lib/useGatedOpen'
import { IconChevronLeft, IconVideo, IconLock, IconCheck } from '../components/icons'
import heroPhoto from '../assets/course-photo.webp'

export default function Programme() {
  const { id } = useParams()
  const navigate = useNavigate()
  const open = useGatedOpen()
  const { data: program } = useProgram(id)

  if (!program) return null

  const nextSession = program.sessions.find((s) => !s.done) ?? program.sessions[0]

  return (
    <div>
      <div className="hero-media" style={{ marginTop: -46 }}>
        <img className="washed" src={heroPhoto} alt="" style={{ objectPosition: '50% 45%' }} />
        <button className="icon-btn floating" style={{ position: 'absolute', left: 18, top: 62 }} onClick={() => navigate(-1)}>
          <IconChevronLeft size={17} />
        </button>
      </div>
      <div className="sheet">
        <div>
          <div className="text-muted" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
            Programme
          </div>
          <h1 style={{ fontSize: 26, margin: '6px 0 8px' }}>{program.title}</h1>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-neutral-700)' }}>{program.description}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="tag" style={{ background: 'var(--color-neutral-100)', color: 'var(--color-neutral-800)' }}>
            {program.sessions.length} séances
          </span>
          <span className="tag" style={{ background: 'var(--color-neutral-100)', color: 'var(--color-neutral-800)' }}>
            Tous niveaux
          </span>
        </div>
        {nextSession && (
          <button
            className="btn"
            style={{ background: 'var(--color-accent-2-700)', color: '#fff', padding: 14, fontSize: 15, width: '100%' }}
            onClick={() => open(nextSession)}
          >
            {program.sessions.some((s) => s.done) ? `Reprendre la séance ${nextSession.order}` : 'Commencer le programme'}
          </button>
        )}
        <div>
          <h2 style={{ fontSize: 18, margin: '6px 0 8px' }}>Séances</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {program.sessions.map((s) => (
              <button key={s.id} className="list-row" onClick={() => open(s)}>
                <div className="thumb" style={{ width: 64, height: 56 }}>
                  <IconVideo size={18} />
                  {s.locked && (
                    <span className="lock-badge">
                      <IconLock size={15} />
                    </span>
                  )}
                </div>
                <div className="body">
                  <div className="title">{s.title}</div>
                  <div className="meta">{s.meta}</div>
                </div>
                <span
                  style={{
                    width: 28, height: 28, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                    background: s.done ? 'var(--color-accent-2-700)' : 'var(--color-neutral-200)',
                    color: s.done ? '#fff' : 'var(--color-neutral-500)',
                  }}
                >
                  <IconCheck size={15} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
