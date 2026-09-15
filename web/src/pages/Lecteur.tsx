import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCourse, useFavorites, useUniverses } from '../lib/hooks'
import { useYouTubePlayer } from '../lib/useYouTubePlayer'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import { api } from '../lib/api'
import {
  IconChevronLeft,
  IconHeart,
  IconPlay,
  IconPause,
  IconRewind15,
  IconForward15,
  IconList,
  IconMore,
  IconShare,
} from '../components/icons'
import heroPhoto from '../assets/course-photo.webp'
import { Loader } from '../components/Loader'

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Lecteur() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: course } = useCourse(id)
  const { data: favorites } = useFavorites(!!user)
  const { data: universes } = useUniverses()
  const flash = useToast()
  const queryClient = useQueryClient()

  const yt = useYouTubePlayer(course?.youtubeId)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isYoutube = !!course?.youtubeId
  const hasVideo = isYoutube || !!course?.videoUrl

  // Position et durée viennent du lecteur réel, plus d'une minuterie factice.
  const [speed, setSpeed] = useState(1)
  const [showSpeed, setShowSpeed] = useState(false)
  const [fileTime, setFileTime] = useState(0)
  const [filePlaying, setFilePlaying] = useState(false)
  const [fileDuration, setFileDuration] = useState(0)

  const durationSec = isYoutube
    ? yt.duration || (course?.durationMin ?? 20) * 60
    : fileDuration || (course?.durationMin ?? 20) * 60
  const currentSec = isYoutube ? yt.currentTime : fileTime
  const playing = isYoutube ? yt.playing : filePlaying
  const progress = durationSec ? Math.min(1, currentSec / durationSec) : 0

  const togglePlay = () => {
    if (isYoutube) return yt.toggle()
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }
  const changeSpeed = (rate: number) => {
    setSpeed(rate)
    setShowSpeed(false)
    if (isYoutube) yt.setPlaybackRate(rate)
    else if (videoRef.current) videoRef.current.playbackRate = rate
  }
  const seekBy = (delta: number) => {
    const target = currentSec + delta
    if (isYoutube) return yt.seekTo(target)
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, target)
  }
  const seekToFraction = (f: number) => {
    const target = f * durationSec
    if (isYoutube) return yt.seekTo(target)
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, target)
  }

  const saveProgress = useMutation({
    mutationFn: (pct: number) => api.post('/api/progress', { courseId: id, progressPct: pct }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['practice'] }),
  })



  useEffect(() => {
    if (!user || !id) return
    const t = setTimeout(() => saveProgress.mutate(progress), 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(progress * 20), user, id])

  const isFav = favorites?.some((f) => f.id === id) ?? false
  const toggleFavorite = useMutation({
    mutationFn: () => (isFav ? api.delete(`/api/favorites/${id}`) : api.post(`/api/favorites/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  // « Liste » renvoie vers les autres cours du même univers.
  const universeSlug = universes?.find((u) => u.label === course?.universe)?.slug

  async function share() {
    const url = window.location.href
    const title = course?.title ?? 'Yogella'
    if (navigator.share) {
      // L'utilisatrice peut annuler le partage : ce n'est pas une erreur.
      try {
        await navigator.share({ title, url })
        return
      } catch {
        return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      flash('Lien copié')
    } catch {
      flash('Impossible de copier le lien')
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    seekToFraction(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
  }

  if (!course) return <Loader />

  return (
    <div className="player-screen" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div
        style={{
          position: 'relative',
          flex: hasVideo ? 1 : 'none',
          aspectRatio: hasVideo ? undefined : '16 / 9',
          minHeight: 220,
          background: hasVideo ? '#000' : undefined,
          display: hasVideo ? 'flex' : undefined,
          alignItems: 'center',
          justifyContent: 'center',
          // Sans média, on garde le débord de la maquette sous la barre d'état.
          marginTop: hasVideo ? 0 : -46,
        }}
      >
        {isYoutube ? (
          // Conteneur remplacé par le lecteur YouTube, piloté par useYouTubePlayer.
          <div ref={yt.containerRef} className="yt-host" style={{ aspectRatio: '16 / 9', width: '100%', height: 'auto', maxHeight: '100%' }} />
        ) : course.videoUrl ? (
          <video
            ref={videoRef}
            src={course.videoUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', maxHeight: '100%' }}
            playsInline
            onPlay={() => setFilePlaying(true)}
            onPause={() => setFilePlaying(false)}
            onTimeUpdate={(e) => setFileTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setFileDuration(e.currentTarget.duration)}
          />
        ) : (
          <img src={course.thumbnailUrl ?? heroPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '45% 60%' }} />
        )}
        <button className="icon-btn floating" style={{ position: 'absolute', left: 18, top: hasVideo ? 14 : 62, zIndex: 3 }} onClick={() => navigate(-1)}>
          <IconChevronLeft size={17} />
        </button>
        {user && (
          <button
            className="icon-btn floating"
            style={{ position: 'absolute', right: 18, top: hasVideo ? 14 : 62, zIndex: 3, color: isFav ? 'var(--color-accent-600)' : 'var(--color-text)' }}
            onClick={() => toggleFavorite.mutate()}
          >
            <IconHeart size={18} filled={isFav} strokeWidth={2.4} />
          </button>
        )}
      </div>
      <div
        style={{
          marginTop: hasVideo ? 0 : -32,
          background: 'var(--color-neutral-100)',
          borderRadius: '32px 32px 0 0',
          padding: '30px 22px calc(26px + env(safe-area-inset-bottom))',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          flex: 'none',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>{course.title}</h1>
          <div className="text-muted" style={{ fontSize: 14 }}>
            {course.meta}
            {course.authorName ? ` · ${course.authorName}${course.authorRole ? ', ' + course.authorRole : ''}` : ''}
          </div>
        </div>
        <div>
          <div className="progress-track" onClick={seek}>
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            <div className="progress-thumb" style={{ left: `${progress * 100}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 7 }}>
            <span>{formatTime(progress * durationSec)}</span>
            <span>{formatTime(durationSec)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <button style={{ border: 0, background: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => seekBy(-15)}>
            <IconRewind15 />
          </button>
          <button
            style={{ width: 70, height: 70, borderRadius: 999, border: 0, background: 'var(--color-accent-2-700)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
            onClick={togglePlay}
          >
            {playing ? <IconPause size={26} /> : <IconPlay size={26} />}
          </button>
          <button style={{ border: 0, background: 'none', cursor: 'pointer', display: 'flex' }} onClick={() => seekBy(15)}>
            <IconForward15 />
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 8px 0', color: 'var(--color-neutral-700)' }}>
          <button
            className="player-action"
            disabled={!universeSlug}
            onClick={() => universeSlug && navigate(`/categorie/${universeSlug}`)}
          >
            <IconList size={20} />
            {course.universe}
          </button>
          <button className="player-action" onClick={() => setShowSpeed((v) => !v)}>
            <IconMore size={20} />
            Vitesse {speed}×
          </button>
          <button className="player-action" onClick={share}>
            <IconShare size={20} />
            Partager
          </button>
        </div>
        {showSpeed && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 2 }}>
            {[0.75, 1, 1.25, 1.5].map((r) => (
              <button
                key={r}
                className="tag"
                style={{
                  border: 0,
                  cursor: 'pointer',
                  background: r === speed ? 'var(--color-accent-600)' : 'var(--color-neutral-200)',
                  color: r === speed ? '#fff' : 'var(--color-text)',
                }}
                onClick={() => changeSpeed(r)}
              >
                {r}×
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
