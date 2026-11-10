// Zajednički bilten: koristi ga admin panel (generator + štampa) i javna stranica /bilteni/[id].
// Bez 'use client' — radi i u server i u client komponentama.

import { Fragment, type ReactNode } from 'react'
import { CATEGORIES } from '@/lib/types'

/* ══════════════════════════════════════════
   TIPOVI
══════════════════════════════════════════ */

export type NumKey = 'played' | 'won' | 'lost' | 'points' | 'sets_won' | 'sets_lost' | 'points_won' | 'points_lost'

export type Row = { uid: string; team: string } & Record<NumKey, number>

export type MatchRow = {
  uid: string
  round: string
  date: string
  home: string
  away: string
  home_sets: string
  away_sets: string
  sets?: string // rezultat po setovima, npr. "25:20, 23:25, 25:18" (stari bilteni ga nemaju)
}

export type MatchKey = Exclude<keyof MatchRow, 'uid'>

// Jedna kategorija u biltenu: tabela + rezultati
export type Section = {
  uid: string
  category: string
  standings: Row[]
  matches: MatchRow[]
}

// Izbor iz generatora: kategorije, sezona i filter utakmica (kolo i/ili period)
export type Selection = {
  categories: string[]
  season: string
  kolo: string
  dateFrom: string
  dateTo: string
}

// Snimak biltena — čuva se u koloni `meta` tabele bilteni.
// v2: više kategorija (sekcije). Stari v1 (jedna kategorija) se pri čitanju pretvara u v2.
export type Snapshot = {
  v: 2
  season: string
  kolo: string
  dateFrom: string
  dateTo: string
  title: string
  note: string
  issued: string
  newPage: boolean // svaka kategorija na novoj strani
  sections: Section[]
}

export type Col =
  | { kind: 'num'; key: NumKey; label: string }
  | { kind: 'koef'; plus: NumKey; minus: NumKey; label: string }

// Redosled kolona tačno po šablonu
export const COLS: Col[] = [
  { kind: 'num', key: 'played', label: 'Ut' },
  { kind: 'num', key: 'won', label: 'Pob' },
  { kind: 'num', key: 'lost', label: 'Por' },
  { kind: 'num', key: 'points', label: 'Bod' },
  { kind: 'num', key: 'sets_won', label: 'S+' },
  { kind: 'num', key: 'sets_lost', label: 'S-' },
  { kind: 'koef', plus: 'sets_won', minus: 'sets_lost', label: 'S Koef' },
  { kind: 'num', key: 'points_won', label: 'P+' },
  { kind: 'num', key: 'points_lost', label: 'P-' },
  { kind: 'koef', plus: 'points_won', minus: 'points_lost', label: 'P Koef' },
]

// Logo sajta — isti fajl kao u Navbar-u (public/mos.png)
export const LOGO_SRC = '/mos.png'

/* ══════════════════════════════════════════
   POMOĆNE FUNKCIJE
══════════════════════════════════════════ */

export const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v

export function koef(plus: number, minus: number) {
  if (!minus) return plus ? 'MAX' : '–'
  return (plus / minus).toFixed(3)
}

export function fmtDate(d?: string | null) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return y && m && day ? `${day}.${m}.${y}.` : d
}

