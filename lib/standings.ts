// Tabela liga: računanje iz završenih utakmica i upis u tabelu `standings`.
// Koriste je admin tabovi UTAKMICE i TABELA i generator biltena, pa su pravila na jednom mestu.

import type { SupabaseClient } from '@supabase/supabase-js'
import { CATEGORIES } from './types'

export type StatKey = 'played' | 'won' | 'lost' | 'sets_won' | 'sets_lost' | 'points_won' | 'points_lost' | 'points'
export type Stat = Record<StatKey, number>

export const STAT_KEYS: StatKey[] = ['played', 'won', 'lost', 'sets_won', 'sets_lost', 'points_won', 'points_lost', 'points']

const nula = (): Stat => ({ played: 0, won: 0, lost: 0, sets_won: 0, sets_lost: 0, points_won: 0, points_lost: 0, points: 0 })

// Bodovi: 3:0, 3:1 (i 2:0) → 3-0; 3:2 (i 2:1) → 2-1
export function calcPoints(winningSets: number, losingSets: number) {
  return winningSets - losingSets >= 2 ? { winner: 3, loser: 0 } : { winner: 2, loser: 1 }
}

const kolicnik = (plus: number, minus: number) => (minus > 0 ? plus / minus : plus)

// Redosled u tabeli: pobede → bodovi → set količnik → poen količnik
export function compareStandings(a: Partial<Stat>, b: Partial<Stat>) {
  return (b.won ?? 0) - (a.won ?? 0)
    || (b.points ?? 0) - (a.points ?? 0)
    || kolicnik(b.sets_won ?? 0, b.sets_lost ?? 0) - kolicnik(a.sets_won ?? 0, a.sets_lost ?? 0)
    || kolicnik(b.points_won ?? 0, b.points_lost ?? 0) - kolicnik(a.points_won ?? 0, a.points_lost ?? 0)
}

export type MatchResult = {
  home_team_id: string | null
  away_team_id: string | null
  home_sets?: number | null
  away_sets?: number | null
  home_score?: number | null
  away_score?: number | null
}

// Statistika po timu iz završenih utakmica (ključ = team_id)
export function computeStats(matches: MatchResult[]): Map<string, Stat> {
  const stats = new Map<string, Stat>()
  const get = (id: string) => {
    let s = stats.get(id)
    if (!s) { s = nula(); stats.set(id, s) }
    return s
  }
  for (const m of matches) {
    if (!m.home_team_id || !m.away_team_id || m.home_team_id === m.away_team_id) continue
    const home = get(m.home_team_id)
    const away = get(m.away_team_id)
    const hs = m.home_sets ?? 0
    const as = m.away_sets ?? 0
    if (hs === as) continue // nema rezultata — tim je u tabeli, ali bez odigrane utakmice
    const hp = m.home_score ?? 0
    const ap = m.away_score ?? 0
    const pts = calcPoints(Math.max(hs, as), Math.min(hs, as))

    home.played++; away.played++
    home.sets_won += hs; home.sets_lost += as
    away.sets_won += as; away.sets_lost += hs
    home.points_won += hp; home.points_lost += ap
    away.points_won += ap; away.points_lost += hp

    if (hs > as) {
      home.won++; home.points += pts.winner
      away.lost++; away.points += pts.loser
    } else {
      away.won++; away.points += pts.winner
      home.lost++; home.points += pts.loser
    }
  }
  return stats
}

type StandingRow = Partial<Stat> & {
  id: string
  team_id: string
  position: number | null
  team?: { category?: string | null } | null
}

const izReda = (r: Partial<Stat>): Stat => {
  const s = nula()
  STAT_KEYS.forEach(k => { s[k] = Number(r[k] ?? 0) || 0 })
  return s
}

/**
 * Preračun tabele jedne kategorije u jednoj sezoni.
 *
 * - Tim sa završenim utakmicama: njegov red se ažurira (ili dodaje). Dupli redovi istog tima se brišu.
 * - `touched`: timovi iz izmenjene ili obrisane utakmice. Ako više nemaju završenih utakmica,
 *   red se vraća na nule, a briše se ako je tim iz druge kategorije (takav red je nastao greškom).
 * - `full`: isto kao `touched`, ali za sve timove u tabeli (dugme PRERAČUNAJ IZ UTAKMICA).
 *   Kategorija bez ijedne završene utakmice se ne dira (osim brisanja duplikata).
 * - Ostali (ručno uneti) redovi ostaju kakvi jesu. Pozicije se računaju za celu tabelu.
 */
