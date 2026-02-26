'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { CATEGORIES_MUSKI, CATEGORIES_ZENSKE, Category, isZenska } from '@/lib/types'

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

  const base = 'px-3 py-1.5 rounded-lg font-display tracking-wider text-sm transition-all'
  const onM  = 'bg-[#f5c518] text-[#002d63]'
  const offM = 'glass text-blue-300 hover:text-white hover:border-[#f5c518]/50'
  const onZ  = 'bg-pink-400 text-white'
  const offZ = 'text-pink-300 hover:text-pink-100 hover:border-pink-400/50 border border-pink-900/40'
  const onAll = !active ? 'bg-[#f5c518] text-[#002d63]' : 'glass text-blue-300 hover:text-white'

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => go('')} className={`${base} ${onAll}`}>SVE</button>

      {/* Muška */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-blue-400 tracking-widest uppercase font-bold px-1">Muška:</span>
        {CATEGORIES_MUSKI.map(c => (
          <button key={c.value} onClick={() => go(c.value)}
            className={`${base} ${active === c.value ? onM : offM}`}>
            {c.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Ženska */}
      <div className="flex flex-wrap gap-1.5 items-center mt-1 w-full">
        <span className="text-[10px] text-pink-300 tracking-widest uppercase font-bold px-1">Ženska:</span>
        {CATEGORIES_ZENSKE.map(c => (
          <button key={c.value} onClick={() => go(c.value)}
            className={`${base} ${active === c.value ? onZ : offZ}`}
            style={active !== c.value ? { background: 'rgba(180,60,100,0.08)' } : {}}>
            {c.label.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
