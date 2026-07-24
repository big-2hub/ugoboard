type Props = {
  icon: string
  title: string
  description: string
  action?: string
}

export function PlaceholderCard({ icon, title, description, action }: Props) {
  return (
    <section className="placeholder-card">
      <span className="placeholder-icon" aria-hidden="true">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && <button type="button" className="secondary-button">{action}</button>}
    </section>
  )
}
