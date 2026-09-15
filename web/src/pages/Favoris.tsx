import { useFavorites } from '../lib/hooks'
import { CourseRow } from '../components/CourseRow'

export default function Favoris() {
  const { data: favorites } = useFavorites(true)

  return (
    <div className="screen">
      <h1 style={{ fontSize: 25, margin: 0 }}>Favoris</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(favorites ?? []).map((c) => (
          <CourseRow key={c.id} course={c} />
        ))}
        {favorites?.length === 0 && <div className="text-muted">Aucun favori pour le moment.</div>}
      </div>
    </div>
  )
}
