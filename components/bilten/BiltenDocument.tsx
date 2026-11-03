// Zajednički bilten: koristi ga admin panel (generator + štampa) i javna stranica /bilteni/[id].
// Bez 'use client' — radi i u server i u client komponentama.

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
}

export type Selection = { category: string; season: string; kolo: string }

// Snimak biltena — čuva se u koloni `meta` tabele bilteni
export type Snapshot = Selection & {
  v: 1
  title: string
  note: string
  issued: string
  standings: Row[]
  matches: MatchRow[]
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

export function parseSnapshot(meta: unknown): Snapshot | null {
  if (!meta) return null
  try {
    const s = typeof meta === 'string' ? JSON.parse(meta) : meta
    if (s && Array.isArray(s.standings) && Array.isArray(s.matches)) return s as Snapshot
  } catch {}
  return null
}

// Naziv PDF fajla koji browser predloži pri "Sačuvaj kao PDF"
export function pdfName(s: Snapshot) {
  return [s.title || 'Bilten', catLabel(s.category), s.season]
    .join(' - ')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ══════════════════════════════════════════
   DOKUMENT (po šablonu index.html, sa logom sajta)
══════════════════════════════════════════ */

export function BiltenDocument({ snap }: { snap: Snapshot }) {
  const cat = catLabel(snap.category)
  const sub = [snap.title, `Sezona ${snap.season}`, snap.kolo ? `${snap.kolo}. kolo` : '']
    .filter(Boolean).join(' · ')

  return (
    // Spoljna tabela: thead/tfoot se ponavljaju na svakoj strani i daju gornju/donju marginu
    <table className="bilten-doc">
      <thead><tr><td><div className="bp-space" /></td></tr></thead>
      <tfoot><tr><td><div className="bp-space" /></td></tr></tfoot>
      <tbody>
        <tr>
          <td>
            <div className="bp-header">
              <div className="bp-logo"><img src={LOGO_SRC} alt="MOS Leskovac" /></div>
              <div className="bp-title">
                <h1>Međuokružni odbojkaški savez Leskovac</h1>
                <h2>Zvanični Bilten Takmičenja</h2>
                <p>{sub}</p>
              </div>
              <div className="bp-logo" />
            </div>

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
                {snap.standings.length === 0 && (
                  <tr><td colSpan={12} className="empty">Tabela je prazna.</td></tr>
                )}
                {snap.standings.map((r, i) => (
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

            {snap.matches.length > 0 && (
              <>
                <h3>{cat} - Rezultati{snap.kolo ? ` (${snap.kolo}. kolo)` : ''}</h3>
                <table className="bp-table">
                  <thead>
                    <tr><th>Kolo</th><th>Datum</th><th>Domaćin</th><th>Rezultat</th><th>Gost</th></tr>
                  </thead>
                  <tbody>
                    {snap.matches.map((m, i) => (
                      <tr key={m.uid || i}>
                        <td>{m.round || '—'}</td>
                        <td>{fmtDate(m.date) || '—'}</td>
                        <td className="l">{m.home}</td>
                        <td className="res">
                          {m.home_sets !== '' && m.away_sets !== '' ? `${m.home_sets} : ${m.away_sets}` : '—'}
                        </td>
                        <td className="l">{m.away}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

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
          </td>
        </tr>
      </tbody>
    </table>
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
.bilten-doc .bp-table td.res { font-weight: bold; color: #003366; white-space: nowrap; }
.bilten-doc .bp-table td.empty { color: #777; }
.bilten-doc .bp-note { margin: 0 0 20px; white-space: pre-wrap; font-size: 0.9rem; line-height: 1.5; }
.bilten-doc .bp-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 0.75rem; color: #777; break-inside: avoid; }
`
