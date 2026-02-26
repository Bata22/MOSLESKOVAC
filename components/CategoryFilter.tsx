'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CATEGORIES, Category } from '@/lib/types'

export default function CategoryFilter({ active }: { active?: Category }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const go = (val: Category | '') => {
    const p = new URLSearchParams(searchParams.toString())
    if (val) p.set('kategorija', val)
    else p.delete('kategorija')
    router.push(`${pathname}?${p.toString()}`)
  }

  const base  = 'px-4 py-2 rounded-lg font-display tracking-wider text-sm transition-all'
  const on    = 'bg-[#f5c518] text-[#002d63]'
  const off   = 'glass text-blue-300 hover:text-white hover:border-[#f5c518]/50'

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => go('')} className={`${base} ${!active ? on : off}`}>SVE</button>
      {CATEGORIES.map(c => (
        <button key={c.value} onClick={() => go(c.value)} className={`${base} ${active === c.value ? on : off}`}>
          {c.label.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
