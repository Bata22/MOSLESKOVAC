import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import StandingsTable from '@/components/StandingsTable'
import CategoryFilter from '@/components/CategoryFilter'
import SeasonSelect from '@/components/SeasonSelect'
import { Category, CATEGORIES, SEASONS } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'
import { Trophy } from 'lucide-react'

interface Props {
  searchParams: { kategorija?: Category; sezona?: string }
}

async function fetchStandings(category?: Category, season = SEASONS[0]) {
  const supabase = createClient()

  let q = supabase
    .from('standings')
    .select('*, team:teams(*)')
    .eq('season', season)
    .order('position', { ascending: true })

  if (category) q = q.eq('category', category)

  const { data, error } = await q
  if (error) { console.error(error); return [] }
  return data ?? []
}

export default async function TimoviPage({ searchParams }: Props) {
  const category = searchParams.kategorija
  const season   = searchParams.sezona ?? SEASONS[0]
  const all      = await fetchStandings(category, season)

  const grouped = CATEGORIES.reduce((acc, c) => {
    acc[c.value] = all.filter(s => s.category === c.value)
    return acc
  }, {} as Record<string, typeof all>)

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="bg-gradient-to-r from-[#002d63] to-[#003f8a] border-b border-[#f5c518]/20">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-[#f5c518]" />
            <span className="font-display text-[#f5c518] tracking-widest text-sm">TABELA LIGA</span>
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">
            {category ? CATEGORIES.find(c => c.value === category)?.label.toUpperCase() : 'SVE KATEGORIJE'}
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

        {category ? (
          <StandingsTable standings={all} />
        ) : (
          <div className="space-y-12">
            {CATEGORIES.map(cat => (
              <div key={cat.value}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-px flex-1 bg-[#003f8a]/50" />
                  <h2 className="font-display text-2xl text-[#f5c518] tracking-widest">{cat.label.toUpperCase()}</h2>
                  <div className="h-px flex-1 bg-[#003f8a]/50" />
                </div>
                <StandingsTable standings={grouped[cat.value] ?? []} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
