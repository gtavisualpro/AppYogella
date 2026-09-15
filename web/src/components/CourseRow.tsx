import type { Course } from '../lib/api'
import { IconVideo, IconLock, IconChevronRight } from './icons'
import { useGatedOpen } from '../lib/useGatedOpen'

export function CourseRow({ course, showChevron = false }: { course: Course; showChevron?: boolean }) {
  const open = useGatedOpen()

  return (
    <button className="list-row" onClick={() => open(course)}>
      <div className="thumb">
        {course.thumbnailUrl ? <img src={course.thumbnailUrl} alt="" /> : <IconVideo size={20} />}
        {course.locked && (
          <span className="lock-badge">
            <IconLock size={15} />
          </span>
        )}
      </div>
      <div className="body">
        <div className="title">{course.title}</div>
        <div className="meta">
          {course.universe} · {course.meta}
        </div>
      </div>
      {showChevron && <IconChevronRight size={17} className="chevron" />}
    </button>
  )
}
