import { useState } from 'react'
import { useAdminCourses, useAdminPrograms, useAddProgram, useToggleProgramVideo, useUpdateProgram, type AdminProgram } from '../../lib/adminHooks'
import { EditSheet, ImagePicker } from '../../components/AdminEdit'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/ToastContext'
import { IconCheck, IconChevronRight, IconPencil } from '../../components/icons'
import { Loader } from '../../components/Loader'

export default function AdminProgrammes() {
  const { data: programs, isPending: programsPending } = useAdminPrograms()
  const { data: courses, isPending: coursesPending } = useAdminCourses()
  const addProgram = useAddProgram()
  const toggleVideo = useToggleProgramVideo()
  const updateProgram = useUpdateProgram()
  const flash = useToast()

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [openId, setOpenId] = useState<string>('')
  const [editing, setEditing] = useState<AdminProgram | null>(null)

  async function create() {
    const t = title.trim()
    if (!t) {
      flash('Donnez un nom au programme')
      return
    }
    const res = await addProgram.mutateAsync({ title: t, description: desc.trim() || undefined })
    flash('Programme créé — liez ses vidéos')
    setTitle('')
    setDesc('')
    setOpenId(res.program.id)
  }

  if (programsPending || coursesPending) return <Loader />

  return (
    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel">
        <div className="panel-title">Nouveau programme</div>
        <input className="input" placeholder="Nom du programme" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" placeholder="Description courte" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn" style={{ background: 'var(--color-accent-600)', color: '#fff', padding: 12, fontSize: 14 }} onClick={create} disabled={addProgram.isPending}>
          Créer le programme
        </button>
      </div>

      <div>
        <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>Programmes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {(programs ?? []).map((p) => {
            const open = openId === p.id
            return (
              <div key={p.id} style={{ borderRadius: 26, background: 'var(--color-neutral-100)', border: '1px solid var(--color-divider)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 12 }}>
                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', cursor: 'pointer', flex: 1, minWidth: 0, background: 'none', border: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit' }}
                    onClick={() => setOpenId(open ? '' : p.id)}
                  >
                    <div className="thumb-preview" style={{ width: 44, height: 44, borderRadius: 12 }}>
                      {p.coverUrl ? <img src={p.coverUrl} alt="" /> : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.title}</div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{p.meta}</div>
                    </div>
                    <IconChevronRight size={17} style={{ color: 'var(--color-neutral-500)', transform: open ? 'rotate(90deg)' : 'none' }} />
                  </button>
                  <button className="row-action" title="Éditer" onClick={() => setEditing(p)}>
                    <IconPencil size={17} />
                  </button>
                </div>
                {open && (
                  <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', padding: '4px 0 2px' }}>
                      Vidéos liées
                    </div>
                    {(courses ?? []).map((c) => {
                      const linked = p.videoIds.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleVideo.mutate({ programId: p.id, courseId: c.id, linked })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 18, cursor: 'pointer',
                            background: linked ? 'var(--color-accent-2-100)' : 'var(--color-neutral-200)', border: 0, width: '100%',
                            textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
                          }}
                        >
                          <span
                            style={{
                              width: 20, height: 20, borderRadius: 6, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: `2px solid ${linked ? 'var(--color-accent-2-600)' : 'var(--color-neutral-400)'}`,
                              background: linked ? 'var(--color-accent-2-600)' : 'transparent', color: '#fff',
                            }}
                          >
                            {linked && <IconCheck size={12} strokeWidth={3.4} />}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>{c.title}</span>
                          <span className="text-muted" style={{ fontSize: 12 }}>{c.durationMin} min</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {editing && (
        <ProgramEditSheet
          program={editing}
          onClose={() => setEditing(null)}
          saving={updateProgram.isPending}
          onSave={async (patch) => {
            try {
              await updateProgram.mutateAsync({ id: editing.id, ...patch })
            } catch (err) {
              flash(err instanceof ApiError ? err.message : 'Enregistrement impossible')
              return
            }
            flash('Programme mis à jour')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function ProgramEditSheet({
  program,
  onClose,
  onSave,
  saving,
}: {
  program: AdminProgram
  onClose: () => void
  onSave: (patch: Record<string, unknown>) => void
  saving: boolean
}) {
  const [title, setTitle] = useState(program.title)
  const [desc, setDesc] = useState(program.description ?? '')
  const [cover, setCover] = useState<string | null>(program.coverUrl)

  return (
    <EditSheet
      title="Éditer le programme"
      onClose={onClose}
      saving={saving}
      onSave={() => onSave({ title: title.trim(), description: desc.trim(), coverUrl: cover ?? '' })}
    >
      <div className="field">
        <label htmlFor="ep-title">Nom</label>
        <input id="ep-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ep-desc">Description</label>
        <input id="ep-desc" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <ImagePicker
        value={cover}
        fallbackLabel="Utiliser la vignette de la première séance"
        onChange={setCover}
      />
    </EditSheet>
  )
}
