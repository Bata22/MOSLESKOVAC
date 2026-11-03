'use client'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { CATEGORIES } from '@/lib/types'
import { Plus, Trash2, Save, X, Edit2 } from 'lucide-react'
import KategorijaFilter, { SVE, groupByCategory, katLabel, useKategorija } from './KategorijaFilter'

export default function TabelaTab({ standings, teams, supabase, onRefresh, aktivnaSezona, isReviewer }: any) {
  const [open,    setOpen]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editRow, setEditRow] = useState<any>(null)
  const [cat,     setCat]     = useKategorija()
  const editRef = useRef<HTMLDivElement>(null)

  const blank = { team_id: '', category: 'seniori', season: aktivnaSezona, played:0, won:0, lost:0, sets_won:0, sets_lost:0, points_won:0, points_lost:0, points:0 }
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

  // Forma za novi unos odmah dobija izabranu kategoriju
  function toggleAdd() {
    setOpen(v => !v); setEditId(null)
    setForm(f => ({
      ...f,
      season: aktivnaSezona,
      category: cat !== SVE && CATEGORIES.some(c => c.value === cat) ? cat : f.category,
    }))
  }

  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('standings').insert([{ ...form, season: aktivnaSezona, position: 1 }])
    await recalcPositions(form.category, aktivnaSezona)
    // Ako je filter na drugoj kategoriji, prebaci na onu u koju je tim dodat
    if (cat !== SVE && cat !== form.category) setCat(form.category)
    setForm({ ...blank, season: aktivnaSezona }); setOpen(false); setBusy(false); onRefresh()
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

  const headers = ['#', 'TIM', 'UT', 'P', 'I', 'S+', 'S-', 'B+', 'B-', 'BOD', ...(isReviewer ? [] : ['AKCIJE'])]

  function renderTable(rows: any[]) {
    return (
      <div className="glass rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead><tr>
            {headers.map(h => <th key={h} className="th-style">{h}</th>)}
          </tr></thead>
          <tbody>
            {byPosition(rows).map((s: any) => (
              <tr key={s.id} className={`border-t border-white/5 tr-hover text-sm ${editId === s.id ? 'bg-blue-900/20' : ''}`}>
                <td className="px-3 py-2.5 text-center"><span className="font-display text-lg text-[#f5c518]">{s.position}</span></td>
                <td className="px-3 py-2.5 text-white font-semibold">{s.team?.name}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-4xl text-white tracking-wider">TABELA LIGA</h2>
          <p className="text-blue-400 text-sm mt-1">Sezona: <span className="text-[#f5c518] font-semibold">{aktivnaSezona}</span></p>
        </div>
        {!isReviewer && (
          <button onClick={toggleAdd} className="btn-yellow">
            <Plus className="w-4 h-4" /> DODAJ UNOS
          </button>
        )}
      </div>

      <KategorijaFilter groups={groups} total={standings.length} active={cat} onChange={setCat} />

      {open && !isReviewer && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-4">NOVI UNOS — {aktivnaSezona}</h3>
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
              <label className="label">Sezona</label>
              <input className="field-input bg-[#003f8a]/30 text-blue-300" value={aktivnaSezona} readOnly />
            </div>
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
          <h3 className="font-display text-xl text-white tracking-wider mb-1">UREDI: <span className="text-[#f5c518]">{editRow.team?.name}</span></h3>
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
