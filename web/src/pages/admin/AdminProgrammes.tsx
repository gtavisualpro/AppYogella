import { useState } from 'react'
import { useAdminCourses, useAdminPrograms, useAddProgram, useToggleProgramVideo } from '../../lib/adminHooks'
import { useToast } from '../../lib/ToastContext'
import { IconCheck, IconChevronRight } from '../../components/icons'

export default function AdminProgrammes() {
  const { data: programs } = useAdminPrograms()
  const { data: courses } = useAdminCourses()
  const addProgram = useAddProgram()
  const toggleVideo = useToggleProgramVideo()
  const flash = useToast()

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [openId, setOpenId] = useState<string>('')

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
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', cursor: 'pointer', width: '100%', background: 'none', border: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit' }}
                  onClick={() => setOpenId(open ? '' : p.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.title}</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{p.meta}</div>
                  </div>
                  <IconChevronRight size={17} style={{ color: 'var(--color-neutral-500)', transform: open ? 'rotate(90deg)' : 'none' }} />
                </button>
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
    </div>
  )
}
