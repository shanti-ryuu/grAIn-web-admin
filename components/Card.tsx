interface CardProps {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`stat-card p-0 ${className}`}
    >
      {children}
    </div>
  )
}
