'use client'

import {
  imaUnetihSetova, maxSetova, prazniSetovi, procitajSetove, setovaZaPobedu, upozorenjeSetova, zbirSetova,
  type SetDraft, type UkupnoForma,
} from '@/lib/setovi'

// Unos rezultata po setovima (forme NOVA UTAKMICA i UREDI UTAKMICU).
// Kad su upisani setovi, dobijeni setovi i ukupni poeni računaju se sami.
// Bez setova (npr. službeni rezultat 3:0) upisuje se samo konačan rezultat.

type Props = {
  category: string
  status: string
  homeName: string
  awayName: string
  sets: SetDraft[]
  onSets: (s: SetDraft[]) => void
  ukupno: UkupnoForma
  onUkupno: (u: UkupnoForma) => void
}

const samoCifre = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 2)

export default function SetoviUnos({ category, status, homeName, awayName, sets, onSets, ukupno, onUkupno }: Props) {
  const max = maxSetova(category)
  const ima = imaUnetihSetova(sets, max)
  const { sets: ispravni, greska } = procitajSetove(sets, max)
  const z = zbirSetova(ispravni)
  const upozorenje = greska ? '' : upozorenjeSetova(ispravni, category, status)

  function setVal(i: number, side: 'home' | 'away', v: string) {
    onSets(sets.map((s, j) => (j === i ? { ...s, [side]: samoCifre(v) } : s)))
  }

  const cell = 'w-16 bg-white/5 border border-[#003f8a]/60 rounded-lg text-center text-lg font-semibold px-1 py-2 focus:outline-none focus:border-[#f5c518] focus:ring-2 focus:ring-[#f5c518]/15'
  const ukupnoCell = 'w-16 bg-white/5 border border-[#003f8a]/60 rounded-lg text-center text-base text-white px-1 py-1.5 focus:outline-none focus:border-[#f5c518]'

  const pobedio = (s: SetDraft, side: 'home' | 'away') => {
    const a = s[side], b = side === 'home' ? s.away : s.home
    return a !== '' && b !== '' && Number(a) > Number(b)
  }

  return (
    <div className="rounded-xl border border-[#f5c518]/20 bg-[#002d63]/30 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <p className="text-xs text-[#f5c518] font-semibold tracking-wider uppercase">Rezultat po setovima</p>
        <p className="text-[11px] text-blue-400">
          Igra se na {setovaZaPobedu(category)} dobijena seta · prazan red = set nije igran
        </p>
      </div>

      <table className="w-full max-w-md">
        <thead>
          <tr>
            <th className="w-16" />
            <th className="px-1 pb-2 text-center text-xs font-semibold text-white align-bottom">
              <span className="block truncate max-w-[150px] mx-auto" title={homeName}>{homeName}</span>
            </th>
            <th className="w-4" />
            <th className="px-1 pb-2 text-center text-xs font-semibold text-white align-bottom">
              <span className="block truncate max-w-[150px] mx-auto" title={awayName}>{awayName}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sets.slice(0, max).map((s, i) => (
            <tr key={i}>
              <td className="pr-2 py-1 text-[11px] text-blue-400 uppercase tracking-wider whitespace-nowrap">{i + 1}. set</td>
              <td className="px-1 py-1 text-center">
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="–" aria-label={`${i + 1}. set — ${homeName}`}
                  className={`${cell} ${pobedio(s, 'home') ? 'text-[#f5c518]' : 'text-white'}`}
                  value={s.home} onChange={e => setVal(i, 'home', e.target.value)} />
              </td>
              <td className="text-center text-[#f5c518] font-bold">:</td>
              <td className="px-1 py-1 text-center">
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="–" aria-label={`${i + 1}. set — ${awayName}`}
                  className={`${cell} ${pobedio(s, 'away') ? 'text-[#f5c518]' : 'text-white'}`}
                  value={s.away} onChange={e => setVal(i, 'away', e.target.value)} />
              </td>
            </tr>
          ))}

          {/* Ukupno */}
          <tr>
            <td className="pr-2 pt-3 text-[11px] text-[#f5c518] uppercase tracking-wider font-semibold border-t border-white/10">Setovi</td>
            <td className="px-1 pt-3 text-center border-t border-white/10">
              {ima
                ? <span className="font-display text-3xl text-[#f5c518]">{z.home_sets}</span>
                : <input type="text" inputMode="numeric" className={ukupnoCell} placeholder="0"
                    value={ukupno.home_sets} onChange={e => onUkupno({ ...ukupno, home_sets: samoCifre(e.target.value).slice(0, 1) })} />}
            </td>
            <td className="pt-3 text-center text-[#f5c518] font-bold border-t border-white/10">:</td>
            <td className="px-1 pt-3 text-center border-t border-white/10">
              {ima
                ? <span className="font-display text-3xl text-[#f5c518]">{z.away_sets}</span>
                : <input type="text" inputMode="numeric" className={ukupnoCell} placeholder="0"
                    value={ukupno.away_sets} onChange={e => onUkupno({ ...ukupno, away_sets: samoCifre(e.target.value).slice(0, 1) })} />}
            </td>
          </tr>
          <tr>
            <td className="pr-2 py-1 text-[11px] text-blue-400 uppercase tracking-wider">Poeni</td>
            <td className="px-1 py-1 text-center">
              {ima
                ? <span className="text-sm font-semibold text-blue-200">{z.home_score}</span>
                : <input type="text" inputMode="numeric" className={ukupnoCell} placeholder="—"
                    value={ukupno.home_score} onChange={e => onUkupno({ ...ukupno, home_score: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} />}
            </td>
            <td className="text-center text-blue-500">:</td>
            <td className="px-1 py-1 text-center">
              {ima
                ? <span className="text-sm font-semibold text-blue-200">{z.away_score}</span>
                : <input type="text" inputMode="numeric" className={ukupnoCell} placeholder="—"
                    value={ukupno.away_score} onChange={e => onUkupno({ ...ukupno, away_score: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} />}
            </td>
          </tr>
        </tbody>
      </table>

      {greska && <p className="mt-3 text-xs text-red-300">⚠ {greska}</p>}
      {upozorenje && <p className="mt-3 text-xs text-amber-300">⚠ {upozorenje}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-blue-500">
          {ima
            ? 'Dobijeni setovi i ukupni poeni računaju se sami iz upisanih setova.'
            : 'Bez setova (npr. službeni rezultat) upiši samo ukupne setove i poene.'}
        </p>
        {ima && (
          <button type="button" onClick={() => onSets(prazniSetovi(5))}
            className="text-[11px] text-blue-400 hover:text-red-300 underline underline-offset-2">
            Obriši setove
          </button>
        )}
      </div>
    </div>
  )
}
