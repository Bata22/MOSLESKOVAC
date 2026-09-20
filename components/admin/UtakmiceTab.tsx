'use client'

import { useState, useRef } from 'react'
import { CATEGORIES, SEASONS } from '@/lib/types'
import { Plus, Trash2, Save, X, Edit2, Calendar } from 'lucide-react'

export default function UtakmiceTab({ matches, teams, supabase, onRefresh, aktivnaSezona }: any) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const blank = {
    home_team_id: '', away_team_id: '', category: 'seniori', season: aktivnaSezona,
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
        <div>
          <h2 className="font-display text-4xl text-white tracking-wider">UTAKMICE</h2>
          <p className="text-blue-400 text-sm mt-1">Sezona: <span className="text-[#f5c518] font-semibold">{aktivnaSezona}</span></p>
        </div>
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
