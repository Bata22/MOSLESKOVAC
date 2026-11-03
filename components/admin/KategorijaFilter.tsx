'use client'

import { useEffect, useState } from 'react'
import { CATEGORIES } from '@/lib/types'

// Filter po kategorijama za admin tabove TABELA i UTAKMICE

const KEY = 'mosl-admin-kategorija'
export const SVE = 'sve'

export type Grupa<T> = { value: string; label: string; items: T[] }

export const katLabel = (v: string) =>
  CATEGORIES.find(c => c.value === v)?.label ?? (v ? v.charAt(0).toUpperCase() + v.slice(1) : '—')

// Razvrstava stavke po kategoriji, redosledom iz CATEGORIES (nepoznate kategorije idu na kraj)
export function groupByCategory<T>(items: T[], getCat: (x: T) => string): Grupa<T>[] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const c = getCat(it) || ''
    const list = map.get(c)
    if (list) list.push(it)
    else map.set(c, [it])
  }
  const known: string[] = CATEGORIES.map(c => c.value)
  const order = [
    ...known.filter(v => map.has(v)),
    ...Array.from(map.keys()).filter(v => !known.includes(v)),
  ]
  return order.map(v => ({ value: v, label: katLabel(v), items: map.get(v) ?? [] }))
}

// Izabrana kategorija se pamti dok je admin otvoren u browseru,
// pa TABELA i UTAKMICE pokazuju istu kategoriju kad se prelazi iz taba u tab.
export function useKategorija(): [string, (v: string) => void] {
  const [cat, setCat] = useState<string>(SVE)
  useEffect(() => {
    try { const v = sessionStorage.getItem(KEY); if (v) setCat(v) } catch {}
  }, [])
  function change(v: string) {
    setCat(v)
    try { sessionStorage.setItem(KEY, v) } catch {}
  }
  return [cat, change]
}

export default function KategorijaFilter({ groups, total, active, onChange }: {
  groups: Grupa<unknown>[]
  total: number
  active: string
  onChange: (v: string) => void
}) {
  // Izabrana kategorija ostaje vidljiva i kad u njoj (još) nema podataka
  const chips: Grupa<unknown>[] = active !== SVE && !groups.some(g => g.value === active)
    ? [...groups, { value: active, label: katLabel(active), items: [] }]
    : groups

  const base = 'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap'
  const on = 'bg-[#f5c518] text-[#002d63] border-[#f5c518]'
  const off = 'bg-[#003f8a]/20 text-blue-300 border-[#003f8a]/50 hover:text-white hover:border-[#f5c518]/50'

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button onClick={() => onChange(SVE)} className={`${base} ${active === SVE ? on : off}`}>
        Sve kategorije <span className="ml-1 opacity-70">{total}</span>
      </button>
      {chips.map(g => (
        <button key={g.value} onClick={() => onChange(g.value)} className={`${base} ${active === g.value ? on : off}`}>
          {g.label} <span className="ml-1 opacity-70">{g.items.length}</span>
        </button>
      ))}
    </div>
  )
}
