'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SEASONS } from '@/lib/types'
import { LogOut, Trophy, Calendar, Users, Info, Building2, Scale, BookOpen } from 'lucide-react'
import TimoviTab   from '@/components/admin/TimoviTab'
import TabelaTab   from '@/components/admin/TabelaTab'
import UtakmiceTab from '@/components/admin/UtakmiceTab'
import MosInfoTab  from '@/components/admin/MosInfoTab'
import KluboviTab  from '@/components/admin/KluboviTab'
import TreneriTab  from '@/components/admin/TreneriTab'
import SudijeTab   from '@/components/admin/SudijeTab'
import BilteniTab  from '@/components/admin/BilteniTab'

type Tab = 'timovi' | 'tabela' | 'utakmice' | 'mosinfo' | 'klubovi' | 'treneri' | 'sudije' | 'bilteni'

export default function Dashboard() {
  const [tab,       setTab]       = useState<Tab>('timovi')
  const [loading,   setLoading]   = useState(true)
  const [teams,     setTeams]     = useState<any[]>([])
  const [standings, setStandings] = useState<any[]>([])
  const [matches,   setMatches]   = useState<any[]>([])
  const [aktivnaSezona, setAktivnaSezona] = useState(SEASONS[0])
  const router   = useRouter()
  const supabase = createClient()
  const [isReviewer, setIsReviewer] = useState(false)

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/admin/login'); return }
    setIsReviewer(user.email === 'google-test@mol.com')
    setLoading(false)
  }, [supabase, router])
  
  

  const reload = useCallback(async () => {
    const [t, s, m] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('standings').select('*, team:teams(name)').order('category').order('won', { ascending: false }),
      supabase.from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)')
        .order('match_date', { ascending: true }).order('match_time', { ascending: true }),
    ])
    setTeams(t.data ?? [])
    setStandings(s.data ?? [])
    setMatches(m.data ?? [])
  }, [supabase])

  useEffect(() => { checkAuth().then(() => reload()) }, [checkAuth, reload])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="font-display text-[#f5c518] text-2xl tracking-widest animate-pulse">UČITAVANJE...</span>
    </div>
  )

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'timovi',   label: 'TIMOVI',   icon: Users     },
    { id: 'tabela',   label: 'TABELA',   icon: Trophy    },
    { id: 'utakmice', label: 'UTAKMICE', icon: Calendar  },
    { id: 'mosinfo',  label: 'MOS INFO', icon: Info      },
    { id: 'klubovi',  label: 'KLUBOVI',  icon: Building2 },
    { id: 'treneri',  label: 'TRENERI',  icon: Users     },
    { id: 'sudije',   label: 'SUDIJE',   icon: Scale     },
    { id: 'bilteni',  label: 'BILTENI',  icon: BookOpen  },
  ]
  
  return (
    
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 bg-[#002d63] border-b-2 border-[#f5c518]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f5c518] flex items-center justify-center font-display text-[#002d63] text-xs font-bold">MOSL</div>
              <div>
                <div className="font-display text-[#f5c518] tracking-widest leading-none">ADMIN PANEL</div>
                <div className="text-[10px] text-blue-300 tracking-wider">MOSL</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Globalni filter sezone */}
              <select
                value={aktivnaSezona}
                onChange={e => setAktivnaSezona(e.target.value)}
                className="bg-[#003f8a]/60 border border-[#f5c518]/30 text-[#f5c518] text-xs font-display tracking-wider rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#f5c518]">
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={logout} className="flex items-center gap-1.5 text-sm text-blue-300 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" /> Odjava
              </button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 font-display text-sm tracking-wider border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-[#f5c518] text-[#f5c518]' : 'border-transparent text-blue-400 hover:text-blue-200'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'timovi'   && <TimoviTab   teams={teams} supabase={supabase} onRefresh={reload} isReviewer = {isReviewer}  />}
        {tab === 'tabela'   && <TabelaTab   standings={standings.filter(s => s.season === aktivnaSezona)} teams={teams} supabase={supabase} onRefresh={reload} aktivnaSezona={aktivnaSezona}  isReviewer = {isReviewer} />}
        {tab === 'utakmice' && <UtakmiceTab matches={matches.filter(m => m.season === aktivnaSezona)} teams={teams} supabase={supabase} onRefresh={reload} aktivnaSezona={aktivnaSezona} isReviewer = {isReviewer} />}
        {tab === 'mosinfo'  && <MosInfoTab  supabase={supabase} isReviewer = {isReviewer} />}
        {tab === 'klubovi'  && <KluboviTab  supabase={supabase} teams={teams} isReviewer = {isReviewer} />}
        {tab === 'treneri'  && <TreneriTab  supabase={supabase} isReviewer = {isReviewer} />}
        {tab === 'sudije'   && <SudijeTab   supabase={supabase} isReviewer = {isReviewer} />}
        {tab === 'bilteni'  && <BilteniTab  supabase={supabase} isReviewer = {isReviewer} />}
      </div>
    </div>
  )
}
