/**
 * Indicateur d'attente des pages.
 *
 * Affiché à la place du contenu tant que les données de la page ne sont pas
 * arrivées, pour éviter que les sections se remplissent les unes après les
 * autres sous les yeux de l'utilisatrice.
 */
export function Loader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-ring" />
      <span className="loader-label">{label}</span>
    </div>
  )
}
