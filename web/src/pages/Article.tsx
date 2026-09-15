import { useNavigate, useParams } from 'react-router-dom'
import { useCourse, useCourses } from '../lib/hooks'
import { useGatedOpen } from '../lib/useGatedOpen'
import { CourseRow } from '../components/CourseRow'
import { IconChevronLeft, IconBookmark, IconPlay, IconLock } from '../components/icons'
import { Loader } from '../components/Loader'

export default function Article() {
  const { id } = useParams()
  const navigate = useNavigate()
  const open = useGatedOpen()
  const { data: article } = useCourse(id)
  const { data: sameUniverse } = useCourses({ universe: article?.universe })

  if (!article) return <Loader />
  const related = (sameUniverse ?? []).filter((c) => c.id !== article.id)

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconChevronLeft size={17} />
        </button>
        <IconBookmark size={19} />
      </div>
      <div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>{article.universe}</div>
        <h1 style={{ fontSize: 25, margin: '0 0 12px' }}>{article.title}</h1>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <p style={{ margin: 0, flex: 1, fontSize: 14.5, lineHeight: 1.55, color: 'var(--color-neutral-700)' }}>
            {article.body ?? 'Le contenu de cet article sera bientôt disponible.'}
          </p>
          <button
            className="icon-btn"
            style={{ width: 52, height: 52, background: 'var(--color-accent-2-700)', color: '#fff', border: 0 }}
            onClick={() => open(article)}
          >
            {article.locked ? <IconLock size={20} /> : <IconPlay size={20} />}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12.5, color: 'var(--color-neutral-600)' }}>
          <span>{article.meta}</span>
          {article.authorName && (
            <span>
              {article.authorName}
              {article.authorRole ? `, ${article.authorRole}` : ''}
            </span>
          )}
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--color-divider)' }} />
      {related.length > 0 && (
        <div>
          <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>Dans la même catégorie</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {related.map((r) => (
              <CourseRow key={r.id} course={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
