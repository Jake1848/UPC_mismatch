import React from 'react'

interface ConflictListProps {
  compact?: boolean
}

export function ConflictList({ compact = false }: ConflictListProps) {
  return (
    <div className={`space-y-${compact ? '2' : '4'}`}>
      <p className="text-gray-600">No conflicts to display</p>
    </div>
  )
}
