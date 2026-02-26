'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, SEASONS } from '@/lib/types'
import { Plus, LogOut, Trophy, Calendar, Users, Trash2, Save, X, Edit2, RefreshCw } from 'lucide-react'

type Tab = 'timovi' | 'tabela' | 'utakmice'

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
      supabase.from('standings').select('*, team:teams(name)').order('category').order('points', { ascending: false }),
      supabase.from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)')
        .order('match_date', { ascending: false }),
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
    { id: 'timovi',   label: 'TIMOVI',   icon: Users    },
    { id: 'tabela',   label: 'TABELA',   icon: Trophy   },
    { id: 'utakmice', label: 'UTAKMICE', icon: Calendar },
  ]

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 bg-[#002d63] border-b-2 border-[#f5c518]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f5c518] flex items-center justify-center font-display text-[#002d63]">Međuokružni odbojkaški savez Leskovac</div>
              <div>
                <div className="font-display text-[#f5c518] tracking-widest leading-none">ADMIN PANEL</div>
                <div className="text-[10px] text-blue-300 tracking-wider"></div>
              </div>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 text-sm text-blue-300 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" /> Odjava
            </button>
          </div>
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-3 font-display text-sm tracking-wider border-b-2 transition-all ${tab === t.id ? 'border-[#f5c518] text-[#f5c518]' : 'border-transparent text-blue-400 hover:text-blue-200'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'timovi'   && <TimoviTab   teams={teams}     supabase={supabase} onRefresh={reload} />}
        {tab === 'tabela'   && <TabelaTab   standings={standings} teams={teams} supabase={supabase} onRefresh={reload} />}
        {tab === 'utakmice' && <UtakmiceTab matches={matches} teams={teams} supabase={supabase} onRefresh={reload} />}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   TIMOVI TAB
══════════════════════════════════════════ */
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
    if (!confirm('Obrisati tim? Svi povezani podaci će biti obrisani.')) return
    await supabase.from('teams').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">TIMOVI</h2>
        <button onClick={() => setOpen(v => !v)} className="btn-yellow">
          <Plus className="w-4 h-4" /> DODAJ TIM
        </button>
      </div>

      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI TIM</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Naziv tima *</label>
              <input className="field-input" placeholder="OK Vranje" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="label">Kategorija *</label>
              <select className="field-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Grad</label>
              <input className="field-input" placeholder="Vranje" value={form.city}
                onChange={e => setForm({...form, city: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th-style">TIM</th>
              <th className="th-style">KATEGORIJA</th>
              <th className="th-style hidden sm:table-cell">GRAD</th>
              <th className="th-style text-right">AKCIJE</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-blue-500 text-sm">Nema unetih timova.</td></tr>
            )}
            {teams.map((t: any) => (
              <tr key={t.id} className="border-t border-white/5 tr-hover">
                <td className="px-4 py-3 text-white font-semibold text-sm">{t.name}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-[#003f8a]/50 text-blue-300 px-2 py-0.5 rounded capitalize">{t.category}</span>
                </td>
                <td className="px-4 py-3 text-blue-400 text-sm hidden sm:table-cell">{t.city || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => del(t.id)} className="text-red-400 hover:text-red-300 p-1 transition-colors">
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
   TABELA TAB — sa edit dugmetom i auto pozicijom
══════════════════════════════════════════ */
function TabelaTab({ standings, teams, supabase, onRefresh }: any) {
  const [open,    setOpen]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editRow, setEditRow] = useState<any>(null)

  const blank = {
    team_id: '', category: 'seniori', season: SEASONS[0],
    played: 0, won: 0, lost: 0,
    sets_won: 0, sets_lost: 0, points_won: 0, points_lost: 0, points: 0
  }
  const [form, setForm] = useState(blank)

  // Auto-računa poziciju unutar kategorije/sezone po bodovima
  function calcPositions(rows: any[]) {
    const groups: Record<string, any[]> = {}
    rows.forEach(r => {
      const key = `${r.category}_${r.season}`
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    })
    Object.values(groups).forEach(group => {
      group.sort((a, b) => b.points - a.points)
      group.forEach((r, i) => { r.position = i + 1 })
    })
    return rows
  }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    // Izračunaj poziciju za novu kategoriju/sezonu
    const sameGroup = standings.filter((s: any) => s.category === form.category && s.season === form.season)
    const position = sameGroup.length + 1 // privremeno, odmah se rekalkuliše
    await supabase.from('standings').insert([{ ...form, position }])
    await recalcPositions(form.category, form.season)
    setForm(blank); setOpen(false); setBusy(false); onRefresh()
  }

  // Rekalkuliše pozicije u bazi za datu kategoriju/sezonu
  async function recalcPositions(category: string, season: string) {
    const { data } = await supabase
      .from('standings')
      .select('id, points')
      .eq('category', category)
      .eq('season', season)
      .order('points', { ascending: false })

    if (!data) return
    const updates = data.map((row: any, i: number) =>
      supabase.from('standings').update({ position: i + 1 }).eq('id', row.id)
    )
    await Promise.all(updates)
  }

  async function saveEdit() {
    if (!editId || !editRow) return
    setBusy(true)
    await supabase.from('standings').update({
      played:      editRow.played,
      won:         editRow.won,
      lost:        editRow.lost,
      sets_won:    editRow.sets_won,
      sets_lost:   editRow.sets_lost,
      points_won:  editRow.points_won,
      points_lost: editRow.points_lost,
      points:      editRow.points,
    }).eq('id', editId)
    // Auto-rekalkuliši pozicije po bodovima
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

  function startEdit(row: any) {
    setEditId(row.id)
    setEditRow({ ...row })
    setOpen(false)
  }

  const n = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditRow((r: any) => ({ ...r, [key]: parseInt(e.target.value) || 0 }))

  const numField = (key: string, label: string) => (
    <div key={key}>
      <label className="label">{label}</label>
      <input type="number" min="0" className="field-input"
        value={(form as any)[key]}
        onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))} />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">TABELA LIGA</h2>
        <button onClick={() => { setOpen(v => !v); setEditId(null) }} className="btn-yellow">
          <Plus className="w-4 h-4" /> DODAJ UNOS
        </button>
      </div>

      {/* FORMA ZA NOVI UNOS */}
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
            {numField('played',      'Utakmice')}
            {numField('won',         'Pobede')}
            {numField('lost',        'Izgubljene')}
            {numField('sets_won',    'Setovi +')}
            {numField('sets_lost',   'Setovi -')}
            {numField('points_won',  'Poeni +')}
            {numField('points_lost', 'Poeni -')}
            {numField('points',      'Bodovi')}
          </div>
          <p className="text-xs text-blue-500 mt-3">* Pozicija se automatski računa po bodovima</p>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      {/* INLINE EDIT FORMA */}
      {editId && editRow && (
        <div className="glass rounded-2xl p-6 mb-6 border border-blue-400/40">
          <h3 className="font-display text-xl text-white tracking-wider mb-1">
            UREDI: <span className="text-[#f5c518]">{editRow.team?.name}</span>
          </h3>
          <p className="text-xs text-blue-400 mb-4 capitalize">{editRow.category} — {editRow.season}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {[
              { key: 'played',      label: 'Utakmice' },
              { key: 'won',         label: 'Pobede'   },
              { key: 'lost',        label: 'Izgubljene' },
              { key: 'sets_won',    label: 'Setovi +' },
              { key: 'sets_lost',   label: 'Setovi -' },
              { key: 'points_won',  label: 'Poeni +'  },
              { key: 'points_lost', label: 'Poeni -'  },
              { key: 'points',      label: 'Bodovi'   },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input type="number" min="0" className="field-input"
                  value={editRow[f.key] ?? 0} onChange={n(f.key)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-500 mt-3">Pozicija se automatski ažurira po bodovima nakon čuvanja.</p>
          <div className="flex gap-2 mt-4">
            <button onClick={saveEdit} disabled={busy} className="btn-yellow">
              <Save className="w-4 h-4" /> SAČUVAJ IZMENE
            </button>
            <button onClick={() => { setEditId(null); setEditRow(null) }} className="btn-ghost">
              <X className="w-4 h-4" /> Odustani
            </button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr>
              {['#','TIM','KAT.','SEZONA','UT','P','I','S+','S-','B+','B-','BOD','AKCIJE'].map(h => (
                <th key={h} className="th-style">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 && (
              <tr><td colSpan={13} className="px-4 py-10 text-center text-blue-500 text-sm">Nema podataka.</td></tr>
            )}
            {standings.map((s: any) => (
              <tr key={s.id} className={`border-t border-white/5 tr-hover text-sm ${editId === s.id ? 'bg-blue-900/20' : ''}`}>
                <td className="px-3 py-2.5 text-center">
                  <span className="font-display text-lg text-[#f5c518]">{s.position}</span>
                </td>
                <td className="px-3 py-2.5 text-white font-semibold">{s.team?.name}</td>
                <td className="px-3 py-2.5">
                  <span className="text-xs bg-[#003f8a]/50 text-blue-300 px-1.5 py-0.5 rounded capitalize">{s.category}</span>
                </td>
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
                    <button onClick={() => startEdit(s)}
                      className="text-blue-400 hover:text-[#f5c518] p-1 transition-colors" title="Uredi">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(s.id)}
                      className="text-red-400 hover:text-red-300 p-1 transition-colors" title="Obriši">
                      <Trash2 className="w-4 h-4" />
                    </button>
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

/* ══════════════════════════════════════════
   UTAKMICE TAB — sa boljim datumom/vremenom
══════════════════════════════════════════ */
function UtakmiceTab({ matches, teams, supabase, onRefresh }: any) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const blank = {
    home_team_id: '', away_team_id: '', category: 'seniori', season: SEASONS[0],
    match_date: '', match_time: '', venue: '', status: 'scheduled',
    round: '', home_sets: '', away_sets: '', home_score: '', away_score: '', notes: ''
  }
  const [form, setForm] = useState(blank)
  // Tri odvojena polja za datum
  const [dateDay,   setDateDay]   = useState('')
  const [dateMonth, setDateMonth] = useState('')
  const [dateYear,  setDateYear]  = useState('')

  // Dva polja za vreme 24h
  const [timeHour, setTimeHour] = useState('')
  const [timeMin,  setTimeMin]  = useState('')

  function updateTime(hour: string, min: string) {
    setTimeHour(hour); setTimeMin(min)
    const h = hour.padStart(2,'0')
    const m = min.padStart(2,'0')
    if (hour !== '' && min !== '') {
      setForm(f => ({ ...f, match_time: `${h}:${m}` }))
    }
  }

  // Kad se bilo koje polje promeni, spoji u YYYY-MM-DD za bazu
  function updateDate(day: string, month: string, year: string) {
    setDateDay(day); setDateMonth(month); setDateYear(year)
    if (day && month && year && year.length === 4) {
      const d = day.padStart(2,'0')
      const m = month.padStart(2,'0')
      setForm(f => ({ ...f, match_date: `${year}-${m}-${d}` }))
    }
  }

  // Formatuje datum iz YYYY-MM-DD u DD.MM.YYYY za prikaz
  function fmtDate(d: string) {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }

  // Formatuje vreme iz HH:MM u HH:MM
  function fmtTime(t: string) {
    if (!t) return null
    return t.substring(0, 5)
  }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    const payload: any = { ...form }
    ;['home_sets','away_sets','home_score','away_score'].forEach(k => {
      if (payload[k] === '') delete payload[k]
      else payload[k] = parseInt(payload[k])
    })
    ;['match_time','round','venue','notes'].forEach(k => { if (!payload[k]) delete payload[k] })
    await supabase.from('matches').insert([payload])
    setForm(blank); setOpen(false); setBusy(false); onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Obrisati utakmicu?')) return
    await supabase.from('matches').delete().eq('id', id); onRefresh()
  }

  const [editMatch, setEditMatch] = useState<any>(null)
  const [editBusy,  setEditBusy]  = useState(false)

  function startEditMatch(m: any) {
    setEditMatch({
      id:         m.id,
      status:     m.status,
      home_sets:  m.home_sets  ?? '',
      away_sets:  m.away_sets  ?? '',
      home_score: m.home_score ?? '',
      away_score: m.away_score ?? '',
      home_name:  m.home_team?.name ?? 'Domaćin',
      away_name:  m.away_team?.name ?? 'Gosti',
    })
    setOpen(false)
  }

  async function saveEditMatch() {
    if (!editMatch) return
    setEditBusy(true)
    const payload: any = {
      status:     editMatch.status,
      home_sets:  editMatch.home_sets  !== '' ? parseInt(editMatch.home_sets)  : null,
      away_sets:  editMatch.away_sets  !== '' ? parseInt(editMatch.away_sets)  : null,
      home_score: editMatch.home_score !== '' ? parseInt(editMatch.home_score) : null,
      away_score: editMatch.away_score !== '' ? parseInt(editMatch.away_score) : null,
    }
    await supabase.from('matches').update(payload).eq('id', editMatch.id)
    setEditMatch(null); setEditBusy(false); onRefresh()
  }

  const showScore = form.status === 'finished' || form.status === 'live'

  const statusLabel = (s: string) => ({
    finished:  { text: 'Završeno',  cls: 'text-green-400' },
    live:      { text: '● UŽIVO',   cls: 'text-red-400 font-semibold' },
    scheduled: { text: 'Zakazano',  cls: 'text-blue-300' },
    postponed: { text: 'Odloženo',  cls: 'text-yellow-400' },
  }[s] ?? { text: s, cls: 'text-blue-300' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">UTAKMICE</h2>
        <button onClick={() => setOpen(v => !v)} className="btn-yellow">
          <Plus className="w-4 h-4" /> DODAJ UTAKMICU
        </button>
      </div>

      {open && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVA UTAKMICA</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Domaćin *</label>
              <select className="field-input" value={form.home_team_id}
                onChange={e => setForm({...form, home_team_id: e.target.value})} required>
                <option value="">— Domaćin —</option>
                {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Gosti *</label>
              <select className="field-input" value={form.away_team_id}
                onChange={e => setForm({...form, away_team_id: e.target.value})} required>
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
                <input
                  type="number" min="1" max="31" placeholder="DD"
                  className="field-input text-center"
                  style={{width:'64px'}}
                  value={dateDay}
                  onChange={e => updateDate(e.target.value, dateMonth, dateYear)}
                />
                <input
                  type="number" min="1" max="12" placeholder="MM"
                  className="field-input text-center"
                  style={{width:'64px'}}
                  value={dateMonth}
                  onChange={e => updateDate(dateDay, e.target.value, dateYear)}
                />
                <input
                  type="number" min="2020" max="2035" placeholder="YYYY"
                  className="field-input text-center"
                  style={{flex:1}}
                  value={dateYear}
                  onChange={e => updateDate(dateDay, dateMonth, e.target.value)}
                />
              </div>
              {form.match_date && (
                <p className="text-xs text-[#f5c518] mt-1">✓ {fmtDate(form.match_date)}</p>
              )}
              <input type="hidden" value={form.match_date} required />
            </div>
            <div>
              <label className="label">Vreme (24h format)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="23" placeholder="HH"
                  className="field-input text-center"
                  style={{width:'70px'}}
                  value={timeHour}
                  onChange={e => updateTime(e.target.value, timeMin)}
                />
                <span className="text-[#f5c518] font-display text-xl">:</span>
                <input
                  type="number" min="0" max="59" placeholder="MM"
                  className="field-input text-center"
                  style={{width:'70px'}}
                  value={timeMin}
                  onChange={e => updateTime(timeHour, e.target.value)}
                />
              </div>
              {form.match_time && (
                <p className="text-xs text-[#f5c518] mt-1">✓ {form.match_time}</p>
              )}
            </div>
            <div>
              <label className="label">Hala / Mesto</label>
              <input type="text" className="field-input" placeholder="Hala Vranje" value={form.venue}
                onChange={e => setForm({...form, venue: e.target.value})} />
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
              <label className="label">Kolo</label>
              <input type="text" className="field-input" placeholder="1" value={form.round}
                onChange={e => setForm({...form, round: e.target.value})} />
            </div>
            {showScore && <>
              <div>
                <label className="label">Setovi — Domaćin</label>
                <input type="number" min="0" max="3" className="field-input" value={form.home_sets}
                  onChange={e => setForm({...form, home_sets: e.target.value})} />
              </div>
              <div>
                <label className="label">Setovi — Gosti</label>
                <input type="number" min="0" max="3" className="field-input" value={form.away_sets}
                  onChange={e => setForm({...form, away_sets: e.target.value})} />
              </div>
              <div>
                <label className="label">Ukupni poeni — Domaćin</label>
                <input type="number" min="0" className="field-input" value={form.home_score}
                  onChange={e => setForm({...form, home_score: e.target.value})} />
              </div>
              <div>
                <label className="label">Ukupni poeni — Gosti</label>
                <input type="number" min="0" className="field-input" value={form.away_score}
                  onChange={e => setForm({...form, away_score: e.target.value})} />
              </div>
            </>}
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      {/* EDIT FORMA ZA REZULTAT */}
      {editMatch && (
        <div className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/40">
          <h3 className="font-display text-xl text-white tracking-wider mb-1">UNESI REZULTAT</h3>
          <p className="text-sm text-blue-300 mb-5 font-semibold">
            {editMatch.home_name} <span className="text-[#f5c518] mx-2">VS</span> {editMatch.away_name}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Status</label>
              <select className="field-input" value={editMatch.status}
                onChange={e => setEditMatch((m: any) => ({...m, status: e.target.value}))}>
                <option value="scheduled">Zakazano</option>
                <option value="live">Uživo</option>
                <option value="finished">Završeno</option>
                <option value="postponed">Odloženo</option>
              </select>
            </div>
            <div>
              <label className="label">Setovi — Dom.</label>
              <input type="number" min="0" max="3" className="field-input text-center text-lg font-display"
                value={editMatch.home_sets}
                onChange={e => setEditMatch((m: any) => ({...m, home_sets: e.target.value}))} />
            </div>
            <div>
              <label className="label">Setovi — Gosti</label>
              <input type="number" min="0" max="3" className="field-input text-center text-lg font-display"
                value={editMatch.away_sets}
                onChange={e => setEditMatch((m: any) => ({...m, away_sets: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Ukupni poeni — {editMatch.home_name}</label>
              <input type="number" min="0" className="field-input"
                value={editMatch.home_score}
                onChange={e => setEditMatch((m: any) => ({...m, home_score: e.target.value}))} />
            </div>
            <div>
              <label className="label">Ukupni poeni — {editMatch.away_name}</label>
              <input type="number" min="0" className="field-input"
                value={editMatch.away_score}
                onChange={e => setEditMatch((m: any) => ({...m, away_score: e.target.value}))} />
            </div>
          </div>
          {/* Preview */}
          {editMatch.home_sets !== '' && editMatch.away_sets !== '' && (
            <div className="flex items-center justify-center gap-6 bg-[#002d63]/60 rounded-xl py-4 mb-5">
              <span className="text-white font-semibold text-sm">{editMatch.home_name}</span>
              <span className="font-display text-4xl text-[#f5c518]">
                {editMatch.home_sets} : {editMatch.away_sets}
              </span>
              <span className="text-white font-semibold text-sm">{editMatch.away_name}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={saveEditMatch} disabled={editBusy} className="btn-yellow">
              <Save className="w-4 h-4" /> SAČUVAJ REZULTAT
            </button>
            <button onClick={() => setEditMatch(null)} className="btn-ghost">
              <X className="w-4 h-4" /> Odustani
            </button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr>
              {['DATUM','VREME','DOMAĆIN','RES.','GOSTI','KAT.','STATUS','KOLO',''].map(h => (
                <th key={h} className="th-style">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-blue-500 text-sm">Nema unetih utakmica.</td></tr>
            )}
            {matches.map((m: any) => {
              const st = statusLabel(m.status)
              return (
                <tr key={m.id} className="border-t border-white/5 tr-hover text-sm">
                  <td className="px-3 py-2.5 text-blue-200 font-semibold whitespace-nowrap">
                    {fmtDate(m.match_date)}
                  </td>
                  <td className="px-3 py-2.5 text-blue-200 whitespace-nowrap">
                    {fmtTime(m.match_time) || <span className="text-blue-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-white font-semibold">{m.home_team?.name}</td>
                  <td className="px-3 py-2.5 text-center font-display text-[#f5c518]">
                    {(m.status === 'finished' || m.status === 'live') ? `${m.home_sets}:${m.away_sets}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-white font-semibold">{m.away_team?.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs bg-[#003f8a]/50 text-blue-300 px-1.5 py-0.5 rounded capitalize">{m.category}</span>
                  </td>
                  <td className={`px-3 py-2.5 text-xs ${st.cls}`}>{st.text}</td>
                  <td className="px-3 py-2.5 text-blue-400">{m.round ? `${m.round}. kolo` : '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => startEditMatch(m)}
                        className="text-blue-400 hover:text-[#f5c518] p-1 transition-colors" title="Unesi rezultat">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => del(m.id)}
                        className="text-red-400 hover:text-red-300 p-1 transition-colors" title="Obriši">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
