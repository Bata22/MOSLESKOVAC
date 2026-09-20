'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X, Edit2 } from 'lucide-react'

export default function SudijeTab({ supabase }: any) {
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