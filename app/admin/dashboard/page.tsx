'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, SEASONS } from '@/lib/types'
import { Plus, LogOut, Trophy, Calendar, Users, Trash2, Save, X, Edit2, Info, Building2, Scale, BookOpen, FileText } from 'lucide-react'


type Tab = 'timovi' | 'tabela' | 'utakmice' | 'mosinfo' | 'klubovi' | 'treneri' | 'sudije' | 'bilteni'

export default function Dashboard() {
  const [tab,       setTab]       = useState<Tab>('timovi')
  const [loading,   setLoading]   = useState(true)
  const [teams,     setTeams]     = useState<any[]>([])
  const [standings, setStandings] = useState<any[]>([])
  const [matches,   setMatches]   = useState<any[]>([])
  const router   = useRouter()
  const supabase = createClient()

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/admin/login'); return }
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
            <button onClick={logout} className="flex items-center gap-1.5 text-sm text-blue-300 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" /> Odjava
            </button>
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
        {tab === 'timovi'   && <TimoviTab   teams={teams} supabase={supabase} onRefresh={reload} />}
        {tab === 'tabela'   && <TabelaTab   standings={standings} teams={teams} supabase={supabase} onRefresh={reload} />}
        {tab === 'utakmice' && <UtakmiceTab matches={matches} teams={teams} supabase={supabase} onRefresh={reload} />}
        {tab === 'mosinfo'  && <MosInfoTab  supabase={supabase} />}
        {tab === 'klubovi'  && <KluboviTab supabase={supabase} teams={teams} />}
        {tab === 'treneri'  && <TreneriTab  supabase={supabase} />}
        {tab === 'sudije'   && <SudijeTab   supabase={supabase} />}
        {tab === 'bilteni'  && <BilteniTab  supabase={supabase} />}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════ TIMOVI ══════════════════════════════════════════ */
function TimoviTab({ teams, supabase, onRefresh }: any) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'seniori', city: '' })

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('teams').insert([form])
    setForm({ name: '', category: 'seniori', city: '' })
    setOpen(false); setBusy(false); onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Obrisati tim?')) return
    await supabase.from('teams').delete().eq('id', id); onRefresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">TIMOVI</h2>
        <button onClick={() => setOpen(v => !v)} className="btn-yellow"><Plus className="w-4 h-4" /> DODAJ TIM</button>
      </div>

      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI TIM</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="label">Naziv tima *</label><input className="field-input" placeholder="OK Vranje" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div>
              <label className="label">Kategorija *</label>
              <select className="field-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div><label className="label">Grad</label><input className="field-input" placeholder="Leskovac" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr>
            <th className="th-style">TIM</th><th className="th-style">KATEGORIJA</th>
            <th className="th-style hidden sm:table-cell">GRAD</th><th className="th-style text-right">AKCIJE</th>
          </tr></thead>
          <tbody>
            {teams.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-blue-500 text-sm">Nema unetih timova.</td></tr>}
            {teams.map((t: any) => (
              <tr key={t.id} className="border-t border-white/5 tr-hover">
                <td className="px-4 py-3 text-white font-semibold text-sm">{t.name}</td>
                <td className="px-4 py-3"><span className="text-xs bg-[#003f8a]/50 text-blue-300 px-2 py-0.5 rounded">{t.category}</span></td>
                <td className="px-4 py-3 text-blue-400 text-sm hidden sm:table-cell">{t.city || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del(t.id)} className="text-red-400 hover:text-red-300 p-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════ TABELA ══════════════════════════════════════════ */
function TabelaTab({ standings, teams, supabase, onRefresh }: any) {
  const [open,    setOpen]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editRow, setEditRow] = useState<any>(null)

  const blank = { team_id: '', category: 'seniori', season: SEASONS[0], played:0, won:0, lost:0, sets_won:0, sets_lost:0, points_won:0, points_lost:0, points:0 }
  const [form, setForm] = useState(blank)

  async function recalcPositions(category: string, season: string) {
    const { data } = await supabase.from('standings').select('id, won, points, sets_won, sets_lost, points_won, points_lost')
      .eq('category', category).eq('season', season)
    if (!data) return
    const sorted = [...data].sort((a: any, b: any) => {
      if (b.won !== a.won) return b.won - a.won
      if (b.points !== a.points) return b.points - a.points
      const setA = a.sets_lost > 0 ? a.sets_won / a.sets_lost : a.sets_won
      const setB = b.sets_lost > 0 ? b.sets_won / b.sets_lost : b.sets_won
      if (setB !== setA) return setB - setA
      const pA = a.points_lost > 0 ? a.points_won / a.points_lost : a.points_won
      const pB = b.points_lost > 0 ? b.points_won / b.points_lost : b.points_won
      return pB - pA
    })
    await Promise.all(sorted.map((row: any, i: number) =>
      supabase.from('standings').update({ position: i + 1 }).eq('id', row.id)
    ))
  }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('standings').insert([{ ...form, position: 1 }])
    await recalcPositions(form.category, form.season)
    setForm(blank); setOpen(false); setBusy(false); onRefresh()
  }

  async function saveEdit() {
    if (!editId || !editRow) return; setBusy(true)
    await supabase.from('standings').update({
      played: editRow.played, won: editRow.won, lost: editRow.lost,
      sets_won: editRow.sets_won, sets_lost: editRow.sets_lost,
      points_won: editRow.points_won, points_lost: editRow.points_lost, points: editRow.points,
    }).eq('id', editId)
    await recalcPositions(editRow.category, editRow.season)
    setEditId(null); setEditRow(null); setBusy(false); onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Obrisati unos?')) return
    const row = standings.find((s: any) => s.id === id)
    await supabase.from('standings').delete().eq('id', id)
    if (row) await recalcPositions(row.category, row.season)
    onRefresh()
  }

  const nEdit = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditRow((r: any) => ({ ...r, [key]: parseInt(e.target.value) || 0 }))

  const numField = (key: string, label: string) => (
    <div key={key}>
      <label className="label">{label}</label>
      <input type="number" min="0" className="field-input" value={(form as any)[key]}
        onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))} />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">TABELA LIGA</h2>
        <button onClick={() => { setOpen(v => !v); setEditId(null) }} className="btn-yellow"><Plus className="w-4 h-4" /> DODAJ UNOS</button>
      </div>

      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI UNOS</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2 md:col-span-1">
              <label className="label">Tim *</label>
              <select className="field-input" value={form.team_id} onChange={e => setForm({...form, team_id: e.target.value})} required>
                <option value="">— Izaberi tim —</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Kategorija *</label>
              <select className="field-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sezona *</label>
              <select className="field-input" value={form.season} onChange={e => setForm({...form, season: e.target.value})}>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {numField('played','Utakmice')} {numField('won','Pobede')} {numField('lost','Izgubljene')}
            {numField('sets_won','Setovi +')} {numField('sets_lost','Setovi -')}
            {numField('points_won','Poeni +')} {numField('points_lost','Poeni -')} {numField('points','Bodovi')}
          </div>
          <p className="text-xs text-blue-500 mt-3">* Pozicija se računa: Pobede → Bodovi → Set količnik → Poen količnik</p>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      {editId && editRow && (
        <div className="glass rounded-2xl p-6 mb-6 border border-blue-400/40">
          <h3 className="font-display text-xl text-white tracking-wider mb-1">UREDI: <span className="text-[#f5c518]">{editRow.team?.name}</span></h3>
          <p className="text-xs text-blue-400 mb-4 capitalize">{editRow.category} — {editRow.season}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {[['played','Utakmice'],['won','Pobede'],['lost','Izgubljene'],['sets_won','Setovi +'],['sets_lost','Setovi -'],['points_won','Poeni +'],['points_lost','Poeni -'],['points','Bodovi']].map(([k,l]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input type="number" min="0" className="field-input" value={editRow[k] ?? 0} onChange={nEdit(k)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-500 mt-3">Pozicija se automatski rekalkuliše: Pobede → Bodovi → Set količnik → Poen količnik</p>
          <div className="flex gap-2 mt-4">
            <button onClick={saveEdit} disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ IZMENE</button>
            <button onClick={() => { setEditId(null); setEditRow(null) }} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead><tr>
            {['#','TIM','KAT.','SEZONA','UT','P','I','S+','S-','B+','B-','BOD','AKCIJE'].map(h => (
              <th key={h} className="th-style">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {standings.length === 0 && <tr><td colSpan={13} className="px-4 py-10 text-center text-blue-500 text-sm">Nema podataka.</td></tr>}
            {standings.map((s: any) => (
              <tr key={s.id} className={`border-t border-white/5 tr-hover text-sm ${editId === s.id ? 'bg-blue-900/20' : ''}`}>
                <td className="px-3 py-2.5 text-center"><span className="font-display text-lg text-[#f5c518]">{s.position}</span></td>
                <td className="px-3 py-2.5 text-white font-semibold">{s.team?.name}</td>
                <td className="px-3 py-2.5"><span className="text-xs bg-[#003f8a]/50 text-blue-300 px-1.5 py-0.5 rounded">{s.category}</span></td>
                <td className="px-3 py-2.5 text-blue-400">{s.season}</td>
                <td className="px-3 py-2.5 text-center text-blue-300">{s.played}</td>
                <td className="px-3 py-2.5 text-center text-green-400 font-semibold">{s.won}</td>
                <td className="px-3 py-2.5 text-center text-red-400">{s.lost}</td>
                <td className="px-3 py-2.5 text-center text-blue-300">{s.sets_won}</td>
                <td className="px-3 py-2.5 text-center text-blue-300">{s.sets_lost}</td>
                <td className="px-3 py-2.5 text-center text-blue-300">{s.points_won}</td>
                <td className="px-3 py-2.5 text-center text-blue-300">{s.points_lost}</td>
                <td className="px-3 py-2.5 text-center font-display text-xl text-[#f5c518]">{s.points}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => { setEditId(s.id); setEditRow({...s}); setOpen(false) }} className="text-blue-400 hover:text-[#f5c518] p-1 transition-colors" title="Uredi"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(s.id)} className="text-red-400 hover:text-red-300 p-1 transition-colors" title="Obriši"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════ UTAKMICE ══════════════════════════════════════════ */
function UtakmiceTab({ matches, teams, supabase, onRefresh }: any) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const blank = {
    home_team_id: '', away_team_id: '', category: 'seniori', season: SEASONS[0],
    match_date: '', match_time: '', venue: '', status: 'scheduled',
    redni_broj: '', round: '', home_sets: '', away_sets: '', home_score: '', away_score: '', notes: ''
  }
  const [form, setForm] = useState(blank)
  const [dateDay, setDateDay]     = useState('')
  const [dateMonth, setDateMonth] = useState('')
  const [dateYear, setDateYear]   = useState('')
  const [timeHour, setTimeHour]   = useState('')
  const [timeMin, setTimeMin]     = useState('')

  function updateDate(day: string, month: string, year: string) {
    setDateDay(day); setDateMonth(month); setDateYear(year)
    if (day && month && year && year.length === 4)
      setForm(f => ({ ...f, match_date: `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}` }))
  }
  function updateTime(hour: string, min: string) {
    setTimeHour(hour); setTimeMin(min)
    if (hour !== '' && min !== '')
      setForm(f => ({ ...f, match_time: `${hour.padStart(2,'0')}:${min.padStart(2,'0')}` }))
  }

  function fmtDate(d: string) {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }
  function fmtTime(t: string) { return t ? t.substring(0, 5) : null }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    const payload: any = { ...form }
    ;['home_sets','away_sets','home_score','away_score'].forEach(k => {
      if (payload[k] === '') delete payload[k]; else payload[k] = parseInt(payload[k])
    })
    ;['match_time','round','redni_broj','venue','notes'].forEach(k => { if (!payload[k]) delete payload[k] })
    await supabase.from('matches').insert([payload])
    setForm(blank); setDateDay(''); setDateMonth(''); setDateYear(''); setTimeHour(''); setTimeMin('')
    setOpen(false); setBusy(false); onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Obrisati utakmicu?')) return
    await supabase.from('matches').delete().eq('id', id); onRefresh()
  }

  // Edit rezultata + datum/vreme
  const [page,      setPage]          = useState(1)
  const [editMatch, setEditMatch]     = useState<any>(null)
  const editRef = useRef<HTMLDivElement>(null)
  const [editBusy,  setEditBusy]      = useState(false)
  const [editDateDay, setEditDateDay]     = useState('')
  const [editDateMonth, setEditDateMonth] = useState('')
  const [editDateYear, setEditDateYear]   = useState('')
  const [editTimeHour, setEditTimeHour]   = useState('')
  const [editTimeMin, setEditTimeMin]     = useState('')

  function startEditMatch(m: any) {
    setEditMatch({
      id: m.id, status: m.status,
      category: m.category, season: m.season,
      home_sets: m.home_sets ?? '', away_sets: m.away_sets ?? '',
      home_score: m.home_score ?? '', away_score: m.away_score ?? '',
      home_name: m.home_team?.name ?? 'Domaćin', away_name: m.away_team?.name ?? 'Gosti',
      match_date: m.match_date ?? '', match_time: m.match_time ?? '',
      venue: m.venue ?? '', redni_broj: m.redni_broj ?? '', round: m.round ?? '',
    })
    // Popuni edit datum polja iz postojećeg datuma
    if (m.match_date) {
      const [y, mo, d] = m.match_date.split('-')
      setEditDateDay(d || ''); setEditDateMonth(mo || ''); setEditDateYear(y || '')
    } else { setEditDateDay(''); setEditDateMonth(''); setEditDateYear('') }
    if (m.match_time) {
      const parts = m.match_time.split(':')
      setEditTimeHour(parts[0] || ''); setEditTimeMin(parts[1] || '')
    } else { setEditTimeHour(''); setEditTimeMin('') }
    setOpen(false)
    // Skroluj do edit forme
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function updateEditDate(day: string, month: string, year: string) {
    setEditDateDay(day); setEditDateMonth(month); setEditDateYear(year)
    if (day && month && year && year.length === 4)
      setEditMatch((m: any) => ({ ...m, match_date: `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}` }))
  }
  function updateEditTime(hour: string, min: string) {
    setEditTimeHour(hour); setEditTimeMin(min)
    if (hour !== '' && min !== '')
      setEditMatch((m: any) => ({ ...m, match_time: `${hour.padStart(2,'0')}:${min.padStart(2,'0')}` }))
  }

  // Mini kategorije igraju na 2 seta, ostale na 3
  function isMini(category: string) {
    return ['mini-muski','mini-zenske','razvojna mini'].includes(category)
  }

  // Bodovi: 3:0 ili 3:1 (2:0) → 3-0, 3:2 (2:1) → 2-1
  function calcPoints(winningSets: number, losingSets: number) {
    const diff = winningSets - losingSets
    if (diff >= 2) return { winner: 3, loser: 0 }  // 3:0, 3:1, 2:0
    return { winner: 2, loser: 1 }                  // 3:2, 2:1
  }

  async function autoRecalcStandings(category: string, season: string) {
    // 1. Povuci sve finished utakmice za ovu kategoriju/sezonu
    const { data: matches } = await supabase
      .from('matches')
      .select('home_team_id, away_team_id, home_sets, away_sets, home_score, away_score')
      .eq('category', category)
      .eq('season', season)
      .eq('status', 'finished')
    if (!matches || matches.length === 0) return

    // 2. Prikupi sve timove koji ucestvuju
    const teamIds = new Set<string>()
    matches.forEach((m: any) => { teamIds.add(m.home_team_id); teamIds.add(m.away_team_id) })

    // 3. Inicijalizuj statistiku za svaki tim
    const stats: Record<string, {
      played: number, won: number, lost: number,
      sets_won: number, sets_lost: number,
      points_won: number, points_lost: number, points: number
    }> = {}
    teamIds.forEach(id => {
      stats[id] = { played:0, won:0, lost:0, sets_won:0, sets_lost:0, points_won:0, points_lost:0, points:0 }
    })

    // 4. Izracunaj statistiku iz utakmica
    matches.forEach((m: any) => {
      const hs = m.home_sets ?? 0
      const as = m.away_sets ?? 0
      const hp = m.home_score ?? 0
      const ap = m.away_score ?? 0
      if (hs === 0 && as === 0 && hp === 0 && ap === 0) return // nema rezultata

      const pts = calcPoints(Math.max(hs, as), Math.min(hs, as))
      const homeWon = hs > as

      // Domaćin
      stats[m.home_team_id].played++
      stats[m.home_team_id].sets_won    += hs
      stats[m.home_team_id].sets_lost   += as
      stats[m.home_team_id].points_won  += hp
      stats[m.home_team_id].points_lost += ap

      // Gosti
      stats[m.away_team_id].played++
      stats[m.away_team_id].sets_won    += as
      stats[m.away_team_id].sets_lost   += hs
      stats[m.away_team_id].points_won  += ap
      stats[m.away_team_id].points_lost += hp

      // Pobeda/poraz i bodovi
      if (homeWon) {
        stats[m.home_team_id].won++
        stats[m.home_team_id].points += pts.winner
        stats[m.away_team_id].lost++
        stats[m.away_team_id].points += pts.loser
      } else {
        stats[m.home_team_id].lost++
        stats[m.home_team_id].points += pts.loser
        stats[m.away_team_id].won++
        stats[m.away_team_id].points += pts.winner
      }
    })

    // 5. Sortiraj i odredi pozicije
    const sorted = Object.entries(stats).sort(([, a], [, b]) => {
      if (b.won !== a.won) return b.won - a.won
      if (b.points !== a.points) return b.points - a.points
      const setA = a.sets_lost > 0 ? a.sets_won / a.sets_lost : a.sets_won
      const setB = b.sets_lost > 0 ? b.sets_won / b.sets_lost : b.sets_won
      if (setB !== setA) return setB - setA
      const pA = a.points_lost > 0 ? a.points_won / a.points_lost : a.points_won
      const pB = b.points_lost > 0 ? b.points_won / b.points_lost : b.points_won
      return pB - pA
    })

    // 6. Upsert standings za svaki tim
    for (let i = 0; i < sorted.length; i++) {
      const [team_id, s] = sorted[i]

      // Proveri da li vec postoji red
      const { data: existing } = await supabase
        .from('standings')
        .select('id')
        .eq('team_id', team_id)
        .eq('category', category)
        .eq('season', season)
        .maybeSingle()

      const row = { team_id, category, season, position: i + 1, ...s }

      if (existing?.id) {
        await supabase.from('standings').update(row).eq('id', existing.id)
      } else {
        await supabase.from('standings').insert([row])
      }
    }
  }

  // async function recalculateAll() {
  //   if (!confirm('Recalculate standings za SVE kategorije i sezone?')) return
  //   setEditBusy(true)
  //   // Povuci sve unique kombinacije kategorija i sezona iz finished utakmica
  //   const { data: combos } = await supabase
  //     .from('matches')
  //     .select('category, season')
  //     .eq('status', 'finished')
  //   if (combos) {
  //     const unique = Array.from(new Set(combos.map((c: any) => `${c.category}|||${c.season}`)))
  //       .map(s => { const [cat, sea] = s.split('|||'); return { category: cat, season: sea } })
  //     for (const { category, season } of unique) {
  //       await autoRecalcStandings(category, season)
  //     }
  //     alert(`Završeno! Ažurirano ${unique.length} kategorija.`)
  //   }
  //   setEditBusy(false); onRefresh()
  // }

  async function saveEditMatch() {
    if (!editMatch) return; setEditBusy(true)
    const payload: any = {
      status:     editMatch.status,
      match_date: editMatch.match_date || null,
      match_time: editMatch.match_time || null,
      venue:      editMatch.venue      || null,
      redni_broj: editMatch.redni_broj || null,
      round:      editMatch.round      || null,
      home_sets:  editMatch.home_sets  !== '' ? parseInt(editMatch.home_sets)  : null,
      away_sets:  editMatch.away_sets  !== '' ? parseInt(editMatch.away_sets)  : null,
      home_score: editMatch.home_score !== '' ? parseInt(editMatch.home_score) : null,
      away_score: editMatch.away_score !== '' ? parseInt(editMatch.away_score) : null,
    }
    await supabase.from('matches').update(payload).eq('id', editMatch.id)

    // Automatski recalc standings ako je utakmica finished
    if (editMatch.status === 'finished') {
      await autoRecalcStandings(editMatch.category, editMatch.season)
    }

    setEditMatch(null); setEditBusy(false); onRefresh()
  }

  const showScore = form.status === 'finished' || form.status === 'live'

  const statusLabel = (s: string) => ({
    finished:  { text: 'Završeno', cls: 'text-green-400' },
    live:      { text: '● UŽIVO',  cls: 'text-red-400 font-semibold' },
    scheduled: { text: 'Zakazano', cls: 'text-blue-300' },
    postponed: { text: 'Odloženo', cls: 'text-yellow-400' },
  }[s] ?? { text: s, cls: 'text-blue-300' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">UTAKMICE</h2>
        <div className="flex gap-2">
          {/* <button onClick={recalculateAll} disabled={editBusy}
            className="border border-[#f5c518]/40 text-[#f5c518] px-4 py-2 rounded-lg text-sm font-display tracking-wide hover:bg-[#f5c518]/10 transition-colors">
            ↻ RECALCULATE SVE
          </button> */}
          <button onClick={() => { setOpen(v => !v); setEditMatch(null) }} className="btn-yellow"><Plus className="w-4 h-4" /> DODAJ UTAKMICU</button>
        </div>
      </div>

      {/* FORMA ZA NOVU UTAKMICU */}
      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVA UTAKMICA</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Domaćin *</label>
              <select className="field-input" value={form.home_team_id} onChange={e => setForm({...form, home_team_id: e.target.value})} required>
                <option value="">— Domaćin —</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Gosti *</label>
              <select className="field-input" value={form.away_team_id} onChange={e => setForm({...form, away_team_id: e.target.value})} required>
                <option value="">— Gosti —</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Kategorija *</label>
              <select className="field-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Datum * (DD / MM / YYYY)</label>
              <div className="flex gap-2">
                <input type="number" min="1" max="31" placeholder="DD" className="field-input text-center" style={{width:'64px'}} value={dateDay} onChange={e => updateDate(e.target.value,dateMonth,dateYear)} />
                <input type="number" min="1" max="12" placeholder="MM" className="field-input text-center" style={{width:'64px'}} value={dateMonth} onChange={e => updateDate(dateDay,e.target.value,dateYear)} />
                <input type="number" min="2020" max="2035" placeholder="YYYY" className="field-input text-center" style={{flex:1}} value={dateYear} onChange={e => updateDate(dateDay,dateMonth,e.target.value)} />
              </div>
              {form.match_date && <p className="text-xs text-[#f5c518] mt-1">✓ {fmtDate(form.match_date)}</p>}
              <input type="hidden" value={form.match_date} required />
            </div>
            <div>
              <label className="label">Vreme (24h)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="23" placeholder="HH" className="field-input text-center" style={{width:'70px'}} value={timeHour} onChange={e => updateTime(e.target.value,timeMin)} />
                <span className="text-[#f5c518] font-display text-xl">:</span>
                <input type="number" min="0" max="59" placeholder="MM" className="field-input text-center" style={{width:'70px'}} value={timeMin} onChange={e => updateTime(timeHour,e.target.value)} />
              </div>
              {form.match_time && <p className="text-xs text-[#f5c518] mt-1">✓ {form.match_time}</p>}
            </div>
            <div>
              <label className="label">Hala / Teren</label>
              <input type="text" className="field-input" placeholder="pr. Teren 4" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} />
            </div>
            <div>
              <label className="label">Sezona *</label>
              <select className="field-input" value={form.season} onChange={e => setForm({...form, season: e.target.value})}>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status *</label>
              <select className="field-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="scheduled">Zakazano</option>
                <option value="live">Uživo</option>
                <option value="finished">Završeno</option>
                <option value="postponed">Odloženo</option>
              </select>
            </div>
            <div>
              <label className="label">Redni broj utakmice</label>
              <input type="number" min="1" className="field-input" placeholder="pr. 5" value={form.redni_broj} onChange={e => setForm({...form, redni_broj: e.target.value})} />
            </div>
            <div>
              <label className="label">Kolo</label>
              <input type="number" min="1" className="field-input" placeholder="pr. 3" value={form.round} onChange={e => setForm({...form, round: e.target.value})} />
            </div>
            {showScore && <>
              <div><label className="label">Setovi — Domaćin</label><input type="number" min="0" max="3" className="field-input" value={form.home_sets} onChange={e => setForm({...form, home_sets: e.target.value})} /></div>
              <div><label className="label">Setovi — Gosti</label><input type="number" min="0" max="3" className="field-input" value={form.away_sets} onChange={e => setForm({...form, away_sets: e.target.value})} /></div>
              <div><label className="label">Poeni — Domaćin</label><input type="number" min="0" className="field-input" value={form.home_score} onChange={e => setForm({...form, home_score: e.target.value})} /></div>
              <div><label className="label">Poeni — Gosti</label><input type="number" min="0" className="field-input" value={form.away_score} onChange={e => setForm({...form, away_score: e.target.value})} /></div>
            </>}
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      {/* EDIT FORMA */}
      {editMatch && (
        <div ref={editRef} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/40">
          <h3 className="font-display text-xl text-white tracking-wider mb-1">UREDI UTAKMICU</h3>
          <p className="text-sm text-blue-300 mb-5 font-semibold">
            {editMatch.home_name} <span className="text-[#f5c518] mx-2">VS</span> {editMatch.away_name}
          </p>

          {/* Rezultat */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label">Status</label>
              <select className="field-input" value={editMatch.status} onChange={e => setEditMatch((m: any) => ({...m, status: e.target.value}))}>
                <option value="scheduled">Zakazano</option>
                <option value="live">Uživo</option>
                <option value="finished">Završeno</option>
                <option value="postponed">Odloženo</option>
              </select>
            </div>
            <div>
              <label className="label">Setovi — Dom.</label>
              <input type="number" min="0" max="3" className="field-input text-center text-lg font-display" value={editMatch.home_sets} onChange={e => setEditMatch((m: any) => ({...m, home_sets: e.target.value}))} />
            </div>
            <div>
              <label className="label">Setovi — Gosti</label>
              <input type="number" min="0" max="3" className="field-input text-center text-lg font-display" value={editMatch.away_sets} onChange={e => setEditMatch((m: any) => ({...m, away_sets: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="label">Poeni — {editMatch.home_name}</label><input type="number" min="0" className="field-input" value={editMatch.home_score} onChange={e => setEditMatch((m: any) => ({...m, home_score: e.target.value}))} /></div>
            <div><label className="label">Poeni — {editMatch.away_name}</label><input type="number" min="0" className="field-input" value={editMatch.away_score} onChange={e => setEditMatch((m: any) => ({...m, away_score: e.target.value}))} /></div>
          </div>

          {/* Preview */}
          {editMatch.home_sets !== '' && editMatch.away_sets !== '' && (
            <div className="flex items-center justify-center gap-6 bg-[#002d63]/60 rounded-xl py-4 mb-4">
              <span className="text-white font-semibold text-sm">{editMatch.home_name}</span>
              <span className="font-display text-4xl text-[#f5c518]">{editMatch.home_sets} : {editMatch.away_sets}</span>
              <span className="text-white font-semibold text-sm">{editMatch.away_name}</span>
            </div>
          )}

          {/* Izmena datuma i vremena */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase mb-3">Izmeni datum, vreme, teren i kolo</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Redni broj utakmice</label>
                <input type="number" min="1" className="field-input" placeholder="pr. 5"
                  value={editMatch.redni_broj} onChange={e => setEditMatch((m: any) => ({...m, redni_broj: e.target.value}))} />
              </div>
              <div>
                <label className="label">Kolo</label>
                <input type="number" min="1" className="field-input" placeholder="pr. 3"
                  value={editMatch.round} onChange={e => setEditMatch((m: any) => ({...m, round: e.target.value}))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Hala / Teren</label>
                <input type="text" className="field-input" placeholder="pr. Teren 4"
                  value={editMatch.venue} onChange={e => setEditMatch((m: any) => ({...m, venue: e.target.value}))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Novi datum (DD / MM / YYYY)</label>
                <div className="flex gap-2">
                  <input type="number" min="1" max="31" placeholder="DD" className="field-input text-center" style={{width:'64px'}} value={editDateDay} onChange={e => updateEditDate(e.target.value,editDateMonth,editDateYear)} />
                  <input type="number" min="1" max="12" placeholder="MM" className="field-input text-center" style={{width:'64px'}} value={editDateMonth} onChange={e => updateEditDate(editDateDay,e.target.value,editDateYear)} />
                  <input type="number" min="2020" max="2035" placeholder="YYYY" className="field-input text-center" style={{flex:1}} value={editDateYear} onChange={e => updateEditDate(editDateDay,editDateMonth,e.target.value)} />
                </div>
                {editMatch.match_date && <p className="text-xs text-[#f5c518] mt-1">✓ {fmtDate(editMatch.match_date)}</p>}
              </div>
              <div>
                <label className="label">Novo vreme (24h)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="23" placeholder="HH" className="field-input text-center" style={{width:'70px'}} value={editTimeHour} onChange={e => updateEditTime(e.target.value,editTimeMin)} />
                  <span className="text-[#f5c518] font-display text-xl">:</span>
                  <input type="number" min="0" max="59" placeholder="MM" className="field-input text-center" style={{width:'70px'}} value={editTimeMin} onChange={e => updateEditTime(editTimeHour,e.target.value)} />
                </div>
                {editMatch.match_time && <p className="text-xs text-[#f5c518] mt-1">✓ {editMatch.match_time}</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={saveEditMatch} disabled={editBusy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ SVE</button>
            <button onClick={() => setEditMatch(null)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </div>
      )}

      {/* TABELA UTAKMICA sa paginacijom */}
      {(() => {
        const PAGE_SIZE = 25
        const totalPages = Math.ceil(matches.length / PAGE_SIZE)
        const paginated = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        return (
          <>
            <div className="glass rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[750px]">
                <thead><tr>
                  {['BR.','DATUM','VREME','DOMAĆIN','RES.','GOSTI','KAT.','STATUS',''].map(h => <th key={h} className="th-style">{h}</th>)}
                </tr></thead>
                <tbody>
                  {matches.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-blue-500 text-sm">Nema utakmica.</td></tr>}
                  {paginated.map((m: any) => {
                    const st = statusLabel(m.status)
                    return (
                      <tr key={m.id} className="border-t border-white/5 tr-hover text-sm">
                        <td className="px-3 py-2.5 text-blue-400 text-xs text-center">{m.round || '—'}</td>
                        <td className="px-3 py-2.5 text-blue-200 font-semibold whitespace-nowrap">{fmtDate(m.match_date)}</td>
                        <td className="px-3 py-2.5 text-blue-200 whitespace-nowrap">{fmtTime(m.match_time) || <span className="text-blue-600">—</span>}</td>
                        <td className="px-3 py-2.5 text-white font-semibold">{m.home_team?.name}</td>
                        <td className="px-3 py-2.5 text-center font-display text-[#f5c518]">
                          {(m.status==='finished'||m.status==='live') ? `${m.home_sets}:${m.away_sets}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-white font-semibold">{m.away_team?.name}</td>
                        <td className="px-3 py-2.5"><span className="text-xs bg-[#003f8a]/50 text-blue-300 px-1.5 py-0.5 rounded">{m.category}</span></td>
                        <td className={`px-3 py-2.5 text-xs ${st.cls}`}>{st.text}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => startEditMatch(m)} className="text-blue-400 hover:text-[#f5c518] p-1 transition-colors" title="Uredi"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => del(m.id)} className="text-red-400 hover:text-red-300 p-1 transition-colors" title="Obriši"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginacija */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-blue-400 text-sm">
                  Prikazano <span className="text-white font-semibold">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, matches.length)}</span> od <span className="text-white font-semibold">{matches.length}</span> utakmica
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={page === 1}
                    className="px-2 py-1.5 rounded text-xs font-semibold text-blue-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    «
                  </button>
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="px-3 py-1.5 rounded text-sm font-semibold text-blue-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce((acc: (number|string)[], p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx-1] as number) > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) => p === '...'
                      ? <span key={`dots-${i}`} className="px-2 text-blue-600 text-sm">…</span>
                      : <button key={p} onClick={() => setPage(p as number)}
                          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${page === p ? 'bg-[#f5c518] text-[#002d63]' : 'text-blue-400 hover:text-white hover:bg-white/10'}`}>
                          {p}
                        </button>
                    )
                  }
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                    className="px-3 py-1.5 rounded text-sm font-semibold text-blue-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    ›
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                    className="px-2 py-1.5 rounded text-xs font-semibold text-blue-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}

/* ══════════════════════════════════════════ MOS INFO ══════════════════════════════════════════ */
function MosInfoTab({ supabase }: any) {
  const [info,      setInfo]      = useState<any>(null)
  const [uprava,    setUprava]    = useState<any[]>([])
  const [busy,      setBusy]      = useState(false)
  const [openForm,  setOpenForm]  = useState(false)
  const [upravaForm, setUpravaForm] = useState({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 })
  const [loaded,    setLoaded]    = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 })

  useEffect(() => {
    async function load() {
      const [i, u] = await Promise.all([
        supabase.from('mos_info').select('*').limit(1).single(),
        supabase.from('mos_uprava').select('*').order('redosled'),
      ])
      setInfo(i.data ?? { naziv:'', adresa:'', pib:'', mail:'', ziro_racun:'' })
      setUprava(u.data ?? [])
      setLoaded(true)
    }
    load()
  }, [supabase])

  async function reload() {
    const [i, u] = await Promise.all([
      supabase.from('mos_info').select('*').limit(1).single(),
      supabase.from('mos_uprava').select('*').order('redosled'),
    ])
    setInfo(i.data ?? { naziv:'', adresa:'', pib:'', mail:'', ziro_racun:'' })
    setUprava(u.data ?? [])
  }

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    if (info?.id) {
      await supabase.from('mos_info').update({ naziv:info.naziv, adresa:info.adresa, pib:info.pib, mail:info.mail, ziro_racun:info.ziro_racun }).eq('id', info.id)
    } else {
      const res = await supabase.from('mos_info').insert([{ naziv:info.naziv, adresa:info.adresa, pib:info.pib, mail:info.mail, ziro_racun:info.ziro_racun }]).select().single()
      setInfo(res.data)
    }
    setBusy(false)
  }

  async function addUprava(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('mos_uprava').insert([upravaForm])
    setUpravaForm({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 })
    setOpenForm(false); setBusy(false); reload()
  }

  async function delUprava(id: string) {
    if (!confirm('Obrisati?')) return
    await supabase.from('mos_uprava').delete().eq('id', id); reload()
  }

  function startEditAdminitstration(a: any) {
  setEditId(a.id)
  setEditForm({
    pozicija:   a.pozicija || '',
    ime_prezime: a.ime_prezime || '',
    telefon:    a.telefon || '',
    mail:       a.mail || '',
    redosled:   a.redosled ?? 0
  })
  
  setOpenForm(false)
}

async function saveEditAdminitstration(e: React.FormEvent) {
  e.preventDefault()
  setBusy(true)
  await supabase.from('mos_uprava').update(editForm).eq('id', editId)
  setEditId(null)
  setEditForm({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 })
  setBusy(false)
  reload()
}

  if (!loaded) return <div className="text-blue-400 text-center py-10 animate-pulse">Učitavanje...</div>

  return (
    <div className="space-y-8">
      <h2 className="font-display text-4xl text-white tracking-wider">MOS INFO</h2>

      {/* Osnovne informacije */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="bg-[#002d63]/60 px-6 py-4 border-b border-white/10">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider">OSNOVNE INFORMACIJE</h3>
          <p className="text-xs text-blue-400 mt-0.5">Ovo se prikazuje na javnoj /mos-info stranici</p>
        </div>
        <form onSubmit={saveInfo} className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { key:'naziv',      label:'Naziv saveza' },
              { key:'adresa',     label:'Adresa'       },
              { key:'pib',        label:'PIB'          },
              { key:'mail',       label:'Mail adresa'  },
              { key:'ziro_racun', label:'Žiro račun'   },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input className="field-input" value={info?.[f.key]||''} onChange={e => setInfo((i: any) => ({...i, [f.key]: e.target.value}))} />
              </div>
            ))}
          </div>
          <button type="submit" disabled={busy} className="btn-yellow mt-5"><Save className="w-4 h-4" /> SAČUVAJ INFORMACIJE</button>
        </form>
      </div>

      {/* Administracija saveza */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="bg-[#002d63]/60 px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-[#f5c518] tracking-wider">ADMINISTRACIJA SAVEZA</h3>
            <p className="text-xs text-blue-400 mt-0.5">Prikazuje se na javnoj stranici</p>
          </div>
          <button onClick={() => setOpenForm(v => !v)} className="btn-yellow text-sm"><Plus className="w-4 h-4" /> DODAJ</button>
        </div>

        {openForm && (
          <form onSubmit={addUprava} className="p-6 border-b border-white/10 bg-black/20">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Pozicija *</label><input className="field-input" placeholder="npr. Predsednik" value={upravaForm.pozicija} onChange={e => setUpravaForm({...upravaForm,pozicija:e.target.value})} required /></div>
              <div><label className="label">Ime i prezime *</label><input className="field-input" value={upravaForm.ime_prezime} onChange={e => setUpravaForm({...upravaForm,ime_prezime:e.target.value})} required /></div>
              <div><label className="label">Broj telefona</label><input className="field-input" value={upravaForm.telefon} onChange={e => setUpravaForm({...upravaForm,telefon:e.target.value})} /></div>
              <div><label className="label">Mail</label><input type="email" className="field-input" value={upravaForm.mail} onChange={e => setUpravaForm({...upravaForm,mail:e.target.value})} /></div>
              <div><label className="label">Redosled prikaza</label><input type="number" className="field-input" value={upravaForm.redosled} onChange={e => setUpravaForm({...upravaForm,redosled:parseInt(e.target.value)||0})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> DODAJ</button>
              <button type="button" onClick={() => setOpenForm(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
            </div>
          </form>
        )}
        {editId && (
        <form onSubmit={saveEditAdminitstration} className="p-6 border-b border-white/10 bg-blue-950/20">
            <h3 className="font-display text-lg text-white tracking-wider mb-4">UREDI ČLANA UPRAVE</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="label">Pozicija *</label><input className="field-input" value={editForm.pozicija} onChange={e => setEditForm({...editForm, pozicija: e.target.value})} required /></div>
                <div><label className="label">Ime i prezime *</label><input className="field-input" value={editForm.ime_prezime} onChange={e => setEditForm({...editForm, ime_prezime: e.target.value})} required /></div>
                <div><label className="label">Broj telefona</label><input className="field-input" value={editForm.telefon} onChange={e => setEditForm({...editForm, telefon: e.target.value})} /></div>
                <div><label className="label">Mail</label><input type="email" className="field-input" value={editForm.mail} onChange={e => setEditForm({...editForm, mail: e.target.value})} /></div>
                <div><label className="label">Redosled prikaza</label><input type="number" className="field-input" value={editForm.redosled} onChange={e => setEditForm({...editForm, redosled: parseInt(e.target.value) || 0})} /></div>
              </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ IZMENE</button>
              <button type="button" onClick={() => { setEditId(null); setEditForm({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 }) }} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
            </div>
          </form>
        )}

        <div className="divide-y divide-white/5">
          {uprava.length === 0 && <p className="px-6 py-8 text-center text-blue-500 text-sm">Nema unetih članova uprave.</p>} 
          {uprava.map((u: any) => (
            <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 flex-1">
                <span className="text-[#f5c518] font-display tracking-wide min-w-[180px]">{u.pozicija}</span>
                <span className="text-white font-semibold">{u.ime_prezime}</span>
                {u.telefon && <span className="text-blue-300 text-sm">{u.telefon}</span>}
                {u.mail    && <span className="text-blue-300 text-sm">{u.mail}</span>}
              </div>
               <button onClick={() => startEditAdminitstration(u)} className="text-blue-400 hover:text-[#f5c518] p-1"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => delUprava(u.id)} className="text-red-400 hover:text-red-300 p-1 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
/* ══════════════════════════════════════════
   KLUBOVI TAB
══════════════════════════════════════════ */
function KluboviTab({ supabase }: any) {
  const [klubovi,  setKlubovi]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(false)
  const [busy,     setBusy]     = useState(false)
  const blank = { naziv: '', kontakt_osoba: '', telefon: '', mail: '' }
  const [form, setForm] = useState(blank)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editForm, setEditForm] = useState(blank)

  async function fetchKlubovi() {
    const { data } = await supabase.from('klubovi').select('*').order('naziv')
    setKlubovi(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchKlubovi() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('klubovi').insert([form])
    setForm(blank); setOpen(false); setBusy(false); fetchKlubovi()
  }

  async function del(id: string) {
    if (!confirm('Obrisati klub?')) return
    await supabase.from('klubovi').delete().eq('id', id); fetchKlubovi()
  }

  function startEdit(k: any) {
  setEditId(k.id)
  setEditForm({ naziv: k.naziv, kontakt_osoba: k.kontakt_osoba || '', telefon: k.telefon || '', mail: k.mail || '' })
  setOpen(false) // zatvori add formu ako je otvorena
}

async function saveEdit(e: React.FormEvent) {
  e.preventDefault(); setBusy(true)
  await supabase.from('klubovi').update(editForm).eq('id', editId)
  setEditId(null); setEditForm(blank); setBusy(false); fetchKlubovi()
}


  if (loading) return <div className="text-blue-400 py-10 text-center animate-pulse">Učitavanje...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">KLUBOVI</h2>
        <button onClick={() => setOpen(v => !v)} className="btn-yellow">
          <Plus className="w-4 h-4" /> DODAJ KLUB
        </button>
      </div>

      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI KLUB</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Ime kluba *</label>
              <input className="field-input" placeholder="OK Leskovac" value={form.naziv}
                onChange={e => setForm({...form, naziv: e.target.value})} required />
            </div>
            <div>
              <label className="label">Kontakt osoba</label>
              <input className="field-input" placeholder="Pera Perić" value={form.kontakt_osoba}
                onChange={e => setForm({...form, kontakt_osoba: e.target.value})} />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input className="field-input" placeholder="+381 60 123 4567" value={form.telefon}
                onChange={e => setForm({...form, telefon: e.target.value})} />
            </div>
            <div>
              <label className="label">Mail</label>
              <input type="email" className="field-input" placeholder="klub@mail.com" value={form.mail}
                onChange={e => setForm({...form, mail: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}
      {editId && (
  <form onSubmit={saveEdit} className="glass rounded-2xl p-6 mb-6 border border-blue-400/40">
    <h3 className="font-display text-xl text-white tracking-wider mb-4">
      UREDI KLUB
    </h3>
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="label">Ime kluba *</label>
        <input className="field-input" value={editForm.naziv}
          onChange={e => setEditForm({...editForm, naziv: e.target.value})} required />
      </div>
      <div>
        <label className="label">Kontakt osoba</label>
        <input className="field-input" value={editForm.kontakt_osoba}
          onChange={e => setEditForm({...editForm, kontakt_osoba: e.target.value})} />
      </div>
      <div>
        <label className="label">Telefon</label>
        <input className="field-input" value={editForm.telefon}
          onChange={e => setEditForm({...editForm, telefon: e.target.value})} />
      </div>
      <div>
        <label className="label">Mail</label>
        <input type="email" className="field-input" value={editForm.mail}
          onChange={e => setEditForm({...editForm, mail: e.target.value})} />
      </div>
    </div>
    <div className="flex gap-2 mt-5">
      <button type="submit" disabled={busy} className="btn-yellow">
        <Save className="w-4 h-4" /> SAČUVAJ IZMENE
      </button>
      <button type="button" onClick={() => { setEditId(null); setEditForm(blank) }} className="btn-ghost">
        <X className="w-4 h-4" /> Odustani
      </button>
    </div>
  </form>
)}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr>
            {['KLUB', 'KONTAKT OSOBA', 'TELEFON', 'MAIL', ''].map(h => (
              <th key={h} className="th-style">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {klubovi.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-blue-500 text-sm">Nema unetih klubova.</td></tr>
            )}
            {klubovi.map((k: any) => (
              <tr key={k.id} className="border-t border-white/5 tr-hover text-sm">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#003f8a]/60 border border-[#003f8a] flex items-center justify-center shrink-0">
                      <span className="font-display text-[#f5c518] text-sm">{k.naziv?.charAt(0)}</span>
                    </div>
                    <span className="text-white font-semibold">{k.naziv}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-blue-300">{k.kontakt_osoba || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{k.telefon || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{k.mail || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(k)} className="text-blue-400 hover:text-[#f5c518] p-1">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => del(k.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



/* ══════════════════════════════════════════
   TRENERI TAB
══════════════════════════════════════════ */
function TreneriTab({ supabase }: any) {
  const [treneri,  setTreneri]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(false)
  const [busy,     setBusy]     = useState(false)
  const blank = { ime_prezime:'', broj_dozvole:'', klub:'', telefon:'', mail:'' }
  const [form,     setForm]     = useState(blank)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editForm, setEditForm] = useState(blank)

  async function fetchTreneri_() {
    const { data } = await supabase.from('treneri').select('*').order('ime_prezime')
    setTreneri(data ?? []); setLoading(false)
  }
  useEffect(() => { fetchTreneri_() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('treneri').insert([form])
    setForm(blank); setOpen(false); setBusy(false); fetchTreneri_()
  }
  async function del(id: string) {
    if (!confirm('Obrisati trenera?')) return
    await supabase.from('treneri').delete().eq('id', id); fetchTreneri_()
  }
  function startEdit(t: any) {
    setEditId(t.id)
    setEditForm({ ime_prezime: t.ime_prezime||'', broj_dozvole: t.broj_dozvole||'', klub: t.klub||'', telefon: t.telefon||'', mail: t.mail||'' })
    setOpen(false)
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('treneri').update(editForm).eq('id', editId)
    setEditId(null); setEditForm(blank); setBusy(false); fetchTreneri_()
  }

 
  if (loading) return <div className="text-blue-400 py-10 text-center animate-pulse">Učitavanje...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">TRENERI</h2>
        <button onClick={() => { setOpen(v => !v); setEditId(null) }} className="btn-yellow"><Plus className="w-4 h-4" /> DODAJ</button>
      </div>
      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI TRENER</h3>
     
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Ime i prezime *</label><input className="field-input" value={form.ime_prezime} onChange={e => setForm({...form, ime_prezime: e.target.value})} required /></div>
            <div><label className="label">Broj dozvole</label><input className="field-input" value={form.broj_dozvole} onChange={e => setForm({...form, broj_dozvole: e.target.value})} /></div>
            <div><label className="label">Klub</label><input className="field-input" value={form.klub} onChange={e => setForm({...form, klub: e.target.value})} /></div>
            <div><label className="label">Telefon</label><input className="field-input" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} /></div>
            <div><label className="label">Mail</label><input type="email" className="field-input" value={form.mail} onChange={e => setForm({...form, mail: e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}
      {editId && (
        <form onSubmit={saveEdit} className="glass rounded-2xl p-6 mb-6 border border-blue-400/40">
          <h3 className="font-display text-xl text-white tracking-wider mb-4">UREDI TRENERA</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Ime i prezime *</label><input className="field-input" value={editForm.ime_prezime} onChange={e => setEditForm({...editForm, ime_prezime: e.target.value})} required /></div>
            <div><label className="label">Broj dozvole</label><input className="field-input" value={editForm.broj_dozvole} onChange={e => setEditForm({...editForm, broj_dozvole: e.target.value})} /></div>
            <div><label className="label">Klub</label><input className="field-input" value={editForm.klub} onChange={e => setEditForm({...editForm, klub: e.target.value})} /></div>
            <div><label className="label">Telefon</label><input className="field-input" value={editForm.telefon} onChange={e => setEditForm({...editForm, telefon: e.target.value})} /></div>
            <div><label className="label">Mail</label><input type="email" className="field-input" value={editForm.mail} onChange={e => setEditForm({...editForm, mail: e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ IZMENE</button>
            <button type="button" onClick={() => { setEditId(null); setEditForm(blank) }} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr>{['IME I PREZIME','DOZVOLA','KLUB','TELEFON','MAIL',''].map(h => <th key={h} className="th-style">{h}</th>)}</tr></thead>
          <tbody>
            {treneri.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-blue-500 text-sm">Nema unetih trenera.</td></tr>}
            {treneri.map((t: any) => (
              <tr key={t.id} className="border-t border-white/5 tr-hover text-sm">
                <td className="px-4 py-3 text-white font-semibold">{t.ime_prezime}</td>
                <td className="px-4 py-3 text-blue-300">{t.broj_dozvole || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{t.klub || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{t.telefon || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{t.mail || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(t)} className="text-blue-400 hover:text-[#f5c518] p-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => del(t.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   SUDIJE TAB
══════════════════════════════════════════ */
function SudijeTab({ supabase }: any) {
  const [sudije,   setSudije]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(false)
  const [busy,     setBusy]     = useState(false)
  const blank = { ime_prezime:'', broj_dozvole:'', telefon:'', mail:'', jmbg:'', tekuci_racun:'' }
  const [form,     setForm]     = useState(blank)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editForm, setEditForm] = useState(blank)

  async function fetch_() {
    const { data } = await supabase.from('sudije').select('*').order('ime_prezime')
    setSudije(data ?? []); setLoading(false)
  }
  useEffect(() => { fetch_() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('sudije').insert([form])
    setForm(blank); setOpen(false); setBusy(false); fetch_()
  }
  async function del(id: string) {
    if (!confirm('Obrisati sudiju?')) return
    await supabase.from('sudije').delete().eq('id', id); fetch_()
  }
  function startEdit(s: any) {
    setEditId(s.id)
    setEditForm({ ime_prezime: s.ime_prezime||'', broj_dozvole: s.broj_dozvole||'', telefon: s.telefon||'', mail: s.mail||'', jmbg: s.jmbg||'', tekuci_racun: s.tekuci_racun||'' })
    setOpen(false)
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('sudije').update(editForm).eq('id', editId)
    setEditId(null); setEditForm(blank); setBusy(false); fetch_()
  }

  const FormFields = ({ data, setData }: { data: any; setData: any }) => (
    <div className="grid sm:grid-cols-2 gap-4">
      <div><label className="label">Ime i prezime *</label><input className="field-input" value={data.ime_prezime} onChange={e => setData({...data, ime_prezime: e.target.value})} required /></div>
      <div><label className="label">Broj sudijske dozvole</label><input className="field-input" value={data.broj_dozvole} onChange={e => setData({...data, broj_dozvole: e.target.value})} /></div>
      <div><label className="label">Telefon</label><input className="field-input" value={data.telefon} onChange={e => setData({...data, telefon: e.target.value})} /></div>
      <div><label className="label">Mail</label><input type="email" className="field-input" value={data.mail} onChange={e => setData({...data, mail: e.target.value})} /></div>
      <div><label className="label">JMBG</label><input className="field-input" value={data.jmbg} onChange={e => setData({...data, jmbg: e.target.value})} /></div>
      <div><label className="label">Broj tekućeg računa</label><input className="field-input" value={data.tekuci_racun} onChange={e => setData({...data, tekuci_racun: e.target.value})} /></div>
    </div>
  )

  if (loading) return <div className="text-blue-400 py-10 text-center animate-pulse">Učitavanje...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">SUDIJE</h2>
        <button onClick={() => { setOpen(v => !v); setEditId(null) }} className="btn-yellow"><Plus className="w-4 h-4" /> DODAJ</button>
      </div>
      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI SUDIJA</h3>
          {/* <FormFields data={form} setData={setForm} /> */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Ime i prezime *</label><input className="field-input" value={form.ime_prezime} onChange={e => setForm({...form, ime_prezime: e.target.value})} required /></div>
              <div><label className="label">Broj sudijske dozvole</label><input className="field-input" value={form.broj_dozvole} onChange={e => setForm({...form, broj_dozvole: e.target.value})} /></div>
              <div><label className="label">Telefon</label><input className="field-input" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} /></div>
              <div><label className="label">Mail</label><input type="email" className="field-input" value={form.mail} onChange={e => setForm({...form, mail: e.target.value})} /></div>
              <div><label className="label">JMBG</label><input className="field-input" maxLength={13} minLength={13} value={form.jmbg} onChange={e => setForm({...form, jmbg: e.target.value})} /></div>
              <div><label className="label">Broj tekućeg računa</label><input className="field-input" value={form.tekuci_racun} onChange={e => setForm({...form, tekuci_racun: e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}
      {editId && (
        <form onSubmit={saveEdit} className="glass rounded-2xl p-6 mb-6 border border-blue-400/40">
          <h3 className="font-display text-xl text-white tracking-wider mb-4">UREDI SUDIJU</h3>
          {/* <FormFields data={editForm} setData={setEditForm} /> */}
          <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Ime i prezime *</label><input className="field-input" value={editForm.ime_prezime} onChange={e => setEditForm({...editForm, ime_prezime: e.target.value})} required /></div>
              <div><label className="label">Broj sudijske dozvole</label><input className="field-input" value={editForm.broj_dozvole} onChange={e => setEditForm({...editForm, broj_dozvole: e.target.value})} /></div>
              <div><label className="label">Telefon</label><input className="field-input" value={editForm.telefon} onChange={e => setEditForm({...editForm, telefon: e.target.value})} /></div>
              <div><label className="label">Mail</label><input type="email" className="field-input" value={editForm.mail} onChange={e => setEditForm({...editForm, mail: e.target.value})} /></div>
              <div><label className="label">JMBG</label><input className="field-input" maxLength={13} minLength={13} value={editForm.jmbg} onChange={e => setEditForm({...editForm, jmbg: e.target.value})} /></div>
              <div><label className="label">Broj tekućeg računa</label><input className="field-input" value={editForm.tekuci_racun} onChange={e => setEditForm({...editForm, tekuci_racun: e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ IZMENE</button>
            <button type="button" onClick={() => { setEditId(null); setEditForm(blank) }} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}
      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead><tr>{['IME I PREZIME','DOZVOLA','TELEFON','MAIL','JMBG','TEK. RAČUN',''].map(h => <th key={h} className="th-style">{h}</th>)}</tr></thead>
          <tbody>
            {sudije.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-blue-500 text-sm">Nema unetih sudija.</td></tr>}
            {sudije.map((s: any) => (
              <tr key={s.id} className="border-t border-white/5 tr-hover text-sm">
                <td className="px-4 py-3 text-white font-semibold">{s.ime_prezime}</td>
                <td className="px-4 py-3 text-blue-300">{s.broj_dozvole || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{s.telefon || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{s.mail || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{s.jmbg || '—'}</td>
                <td className="px-4 py-3 text-blue-300">{s.tekuci_racun || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(s)} className="text-blue-400 hover:text-[#f5c518] p-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => del(s.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   BILTENI TAB
══════════════════════════════════════════ */
function BilteniTab({ supabase }: any) {
  const [bilteni,  setBilteni]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [open,     setOpen]     = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form,     setForm]     = useState({ naziv:'', opis:'', pdf_url:'' })

  async function fetch_() {
    const { data } = await supabase.from('bilteni').select('*').order('created_at', { ascending: false })
    setBilteni(data ?? []); setLoading(false)
  }
  useEffect(() => { fetch_() }, [])

  async function uploadPdf(file: File) {
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('bilteni').upload(path, file, { upsert: false })
    if (error) { alert('Greška pri uploadu: ' + error.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('bilteni').getPublicUrl(path)
    setForm(f => ({ ...f, pdf_url: urlData.publicUrl }))
    setUploading(false)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!form.pdf_url) { alert('Molimo uploadujte PDF fajl.'); return }
    setBusy(true)
    await supabase.from('bilteni').insert([form])
    setForm({ naziv:'', opis:'', pdf_url:'' }); setOpen(false); setBusy(false); fetch_()
  }

  async function del(id: string, pdf_url: string) {
    if (!confirm('Obrisati bilten?')) return
    await supabase.from('bilteni').delete().eq('id', id)
    // Pokušaj obrisati i fajl iz storage-a
    try {
      const path = pdf_url.split('/bilteni/').pop()
      if (path) await supabase.storage.from('bilteni').remove([path])
    } catch {}
    fetch_()
  }

  function fmtDate(d: string) {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getDate().toString().padStart(2,'0')}.${(dt.getMonth()+1).toString().padStart(2,'0')}.${dt.getFullYear()}`
  }

  if (loading) return <div className="text-blue-400 py-10 text-center animate-pulse">Učitavanje...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">BILTENI</h2>
        <button onClick={() => setOpen(v => !v)} className="btn-yellow"><Plus className="w-4 h-4" /> DODAJ BILTEN</button>
      </div>

      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI BILTEN</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Naziv *</label><input className="field-input" placeholder="Bilten br. 1 — Seniori" value={form.naziv} onChange={e => setForm({...form, naziv: e.target.value})} required /></div>
            <div><label className="label">Opis (opciono)</label><input className="field-input" placeholder="Kratki opis..." value={form.opis} onChange={e => setForm({...form, opis: e.target.value})} /></div>
            <div className="sm:col-span-2">
              <label className="label">PDF Fajl *</label>
              <input type="file" accept=".pdf" className="field-input cursor-pointer"
                onChange={e => { if (e.target.files?.[0]) uploadPdf(e.target.files[0]) }} />
              {uploading && <p className="text-xs text-blue-400 mt-1 animate-pulse">Uploadovanje...</p>}
              {form.pdf_url && <p className="text-xs text-green-400 mt-1">✓ PDF uspešno uploadovan</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy || uploading} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr>{['NAZIV','OPIS','DATUM','PDF',''].map(h => <th key={h} className="th-style">{h}</th>)}</tr></thead>
          <tbody>
            {bilteni.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-blue-500 text-sm">Nema objavljenih biltena.</td></tr>}
            {bilteni.map((b: any) => (
              <tr key={b.id} className="border-t border-white/5 tr-hover text-sm">
                <td className="px-4 py-3 text-white font-semibold">{b.naziv}</td>
                <td className="px-4 py-3 text-blue-300">{b.opis || '—'}</td>
                <td className="px-4 py-3 text-blue-400 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                <td className="px-4 py-3">
                  <a href={b.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="text-[#f5c518] hover:underline text-xs flex items-center gap-1">
                    📄 Otvori PDF
                  </a>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del(b.id, b.pdf_url)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
