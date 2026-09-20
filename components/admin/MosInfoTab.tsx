'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, X, Edit2 } from 'lucide-react'

export default function MosInfoTab({ supabase }: any) {
  const [info,      setInfo]      = useState<any>(null)
  const [uprava,    setUprava]    = useState<any[]>([])
  const [busy,      setBusy]      = useState(false)
  const [openForm,  setOpenForm]  = useState(false)
  const [upravaForm, setUpravaForm] = useState({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 })
  const [loaded,    setLoaded]    = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 })

  useEffect(() => {
    async function load() {
      const [i, u] = await Promise.all([
        supabase.from('mos_info').select('*').limit(1).single(),
        supabase.from('mos_uprava').select('*').order('redosled'),
      ])
      setInfo(i.data ?? { naziv:'', adresa:'', pib:'', mail:'', ziro_racun:'' })
      setUprava(u.data ?? [])
      setLoaded(true)
    }
    load()
  }, [supabase])

  async function reload() {
    const [i, u] = await Promise.all([
      supabase.from('mos_info').select('*').limit(1).single(),
      supabase.from('mos_uprava').select('*').order('redosled'),
    ])
    setInfo(i.data ?? { naziv:'', adresa:'', pib:'', mail:'', ziro_racun:'' })
    setUprava(u.data ?? [])
  }

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    if (info?.id) {
      await supabase.from('mos_info').update({ naziv:info.naziv, adresa:info.adresa, pib:info.pib, mail:info.mail, ziro_racun:info.ziro_racun }).eq('id', info.id)
    } else {
      const res = await supabase.from('mos_info').insert([{ naziv:info.naziv, adresa:info.adresa, pib:info.pib, mail:info.mail, ziro_racun:info.ziro_racun }]).select().single()
      setInfo(res.data)
    }
    setBusy(false)
  }

  async function addUprava(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    await supabase.from('mos_uprava').insert([upravaForm])
    setUpravaForm({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 })
    setOpenForm(false); setBusy(false); reload()
  }

  async function delUprava(id: string) {
    if (!confirm('Obrisati?')) return
    await supabase.from('mos_uprava').delete().eq('id', id); reload()
  }

  function startEditAdminitstration(a: any) {
  setEditId(a.id)
  setEditForm({
    pozicija:   a.pozicija || '',
    ime_prezime: a.ime_prezime || '',
    telefon:    a.telefon || '',
    mail:       a.mail || '',
    redosled:   a.redosled ?? 0
  })
  
  setOpenForm(false)
}

