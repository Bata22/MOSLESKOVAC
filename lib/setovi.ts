// Rezultat po setovima.
// U bazi se čuva u koloni matches.set_scores (JSONB), npr.
//   [{ "home": 25, "away": 20 }, { "home": 23, "away": 25 }, { "home": 25, "away": 18 }]
// Iz setova se sami računaju dobijeni setovi (home_sets/away_sets) i ukupni poeni (home_score/away_score).

import type { SetScore } from './types'

// Polja forme su stringovi (input polja)
export type SetDraft = { home: string; away: string }

export type Ukupno = {
  home_sets: number | null
  away_sets: number | null
  home_score: number | null
  away_score: number | null
}

export type UkupnoForma = { home_sets: string; away_sets: string; home_score: string; away_score: string }

// Mini kategorije igraju na 2 dobijena seta (najviše 3 seta), ostale na 3 dobijena (najviše 5)
export const jeMini = (category: string) => /mini/i.test(category || '')
export const maxSetova = (category: string) => (jeMini(category) ? 3 : 5)
export const setovaZaPobedu = (category: string) => (jeMini(category) ? 2 : 3)

export const PRAZNO_UKUPNO: UkupnoForma = { home_sets: '', away_sets: '', home_score: '', away_score: '' }

export const prazniSetovi = (n = 5): SetDraft[] =>
  Array.from({ length: n }, () => ({ home: '', away: '' }))

// Podaci iz baze → uvek ispravan niz (JSONB može doći i kao string)
export function normalizujSetove(s: unknown): SetScore[] {
  let v: any = s
  if (typeof v === 'string') {
    try { v = JSON.parse(v) } catch { return [] }
  }
  if (!Array.isArray(v)) return []
  return v
    .map((x: any) => ({ home: Number(x?.home), away: Number(x?.away) }))
    .filter(x => Number.isFinite(x.home) && Number.isFinite(x.away))
}

// Podaci iz baze → polja forme (uvek 5 redova)
export function setoviUFormu(s: unknown): SetDraft[] {
  const d = prazniSetovi(5)
  normalizujSetove(s).slice(0, 5).forEach((x, i) => { d[i] = { home: String(x.home), away: String(x.away) } })
  return d
}

export const imaUnetihSetova = (drafts: SetDraft[], max = 5) =>
  drafts.slice(0, max).some(d => d.home.trim() !== '' || d.away.trim() !== '')

// Polja forme → setovi za bazu, uz proveru unosa
export function procitajSetove(drafts: SetDraft[], max: number): { sets: SetScore[]; greska: string } {
  const sets: SetScore[] = []
  let greska = ''
  let preskocen = false
  drafts.slice(0, max).forEach((d, i) => {
    if (greska) return
    const h = d.home.trim()
    const a = d.away.trim()
    if (h === '' && a === '') { preskocen = true; return }
    const n = i + 1
    if (h === '' || a === '') { greska = `${n}. set: upiši poene za obe ekipe.`; return }
    const hn = Number(h)
    const an = Number(a)
    if (!Number.isInteger(hn) || !Number.isInteger(an) || hn < 0 || an < 0) { greska = `${n}. set: neispravan broj poena.`; return }
    if (hn === an) { greska = `${n}. set: set ne može da bude nerešen (${hn}:${an}).`; return }
    if (preskocen) { greska = `${n}. set: setove upisuj redom, bez preskakanja.`; return }
    sets.push({ home: hn, away: an })
  })
  return { sets, greska }
}

// Dobijeni setovi i ukupni poeni iz rezultata po setovima
export function zbirSetova(sets: SetScore[]) {
  let home_sets = 0, away_sets = 0, home_score = 0, away_score = 0
  for (const s of sets) {
    if (s.home > s.away) home_sets++
    else if (s.away > s.home) away_sets++
    home_score += s.home
    away_score += s.away
  }
  return { home_sets, away_sets, home_score, away_score }
}

// "25:20, 23:25, 25:18"
export const formatSetova = (s: unknown, sep = ', ') =>
  normalizujSetove(s).map(x => `${x.home}:${x.away}`).join(sep)

const broj = (v: string): number | null => {
  if (v == null || String(v).trim() === '') return null
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

// Rezultat iz forme (setovi ili, ako setova nema, ručno upisan konačan rezultat).
// Vraća vrednosti za kolone home_sets, away_sets, home_score, away_score i set_scores.
export function rezultatIzForme(
  drafts: SetDraft[], rucno: UkupnoForma, category: string, status: string,
): { rezultat: Ukupno & { set_scores: SetScore[] | null }; greska: string } {
  const { sets, greska } = procitajSetove(drafts, maxSetova(category))
  const rezultat = sets.length
    ? { ...zbirSetova(sets), set_scores: sets }
    : {
        home_sets: broj(rucno.home_sets), away_sets: broj(rucno.away_sets),
        home_score: broj(rucno.home_score), away_score: broj(rucno.away_score),
        set_scores: null,
      }
  if (greska) return { rezultat, greska }
  const hs = rezultat.home_sets ?? 0
  const as = rezultat.away_sets ?? 0
  if (status === 'finished' && hs === as && hs > 0)
    return { rezultat, greska: `Završena utakmica mora imati pobednika (sada je ${hs}:${as} u setovima).` }
  return { rezultat, greska: '' }
}

const dobijenihSetova = (n: number) =>
  n === 1 ? '1 dobijen set' : n >= 2 && n <= 4 ? `${n} dobijena seta` : `${n} dobijenih setova`

// Upozorenje (ne blokira čuvanje): pobednik ima manje dobijenih setova nego što se igra u kategoriji
export function upozorenjeSetova(sets: SetScore[], category: string, status: string) {
  if (status !== 'finished' || !sets.length) return ''
  const z = zbirSetova(sets)
  const potrebno = setovaZaPobedu(category)
  const pobednik = Math.max(z.home_sets, z.away_sets)
  if (pobednik < potrebno)
    return `Pobednik ima ${dobijenihSetova(pobednik)}, a u ovoj kategoriji igra se na ${potrebno} dobijena seta. Proveri da li su upisani svi setovi.`
  return ''
}
