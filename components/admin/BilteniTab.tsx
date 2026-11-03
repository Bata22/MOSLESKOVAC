'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { CATEGORIES, SEASONS } from '@/lib/types'
import {
  ArrowDown, ArrowUp, Download, Edit2, ExternalLink, FileText, Plus, Printer, RefreshCw, Save, Trash2, Upload, X,
} from 'lucide-react'
import {
  BiltenDocument, BILTEN_DOC_CSS, COLS, LOGO_SRC,
  catLabel, fmtIssued, koef, parseSnapshot, pdfName,
  type MatchRow, type NumKey, type Row, type Selection, type Snapshot,
} from '@/components/bilten/BiltenDocument'

/* ══════════════════════════════════════════
   POMOĆNE FUNKCIJE (samo za admin)
══════════════════════════════════════════ */

let seq = 0
const uid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`

const autoOpis = (s: Selection) =>
  `${catLabel(s.category)} — Sezona ${s.season}${s.kolo ? ` — ${s.kolo}. kolo` : ''}`

// Isti redosled kao "recalcPositions" u TabelaTab: pobede → bodovi → set koef → poen koef
function sortStandings(list: any[]) {
  const r = (w: number, l: number) => (l > 0 ? w / l : w)
  return [...list].sort((a, b) =>
    (b.won ?? 0) - (a.won ?? 0) ||
    (b.points ?? 0) - (a.points ?? 0) ||
    r(b.sets_won ?? 0, b.sets_lost ?? 0) - r(a.sets_won ?? 0, a.sets_lost ?? 0) ||
    r(b.points_won ?? 0, b.points_lost ?? 0) - r(a.points_won ?? 0, a.points_lost ?? 0) ||
    (a.position ?? 999) - (b.position ?? 999))
}

const toRow = (s: any): Row => ({
  uid: uid(),
  team: s.team?.name ?? '—',
  played: s.played ?? 0, won: s.won ?? 0, lost: s.lost ?? 0, points: s.points ?? 0,
  sets_won: s.sets_won ?? 0, sets_lost: s.sets_lost ?? 0,
  points_won: s.points_won ?? 0, points_lost: s.points_lost ?? 0,
})

const toMatchRow = (m: any): MatchRow => ({
  uid: uid(),
  round: m.round != null ? String(m.round) : '',
  date: m.match_date ?? '',
  home: m.home_team?.name ?? '—',
  away: m.away_team?.name ?? '—',
  home_sets: m.home_sets != null ? String(m.home_sets) : '',
  away_sets: m.away_sets != null ? String(m.away_sets) : '',
})

function explainError(e: any) {
  const m = String(e?.message ?? e ?? '')
  if (e?.code === '23502' || /not-null|null value/i.test(m))
    return 'Baza ne dozvoljava bilten bez PDF fajla. U Supabase SQL Editoru pokreni: ALTER TABLE bilteni ALTER COLUMN pdf_url DROP NOT NULL;'
  if (/meta/i.test(m) && /column/i.test(m))
    return 'U tabeli bilteni nedostaje kolona meta. U Supabase SQL Editoru pokreni: ALTER TABLE bilteni ADD COLUMN IF NOT EXISTS meta TEXT;'
  if (e?.code === 'PGRST116')
    return 'Baza nije dozvolila izmenu ovog biltena (RLS politika za UPDATE na tabeli bilteni).'
  return 'Greška pri čuvanju: ' + m
}

// Sačekaj da se logo učita pre štampe (inače bi na PDF-u ostalo prazno mesto)
async function logoReady() {
  const img = document.querySelector<HTMLImageElement>('#bilten-print-root .bp-logo img')
  if (!img) return
  if (!img.complete) {
    await new Promise<void>(res => {
      img.addEventListener('load', () => res(), { once: true })
      img.addEventListener('error', () => res(), { once: true })
      setTimeout(() => res(), 4000)
    })
  }
  try { await Promise.race([img.decode(), new Promise(r => setTimeout(r, 1000))]) } catch {}
}

/* ══════════════════════════════════════════
   BILTENI TAB
══════════════════════════════════════════ */

export default function BilteniTab({ supabase, isReviewer, aktivnaSezona }: any) {
  // Arhiva
  const [bilteni, setBilteni] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  // Generator
  const [genOpen, setGenOpen] = useState(false)
  const [category, setCategory] = useState<string>(CATEGORIES[0].value)
  const [season, setSeason] = useState<string>(aktivnaSezona || SEASONS[0])
  const [kolo, setKolo] = useState('')
  const [loadedFor, setLoadedFor] = useState<Selection | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [title, setTitle] = useState('')
  const [opis, setOpis] = useState('')
  const [note, setNote] = useState('')
  const [issued, setIssued] = useState('')
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Upload gotovog PDF-a
  const [upOpen, setUpOpen] = useState(false)
  const [upForm, setUpForm] = useState({ naziv: '', opis: '', pdf_url: '' })
  const [uploading, setUploading] = useState(false)

  // Štampa
  const [mounted, setMounted] = useState(false)
  const [printSnap, setPrintSnap] = useState<Snapshot | null>(null)

  useEffect(() => {
    setMounted(true)
    new Image().src = LOGO_SRC // učitaj logo unapred, da bude spreman za štampu
  }, [])
  useEffect(() => { fetchBilteni() }, [])
  useEffect(() => { if (aktivnaSezona && !loadedFor) setSeason(aktivnaSezona) }, [aktivnaSezona])

  async function fetchBilteni() {
    const { data, error } = await supabase.from('bilteni').select('*').order('created_at', { ascending: false })
    setListError(error ? error.message : '')
    setBilteni(data ?? [])
    setLoading(false)
  }

  /* ── generator ── */

  function resetEditor() {
    setRows([]); setMatches([]); setLoadedFor(null)
    setTitle(''); setOpis(''); setNote(''); setIssued('')
    setCurrentId(null); setDirty(false); setMsg(null)
  }

  function newBilten() {
    if (genOpen && dirty && !confirm('Imaš nesačuvane izmene u biltenu. Odbaciti ih?')) return
    resetEditor()
    setUpOpen(false)
    setGenOpen(true)
  }

  function closeGen() {
    if (dirty && !confirm('Imaš nesačuvane izmene. Zatvoriti bez čuvanja?')) return
    setGenOpen(false); setDirty(false); setMsg(null)
  }

  async function loadData() {
    if (dirty && !confirm('Učitavanje iz baze zameniće podatke koje si ručno izmenio. Nastaviti?')) return
    setLoadingData(true); setMsg(null)
    const k = kolo.trim()
    const [s, m] = await Promise.all([
      supabase.from('standings')
        .select('*, team:teams(name)')
        .eq('category', category).eq('season', season),
      supabase.from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)')
        .eq('category', category).eq('season', season).eq('status', 'finished')
        .order('match_date', { ascending: true }),
    ])
    setLoadingData(false)
    if (s.error || m.error) {
      setMsg({ ok: false, text: 'Greška pri učitavanju: ' + (s.error ?? m.error).message })
      return
    }
    let ms: any[] = m.data ?? []
    if (k) ms = ms.filter(x => String(x.round ?? '').trim() === k)
    ms = [...ms].sort((a, b) =>
      (Number(a.round) || 0) - (Number(b.round) || 0) ||
      String(a.match_date ?? '').localeCompare(String(b.match_date ?? '')))

    const newRows = sortStandings(s.data ?? []).map(toRow)
    setRows(newRows)
    setMatches(ms.map(toMatchRow))
    setLoadedFor({ category, season, kolo: k })
    setDirty(false)
    if (!newRows.length && !ms.length)
      setMsg({ ok: false, text: `Nema podataka za ${catLabel(category)}, sezona ${season}${k ? `, ${k}. kolo` : ''}.` })
  }

  function setRowVal(i: number, key: NumKey | 'team', val: string) {
    setRows(rs => rs.map((r, j) => j !== i ? r
      : { ...r, [key]: key === 'team' ? val : Math.max(0, parseInt(val, 10) || 0) }))
    setDirty(true)
  }

  function moveRow(i: number, d: -1 | 1) {
    setRows(rs => {
      const j = i + d
      if (j < 0 || j >= rs.length) return rs
      const c = [...rs]
      const t = c[i]; c[i] = c[j]; c[j] = t
      return c
    })
    setDirty(true)
  }

  function removeRow(i: number) { setRows(rs => rs.filter((_, j) => j !== i)); setDirty(true) }

  function setMatchVal(i: number, key: Exclude<keyof MatchRow, 'uid'>, val: string) {
    setMatches(ms => ms.map((m, j) => (j === i ? { ...m, [key]: val } : m)))
    setDirty(true)
  }

  function removeMatch(i: number) { setMatches(ms => ms.filter((_, j) => j !== i)); setDirty(true) }

  function currentSnapshot(): Snapshot | null {
    if (!loadedFor) return null
    return {
      v: 1, ...loadedFor,
      title: title.trim(), note: note.trim(),
      issued: issued || new Date().toISOString(),
      standings: rows, matches,
    }
  }

  async function save(): Promise<Snapshot | null> {
    const snap = currentSnapshot()
    if (!snap) return null
    if (!snap.title) { setMsg({ ok: false, text: 'Unesi naziv biltena (npr. Bilten br. 3).' }); return null }
    setBusy(true); setMsg(null)
    const payload = { naziv: snap.title, opis: opis.trim() || autoOpis(snap), meta: JSON.stringify(snap) }
    const res = currentId
      ? await supabase.from('bilteni').update(payload).eq('id', currentId).select('id').single()
      : await supabase.from('bilteni').insert([payload]).select('id').single()
    setBusy(false)
    if (res.error) { setMsg({ ok: false, text: explainError(res.error) }); return null }
    const wasUpdate = !!currentId
    setCurrentId(res.data.id)
    setIssued(snap.issued)
    setDirty(false)
    setMsg({ ok: true, text: wasUpdate ? '✓ Izmene su sačuvane i vide se na sajtu.' : '✓ Bilten je sačuvan i objavljen na sajtu.' })
    fetchBilteni()
    return snap
  }

  // Štampa: bilten se renderuje direktno u <body> (van admin panela), pa ga
  // print CSS može prikazati dok je sve ostalo sakriveno.
  async function printSnapshot(snap: Snapshot) {
    flushSync(() => setPrintSnap(snap))
    await logoReady()
    const prevTitle = document.title
    document.title = pdfName(snap)
    const restore = () => {
      document.title = prevTitle
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
  }

  async function saveAndPrint() {
    const snap = await save()
    if (snap) await printSnapshot(snap)
  }

  /* ── arhiva ── */

  function openForEdit(b: any) {
    const snap = parseSnapshot(b.meta)
    if (!snap) return
    if (genOpen && dirty && b.id !== currentId && !confirm('Imaš nesačuvane izmene u biltenu. Odbaciti ih?')) return
    const sel = { category: snap.category, season: snap.season, kolo: snap.kolo ?? '' }
    setCategory(sel.category); setSeason(sel.season); setKolo(sel.kolo)
    setLoadedFor(sel)
    setRows(snap.standings.map(r => ({ ...r, uid: r.uid || uid() })))
    setMatches(snap.matches.map(m => ({ ...m, uid: m.uid || uid() })))
    setTitle(snap.title || b.naziv || '')
    setOpis(b.opis ?? '')
    setNote(snap.note ?? '')
    setIssued(snap.issued || b.created_at || '')
    setCurrentId(b.id); setDirty(false); setMsg(null)
    setUpOpen(false); setGenOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function del(b: any) {
    if (!confirm(`Obrisati bilten "${b.naziv}"? Nestaće i sa sajta.`)) return
    const { error } = await supabase.from('bilteni').delete().eq('id', b.id)
    if (error) { alert('Greška pri brisanju: ' + error.message); return }
    if (b.pdf_url) {
      try {
        const path = String(b.pdf_url).split('/bilteni/').pop()
        if (path) await supabase.storage.from('bilteni').remove([path])
      } catch {}
    }
    if (b.id === currentId) setCurrentId(null)
    fetchBilteni()
  }

  /* ── upload gotovog PDF-a ── */

  async function uploadPdf(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Izaberi PDF fajl.'); return
    }
    setUploading(true)
    const path = `${Date.now()}.pdf`
    const { error } = await supabase.storage.from('bilteni').upload(path, file, { upsert: false, contentType: 'application/pdf' })
    if (error) { alert('Greška pri uploadu: ' + error.message); setUploading(false); return }
    const { data } = supabase.storage.from('bilteni').getPublicUrl(path)
    setUpForm(f => ({ ...f, pdf_url: data.publicUrl }))
    setUploading(false)
  }

  async function addUploaded(e: FormEvent) {
    e.preventDefault()
    if (!upForm.pdf_url) { alert('Molimo uploadujte PDF fajl.'); return }
    setBusy(true)
    const { error } = await supabase.from('bilteni').insert([upForm])
    setBusy(false)
    if (error) { alert('Greška pri čuvanju: ' + error.message); return }
    setUpForm({ naziv: '', opis: '', pdf_url: '' }); setUpOpen(false); fetchBilteni()
  }

  /* ── render ── */

  const stale = !!loadedFor &&
    (loadedFor.category !== category || loadedFor.season !== season || loadedFor.kolo !== kolo.trim())

  const cellNum = 'w-14 bg-[#003f8a]/40 border border-white/10 rounded text-center text-white text-xs px-1 py-1 focus:outline-none focus:border-[#f5c518]'
  const cellText = 'w-full min-w-[140px] bg-[#003f8a]/40 border border-white/10 rounded text-white text-xs px-2 py-1 focus:outline-none focus:border-[#f5c518]'
  const iconBtn = 'p-1 rounded text-blue-400 hover:text-[#f5c518] hover:bg-white/5 disabled:opacity-25 disabled:pointer-events-none'
  const pdfBtn = 'flex items-center gap-1.5 bg-[#f5c518]/10 hover:bg-[#f5c518]/20 border border-[#f5c518]/30 text-[#f5c518] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors'

  return (
    <div>
      {/* Naslov */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h2 className="font-display text-4xl text-white tracking-wider">BILTENI</h2>
        {!isReviewer && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={newBilten} className="btn-yellow">
              <Plus className="w-4 h-4" /> KREIRAJ BILTEN
            </button>
            <button onClick={() => { setUpOpen(v => !v) }} className="btn-ghost">
              <Upload className="w-4 h-4" /> Dodaj gotov PDF
            </button>
          </div>
        )}
      </div>

      {/* Upload gotovog PDF-a */}
      {upOpen && !isReviewer && (
        <form onSubmit={addUploaded} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-xl text-[#f5c518] tracking-wider">DODAJ GOTOV PDF</h3>
            <button type="button" onClick={() => setUpOpen(false)} className="text-blue-400 hover:text-white p-1" title="Zatvori">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-blue-400 mb-4">PDF dodat ovde prikazuje se i na javnoj stranici /bilteni.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Naziv *</label>
              <input className="field-input" placeholder="Bilten br. 1 — Seniori" required
                value={upForm.naziv} onChange={e => setUpForm({ ...upForm, naziv: e.target.value })} />
            </div>
            <div>
              <label className="label">Opis (opciono)</label>
              <input className="field-input" placeholder="Kratki opis..."
                value={upForm.opis} onChange={e => setUpForm({ ...upForm, opis: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">PDF fajl *</label>
              <input type="file" accept="application/pdf,.pdf" className="field-input cursor-pointer"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf(f) }} />
              {uploading && <p className="text-xs text-blue-400 mt-1 animate-pulse">Uploadovanje...</p>}
              {upForm.pdf_url && !uploading && <p className="text-xs text-green-400 mt-1">✓ PDF uspešno uploadovan</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={busy || uploading} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="button" onClick={() => setUpOpen(false)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      {/* Generator */}
      {genOpen && !isReviewer && (
        <div className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-[#f5c518] tracking-wider">
              {currentId ? 'IZMENA BILTENA' : 'NOVI BILTEN'}
            </h3>
            <button onClick={closeGen} className="text-blue-400 hover:text-white p-1" title="Zatvori">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Kategorija</label>
              <select className="field-input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sezona</label>
              <select className="field-input" value={season} onChange={e => setSeason(e.target.value)}>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Kolo (prazno = sva kola)</label>
              <input type="number" min="1" className="field-input" placeholder="npr. 3"
                value={kolo} onChange={e => setKolo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button onClick={loadData} disabled={loadingData} className="btn-yellow w-full justify-center">
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                {loadingData ? 'UČITAVANJE...' : 'UČITAJ PODATKE'}
              </button>
            </div>
          </div>

          {stale && (
            <p className="mt-3 text-xs text-amber-300">
              Promenio si kategoriju, sezonu ili kolo — klikni UČITAJ PODATKE da bi bilten dobio nove podatke.
            </p>
          )}

          {loadedFor && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="label">Naziv biltena *</label>
                  <input className="field-input" placeholder="npr. Bilten br. 3"
                    value={title} onChange={e => { setTitle(e.target.value); setDirty(true) }} />
                </div>
                <div>
                  <label className="label">Opis (opciono)</label>
                  <input className="field-input" placeholder={autoOpis(loadedFor)}
                    value={opis} onChange={e => { setOpis(e.target.value); setDirty(true) }} />
                </div>
              </div>

              {/* Tabela */}
              <h4 className="font-display text-lg text-[#f5c518] tracking-wider">
                {catLabel(loadedFor.category).toUpperCase()} — TABELA
              </h4>
              <p className="text-xs text-blue-400 mb-2">
                Brojeve i nazive možeš da ispraviš. Strelicama menjaš redosled — pozicija se računa po redu.
              </p>
              <div className="overflow-x-auto mb-6 rounded-xl border border-white/10">
                <table className="w-full min-w-[980px] text-xs">
                  <thead>
                    <tr className="bg-[#002d63]/80">
                      <th className="px-2 py-2 text-blue-300 font-bold text-center w-10">Poz</th>
                      <th className="px-2 py-2 text-blue-300 font-bold text-left">Naziv kluba</th>
                      {COLS.map(c => (
                        <th key={c.label} className="px-1 py-2 text-blue-300 font-bold text-center whitespace-nowrap">{c.label}</th>
                      ))}
                      <th className="w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr><td colSpan={13} className="px-4 py-6 text-center text-blue-500">Nema timova u tabeli za ovu kategoriju i sezonu.</td></tr>
                    )}
                    {rows.map((r, i) => (
                      <tr key={r.uid} className="border-t border-white/5">
                        <td className="px-2 py-1.5 text-center font-display text-base text-[#f5c518]">{i + 1}</td>
                        <td className="px-1 py-1">
                          <input className={cellText} value={r.team} onChange={e => setRowVal(i, 'team', e.target.value)} />
                        </td>
                        {COLS.map(c => (
                          <td key={c.label} className="px-1 py-1 text-center">
                            {c.kind === 'num'
                              ? <input type="number" min="0" className={cellNum} value={r[c.key]}
                                  onChange={e => setRowVal(i, c.key, e.target.value)} />
                              : <span className="text-blue-300 whitespace-nowrap">{koef(r[c.plus], r[c.minus])}</span>}
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => moveRow(i, -1)} disabled={i === 0} className={iconBtn} title="Pomeri gore">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1} className={iconBtn} title="Pomeri dole">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => removeRow(i)} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-white/5" title="Izbaci iz biltena">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rezultati */}
              <h4 className="font-display text-lg text-[#f5c518] tracking-wider mb-2">
                REZULTATI — {loadedFor.kolo ? `${loadedFor.kolo}. KOLO` : 'SVA KOLA'}
              </h4>
              <div className="overflow-x-auto mb-6 rounded-xl border border-white/10">
                <table className="w-full min-w-[720px] text-xs">
                  <thead>
                    <tr className="bg-[#002d63]/80">
                      {['Kolo', 'Datum', 'Domaćin', 'Rezultat', 'Gost', ''].map(h => (
                        <th key={h} className="px-2 py-2 text-blue-300 font-bold text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-blue-500">Nema završenih utakmica — rezultati se neće štampati.</td></tr>
                    )}
                    {matches.map((m, i) => (
                      <tr key={m.uid} className="border-t border-white/5">
                        <td className="px-1 py-1">
                          <input className={`${cellNum} !w-12`} value={m.round} onChange={e => setMatchVal(i, 'round', e.target.value)} />
                        </td>
                        <td className="px-1 py-1">
                          <input type="date" className={`${cellText} !min-w-[130px]`} value={m.date} onChange={e => setMatchVal(i, 'date', e.target.value)} />
                        </td>
                        <td className="px-1 py-1">
                          <input className={cellText} value={m.home} onChange={e => setMatchVal(i, 'home', e.target.value)} />
                        </td>
                        <td className="px-1 py-1">
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min="0" max="3" className={`${cellNum} !w-11`} value={m.home_sets}
                              onChange={e => setMatchVal(i, 'home_sets', e.target.value)} />
                            <span className="text-[#f5c518] font-bold">:</span>
                            <input type="number" min="0" max="3" className={`${cellNum} !w-11`} value={m.away_sets}
                              onChange={e => setMatchVal(i, 'away_sets', e.target.value)} />
                          </div>
                        </td>
                        <td className="px-1 py-1">
                          <input className={cellText} value={m.away} onChange={e => setMatchVal(i, 'away', e.target.value)} />
                        </td>
                        <td className="px-1 py-1 text-right">
                          <button onClick={() => removeMatch(i)} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-white/5" title="Izbaci iz biltena">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <label className="label">Napomena (opciono — štampa se na dnu biltena)</label>
                <textarea className="field-input min-h-[80px]" rows={3}
                  placeholder="npr. odluke takmičarske komisije, odložene utakmice..."
                  value={note} onChange={e => { setNote(e.target.value); setDirty(true) }} />
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={saveAndPrint} disabled={busy} className="btn-yellow">
                  <Printer className="w-4 h-4" /> {busy ? 'ČUVANJE...' : 'SAČUVAJ I PREUZMI PDF'}
                </button>
                <button onClick={() => { save() }} disabled={busy} className="btn-ghost">
                  <Save className="w-4 h-4" /> Samo sačuvaj
                </button>
                <button onClick={closeGen} className="btn-ghost">
                  <X className="w-4 h-4" /> Zatvori
                </button>
              </div>
              <p className="text-[11px] text-blue-500 mt-3">
                Sačuvan bilten se odmah vidi i na sajtu (/bilteni). U prozoru za štampu izaberi „Sačuvaj kao PDF“.
              </p>
            </div>
          )}

          {msg && (
            <div className={`mt-4 text-sm rounded-lg px-3 py-2 border ${msg.ok
              ? 'text-green-300 border-green-500/30 bg-green-500/10'
              : 'text-red-300 border-red-500/30 bg-red-500/10'}`}>
              {msg.text}
            </div>
          )}
        </div>
      )}

      {/* Arhiva */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="bg-[#002d63]/60 px-6 py-4 border-b border-white/10">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider">ARHIVA BILTENA</h3>
          <p className="text-xs text-blue-400 mt-0.5">
            Svi bilteni sa ove liste vide se i na sajtu, na stranici /bilteni.
          </p>
        </div>
        {loading ? (
          <p className="px-6 py-10 text-center text-blue-400 text-sm animate-pulse">Učitavanje...</p>
        ) : (
          <div className="divide-y divide-white/5">
            {listError && <p className="px-6 py-4 text-sm text-red-300">Greška: {listError}</p>}
            {!listError && bilteni.length === 0 && (
              <p className="px-6 py-10 text-center text-blue-500 text-sm">Još nema biltena.</p>
            )}
            {bilteni.map((b: any) => {
              const snap = parseSnapshot(b.meta)
              return (
                <div key={b.id}
                  className={`px-6 py-4 flex items-center justify-between gap-4 ${genOpen && b.id === currentId ? 'bg-[#f5c518]/5' : ''}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${snap
                      ? 'bg-[#003f8a]/60 border-[#003f8a]' : 'bg-red-900/40 border-red-700/40'}`}>
                      <FileText className={`w-5 h-5 ${snap ? 'text-[#f5c518]' : 'text-red-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{b.naziv}</div>
                      {b.opis && <div className="text-blue-400 text-xs mt-0.5 truncate">{b.opis}</div>}
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded ${snap ? 'bg-[#003f8a]/50 text-blue-200' : 'bg-red-900/40 text-red-300'}`}>
                          {snap ? 'GENERISAN' : b.pdf_url ? 'UPLOAD PDF' : 'BEZ SADRŽAJA'}
                        </span>
                        <span className="text-blue-500">{fmtIssued(snap?.issued || b.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {snap && (
                      <button onClick={() => printSnapshot({ ...snap, issued: snap.issued || b.created_at })}
                        className={pdfBtn} title="Preuzmi PDF">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    )}
                    {!snap && b.pdf_url && (
                      <a href={b.pdf_url} target="_blank" rel="noopener noreferrer" className={pdfBtn} title="Otvori PDF">
                        <Download className="w-4 h-4" /> PDF
                      </a>
                    )}
                    {snap && (
                      <a href={`/bilteni/${b.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-[#f5c518] p-1.5 transition-colors" title="Otvori na sajtu">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {snap && !isReviewer && (
                      <button onClick={() => openForEdit(b)} className="text-blue-400 hover:text-[#f5c518] p-1.5 transition-colors" title="Izmeni">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {!isReviewer && (
                      <button onClick={() => del(b)} className="text-red-400 hover:text-red-300 p-1.5 transition-colors" title="Obriši">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bilten za štampu — direktno u <body>, vidljiv samo pri štampi */}
      {mounted && printSnap && createPortal(
        <div id="bilten-print-root">
          <style dangerouslySetInnerHTML={{ __html: ADMIN_PRINT_CSS + BILTEN_DOC_CSS }} />
          <BiltenDocument snap={printSnap} />
        </div>,
        document.body,
      )}
    </div>
  )
}

// Pri štampi iz admin panela sakrij sve osim biltena
const ADMIN_PRINT_CSS = `
#bilten-print-root { display: none; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body {
    background: #fff !important; margin: 0 !important; padding: 0 !important;
    height: auto !important; min-height: 0 !important; overflow: visible !important;
  }
  body > *:not(#bilten-print-root) { display: none !important; }
  #bilten-print-root { display: block !important; }
}
`
