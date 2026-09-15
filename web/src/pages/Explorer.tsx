import { useNavigate } from 'react-router-dom'
import { useUniverses } from '../lib/hooks'
import { api } from '../lib/api'
import type { Course, ProgramSummary } from '../lib/api'

export default function Explorer() {
  const navigate = useNavigate()
  const { data: universes } = useUniverses()

  async function onSelect(u: NonNullable<typeof universes>[number]) {
    if (u.dest === 'categorie') {
      navigate(`/categorie/${u.slug}`)
    } else if (u.dest === 'article') {
      const { courses } = await api.get<{ courses: Course[] }>(`/api/courses?kind=ARTICLE`)
      if (courses[0]) navigate(`/article/${courses[0].id}`)
    } else if (u.dest === 'programme') {
      const { programs } = await api.get<{ programs: ProgramSummary[] }>(`/api/programs`)
      if (programs[0]) navigate(`/programme/${programs[0].id}`)
    }
  }

  return (
    <div className="screen">
      <div className="text-muted" style={{ fontSize: 14 }}>Explorer</div>
      <h1 style={{ fontSize: 25, margin: 0 }}>Nos univers</h1>
      <div className="card-grid">
        {(universes ?? []).map((u) => (
          <button key={u.id} className="univers-tile" style={{ background: u.bg, color: u.fg }} onClick={() => onSelect(u)}>
            <span className="label">{u.label}</span>
            <span className="blob" />
          </button>
        ))}
      </div>
    </div>
  )
}
