'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { SEASONS } from '@/lib/types'
import {
  ArrowDown, ArrowUp, ChevronDown, Download, Edit2, ExternalLink, FileText, Plus, Printer, RefreshCw, Save, Trash2, Upload, X,
} from 'lucide-react'
import {
  BiltenDocument, BILTEN_DOC_CSS, COLS, LOGO_SRC,
  catLabel, fmtIssued, fmtPeriod, koef, parseSnapshot, pdfName,
  type MatchKey, type MatchRow, type NumKey, type Row, type Section, type Selection, type Snapshot,
} from '@/components/bilten/BiltenDocument'
import KategorijeIzbor, { poRedu } from './KategorijeIzbor'
import { compareStandings } from '@/lib/standings'
import { formatSetova } from '@/lib/setovi'

/* ══════════════════════════════════════════
   POMOĆNE FUNKCIJE (samo za admin)
══════════════════════════════════════════ */

let seq = 0
const uid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`

// Poslednji izbor kategorija se pamti u browseru (bilten se obično pravi za iste kategorije)
const KAT_KEY = 'mosl-bilten-kategorije'

const pad = (n: number) => String(n).padStart(2, '0')
const isoDan = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const reciKategorija = (n: number) => (n >= 2 && n <= 4 ? 'kategorije' : 'kategorija')

// Opis biltena u listi, npr. "Seniori, Kadeti — Sezona 2026/2027 — 01.11.–07.11.2026."
const autoOpis = (s: Selection) => [
  s.categories.length <= 3 ? s.categories.map(catLabel).join(', ') : `${s.categories.length} ${reciKategorija(s.categories.length)}`,
  `Sezona ${s.season}`,
  s.kolo ? `${s.kolo}. kolo` : '',
  fmtPeriod(s.dateFrom, s.dateTo),
].filter(Boolean).join(' — ')

// Ključ izbora — kad se razlikuje od učitanog, podaci u editoru su zastareli
const selKey = (s: Selection, saPraznim: boolean) =>
  JSON.stringify([poRedu(s.categories), s.season, s.kolo.trim(), s.dateFrom, s.dateTo, saPraznim])

// Isti redosled kao u TABELA: pobede → bodovi → set koef → poen koef
const sortStandings = (list: any[]) =>
  [...list].sort((a, b) => compareStandings(a, b) || (a.position ?? 999) - (b.position ?? 999))

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
  sets: formatSetova(m.set_scores),
})

const poKoluIDatumu = (a: any, b: any) =>
  (Number(a.round) || 0) - (Number(b.round) || 0) ||
  String(a.match_date ?? '').localeCompare(String(b.match_date ?? '')) ||
  String(a.match_time ?? '').localeCompare(String(b.match_time ?? ''))

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

type Msg = { kind: 'ok' | 'err' | 'info'; text: string }

/* ══════════════════════════════════════════
   BILTENI TAB
══════════════════════════════════════════ */

export default function BilteniTab({ supabase, isReviewer, aktivnaSezona }: any) {
  // Arhiva
  const [bilteni, setBilteni] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  // Generator — izbor
  const [genOpen, setGenOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [season, setSeason] = useState<string>(aktivnaSezona || SEASONS[0])
  const [kolo, setKolo] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [saPraznim, setSaPraznim] = useState(false)

  // Generator — učitani podaci
  const [loadedFor, setLoadedFor] = useState<Selection | null>(null)
  const [loadedKey, setLoadedKey] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [otvorene, setOtvorene] = useState<Record<string, boolean>>({})
  const [newPage, setNewPage] = useState(false)
  const [title, setTitle] = useState('')
  const [opis, setOpis] = useState('')
  const [note, setNote] = useState('')
  const [issued, setIssued] = useState('')
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

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
    try {
      const v = JSON.parse(localStorage.getItem(KAT_KEY) || '[]')
      if (Array.isArray(v)) setCategories(poRedu(v.filter((x: unknown) => typeof x === 'string')))
    } catch {}
  }, [])
  useEffect(() => { fetchBilteni() }, [])
  useEffect(() => { if (aktivnaSezona && !loadedFor) setSeason(aktivnaSezona) }, [aktivnaSezona])

  async function fetchBilteni() {
    const { data, error } = await supabase.from('bilteni').select('*').order('created_at', { ascending: false })
    setListError(error ? error.message : '')
    setBilteni(data ?? [])
    setLoading(false)
  }

  /* ── generator: izbor ── */

  function changeCategories(v: string[]) {
    setCategories(v)
    try { localStorage.setItem(KAT_KEY, JSON.stringify(v)) } catch {}
  }

  // "7 dana": od izabranog datuma Od sedam dana unapred; bez Od — poslednjih 7 dana (do danas)
  function sedamDana() {
    if (dateFrom) {
      const d = new Date(`${dateFrom}T00:00:00`)
      d.setDate(d.getDate() + 6)
      setDateTo(isoDan(d))
    } else {
      const danas = new Date()
      const od = new Date()
      od.setDate(danas.getDate() - 6)
      setDateFrom(isoDan(od)); setDateTo(isoDan(danas))
    }
  }

  function resetEditor() {
    setSections([]); setLoadedFor(null); setLoadedKey(''); setOtvorene({}); setNewPage(false)
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
    if (!categories.length) { setMsg({ kind: 'err', text: 'Označi bar jednu kategoriju.' }); return }
    if (dateFrom && dateTo && dateFrom > dateTo) { setMsg({ kind: 'err', text: 'Datum „Od“ je posle datuma „Do“.' }); return }
    if (dirty && !confirm('Učitavanje iz baze zameniće podatke koje si ručno izmenio. Nastaviti?')) return
    setLoadingData(true); setMsg(null)
    const k = kolo.trim()
    const cats = poRedu(categories)

    // Utakmice se učitavaju posebno za svaku kategoriju (bez rizika od limita od 1000 redova)
    const utakmice = (c: string) => {
      let q = supabase.from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)')
        .eq('category', c).eq('season', season).eq('status', 'finished')
      if (dateFrom) q = q.gte('match_date', dateFrom)
      if (dateTo) q = q.lte('match_date', dateTo)
      return q.order('match_date', { ascending: true })
    }
    const [s, ...ms] = await Promise.all([
      supabase.from('standings').select('*, team:teams(name)').eq('season', season).in('category', cats),
      ...cats.map(utakmice),
    ])
    setLoadingData(false)
    const err = s.error ?? ms.find((r: any) => r.error)?.error
    if (err) { setMsg({ kind: 'err', text: 'Greška pri učitavanju: ' + err.message }); return }

    const filtrirano = !!(k || dateFrom || dateTo)
    const secs: Section[] = []
    const preskocene: string[] = []
    cats.forEach((c, i) => {
      const st = (s.data ?? []).filter((x: any) => x.category === c)
      let mm: any[] = ms[i].data ?? []
      if (k) mm = mm.filter(x => String(x.round ?? '').trim() === k)
      mm = [...mm].sort(poKoluIDatumu)
      if ((!st.length && !mm.length) || (filtrirano && !mm.length && !saPraznim)) {
        preskocene.push(catLabel(c))
        return
      }
      secs.push({ uid: uid(), category: c, standings: sortStandings(st).map(toRow), matches: mm.map(toMatchRow) })
    })

    const sel: Selection = { categories: cats, season, kolo: k, dateFrom, dateTo }
    setSections(secs)
    setOtvorene({})
    setLoadedFor(sel)
    setLoadedKey(selKey(sel, saPraznim))
    setDirty(false)
    const filter = [k ? `${k}. kolo` : '', fmtPeriod(dateFrom, dateTo)].filter(Boolean).join(', ')
    if (!secs.length)
      setMsg({ kind: 'err', text: `Nema podataka za izabrane kategorije (sezona ${season}${filter ? `, ${filter}` : ''}).` })
    else if (preskocene.length)
      setMsg({ kind: 'info', text: `Preskočeno (${filtrirano ? 'nema utakmica u izabranom kolu/periodu' : 'nema podataka'}): ${preskocene.join(', ')}.` })
  }

  /* ── generator: izmene po kategorijama ── */

  function updSection(si: number, fn: (s: Section) => Section) {
    setSections(ss => ss.map((s, j) => (j === si ? fn(s) : s)))
    setDirty(true)
  }

  function setRowVal(si: number, i: number, key: NumKey | 'team', val: string) {
    updSection(si, s => ({
      ...s,
      standings: s.standings.map((r, j) => j !== i ? r
        : { ...r, [key]: key === 'team' ? val : Math.max(0, parseInt(val, 10) || 0) }),
    }))
  }

  function moveRow(si: number, i: number, d: -1 | 1) {
    updSection(si, s => {
      const j = i + d
      if (j < 0 || j >= s.standings.length) return s
      const c = [...s.standings]
      const t = c[i]; c[i] = c[j]; c[j] = t
      return { ...s, standings: c }
    })
  }

  function removeRow(si: number, i: number) {
    updSection(si, s => ({ ...s, standings: s.standings.filter((_, j) => j !== i) }))
  }

  function setMatchVal(si: number, i: number, key: MatchKey, val: string) {
    updSection(si, s => ({ ...s, matches: s.matches.map((m, j) => (j === i ? { ...m, [key]: val } : m)) }))
  }

  function removeMatch(si: number, i: number) {
    updSection(si, s => ({ ...s, matches: s.matches.filter((_, j) => j !== i) }))
  }

  function moveSection(si: number, d: -1 | 1) {
    setSections(ss => {
      const j = si + d
      if (j < 0 || j >= ss.length) return ss
      const c = [...ss]
      const t = c[si]; c[si] = c[j]; c[j] = t
      return c
    })
    setDirty(true)
  }

  function removeSection(si: number) {
    const sec = sections[si]
    if (!sec || !confirm(`Izbaciti kategoriju ${catLabel(sec.category)} iz biltena?`)) return
    setSections(ss => ss.filter((_, j) => j !== si))
    setDirty(true)
  }

  function sveOtvorene(v: boolean) {
    setOtvorene(Object.fromEntries(sections.map(s => [s.uid, v])))
  }

  /* ── čuvanje i štampa ── */

  function currentSnapshot(): Snapshot | null {
    if (!loadedFor) return null
    return {
      v: 2,
      season: loadedFor.season, kolo: loadedFor.kolo,
      dateFrom: loadedFor.dateFrom, dateTo: loadedFor.dateTo,
      title: title.trim(), note: note.trim(),
      issued: issued || new Date().toISOString(),
      newPage: newPage && sections.length > 1,
      sections,
    }
  }

  async function save(): Promise<Snapshot | null> {
    const snap = currentSnapshot()
    if (!snap || !loadedFor) return null
    if (!snap.title) { setMsg({ kind: 'err', text: 'Unesi naziv biltena (npr. Bilten br. 3).' }); return null }
    if (!snap.sections.length) { setMsg({ kind: 'err', text: 'Bilten nema nijednu kategoriju — učitaj podatke ponovo.' }); return null }
    setBusy(true); setMsg(null)
    const opisAuto = autoOpis({ ...loadedFor, categories: snap.sections.map(s => s.category) })
    const payload = { naziv: snap.title, opis: opis.trim() || opisAuto, meta: JSON.stringify(snap) }
    const res = currentId
      ? await supabase.from('bilteni').update(payload).eq('id', currentId).select('id').single()
      : await supabase.from('bilteni').insert([payload]).select('id').single()
    setBusy(false)
    if (res.error) { setMsg({ kind: 'err', text: explainError(res.error) }); return null }
    const wasUpdate = !!currentId
    setCurrentId(res.data.id)
    setIssued(snap.issued)
    setDirty(false)
    setMsg({ kind: 'ok', text: wasUpdate ? '✓ Izmene su sačuvane i vide se na sajtu.' : '✓ Bilten je sačuvan i objavljen na sajtu.' })
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
    const cats = poRedu(Array.from(new Set(snap.sections.map(s => s.category).filter(Boolean))))
    const sel: Selection = {
      categories: cats, season: snap.season || season,
      kolo: snap.kolo, dateFrom: snap.dateFrom, dateTo: snap.dateTo,
    }
    setCategories(cats); setSeason(sel.season); setKolo(sel.kolo)
    setDateFrom(sel.dateFrom); setDateTo(sel.dateTo); setSaPraznim(false)
    setLoadedFor(sel); setLoadedKey(selKey(sel, false))
    setSections(snap.sections.map(s => ({
      ...s,
      uid: s.uid || uid(),
      standings: s.standings.map(r => ({ ...r, uid: r.uid || uid() })),
      matches: s.matches.map(m => ({ ...m, uid: m.uid || uid(), sets: m.sets ?? '' })),
    })))
    setOtvorene({})
    setNewPage(snap.newPage)
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

  const filterAktivan = !!(kolo.trim() || dateFrom || dateTo)
  const stale = !!loadedFor && loadedKey !== selKey({ categories, season, kolo, dateFrom, dateTo }, saPraznim)
  const naslovRezultata = loadedFor
    ? (loadedFor.kolo ? `${loadedFor.kolo}. KOLO` : fmtPeriod(loadedFor.dateFrom, loadedFor.dateTo) || 'SVA KOLA')
    : ''

  const cellNum = 'w-14 bg-[#003f8a]/40 border border-white/10 rounded text-center text-white text-xs px-1 py-1 focus:outline-none focus:border-[#f5c518]'
  const cellText = 'w-full min-w-[140px] bg-[#003f8a]/40 border border-white/10 rounded text-white text-xs px-2 py-1 focus:outline-none focus:border-[#f5c518]'
  const iconBtn = 'p-1 rounded text-blue-400 hover:text-[#f5c518] hover:bg-white/5 disabled:opacity-25 disabled:pointer-events-none'
  const pdfBtn = 'flex items-center gap-1.5 bg-[#f5c518]/10 hover:bg-[#f5c518]/20 border border-[#f5c518]/30 text-[#f5c518] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors'
  const msgCls = {
    ok: 'text-green-300 border-green-500/30 bg-green-500/10',
    err: 'text-red-300 border-red-500/30 bg-red-500/10',
    info: 'text-blue-200 border-blue-400/30 bg-blue-400/10',
  }

  function renderSection(sec: Section, si: number) {
    const otvorena = otvorene[sec.uid] ?? sections.length <= 2
    return (
      <div key={sec.uid} className="mb-4 rounded-xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#002d63]/70">
          <button type="button" onClick={() => setOtvorene(o => ({ ...o, [sec.uid]: !otvorena }))}
            className="flex items-center gap-2 min-w-0 text-left" title={otvorena ? 'Sakrij' : 'Prikaži i uredi'}>
            <ChevronDown className={`w-4 h-4 shrink-0 text-blue-300 transition-transform ${otvorena ? '' : '-rotate-90'}`} />
            <span className="font-display text-lg text-[#f5c518] tracking-wider truncate">{catLabel(sec.category).toUpperCase()}</span>
            <span className="text-xs text-blue-400 whitespace-nowrap">Tabela: {sec.standings.length} · Rezultati: {sec.matches.length}</span>
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => moveSection(si, -1)} disabled={si === 0} className={iconBtn} title="Pomeri kategoriju gore">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1} className={iconBtn} title="Pomeri kategoriju dole">
              <ArrowDown className="w-4 h-4" />
            </button>
            <button onClick={() => removeSection(si)} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-white/5" title="Izbaci kategoriju iz biltena">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {otvorena && (
          <div className="p-3">
            {/* Tabela */}
            <h4 className="font-display text-base text-[#f5c518] tracking-wider">TABELA</h4>
            <p className="text-xs text-blue-400 mb-2">
              Brojeve i nazive možeš da ispraviš. Strelicama menjaš redosled — pozicija se računa po redu.
            </p>
            <div className="overflow-x-auto mb-5 rounded-xl border border-white/10">
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
                  {sec.standings.length === 0 && (
                    <tr><td colSpan={13} className="px-4 py-6 text-center text-blue-500">Nema timova u tabeli za ovu kategoriju i sezonu.</td></tr>
                  )}
                  {sec.standings.map((r, i) => (
                    <tr key={r.uid} className="border-t border-white/5">
                      <td className="px-2 py-1.5 text-center font-display text-base text-[#f5c518]">{i + 1}</td>
                      <td className="px-1 py-1">
                        <input className={cellText} value={r.team} onChange={e => setRowVal(si, i, 'team', e.target.value)} />
                      </td>
                      {COLS.map(c => (
                        <td key={c.label} className="px-1 py-1 text-center">
                          {c.kind === 'num'
                            ? <input type="number" min="0" className={cellNum} value={r[c.key]}
                                onChange={e => setRowVal(si, i, c.key, e.target.value)} />
                            : <span className="text-blue-300 whitespace-nowrap">{koef(r[c.plus], r[c.minus])}</span>}
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => moveRow(si, i, -1)} disabled={i === 0} className={iconBtn} title="Pomeri gore">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveRow(si, i, 1)} disabled={i === sec.standings.length - 1} className={iconBtn} title="Pomeri dole">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeRow(si, i)} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-white/5" title="Izbaci iz biltena">
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
            <h4 className="font-display text-base text-[#f5c518] tracking-wider mb-2">REZULTATI — {naslovRezultata}</h4>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[900px] text-xs">
                <thead>
                  <tr className="bg-[#002d63]/80">
                    {['Kolo', 'Datum', 'Domaćin', 'Rezultat', 'Gost', 'Po setovima', ''].map(h => (
                      <th key={h} className="px-2 py-2 text-blue-300 font-bold text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sec.matches.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-blue-500">Nema završenih utakmica — rezultati se neće štampati.</td></tr>
                  )}
                  {sec.matches.map((m, i) => (
                    <tr key={m.uid} className="border-t border-white/5">
                      <td className="px-1 py-1">
                        <input className={`${cellNum} !w-12`} value={m.round} onChange={e => setMatchVal(si, i, 'round', e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <input type="date" className={`${cellText} !min-w-[130px]`} value={m.date} onChange={e => setMatchVal(si, i, 'date', e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <input className={cellText} value={m.home} onChange={e => setMatchVal(si, i, 'home', e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" min="0" max="3" className={`${cellNum} !w-11`} value={m.home_sets}
                            onChange={e => setMatchVal(si, i, 'home_sets', e.target.value)} />
                          <span className="text-[#f5c518] font-bold">:</span>
                          <input type="number" min="0" max="3" className={`${cellNum} !w-11`} value={m.away_sets}
                            onChange={e => setMatchVal(si, i, 'away_sets', e.target.value)} />
                        </div>
                      </td>
                      <td className="px-1 py-1">
                        <input className={cellText} value={m.away} onChange={e => setMatchVal(si, i, 'away', e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <input className={`${cellText} !min-w-[170px]`} placeholder="nije upisano" value={m.sets ?? ''}
                          onChange={e => setMatchVal(si, i, 'sets', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 text-right">
                        <button onClick={() => removeMatch(si, i)} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-white/5" title="Izbaci iz biltena">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

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

          {/* 1. Kategorije */}
          <div className="mb-5">
            <label className="label">Kategorije u biltenu *</label>
            <KategorijeIzbor value={categories} onChange={changeCategories} />
          </div>

          {/* 2. Sezona, kolo, period */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="sm:col-span-2">
              <label className="label">Odigrano od – do (prazno = cela sezona)</label>
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" className="field-input !w-auto flex-1 min-w-[150px]" value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)} aria-label="Od datuma" />
                <span className="text-blue-400">–</span>
                <input type="date" className="field-input !w-auto flex-1 min-w-[150px]" value={dateTo}
                  onChange={e => setDateTo(e.target.value)} aria-label="Do datuma" />
                <button type="button" onClick={sedamDana} className="btn-ghost !px-3 !py-2 !text-xs"
                  title="Od izabranog datuma 7 dana unapred (bez datuma Od: poslednjih 7 dana)">
                  7 dana
                </button>
                {(dateFrom || dateTo) && (
                  <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }}
                    className="text-xs text-blue-400 hover:text-red-300 px-1">Očisti</button>
                )}
              </div>
            </div>
          </div>

          {filterAktivan && (
            <label className="mt-4 flex items-center gap-2 text-sm text-blue-300 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 accent-[#f5c518]" checked={saPraznim}
                onChange={e => setSaPraznim(e.target.checked)} />
              Uključi i kategorije bez utakmica u izabranom kolu/periodu (samo tabela)
            </label>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button onClick={loadData} disabled={loadingData || !categories.length} className="btn-yellow">
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              {loadingData ? 'UČITAVANJE...' : 'UČITAJ PODATKE'}
            </button>
            {!categories.length && <span className="text-xs text-blue-400">Označi bar jednu kategoriju.</span>}
          </div>

          {stale && (
            <p className="mt-3 text-xs text-amber-300">
              Promenio si kategorije, sezonu, kolo ili period — klikni UČITAJ PODATKE da bi bilten dobio nove podatke.
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
                  <input className="field-input"
                    placeholder={autoOpis({ ...loadedFor, categories: sections.map(s => s.category) })}
                    value={opis} onChange={e => { setOpis(e.target.value); setDirty(true) }} />
                </div>
              </div>

              {/* Kategorije: tabela + rezultati */}
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <p className="text-xs text-blue-400">
                  Kategorija u biltenu: <b className="text-white">{sections.length}</b>. Klikni na naziv da otvoriš tabelu i rezultate.
                </p>
                {sections.length > 1 && (
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => sveOtvorene(true)} className="text-blue-400 hover:text-[#f5c518]">Otvori sve</button>
                    <button onClick={() => sveOtvorene(false)} className="text-blue-400 hover:text-[#f5c518]">Zatvori sve</button>
                  </div>
                )}
              </div>
              {sections.map(renderSection)}

              {sections.length > 1 && (
                <label className="mb-5 flex items-center gap-2 text-sm text-blue-300 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 accent-[#f5c518]" checked={newPage}
                    onChange={e => { setNewPage(e.target.checked); setDirty(true) }} />
                  Svaka kategorija počinje na novoj strani
                </label>
              )}

              <div className="mb-6">
                <label className="label">Napomena (opciono — štampa se na dnu biltena)</label>
                <textarea className="field-input min-h-[80px]" rows={3}
                  placeholder="npr. odluke takmičarske komisije, odložene utakmice..."
                  value={note} onChange={e => { setNote(e.target.value); setDirty(true) }} />
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={saveAndPrint} disabled={busy || !sections.length} className="btn-yellow">
                  <Printer className="w-4 h-4" /> {busy ? 'ČUVANJE...' : 'SAČUVAJ I PREUZMI PDF'}
                </button>
                <button onClick={() => { save() }} disabled={busy || !sections.length} className="btn-ghost">
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
            <div className={`mt-4 text-sm rounded-lg px-3 py-2 border ${msgCls[msg.kind]}`}>
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