export function fmtIssued(iso?: string | null) {
  const dt = iso ? new Date(iso) : new Date()
  if (isNaN(dt.getTime())) return ''
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}.`
}

// Period odigravanja: "01.11.–07.11.2026.", "od 01.11.2026.", "do 07.11.2026."
export function fmtPeriod(from?: string | null, to?: string | null) {
  const f = fmtDate(from)
  const t = fmtDate(to)
  if (f && t) {
    if (from === to) return t
    return from!.slice(0, 4) === to!.slice(0, 4) ? `${f.slice(0, 6)}–${t}` : `${f}–${t}`
  }
  if (f) return `od ${f}`
  if (t) return `do ${t}`
  return ''
}

// Nazivi kategorija u biltenu, npr. "Seniori, Kadeti"
export const snapCategories = (s: Snapshot) => s.sections.map(x => catLabel(x.category)).join(', ')

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

function toSection(x: any, i: number): Section {
  return {
    uid: str(x?.uid) || `s${i}`,
    category: str(x?.category),
    standings: arr<Row>(x?.standings),
    matches: arr<MatchRow>(x?.matches),
  }
}

export function parseSnapshot(meta: unknown): Snapshot | null {
  if (!meta) return null
  try {
    const s: any = typeof meta === 'string' ? JSON.parse(meta) : meta
    if (!s || typeof s !== 'object') return null
    const base = {
      v: 2 as const,
      season: str(s.season), kolo: str(s.kolo),
      dateFrom: str(s.dateFrom), dateTo: str(s.dateTo),
      title: str(s.title), note: str(s.note), issued: str(s.issued),
      newPage: !!s.newPage,
    }
    // v2 — više kategorija
    if (Array.isArray(s.sections)) return { ...base, sections: s.sections.map(toSection) }
    // v1 — jedna kategorija (stari bilteni)
    if (Array.isArray(s.standings) && Array.isArray(s.matches))
      return { ...base, sections: [toSection(s, 0)] }
  } catch {}
  return null
}

// Naziv PDF fajla koji browser predloži pri "Sačuvaj kao PDF"
export function pdfName(s: Snapshot) {
  const parts = [s.title || 'Bilten']
  if (s.sections.length === 1) parts.push(catLabel(s.sections[0].category))
  parts.push(fmtPeriod(s.dateFrom, s.dateTo) || s.season)
  return parts
    .filter(Boolean)
    .join(' - ')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[.\s]+$/, '')
    .trim()
}

/* ══════════════════════════════════════════
   DOKUMENT (po šablonu index.html, sa logom sajta)
══════════════════════════════════════════ */

function SectionView({ sec, kolo }: { sec: Section; kolo: string }) {
  const cat = catLabel(sec.category)
  const imaSetove = sec.matches.some(m => str(m.sets).trim() !== '')
  return (
    <>
      <h3>{cat} - Tabela</h3>
      <table className="bp-table">
        <thead>
          <tr>
            <th>Poz</th>
            <th>Naziv kluba</th>
            {COLS.map(c => <th key={c.label}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {sec.standings.length === 0 && (
            <tr><td colSpan={12} className="empty">Tabela je prazna.</td></tr>
          )}
          {sec.standings.map((r, i) => (
            <tr key={r.uid || i}>
              <td>{i + 1}</td>
              <td className="l">{r.team}</td>
              {COLS.map(c => (
                <td key={c.label}>{c.kind === 'num' ? r[c.key] : koef(r[c.plus], r[c.minus])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {sec.matches.length > 0 && (
        <>
          <h3>{cat} - Rezultati{kolo ? ` (${kolo}. kolo)` : ''}</h3>
          <table className="bp-table">
            <thead>
              <tr>
                <th>Kolo</th><th>Datum</th><th>Domaćin</th><th>Rezultat</th><th>Gost</th>
                {imaSetove && <th>Po setovima</th>}
              </tr>
            </thead>
            <tbody>
              {sec.matches.map((m, i) => (
                <tr key={m.uid || i}>
                  <td>{m.round || '—'}</td>
                  <td className="d">{fmtDate(m.date) || '—'}</td>
                  <td className="l">{m.home}</td>
                  <td className="res">
                    {m.home_sets !== '' && m.away_sets !== '' ? `${m.home_sets} : ${m.away_sets}` : '—'}
                  </td>
                  <td className="l">{m.away}</td>
                  {imaSetove && <td className="sets">{str(m.sets)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  )
}

export function BiltenDocument({ snap }: { snap: Snapshot }) {
  const sub = [
    snap.title,
    snap.season ? `Sezona ${snap.season}` : '',
    snap.kolo ? `${snap.kolo}. kolo` : '',
    fmtPeriod(snap.dateFrom, snap.dateTo),
  ].filter(Boolean).join(' · ')

  const header = (
    <div className="bp-header">
      <div className="bp-logo"><img src={LOGO_SRC} alt="MOS Leskovac" /></div>
      <div className="bp-title">
        <h1>Međuokružni odbojkaški savez Leskovac</h1>
        <h2>Zvanični Bilten Takmičenja</h2>
        <p>{sub}</p>
      </div>
      <div className="bp-logo" />
    </div>
  )

  const end = (
    <>
      {snap.note && (
        <>
          <h3>Napomena</h3>
          <p className="bp-note">{snap.note}</p>
        </>
      )}
      <div className="bp-footer">
        <span>Leskovac, {fmtIssued(snap.issued)}</span>
        <span>Međuokružni odbojkaški savez Leskovac · mosleskovac.vercel.app</span>
      </div>
    </>
  )

  const sections = snap.sections.map(sec => <SectionView key={sec.uid} sec={sec} kolo={snap.kolo} />)

  // Strane: sve redom, ili svaka kategorija na novoj strani
  const pages: ReactNode[][] = snap.newPage && sections.length > 1
    ? sections.map((s, i) => [i === 0 ? header : null, s, i === sections.length - 1 ? end : null])
    : [[header, ...sections, end]]

  return (
    <>
      {pages.map((content, p) => (
        // Spoljna tabela: thead/tfoot se ponavljaju na svakoj strani i daju gornju/donju marginu
        <table key={p} className={`bilten-doc${p > 0 ? ' bp-break' : ''}`}>
          <thead><tr><td><div className="bp-space" /></td></tr></thead>
          <tfoot><tr><td><div className="bp-space" /></td></tr></tfoot>
          <tbody>
            <tr>
              <td>
                {content.map((c, i) => <Fragment key={i}>{c}</Fragment>)}
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </>
  )
}

// Stil dokumenta (važi i na ekranu i pri štampi)
export const BILTEN_DOC_CSS = `
.bilten-doc { width: 100%; border-collapse: collapse; background: #fff; color: #333; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.3; }
.bilten-doc, .bilten-doc * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.bilten-doc > thead > tr > td,
.bilten-doc > tfoot > tr > td,
.bilten-doc > tbody > tr > td { padding: 0 12mm; border: 0; text-align: left; vertical-align: top; }
.bilten-doc .bp-space { height: 12mm; }
.bilten-doc.bp-break { break-before: page; page-break-before: always; }
@media screen { .bilten-doc.bp-break { border-top: 2px dashed #c9d1dc; } }
.bilten-doc .bp-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #003366; padding-bottom: 15px; margin-bottom: 20px; }
.bilten-doc .bp-logo { width: 90px; height: 90px; flex: 0 0 90px; }
.bilten-doc .bp-logo img { display: block; width: 100%; height: 100%; object-fit: contain; }
.bilten-doc .bp-title { flex: 1 1 auto; text-align: center; padding: 0 15px; }
.bilten-doc .bp-title h1 { margin: 0; font-size: 1.4rem; font-weight: bold; color: #003366; text-transform: uppercase; }
.bilten-doc .bp-title h2 { margin: 5px 0 0; font-size: 1.1rem; font-weight: bold; color: #555; }
.bilten-doc .bp-title p { margin: 6px 0 0; font-size: 0.9rem; color: #555; }
.bilten-doc h3 { margin: 18px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #ddd; color: #003366; font-size: 1.17em; font-weight: bold; break-after: avoid; page-break-after: avoid; }
.bilten-doc .bp-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem; }
.bilten-doc .bp-table thead { display: table-header-group; }
.bilten-doc .bp-table tr { break-inside: avoid; page-break-inside: avoid; }
.bilten-doc .bp-table th,
.bilten-doc .bp-table td { border: 1px solid #d1d5db; padding: 8px; text-align: center; }
.bilten-doc .bp-table th { background-color: #e9ecef; color: #003366; font-weight: bold; white-space: nowrap; }
.bilten-doc .bp-table td.l { text-align: left; font-weight: bold; }
.bilten-doc .bp-table td.d { white-space: nowrap; }
.bilten-doc .bp-table td.res { font-weight: bold; color: #003366; white-space: nowrap; }
.bilten-doc .bp-table td.sets { font-size: 0.8rem; color: #444; }
.bilten-doc .bp-table td.empty { color: #777; }
.bilten-doc .bp-note { margin: 0 0 20px; white-space: pre-wrap; font-size: 0.9rem; line-height: 1.5; }
.bilten-doc .bp-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 0.75rem; color: #777; break-inside: avoid; }
`
