'use client'
import { useState, useEffect } from 'react'
import { CATEGORIES } from '@/lib/types'
import { Plus, Trash2, Save, X } from 'lucide-react'

export default function TimoviTab({ teams, supabase, onRefresh }: any) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'seniori', city: '' })
  const [klubovi, setKlubovi] = useState<any[]>([])

  useEffect(() => {
    supabase.from('klubovi').select('id, naziv').order('naziv')
      .then(({ data }: any) => setKlubovi(data ?? []))
  }, [supabase])

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
            <div>
              <label className="label">Naziv tima *</label>
              <select className="field-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required>
                <option value="">— Odaberi klub —</option>
                {klubovi.map((k: any) => <option key={k.id} value={k.naziv}>{k.naziv}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Kategorija *</label>
              <select className="field-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Grad</label>
              <input className="field-input" placeholder="Leskovac" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
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
