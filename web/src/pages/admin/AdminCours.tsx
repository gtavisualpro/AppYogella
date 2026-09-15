import { useRef, useState } from 'react'
import { useAdminCourses, useAddCourse, useUpdateCourse, useDeleteCourse, useUploadVideo } from '../../lib/adminHooks'
import { useToast } from '../../lib/ToastContext'
import { ApiError } from '../../lib/api'
import { IconUpload, IconTrash } from '../../components/icons'

const UNIVERSES = ['Yoga', 'Auto-massages', 'Respiration', 'Comprendre son corps', 'Sommeil', 'Nutrition']

export default function AdminCours() {
  const { data: courses } = useAdminCourses()
  const addCourse = useAddCourse()
  const updateCourse = useUpdateCourse()
  const deleteCourse = useDeleteCourse()
  const uploadVideo = useUploadVideo()
  const flash = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('')
  const [universe, setUniverse] = useState(UNIVERSES[0])
  const [premium, setPremium] = useState(true)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    try {
      const res = await uploadVideo.mutateAsync(file)
      setVideoUrl(res.url)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Échec de l'envoi du fichier")
      setFileName('')
    }
  }

  async function publish() {
    const t = title.trim()
    if (!t) {
      flash('Donnez un titre au cours')
      return
    }
    const durationMin = parseInt(duration.replace(/\D/g, ''), 10) || 20
    await addCourse.mutateAsync({ title: t, durationMin, universe, premium, videoUrl: videoUrl ?? undefined })
    flash('Cours publié')
    setTitle('')
    setDuration('')
    setVideoUrl(null)
    setFileName('')
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel">
        <div className="panel-title">Ajouter un cours vidéo</div>
        <input className="input" placeholder="Titre du cours" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: 9 }}>
          <input className="input" placeholder="Durée (min)" style={{ flex: 1, minWidth: 0 }} value={duration} onChange={(e) => setDuration(e.target.value)} />
          <select className="input" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} value={universe} onChange={(e) => setUniverse(e.target.value)}>
            {UNIVERSES.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 4px', cursor: 'pointer' }} onClick={() => setPremium((p) => !p)}>
          <span className="switch" style={{ background: premium ? 'var(--color-accent-600)' : 'var(--color-neutral-400)', justifyContent: premium ? 'flex-end' : 'flex-start' }}>
            <span className="knob" />
          </span>
          <span style={{ fontSize: 13.5 }}>Réservé aux abonnées</span>
        </div>
        <label className={`dropzone${fileName ? ' has-file' : ''}`}>
          <IconUpload size={18} />
          {fileName || 'Déposer le fichier vidéo'}
          <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={onFileChange} />
        </label>
        <button className="btn" style={{ background: 'var(--color-accent-600)', color: '#fff', padding: 12, fontSize: 14 }} onClick={publish} disabled={addCourse.isPending}>
          Publier le cours
        </button>
      </div>

      <div>
        <div className="section-title-row">
          <h2 style={{ fontSize: 17 }}>Catalogue</h2>
          <span className="text-muted" style={{ fontSize: 12.5 }}>{courses?.length ?? 0} cours</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(courses ?? []).map((c) => (
            <div key={c.id} className="catalog-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{c.title}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{c.meta}</div>
              </div>
              <button
                className="tag"
                style={{
                  border: 0, cursor: 'pointer',
                  background: c.premium ? 'var(--color-accent-200)' : 'var(--color-accent-2-200)',
                  color: c.premium ? 'var(--color-accent-800)' : 'var(--color-accent-2-800)',
                }}
                onClick={() => updateCourse.mutate({ id: c.id, premium: !c.premium })}
              >
                {c.premium ? 'Premium' : 'Gratuit'}
              </button>
              <button
                style={{ border: 0, background: 'none', cursor: 'pointer', display: 'flex', color: 'var(--color-neutral-600)', padding: 2 }}
                onClick={() => deleteCourse.mutate(c.id)}
              >
                <IconTrash size={17} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
