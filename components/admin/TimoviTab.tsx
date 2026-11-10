'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X } from 'lucide-react'
import KategorijeIzbor from './KategorijeIzbor'
import { katLabel } from './KategorijaFilter'
import { recalcStandings } from '@/lib/standings'

// Tim = klub u jednoj kategoriji. Klub se dodaje odjednom u sve kategorije u kojima igra.

export default function TimoviTab({ teams, supabase, onRefresh, isReviewer }: any) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', city: '' })
  const [kategorije, setKategorije] = useState<string[]>([])
  const [poruka, setPoruka] = useState('')
  const [klubovi, setKlubovi] = useState<any[]>([])

  useEffect(() => {
    supabase.from('klubovi').select('id, naziv').order('naziv')
      .then(({ data }: any) => setKlubovi(data ?? []))
  }, [supabase])

  // Kategorije u kojima izabrani klub već ima tim
  const postojece: string[] = form.name
    ? (teams ?? []).filter((t: any) => t.name === form.name).map((t: any) => t.category)
    : []

  function izaberiKlub(name: string) {
    const postoji = (teams ?? []).filter((t: any) => t.name === name)
    setForm(f => ({ name, city: f.city || postoji.find((t: any) => t.city)?.city || '' }))
    setKategorije(k => k.filter(c => !postoji.some((t: any) => t.category === c)))
    setPoruka('')
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (isReviewer) return // Google recenzent: samo pregled
    if (!form.name) { alert('Izaberi klub.'); return }
    const nove = kategorije.filter(c => !postojece.includes(c))
    if (!nove.length) { alert('Označi bar jednu kategoriju u kojoj klub još nema tim.'); return }
    setBusy(true)
    const { error } = await supabase.from('teams')
      .insert(nove.map(category => ({ name: form.name, category, city: form.city })))
    setBusy(false)
    if (error) {
      alert(error.code === '23505'
        ? 'Klub već ima tim u nekoj od izabranih kategorija. Osveži stranicu i pokušaj ponovo.'
        : 'Timovi nisu sačuvani: ' + error.message)
      return
    }
    setPoruka(`✓ ${form.name}: dodato ${nove.length} — ${nove.map(katLabel).join(', ')}`)
    setForm({ name: '', city: '' }); setKategorije([])
    onRefresh()
  }

  async function del(t: any) {
    if (isReviewer) return
    // Brisanjem tima brišu se i njegove utakmice (i red u tabeli) — upozori pre brisanja
    const { data: ms, error: e1 } = await supabase.from('matches')
      .select('season, category, status, home_team_id, away_team_id')
      .or(`home_team_id.eq.${t.id},away_team_id.eq.${t.id}`)
    if (e1) { alert('Greška: ' + e1.message); return }
    const broj = ms?.length ?? 0
    const tekst = broj
      ? `Tim „${t.name}“ (${katLabel(t.category)}) ima upisanih utakmica: ${broj}.\n\n` +
        'Brisanjem tima obrisaće se i te utakmice i njegov red u tabeli. Obrisati?'
      : `Obrisati tim „${t.name}“ (${katLabel(t.category)})?`
    if (!confirm(tekst)) return

    const { error } = await supabase.from('teams').delete().eq('id', t.id)
    if (error) { alert('Tim nije obrisan: ' + error.message); return }

    // Tabele u kojima su bile završene utakmice ovog tima računaju se ponovo
    const zavrsene = (ms ?? []).filter((m: any) => m.status === 'finished')
    const tabele = Array.from(new Set<string>(zavrsene.map((m: any) => `${m.category}|${m.season}`)))
    for (const k of tabele) {
      const [category, season] = k.split('|')
      const touched = zavrsene
        .filter((m: any) => m.category === category && m.season === season)
        .flatMap((m: any) => [m.home_team_id, m.away_team_id])
      await recalcStandings(supabase, category, season, { touched })
    }
    onRefresh()
  }

  // Isti klub dva puta u istoj kategoriji
  const kljuc = (t: any) => `${t.name}|${t.category}`
  const brojac = new Map<string, number>()
  ;(teams ?? []).forEach((t: any) => brojac.set(kljuc(t), (brojac.get(kljuc(t)) ?? 0) + 1))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-4xl text-white tracking-wider">TIMOVI</h2>
        {!isReviewer && (
          <button onClick={() => { setOpen(v => !v); setPoruka('') }} className="btn-yellow"><Plus className="w-4 h-4" /> DODAJ TIM</button>
        )}
      </div>

      {open && !isReviewer && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-1">NOVI TIM</h3>
          <p className="text-xs text-blue-400 mb-4">Izaberi klub i označi sve kategorije u kojima igra — za svaku se pravi poseban tim.</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="label">Klub *</label>
              <select className="field-input" value={form.name} onChange={e => izaberiKlub(e.target.value)} required>
                <option value="">— Odaberi klub —</option>
                {klubovi.map((k: any) => <option key={k.id} value={k.naziv}>{k.naziv}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Grad</label>
              <input className="field-input" placeholder="Leskovac" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
          </div>
          <label className="label">Kategorije *</label>
          <KategorijeIzbor value={kategorije} onChange={setKategorije}
            postojece={postojece} postojeceTekst="već postoji" />
          {poruka && <p className="mt-4 text-sm text-green-300">{poruka}</p>}
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => { setOpen(false); setPoruka('') }} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
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
                <td className="px-4 py-3 text-white font-semibold text-sm">
                  {t.name}
                  {(brojac.get(kljuc(t)) ?? 0) > 1 && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 align-middle"
                      title="Isti klub je u ovoj kategoriji upisan više puta">DUPLIKAT</span>
                  )}
                </td>
                <td className="px-4 py-3"><span className="text-xs bg-[#003f8a]/50 text-blue-300 px-2 py-0.5 rounded">{katLabel(t.category)}</span></td>
                <td className="px-4 py-3 text-blue-400 text-sm hidden sm:table-cell">{t.city || '—'}</td>
                <td className="px-4 py-3 text-right">
                  {!isReviewer && (
                    <button onClick={() => del(t)} className="text-red-400 hover:text-red-300 p-1 transition-colors" title="Obriši"><Trash2 className="w-4 h-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