export async function recalcStandings(
  supabase: SupabaseClient,
  category: string,
  season: string,
  opts: { touched?: (string | null | undefined)[]; full?: boolean } = {},
): Promise<{ error: string | null; changed: boolean }> {
  const [mRes, sRes] = await Promise.all([
    supabase.from('matches')
      .select('home_team_id, away_team_id, home_sets, away_sets, home_score, away_score')
      .eq('category', category).eq('season', season).eq('status', 'finished'),
    supabase.from('standings')
      .select('id, team_id, position, played, won, lost, sets_won, sets_lost, points_won, points_lost, points, team:teams(category)')
      .eq('category', category).eq('season', season),
  ])
  if (mRes.error) return { error: mRes.error.message, changed: false }
  if (sRes.error) return { error: sRes.error.message, changed: false }

  const matches = (mRes.data ?? []) as MatchResult[]
  const rows = (sRes.data ?? []) as unknown as StandingRow[]
  const stats = computeStats(matches)

  const reset = new Set<string>()
  if (opts.full) { if (matches.length) rows.forEach(r => reset.add(r.team_id)) }
  else (opts.touched ?? []).forEach(id => { if (id) reset.add(id) })

  // Redovi po timu
  const byTeam = new Map<string, StandingRow[]>()
  for (const r of rows) {
    const list = byTeam.get(r.team_id)
    if (list) list.push(r)
    else byTeam.set(r.team_id, [r])
  }

  type Final = { id?: string; team_id: string; stat: Stat; old?: StandingRow }
  const brisi: string[] = []
  const final: Final[] = []

  byTeam.forEach((list, team_id) => {
    // Zadržava se red sa najviše odigranih, višak (duplikati) se briše
    const [keep, ...visak] = [...list].sort((a, b) => (b.played ?? 0) - (a.played ?? 0))
    visak.forEach(r => brisi.push(r.id))
    const s = stats.get(team_id)
    if (s) {
      final.push({ id: keep.id, team_id, stat: s, old: keep })
    } else if (reset.has(team_id)) {
      const teamCat = keep.team?.category
      if (teamCat && teamCat !== category) brisi.push(keep.id)
      else final.push({ id: keep.id, team_id, stat: nula(), old: keep })
    } else {
      final.push({ id: keep.id, team_id, stat: izReda(keep), old: keep })
    }
  })
  stats.forEach((s, team_id) => { if (!byTeam.has(team_id)) final.push({ team_id, stat: s }) })

  final.sort((a, b) => compareStandings(a.stat, b.stat) || (a.old?.position ?? 999) - (b.old?.position ?? 999))
  const saPozicijom = final.map((f, i) => ({ ...f, position: i + 1 }))

  let error: string | null = null
  const zapamti = (e: any) => { if (e && !error) error = e.message ?? String(e) }

  if (brisi.length) {
    const { error: e } = await supabase.from('standings').delete().in('id', brisi)
    zapamti(e)
  }

  const izmene = saPozicijom.filter(f => f.id && (
    f.old?.position !== f.position || STAT_KEYS.some(k => Number(f.old?.[k] ?? 0) !== f.stat[k])
  ))
  const rez = await Promise.all(izmene.map(f =>
    supabase.from('standings').update({ ...f.stat, position: f.position }).eq('id', f.id as string)))
  rez.forEach(r => zapamti(r.error))

  const novi = saPozicijom.filter(f => !f.id)
  if (novi.length) {
    const { error: e } = await supabase.from('standings')
      .insert(novi.map(f => ({ team_id: f.team_id, category, season, position: f.position, ...f.stat })))
    zapamti(e)
  }

  return { error, changed: brisi.length + izmene.length + novi.length > 0 }
}

/**
 * PRERAČUNAJ za celu sezonu (ili samo jednu kategoriju): prolazi kroz sve kategorije
 * (i one koje postoje samo u tabeli, npr. stare) i preračunava ih iz završenih utakmica.
 */
export async function recalcSeason(
  supabase: SupabaseClient, season: string, onlyCategory?: string,
): Promise<{ count: number; errors: string[] }> {
  let cats: string[]
  if (onlyCategory) cats = [onlyCategory]
  else {
    const { data } = await supabase.from('standings').select('category').eq('season', season)
    const set = new Set<string>(CATEGORIES.map(c => c.value))
    ;(data ?? []).forEach((r: any) => { if (r?.category) set.add(r.category) })
    cats = Array.from(set)
  }
  const errors: string[] = []
  let count = 0
  for (const c of cats) {
    const r = await recalcStandings(supabase, c, season, { full: true })
    if (r.error) errors.push(`${c}: ${r.error}`)
    else if (r.changed) count++
  }
  return { count, errors }
}
