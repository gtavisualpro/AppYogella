import { useId, useRef, useState, type ReactNode } from 'react'
import { useUploadImage } from '../lib/adminHooks'
import { useToast } from '../lib/ToastContext'
import { ApiError } from '../lib/api'
import { IconUpload, IconTrash } from './icons'

/** Feuille d'édition modale, remontant du bas comme le reste de l'app. */
export function EditSheet({
  title,
  onClose,
  onSave,
  saving,
  children,
}: {
  title: string
  onClose: () => void
  onSave: () => void
  saving?: boolean
  children: ReactNode
}) {
  return (
    <div className="edit-sheet-backdrop" onClick={onClose} role="presentation">
      <div className="edit-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="edit-sheet-handle" />
        <div className="panel-title" style={{ marginBottom: 4 }}>{title}</div>
        {children}
        <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Choix d'une image : téléversement, ou repli automatique sur une image
 * fournie par ailleurs (la miniature YouTube du cours, par exemple).
 */
export function ImagePicker({
  value,
  fallback,
  fallbackLabel,
  onChange,
}: {
  /** Image explicitement choisie, ou null si l'on s'appuie sur le repli. */
  value: string | null
  /** Image utilisée quand `value` est null (miniature YouTube, 1re séance…). */
  fallback?: string | null
  fallbackLabel?: string
  onChange: (url: string | null) => void
}) {
  const uploadImage = useUploadImage()
  const flash = useToast()
  const input = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const shown = value ?? fallback ?? null

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const res = await uploadImage.mutateAsync(file)
      onChange(res.url)
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Échec de l'envoi de l'image")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="field">
      <label>Image</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* L'aperçu est lui-même cliquable : c'est là qu'on porte le doigt. */}
        <label htmlFor={inputId} className="thumb-preview" style={{ cursor: 'pointer' }}>
          {shown ? <img src={shown} alt="" /> : <span className="text-muted" style={{ fontSize: 11 }}>Choisir</span>}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <label htmlFor={inputId} className="dropzone" style={{ margin: 0 }}>
            <IconUpload size={16} />
            {busy ? 'Envoi…' : 'Choisir une image'}
          </label>
          {/* accept="image/*" plutôt qu'une liste de types : sinon les photos
              iPhone (HEIC) apparaissent grisées dans le sélecteur. iOS les
              convertit en JPEG à la sélection. */}
          <input
            id={inputId}
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={onFile}
          />
          {value ? (
            <button
              className="btn btn-ghost"
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
              onClick={() => onChange(null)}
            >
              <IconTrash size={14} />
              {fallbackLabel ?? "Revenir à l'image par défaut"}
            </button>
          ) : (
            fallback && (
              <span className="text-muted" style={{ fontSize: 12 }}>
                {fallbackLabel ?? 'Image par défaut utilisée'}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}
