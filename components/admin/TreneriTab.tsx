'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X, Edit2 } from 'lucide-react'

export default function TreneriTab({ supabase }: any) {
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