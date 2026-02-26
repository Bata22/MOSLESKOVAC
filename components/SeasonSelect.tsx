'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SEASONS } from '@/lib/types'

export default function SeasonSelect({ active }: { active: string }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('sezona', e.target.value)
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <select className="field-input w-auto" value={active} onChange={handleChange}>
      {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}
