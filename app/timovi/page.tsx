import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import StandingsTable from '@/components/StandingsTable'
import MatchCard from '@/components/MatchCard'
import CategoryFilter from '@/components/CategoryFilter'
import SeasonSelect from '@/components/SeasonSelect'
import { Category, CATEGORIES, CATEGORIES_MUSKI, CATEGORIES_ZENSKE, SEASONS, isZenska } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'
import { Trophy, Calendar } from 'lucide-react'

interface Props {
  searchParams: { kategorija?: Category; sezona?: string }
}

// Rangiranje: pobede → bodovi → set količnik → poen količnik
function sortStandings(rows: any[]): any[] {
  return [...rows].sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won
    if (b.points !== a.points) return b.points - a.points
    const setA = a.sets_lost > 0 ? a.sets_won / a.sets_lost : a.sets_won
    const setB = b.sets_lost > 0 ? b.sets_won / b.sets_lost : b.sets_won
    if (setB !== setA) return setB - setA
    const poenA = a.points_lost > 0 ? a.points_won / a.points_lost : a.points_won
    const poenB = b.points_lost > 0 ? b.points_won / b.points_lost : b.points_won
    return poenB - poenA
  }).map((r, i) => ({ ...r, position: i + 1 }))
}

async function fetchStandings(category?: Category, season = SEASONS[0]) {
  const supabase = createClient()
  let q = supabase.from('standings').select('*, team:teams(*)').eq('season', season)
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  if (error) { console.error(error); return [] }
  return data ?? []
}

async function fetchUpcoming(category?: Category, season = SEASONS[0]) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  let q = supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
    .eq('season', season)
    .in('status', ['scheduled', 'postponed'])
    .gte('match_date', today)
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  if (error) { console.error(error); return [] }
  return data ?? []
}

export default async function TimoviPage({ searchParams }: Props) {
  const category = searchParams.kategorija
  const season   = searchParams.sezona ?? SEASONS[0]

  const [rawAll, upcoming] = await Promise.all([
    fetchStandings(category, season),
    fetchUpcoming(category, season),
  ])

  function groupAndSort(rows: any[], catList: { value: Category }[]) {
    return catList.reduce((acc, c) => {
      const group = rows.filter(s => s.category === c.value)
      acc[c.value] = sortStandings(group)
      return acc
    }, {} as Record<string, any[]>)
  }

  const groupedM = groupAndSort(rawAll, CATEGORIES_MUSKI)
  const groupedZ = groupAndSort(rawAll, CATEGORIES_ZENSKE)
  const allSorted = category ? sortStandings(rawAll) : []
  const catLabel  = category ? CATEGORIES.find(c => c.value === category)?.label : null
  const zenski    = category ? isZenska(category) : false

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className={`border-b border-[#f5c518]/20 ${zenski ? 'bg-gradient-to-r from-[#3a0a20] to-[#6b1a3a]' : 'bg-gradient-to-r from-[#002d63] to-[#003f8a]'}`}>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5" style={{ color: zenski ? '#f9a8d4' : '#f5c518' }} />
            <span className="font-display tracking-widest text-sm" style={{ color: zenski ? '#f9a8d4' : '#f5c518' }}>TABELA LIGA</span>
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">
            {catLabel ? catLabel.toUpperCase() : 'SVE KATEGORIJE'}
          </h1>
          <p className="text-blue-300 text-sm mt-1">Sezona {season}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filteri */}
        <div className="flex flex-col gap-4 mb-8">
          <Suspense fallback={<div className="h-10" />}>
            <CategoryFilter active={category} />
          </Suspense>
          <div className="flex justify-end">
            <Suspense fallback={<div className="h-10 w-32" />}>
              <SeasonSelect active={season} />
            </Suspense>
          </div>
        </div>

        {/* Odabrana kategorija */}
        {category ? (
          <>
            <StandingsTable standings={allSorted} />

            {/* Predstojeće utakmice */}
            {upcoming.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-5">
                  <Calendar className="w-5 h-5" style={{ color: zenski ? '#f9a8d4' : '#f5c518' }} />
                  <h2 className="font-display text-2xl tracking-widest" style={{ color: zenski ? '#f9a8d4' : '#f5c518' }}>
                    PREDSTOJEĆE UTAKMICE
                  </h2>
                  <span className="text-xs text-blue-400 bg-[#003f8a]/30 px-2 py-0.5 rounded">{upcoming.length}</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map((m: any) => <MatchCard key={m.id} match={m} />)}
                </div>
              </div>
            )}

            {upcoming.length === 0 && (
              <div className="mt-10 glass rounded-2xl p-8 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: zenski ? '#f9a8d4' : '#f5c518' }} />
                <p className="text-blue-400 text-sm">Nema predstojecih utakmica za ovu kategoriju.</p>
              </div>
            )}
          </>
        ) : (
          /* Sve kategorije — dve sekcije */
          <div className="space-y-16">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-[#003f8a]/50" />
                <h2 className="font-display text-2xl text-[#f5c518] tracking-widest">MUŠKA VERTIKALA</h2>
                <div className="h-px flex-1 bg-[#003f8a]/50" />
              </div>
              <div className="space-y-10">
                {CATEGORIES_MUSKI.map(cat => (
                  <div key={cat.value}>
                    <h3 className="font-display text-xl text-blue-300 tracking-widest mb-3">{cat.label.toUpperCase()}</h3>
                    <StandingsTable standings={groupedM[cat.value] ?? []} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-pink-900/40" />
                <h2 className="font-display text-2xl text-pink-300 tracking-widest">ŽENSKA VERTIKALA</h2>
                <div className="h-px flex-1 bg-pink-900/40" />
              </div>
              <div className="space-y-10">
                {CATEGORIES_ZENSKE.map(cat => (
                  <div key={cat.value}>
                    <h3 className="font-display text-xl text-pink-300 tracking-widest mb-3">{cat.label.toUpperCase()}</h3>
                    <StandingsTable standings={groupedZ[cat.value] ?? []} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
