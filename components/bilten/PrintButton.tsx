'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-yellow">
      <Printer className="w-4 h-4" /> PREUZMI PDF
    </button>
  )
}
