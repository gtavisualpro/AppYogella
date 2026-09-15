import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCourse, useFavorites } from '../lib/hooks'
import { useYouTubePlayer } from '../lib/useYouTubePlayer'
import { useAuth } from '../lib/AuthContext'
import { api } from '../lib/api'
import {
  IconChevronLeft,
  IconHeart,
  IconPlay,
  IconPause,
  IconRewind15,
  IconForward15,
  IconList,
  IconDownload,
  IconAirplay,
  IconMore,
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
  const queryClient = useQueryClient()

  const yt = useYouTubePlayer(course?.youtubeId)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isYoutube = !!course?.youtubeId
  const hasVideo = isYoutube || !!course?.videoUrl

  // Position et durée viennent du lecteur réel, plus d'une minuterie factice.
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

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    seekToFraction(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
  }

  if (!course) return <Loader />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          position: 'relative',
          flex: 'none',
          aspectRatio: '16 / 9',
          minHeight: 220,
          background: '#000',
          // Sans média, on garde le débord de la maquette sous la barre d'état.
          marginTop: hasVideo ? 0 : -46,
        }}
      >
        {isYoutube ? (
          // Conteneur remplacé par le lecteur YouTube, piloté par useYouTubePlayer.
          <div ref={yt.containerRef} className="yt-host" />
        ) : course.videoUrl ? (
          <video
            ref={videoRef}
            src={course.videoUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
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
      <div style={{ marginTop: hasVideo ? 0 : -32, background: 'var(--color-neutral-100)', borderRadius: '32px 32px 0 0', padding: '36px 22px 26px', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 0', color: 'var(--color-neutral-700)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <IconList size={20} /> Liste
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <IconDownload size={20} /> Télécharger
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <IconAirplay size={20} /> AirPlay
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <IconMore size={20} /> Plus
          </div>
        </div>
      </div>
    </div>
  )
}