async function saveEditAdminitstration(e: React.FormEvent) {
  e.preventDefault()
  setBusy(true)
  await supabase.from('mos_uprava').update(editForm).eq('id', editId)
  setEditId(null)
  setEditForm({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 })
  setBusy(false)
  reload()
}

  if (!loaded) return <div className="text-blue-400 text-center py-10 animate-pulse">Učitavanje...</div>

  return (
    <div className="space-y-8">
      <h2 className="font-display text-4xl text-white tracking-wider">MOS INFO</h2>

      {/* Osnovne informacije */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="bg-[#002d63]/60 px-6 py-4 border-b border-white/10">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider">OSNOVNE INFORMACIJE</h3>
          <p className="text-xs text-blue-400 mt-0.5">Ovo se prikazuje na javnoj /mos-info stranici</p>
        </div>
        <form onSubmit={saveInfo} className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { key:'naziv',      label:'Naziv saveza' },
              { key:'adresa',     label:'Adresa'       },
              { key:'pib',        label:'PIB'          },
              { key:'mail',       label:'Mail adresa'  },
              { key:'ziro_racun', label:'Žiro račun'   },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input className="field-input" value={info?.[f.key]||''} onChange={e => setInfo((i: any) => ({...i, [f.key]: e.target.value}))} />
              </div>
            ))}
          </div>
          <button type="submit" disabled={busy} className="btn-yellow mt-5"><Save className="w-4 h-4" /> SAČUVAJ INFORMACIJE</button>
        </form>
      </div>

      {/* Administracija saveza */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="bg-[#002d63]/60 px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-[#f5c518] tracking-wider">ADMINISTRACIJA SAVEZA</h3>
            <p className="text-xs text-blue-400 mt-0.5">Prikazuje se na javnoj stranici</p>
          </div>
          <button onClick={() => setOpenForm(v => !v)} className="btn-yellow text-sm"><Plus className="w-4 h-4" /> DODAJ</button>
        </div>

        {openForm && (
          <form onSubmit={addUprava} className="p-6 border-b border-white/10 bg-black/20">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Pozicija *</label><input className="field-input" placeholder="npr. Predsednik" value={upravaForm.pozicija} onChange={e => setUpravaForm({...upravaForm,pozicija:e.target.value})} required /></div>
              <div><label className="label">Ime i prezime *</label><input className="field-input" value={upravaForm.ime_prezime} onChange={e => setUpravaForm({...upravaForm,ime_prezime:e.target.value})} required /></div>
              <div><label className="label">Broj telefona</label><input className="field-input" value={upravaForm.telefon} onChange={e => setUpravaForm({...upravaForm,telefon:e.target.value})} /></div>
              <div><label className="label">Mail</label><input type="email" className="field-input" value={upravaForm.mail} onChange={e => setUpravaForm({...upravaForm,mail:e.target.value})} /></div>
              <div><label className="label">Redosled prikaza</label><input type="number" className="field-input" value={upravaForm.redosled} onChange={e => setUpravaForm({...upravaForm,redosled:parseInt(e.target.value)||0})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> DODAJ</button>
              <button type="button" onClick={() => setOpenForm(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
            </div>
          </form>
        )}
        {editId && (
        <form onSubmit={saveEditAdminitstration} className="p-6 border-b border-white/10 bg-blue-950/20">
            <h3 className="font-display text-lg text-white tracking-wider mb-4">UREDI ČLANA UPRAVE</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="label">Pozicija *</label><input className="field-input" value={editForm.pozicija} onChange={e => setEditForm({...editForm, pozicija: e.target.value})} required /></div>
                <div><label className="label">Ime i prezime *</label><input className="field-input" value={editForm.ime_prezime} onChange={e => setEditForm({...editForm, ime_prezime: e.target.value})} required /></div>
                <div><label className="label">Broj telefona</label><input className="field-input" value={editForm.telefon} onChange={e => setEditForm({...editForm, telefon: e.target.value})} /></div>
                <div><label className="label">Mail</label><input type="email" className="field-input" value={editForm.mail} onChange={e => setEditForm({...editForm, mail: e.target.value})} /></div>
                <div><label className="label">Redosled prikaza</label><input type="number" className="field-input" value={editForm.redosled} onChange={e => setEditForm({...editForm, redosled: parseInt(e.target.value) || 0})} /></div>
              </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ IZMENE</button>
              <button type="button" onClick={() => { setEditId(null); setEditForm({ pozicija:'', ime_prezime:'', telefon:'', mail:'', redosled:0 }) }} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
            </div>
          </form>
        )}

        <div className="divide-y divide-white/5">
          {uprava.length === 0 && <p className="px-6 py-8 text-center text-blue-500 text-sm">Nema unetih članova uprave.</p>} 
          {uprava.map((u: any) => (
            <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 flex-1">
                <span className="text-[#f5c518] font-display tracking-wide min-w-[180px]">{u.pozicija}</span>
                <span className="text-white font-semibold">{u.ime_prezime}</span>
                {u.telefon && <span className="text-blue-300 text-sm">{u.telefon}</span>}
                {u.mail    && <span className="text-blue-300 text-sm">{u.mail}</span>}
              </div>
               <button onClick={() => startEditAdminitstration(u)} className="text-blue-400 hover:text-[#f5c518] p-1"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => delUprava(u.id)} className="text-red-400 hover:text-red-300 p-1 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
/* ══════════════════════════════════════════
   KLUBOVI TAB
══════════════════════════════════════════ */