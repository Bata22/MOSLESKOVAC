import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import MatchCard from '@/components/MatchCard'
import CategoryFilter from '@/components/CategoryFilter'
import SeasonSelect from '@/components/SeasonSelect'
import { Category, CATEGORIES, SEASONS } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'
import { Calendar } from 'lucide-react'

interface Props {
  searchParams: { kategorija?: Category; sezona?: string }
}

async function fetchMatches(category?: Category, season = SEASONS[0]) {
  const supabase = createClient()

  let q = supabase
    .from('matches')
    .select(`*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)`)
    .eq('season', season)
    .order('match_date', { ascending: true })

  if (category) q = q.eq('category', category)

  const { data, error } = await q
  if (error) { console.error(error); return [] }
  return data ?? []
}

export default async function UtakmicePage({ searchParams }: Props) {
  const category = searchParams.kategorija
  const season   = searchParams.sezona ?? SEASONS[0]
  const matches  = await fetchMatches(category, season)

  const today     = new Date().toISOString().split('T')[0]
  const live      = matches.filter(m => m.status === 'live')
  const upcoming  = matches.filter(m => m.status === 'scheduled' && m.match_date >= today)
  const finished  = matches.filter(m => m.status === 'finished').reverse()
  const postponed = matches.filter(m => m.status === 'postponed')

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="bg-gradient-to-r from-[#002d63] to-[#003f8a] border-b border-[#f5c518]/20">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-[#f5c518]" />
            <span className="font-display text-[#f5c518] tracking-widest text-sm">RASPORED & REZULTATI</span>
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">
            {category ? CATEGORIES.find(c => c.value === category)?.label.toUpperCase() + ' — UTAKMICE' : 'UTAKMICE'}
          </h1>
          <p className="text-blue-300 text-sm mt-1">Sezona {season}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center">
          <Suspense fallback={<div className="h-10" />}>
            <CategoryFilter active={category} />
          </Suspense>
          <div className="sm:ml-auto">
            <Suspense fallback={<div className="h-10 w-32" />}>
              <SeasonSelect active={season} />
            </Suspense>
          </div>
        </div>

        {live.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-2xl text-red-400 tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 live-pulse inline-block" /> UŽIVO
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {live.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="font-display text-2xl text-[#f5c518] tracking-widest mb-4 flex items-center gap-3">
            PREDSTOJEĆE
            <span className="text-xs text-blue-400 bg-[#003f8a]/30 px-2 py-0.5 rounded font-body">{upcoming.length}</span>
          </h2>
          {upcoming.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-blue-400">Nema zakazanih utakmica.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl text-white tracking-widest mb-4 flex items-center gap-3">
            REZULTATI
            <span className="text-xs text-blue-400 bg-[#003f8a]/30 px-2 py-0.5 rounded font-body">{finished.length}</span>
          </h2>
          {finished.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-blue-400">Nema odigranih utakmica.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {finished.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
        </section>

        {postponed.length > 0 && (
          <section>
            <h2 className="font-display text-2xl text-yellow-400 tracking-widest mb-4">ODLOŽENE</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {postponed.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
