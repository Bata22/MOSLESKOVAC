'use client'

import { Check } from 'lucide-react'
import { CATEGORIES, CATEGORIES_MUSKI, CATEGORIES_ZENSKE } from '@/lib/types'

// Izbor više kategorija (čekiranje), npr. za bilten ili za dodavanje kluba u više kategorija odjednom.
// `postojece` = kategorije koje se ne mogu izabrati (npr. klub već ima tim u njima).

const SVE_VREDNOSTI: string[] = CATEGORIES.map(c => c.value)

// Izabrane kategorije uvek idu redom kao u CATEGORIES (nepoznate, npr. stare, na kraj)
export const poRedu = (v: string[]) => [
  ...SVE_VREDNOSTI.filter(c => v.includes(c)),
  ...v.filter(c => !SVE_VREDNOSTI.includes(c)),
]

export default function KategorijeIzbor({ value, onChange, postojece = [], postojeceTekst = 'već postoji' }: {
  value: string[]
  onChange: (v: string[]) => void
  postojece?: string[]
  postojeceTekst?: string
}) {
  const slobodne = (list: { value: string }[]) => list.map(c => c.value).filter(c => !postojece.includes(c))

  function toggle(c: string) {
    onChange(poRedu(value.includes(c) ? value.filter(x => x !== c) : [...value, c]))
  }

  function toggleGrupa(list: { value: string }[]) {
    const g = slobodne(list)
    const sveIzabrane = g.length > 0 && g.every(c => value.includes(c))
    onChange(poRedu(sveIzabrane ? value.filter(c => !g.includes(c)) : Array.from(new Set([...value, ...g]))))
  }

  const base = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap'
  const on = 'bg-[#f5c518] text-[#002d63] border-[#f5c518]'
  const off = 'bg-[#003f8a]/20 text-blue-300 border-[#003f8a]/50 hover:text-white hover:border-[#f5c518]/50'
  const zauzeto = 'bg-transparent text-blue-600 border-[#003f8a]/30 cursor-not-allowed'

  const grupa = (naslov: string, list: { value: string; label: string }[]) => {
    const g = slobodne(list)
    const sveIzabrane = g.length > 0 && g.every(c => value.includes(c))
    return (
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[11px] text-blue-400 font-semibold tracking-wider uppercase">{naslov}</span>
          {g.length > 0 && (
            <button type="button" onClick={() => toggleGrupa(list)} className="text-[11px] text-blue-400 hover:text-[#f5c518] underline underline-offset-2">
              {sveIzabrane ? 'poništi' : 'označi sve'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {list.map(c => {
            const zauzeta = postojece.includes(c.value)
            const izabrana = value.includes(c.value)
            return (
              <button key={c.value} type="button" aria-pressed={izabrana} disabled={zauzeta}
                title={zauzeta ? postojeceTekst : undefined}
                onClick={() => toggle(c.value)}
                className={`${base} ${zauzeta ? zauzeto : izabrana ? on : off}`}>
                {(izabrana || zauzeta) && <Check className="w-3.5 h-3.5" />}
                {c.label}
                {zauzeta && <span className="font-normal">({postojeceTekst})</span>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const sveSlobodne = SVE_VREDNOSTI.filter(c => !postojece.includes(c))
  const brojIzabranih = value.filter(c => !postojece.includes(c)).length

  return (
    <div className="space-y-3">
      {grupa('Muška vertikala', CATEGORIES_MUSKI)}
      {grupa('Ženska vertikala', CATEGORIES_ZENSKE)}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="button" onClick={() => onChange(poRedu(sveSlobodne))}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#f5c518]/40 text-[#f5c518] hover:bg-[#f5c518]/10 transition-colors">
          Označi sve
        </button>
        <button type="button" onClick={() => onChange([])} disabled={!value.length}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-blue-300 hover:text-white disabled:opacity-40 transition-colors">
          Poništi izbor
        </button>
        <span className="text-xs text-blue-400">Izabrano: <b className="text-white">{brojIzabranih}</b></span>
      </div>
    </div>
  )
}
