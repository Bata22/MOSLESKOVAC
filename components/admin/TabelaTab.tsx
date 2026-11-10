'use client'
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { CATEGORIES } from '@/lib/types'
import { Plus, Trash2, Save, X, Edit2, RefreshCw, AlertTriangle } from 'lucide-react'
import KategorijaFilter, { SVE, groupByCategory, katLabel, useKategorija } from './KategorijaFilter'
import { compareStandings, recalcSeason } from '@/lib/standings'

export default function TabelaTab({ standings, teams, supabase, onRefresh, aktivnaSezona, isReviewer }: any) {
  const [open,    setOpen]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [racuna,  setRacuna]  = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editRow, setEditRow] = useState<any>(null)
  const [cat,     setCat]     = useKategorija()
  const editRef = useRef<HTMLDivElement>(null)

  const blank = { team_id: '', category: 'seniori', season: aktivnaSezona, played:0, won:0, lost:0, sets_won:0, sets_lost:0, points_won:0, points_lost:0, points:0 }
  const [form, setForm] = useState(blank)

  const teamById = useMemo(() => {
    const m = new Map<string, any>()
    ;(teams ?? []).forEach((t: any) => m.set(t.id, t))
    return m
  }, [teams])

  // U tabelu kategorije mogu samo timovi te kategorije
  const timoviZa = (category: string) => (teams ?? []).filter((t: any) => t.category === category)
  const imeTima = (s: any) => s.team?.name ?? teamById.get(s.team_id)?.name ?? '—'

  async function recalcPositions(category: string, season: string) {
    const { data } = await supabase.from('standings').select('id, won, points, sets_won, sets_lost, points_won, points_lost')
      .eq('category', category).eq('season', season)
    if (!data) return
    const sorted = [...data].sort(compareStandings)
    await Promise.all(sorted.map((row: any, i: number) =>
      supabase.from('standings').update({ position: i + 1 }).eq('id', row.id)
    ))
  }

  // Forma za novi unos odmah dobija izabranu kategoriju
  function toggleAdd() {
    setOpen(v => !v); setEditId(null)
    const c = cat !== SVE && CATEGORIES.some(x => x.value === cat) ? cat : form.category
    setForm(f => ({ ...f, season: aktivnaSezona, category: c, team_id: teamById.get(f.team_id)?.category === c ? f.team_id : '' }))
  }

  function promeniKategoriju(category: string) {
    setForm(f => ({ ...f, category, team_id: teamById.get(f.team_id)?.category === category ? f.team_id : '' }))
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (isReviewer) return
    const tim = teamById.get(form.team_id)
    if (!tim) { alert('Izaberi tim.'); return }
    if (tim.category !== form.category) { alert(`Tim mora biti iz kategorije ${katLabel(form.category)}.`); return }
    // Isti tim (ili isti klub) može da bude samo jednom u tabeli kategorije
    const vecPostoji = (standings ?? []).some((s: any) =>
      s.category === form.category && s.season === aktivnaSezona &&
      (s.team_id === form.team_id || imeTima(s) === tim.name))
    if (vecPostoji) { alert(`${tim.name} već postoji u tabeli kategorije ${katLabel(form.category)} (${aktivnaSezona}).`); return }

    setBusy(true)
    const { error } = await supabase.from('standings').insert([{ ...form, season: aktivnaSezona, position: 1 }])
    if (error) {
      setBusy(false)
      alert(error.code === '23505'
        ? `${tim.name} već postoji u tabeli kategorije ${katLabel(form.category)} (${aktivnaSezona}).`
        : 'Unos nije sačuvan: ' + error.message)
      return
    }
    await recalcPositions(form.category, aktivnaSezona)
    // Ako je filter na drugoj kategoriji, prebaci na onu u koju je tim dodat
    if (cat !== SVE && cat !== form.category) setCat(form.category)
    setForm({ ...blank, season: aktivnaSezona, category: form.category }); setOpen(false); setBusy(false); onRefresh()
  }

  async function saveEdit() {
    if (!editId || !editRow) return; setBusy(true)
    const { error } = await supabase.from('standings').update({
      played: editRow.played, won: editRow.won, lost: editRow.lost,
      sets_won: editRow.sets_won, sets_lost: editRow.sets_lost,
      points_won: editRow.points_won, points_lost: editRow.points_lost, points: editRow.points,
    }).eq('id', editId)
    if (error) { setBusy(false); alert('Izmene nisu sačuvane: ' + error.message); return }
    await recalcPositions(editRow.category, editRow.season)
    setEditId(null); setEditRow(null); setBusy(false); onRefresh()
  }

  async function del(id: string) {
    if (!confirm('Obrisati unos?')) return
    const row = standings.find((s: any) => s.id === id)
    const { error } = await supabase.from('standings').delete().eq('id', id)
    if (error) { alert('Unos nije obrisan: ' + error.message); return }
    if (row) await recalcPositions(row.category, row.season)
    if (editId === id) { setEditId(null); setEditRow(null) }
    onRefresh()
  }

  // Tabela se računa iz završenih utakmica (izabrana kategorija ili sve)
  async function preracunaj() {
    const jedna = cat !== SVE ? cat : null
    const sta = jedna ? `kategoriju ${katLabel(jedna)}` : 'SVE kategorije'
    if (!confirm(
      `Preračunati tabelu za ${sta} (sezona ${aktivnaSezona}) iz završenih utakmica?\n\n` +
      '• Bodovi, setovi i poeni računaju se iz upisanih rezultata.\n' +
      '• Dupli redovi istog tima se brišu.\n' +
      '• Tim bez završenih utakmica dobija nule; red tima iz druge kategorije se briše.\n' +
      '• Kategorija bez ijedne završene utakmice ostaje kakva jeste.'
    )) return
    setRacuna(true)
    const r = await recalcSeason(supabase, aktivnaSezona, jedna ?? undefined)
    setRacuna(false)
    onRefresh()
    if (r.errors.length) alert('Greška pri preračunavanju:\n' + r.errors.join('\n'))
    else alert(r.count ? `Gotovo. Promenjenih tabela: ${r.count}.` : 'Gotovo. Tabela je već bila tačna.')
  }

  function startEdit(s: any) {
    setEditId(s.id); setEditRow({ ...s }); setOpen(false)
    // Skroluj do forme za izmenu (lista po kategorijama ume da bude dugačka)
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const nEdit = (key: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setEditRow((r: any) => ({ ...r, [key]: parseInt(e.target.value) || 0 }))

  const numField = (key: string, label: string) => (
    <div key={key}>
      <label className="label">{label}</label>
      <input type="number" min="0" className="field-input" value={(form as any)[key]}
        onChange={e => setForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))} />
    </div>
  )

  // Razvrstavanje po kategorijama
  const groups = groupByCategory<any>(standings, s => s.category)
  const shown = cat === SVE ? groups : groups.filter(g => g.value === cat)
  const byPosition = (rows: any[]) =>
    [...rows].sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || (b.won ?? 0) - (a.won ?? 0))

  // Problemi u tabeli: isti klub više puta, ili tim iz druge kategorije
  const problemi = (() => {
    const dupli = new Set<string>()
    const pogresni = new Set<string>()
    const poKategoriji = new Map<string, Map<string, string[]>>()
    for (const s of standings ?? []) {
      const kat = teamById.get(s.team_id)?.category
      if (kat && kat !== s.category) pogresni.add(s.id)
      const naziv = (imeTima(s) || '').trim().toLowerCase()
      const k = `${s.category}|${s.season}`
      if (!poKategoriji.has(k)) poKategoriji.set(k, new Map())
      const m = poKategoriji.get(k)!
      m.set(naziv, [...(m.get(naziv) ?? []), s.id])
    }
    poKategoriji.forEach(m => m.forEach(ids => { if (ids.length > 1) ids.forEach(id => dupli.add(id)) }))
    return { dupli, pogresni }
  })()
  const brojProblema = new Set([...Array.from(problemi.dupli), ...Array.from(problemi.pogresni)]).size

  const headers = ['#', 'TIM', 'UT', 'P', 'I', 'S+', 'S-', 'B+', 'B-', 'BOD', ...(isReviewer ? [] : ['AKCIJE'])]

  function renderTable(rows: any[]) {
    return (
      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead><tr>
            {headers.map(h => <th key={h} className="th-style">{h}</th>)}
          </tr></thead>
          <tbody>
            {byPosition(rows).map((s: any) => {
              const katTima = teamById.get(s.team_id)?.category
              return (
                <tr key={s.id} className={`border-t border-white/5 tr-hover text-sm ${editId === s.id ? 'bg-blue-900/20' : ''}`}>
                  <td className="px-3 py-2.5 text-center"><span className="font-display text-lg text-[#f5c518]">{s.position}</span></td>
                  <td className="px-3 py-2.5 text-white font-semibold">
                    {imeTima(s)}
                    {problemi.dupli.has(s.id) && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 align-middle"
                        title="Isti klub je u ovoj tabeli više puta">DUPLIKAT</span>
                    )}
                    {problemi.pogresni.has(s.id) && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-normal text-amber-300 align-middle"
                        title={`Tim je iz kategorije ${katLabel(katTima)}`}>
                        <AlertTriangle className="w-3 h-3" /> tim iz kategorije {katLabel(katTima)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-blue-300">{s.played}</td>
                  <td className="px-3 py-2.5 text-center text-green-400 font-semibold">{s.won}</td>
                  <td className="px-3 py-2.5 text-center text-red-400">{s.lost}</td>
                  <td className="px-3 py-2.5 text-center text-blue-300">{s.sets_won}</td>
                  <td className="px-3 py-2.5 text-center text-blue-300">{s.sets_lost}</td>
                  <td className="px-3 py-2.5 text-center text-blue-300">{s.points_won}</td>
                  <td className="px-3 py-2.5 text-center text-blue-300">{s.points_lost}</td>
                  <td className="px-3 py-2.5 text-center font-display text-xl text-[#f5c518]">{s.points}</td>
                  {!isReviewer && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => startEdit(s)} className="text-blue-400 hover:text-[#f5c518] p-1 transition-colors" title="Uredi"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => del(s.id)} className="text-red-400 hover:text-red-300 p-1 transition-colors" title="Obriši"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const timoviUFormi = timoviZa(form.category)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h2 className="font-display text-4xl text-white tracking-wider">TABELA LIGA</h2>
          <p className="text-blue-400 text-sm mt-1">Sezona: <span className="text-[#f5c518] font-semibold">{aktivnaSezona}</span></p>
        </div>
        {!isReviewer && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={preracunaj} disabled={racuna}
              className="border border-[#f5c518]/40 text-[#f5c518] px-4 py-2 rounded-lg text-sm font-display tracking-wide hover:bg-[#f5c518]/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              title="Tabela se računa iz završenih utakmica">
              <RefreshCw className={`w-4 h-4 ${racuna ? 'animate-spin' : ''}`} />
              {racuna ? 'RAČUNAM...' : cat === SVE ? 'PRERAČUNAJ SVE IZ UTAKMICA' : 'PRERAČUNAJ IZ UTAKMICA'}
            </button>
            <button onClick={toggleAdd} className="btn-yellow">
              <Plus className="w-4 h-4" /> DODAJ UNOS
            </button>
          </div>
        )}
      </div>

      <KategorijaFilter groups={groups} total={standings.length} active={cat} onChange={setCat} />

      {brojProblema > 0 && !isReviewer && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            U tabeli ima redova koji se ponavljaju ili su iz pogrešne kategorije: <b>{brojProblema}</b>.
            Prvo u UTAKMICAMA ispravi utakmice sa ⚠ (pogrešan tim), pa klikni <b>PRERAČUNAJ IZ UTAKMICA</b>.
            Višak možeš i ručno da obrišeš.
          </span>
        </div>
      )}

      {open && !isReviewer && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI UNOS — {aktivnaSezona}</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Kategorija *</label>
              <select className="field-input" value={form.category} onChange={e => promeniKategoriju(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tim *</label>
              <select className="field-input" value={form.team_id} onChange={e => setForm({...form, team_id: e.target.value})}
                required disabled={!timoviUFormi.length}>
                <option value="">{timoviUFormi.length ? '— Izaberi tim —' : '— nema timova u ovoj kategoriji —'}</option>
                {timoviUFormi.map((t: any) => <option key={t.id} value={t.id}>{t.name} — {katLabel(t.category)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sezona</label>
              <input className="field-input bg-[#003f8a]/30 text-blue-300" value={aktivnaSezona} readOnly />
            </div>
            {!timoviUFormi.length && (
              <p className="sm:col-span-2 md:col-span-3 -mt-1 text-xs text-amber-300">
                U kategoriji {katLabel(form.category)} još nema timova. Dodaj ih u tabu TIMOVI.
              </p>
            )}
            {numField('played','Utakmice')} {numField('won','Pobede')} {numField('lost','Izgubljene')}
            {numField('sets_won','Setovi +')} {numField('sets_lost','Setovi -')}
            {numField('points_won','Poeni +')} {numField('points_lost','Poeni -')} {numField('points','Bodovi')}
          </div>
          <p className="text-xs text-blue-500 mt-3">* Pozicija: Pobede → Bodovi → Set količnik → Poen količnik</p>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      {editId && editRow && !isReviewer && (
        <div ref={editRef} className="glass rounded-2xl p-6 mb-6 border border-blue-400/40 scroll-mt-32">
          <h3 className="font-display text-xl text-white tracking-wider mb-1">UREDI: <span className="text-[#f5c518]">{imeTima(editRow)}</span></h3>
          <p className="text-xs text-blue-400 mb-4">{katLabel(editRow.category)} — {editRow.season}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {[['played','Utakmice'],['won','Pobede'],['lost','Izgubljene'],['sets_won','Setovi +'],['sets_lost','Setovi -'],['points_won','Poeni +'],['points_lost','Poeni -'],['points','Bodovi']].map(([k,l]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input type="number" min="0" className="field-input" value={editRow[k] ?? 0} onChange={nEdit(k)} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveEdit} disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ IZMENE</button>
            <button onClick={() => { setEditId(null); setEditRow(null) }} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-10 text-center text-blue-500 text-sm">
          {cat === SVE
            ? `Nema podataka za sezonu ${aktivnaSezona}.`
            : `Nema timova u kategoriji ${katLabel(cat)} za sezonu ${aktivnaSezona}.`}
        </div>
      ) : (
        <div className="space-y-8">
          {shown.map(g => (
            <section key={g.value}>
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h3 className="font-display text-2xl text-[#f5c518] tracking-wider">
                  {g.label.toUpperCase()} <span className="text-sm text-blue-400 font-sans tracking-normal">({g.items.length})</span>
                </h3>
                {cat === SVE && (
                  <button onClick={() => setCat(g.value)} className="text-xs text-blue-400 hover:text-[#f5c518] transition-colors">
                    Samo ova kategorija →
                  </button>
                )}
              </div>
              {renderTable(g.items)}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
