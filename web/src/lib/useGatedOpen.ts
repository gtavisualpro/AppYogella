import { useNavigate } from 'react-router-dom'
import type { Course } from './api'
import { useToast } from './ToastContext'

export function useGatedOpen() {
  const navigate = useNavigate()
  const flash = useToast()

  return (course: Course) => {
    if (course.locked) {
      flash('Cours réservé aux abonnées')
      navigate('/abonnement')
      return
    }
    if (course.kind === 'ARTICLE') navigate(`/article/${course.id}`)
    else navigate(`/lecteur/${course.id}`)
  }
}
