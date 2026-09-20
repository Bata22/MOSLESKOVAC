'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X } from 'lucide-react'

export default function BilteniTab({ supabase }: any) {
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
