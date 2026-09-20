'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X, Edit2 } from 'lucide-react'

export default function KluboviTab({ supabase }: any) {
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