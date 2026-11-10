'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CATEGORIES, SEASONS } from '@/lib/types'
import { Plus, Trash2, Save, X, Edit2, AlertTriangle } from 'lucide-react'
import KategorijaFilter, { SVE, groupByCategory, katLabel, useKategorija } from './KategorijaFilter'
import SetoviUnos from './SetoviUnos'
import { recalcStandings } from '@/lib/standings'
import {
  PRAZNO_UKUPNO, formatSetova, prazniSetovi, rezultatIzForme, setoviUFormu,
  type SetDraft, type UkupnoForma,
} from '@/lib/setovi'

const PAGE_SIZE = 25

const bezRezultata = (r: { home_sets: number | null; away_sets: number | null; set_scores: unknown }) =>
  !r.set_scores && !r.home_sets && !r.away_sets

// Upis u tabelu matches. Ako u bazi još nema kolone set_scores (SQL nije pokrenut),
// utakmica se ipak sačuva (bez setova) i admin dobija uputstvo.
async function upisiUtakmicu(op: (p: any) => PromiseLike<{ error: any }>, payload: any): Promise<string | null> {
  let { error } = await op(payload)
  if (error && /set_scores/.test(String(error.message ?? ''))) {
    const { set_scores, ...bez } = payload
    ;({ error } = await op(bez))
    if (!error) {
      if (set_scores)
        alert('Utakmica je sačuvana, ali BEZ rezultata po setovima: u bazi još nema kolone set_scores.\n\n' +
          'U Supabase SQL Editoru pokreni:\nALTER TABLE matches ADD COLUMN IF NOT EXISTS set_scores JSONB;')
      return null
    }
  }
  return error ? String(error.message ?? error) : null
}

export default function UtakmiceTab({ matches, teams, supabase, onRefresh, aktivnaSezona, isReviewer }: any) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cat,  setCat]  = useKategorija()
  const [poruka, setPoruka] = useState('')
  const [samoProblemi, setSamoProblemi] = useState(false)

  const blank = {
    home_team_id: '', away_team_id: '', category: 'seniori', season: aktivnaSezona,
    match_date: '', match_time: '', venue: '', status: 'scheduled',
    redni_broj: '', round: '', notes: ''
  }
  const [form, setForm] = useState(blank)
  const [formSets, setFormSets] = useState<SetDraft[]>(prazniSetovi())
  const [formUkupno, setFormUkupno] = useState<UkupnoForma>(PRAZNO_UKUPNO)
  const [dateDay, setDateDay]     = useState('')
  const [dateMonth, setDateMonth] = useState('')
  const [dateYear, setDateYear]   = useState('')
  const [timeHour, setTimeHour]   = useState('')
  const [timeMin, setTimeMin]     = useState('')

  /* ── timovi po kategoriji ── */

  const teamById = useMemo(() => {
    const m = new Map<string, any>()
    ;(teams ?? []).forEach((t: any) => m.set(t.id, t))
    return m
  }, [teams])

  // Za utakmicu se biraju samo timovi iz njene kategorije (isti klub ima po jedan tim u svakoj kategoriji)
  const timoviZa = (category: string) => (teams ?? []).filter((t: any) => t.category === category)
  const teamLabel = (t: any) => `${t.name} — ${katLabel(t.category)}`
  const imeTima = (id: string, fallback: string) => teamById.get(id)?.name ?? fallback

  // Kategorija tima ako NIJE ista kao kategorija utakmice (greška u podacima), inače null
  function pogresnaKat(teamId: string, category: string): string | null {
    const t = teamById.get(teamId)
    return t && t.category !== category ? t.category : null
  }

  function updateDate(day: string, month: string, year: string) {
    setDateDay(day); setDateMonth(month); setDateYear(year)
    if (day && month && year && year.length === 4)
      setForm(f => ({ ...f, match_date: `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}` }))
    else
      setForm(f => ({ ...f, match_date: '' }))
  }
  function updateTime(hour: string, min: string) {
    setTimeHour(hour); setTimeMin(min)
    if (hour !== '' && min !== '')
      setForm(f => ({ ...f, match_time: `${hour.padStart(2,'0')}:${min.padStart(2,'0')}` }))
    else
      setForm(f => ({ ...f, match_time: '' }))
  }

  function fmtDate(d: string) {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }
  function fmtTime(t: string) { return t ? t.substring(0, 5) : null }

  function resetRezultat() { setFormSets(prazniSetovi()); setFormUkupno(PRAZNO_UKUPNO) }

  // Forma za novu utakmicu odmah dobija izabranu kategoriju i aktivnu sezonu
  function toggleAdd() {
    setOpen(v => !v); setEditMatch(null); setPoruka('')
    const c = cat !== SVE && CATEGORIES.some(x => x.value === cat) ? cat : form.category
    promeniKategoriju(c)
    setForm(f => ({ ...f, season: aktivnaSezona }))
  }

  // Promena kategorije: izabrani timovi ostaju samo ako su iz nove kategorije
  function promeniKategoriju(category: string) {
    setForm(f => {
      const ok = (id: string) => !!id && teamById.get(id)?.category === category
      return {
        ...f, category,
        home_team_id: ok(f.home_team_id) ? f.home_team_id : '',
        away_team_id: ok(f.away_team_id) ? f.away_team_id : '',
      }
    })
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    // Koje dugme je poslalo formu: "Sačuvaj" ili "Sačuvaj i dodaj sledeću"
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null
    const sledeca = submitter?.dataset?.sledeca === '1'
    if (isReviewer) return
    if (!form.home_team_id || !form.away_team_id) { alert('Izaberi domaćina i goste.'); return }
    if (form.home_team_id === form.away_team_id) { alert('Domaćin i gosti ne mogu biti isti tim.'); return }
    if (pogresnaKat(form.home_team_id, form.category) || pogresnaKat(form.away_team_id, form.category)) {
      alert(`Oba tima moraju biti iz kategorije ${katLabel(form.category)}.`); return
    }
    if (!form.match_date) { alert('Upiši datum utakmice (dan, mesec i godinu).'); return }

    const showScore = form.status === 'finished' || form.status === 'live'
    const { rezultat, greska } = rezultatIzForme(formSets, formUkupno, form.category, form.status)
    if (showScore && greska) { alert(greska); return }
    if (form.status === 'finished' && bezRezultata(rezultat) &&
        !confirm('Utakmica je označena kao „Završeno“, ali nema upisan rezultat. Sačuvati ipak?')) return

    const payload: any = {
      home_team_id: form.home_team_id, away_team_id: form.away_team_id,
      category: form.category, season: form.season,
      match_date: form.match_date, status: form.status,
    }
    ;(['match_time', 'round', 'redni_broj', 'venue', 'notes'] as const).forEach(k => { if (form[k]) payload[k] = form[k] })
    if (showScore) {
      Object.assign(payload, rezultat)
      if (!rezultat.set_scores) delete payload.set_scores
      ;(['home_sets', 'away_sets', 'home_score', 'away_score'] as const).forEach(k => { if (payload[k] == null) delete payload[k] })
    }

    setBusy(true); setPoruka('')
    const err = await upisiUtakmicu(p => supabase.from('matches').insert([p]), payload)
    if (err) { setBusy(false); alert('Utakmica nije sačuvana: ' + err); return }

    if (payload.status === 'finished') {
      const r = await recalcStandings(supabase, payload.category, payload.season,
        { touched: [payload.home_team_id, payload.away_team_id] })
      if (r.error) alert('Utakmica je sačuvana, ali tabela nije preračunata: ' + r.error)
    }

    // Ako je filter na drugoj kategoriji, prebaci na onu u koju je utakmica dodata
    if (cat !== SVE && cat !== payload.category) setCat(payload.category)
    const opis = `${imeTima(payload.home_team_id, 'Domaćin')} — ${imeTima(payload.away_team_id, 'Gosti')}`
    resetRezultat()
    setTimeHour(''); setTimeMin('')
    if (sledeca) {
      // Ostaju kategorija, datum, kolo, teren, sezona i status — za brz unos celog kola
      setForm(f => ({ ...f, home_team_id: '', away_team_id: '', match_time: '', redni_broj: '', notes: '' }))
      setPoruka(`✓ Sačuvano: ${opis}. Upiši sledeću utakmicu.`)
    } else {
      setForm({ ...blank, season: aktivnaSezona, category: payload.category })
      setDateDay(''); setDateMonth(''); setDateYear('')
      setOpen(false)
    }
    setBusy(false); onRefresh()
  }

  async function del(m: any) {
    if (!confirm('Obrisati utakmicu?')) return
    const { error } = await supabase.from('matches').delete().eq('id', m.id)
    if (error) { alert('Utakmica nije obrisana: ' + error.message); return }
    if (m.status === 'finished') {
      const r = await recalcStandings(supabase, m.category, m.season, { touched: [m.home_team_id, m.away_team_id] })
      if (r.error) alert('Utakmica je obrisana, ali tabela nije preračunata: ' + r.error)
    }
    if (editMatch?.id === m.id) setEditMatch(null)
    onRefresh()
  }

  // Edit rezultata + datum/vreme
  const [page,      setPage]          = useState(1)
  const [editMatch, setEditMatch]     = useState<any>(null)
  const [editSets,  setEditSets]      = useState<SetDraft[]>(prazniSetovi())
  const [editUkupno, setEditUkupno]   = useState<UkupnoForma>(PRAZNO_UKUPNO)
  const editRef = useRef<HTMLDivElement>(null)
  const [editBusy,  setEditBusy]      = useState(false)
  const [editDateDay, setEditDateDay]     = useState('')
  const [editDateMonth, setEditDateMonth] = useState('')
  const [editDateYear, setEditDateYear]   = useState('')
  const [editTimeHour, setEditTimeHour]   = useState('')
  const [editTimeMin, setEditTimeMin]     = useState('')

  // Nova kategorija → kreni od prve strane
  useEffect(() => { setPage(1) }, [cat, samoProblemi])

  const str = (v: any) => (v == null ? '' : String(v))

  function startEditMatch(m: any) {
    setEditMatch({
      id: m.id, status: m.status, origStatus: m.status,
      category: m.category, season: m.season,
      home_team_id: m.home_team_id ?? '', away_team_id: m.away_team_id ?? '',
      origHome: m.home_team_id, origAway: m.away_team_id,
      home_name: m.home_team?.name ?? 'Domaćin', away_name: m.away_team?.name ?? 'Gosti',
      match_date: m.match_date ?? '', match_time: m.match_time ?? '',
      venue: m.venue ?? '', redni_broj: m.redni_broj ?? '', round: m.round ?? '',
    })
    setEditSets(setoviUFormu(m.set_scores))
    setEditUkupno({
      home_sets: str(m.home_sets), away_sets: str(m.away_sets),
      home_score: str(m.home_score), away_score: str(m.away_score),
    })
    // Popuni edit datum polja iz postojećeg datuma
    if (m.match_date) {
      const [y, mo, d] = m.match_date.split('-')
      setEditDateDay(d || ''); setEditDateMonth(mo || ''); setEditDateYear(y || '')
    } else { setEditDateDay(''); setEditDateMonth(''); setEditDateYear('') }
    if (m.match_time) {
      const parts = m.match_time.split(':')
      setEditTimeHour(parts[0] || ''); setEditTimeMin(parts[1] || '')
    } else { setEditTimeHour(''); setEditTimeMin('') }
    setOpen(false)
    // Skroluj do edit forme
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function updateEditDate(day: string, month: string, year: string) {
    setEditDateDay(day); setEditDateMonth(month); setEditDateYear(year)
    if (day && month && year && year.length === 4)
      setEditMatch((m: any) => ({ ...m, match_date: `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}` }))
  }
  function updateEditTime(hour: string, min: string) {
    setEditTimeHour(hour); setEditTimeMin(min)
    if (hour !== '' && min !== '')
      setEditMatch((m: any) => ({ ...m, match_time: `${hour.padStart(2,'0')}:${min.padStart(2,'0')}` }))
  }

  async function saveEditMatch() {
    if (!editMatch) return
    const em = editMatch
    if (!em.home_team_id || !em.away_team_id) { alert('Izaberi domaćina i goste.'); return }
    if (em.home_team_id === em.away_team_id) { alert('Domaćin i gosti ne mogu biti isti tim.'); return }
    const { rezultat, greska } = rezultatIzForme(editSets, editUkupno, em.category, em.status)
    if (greska) { alert(greska); return }
    if (em.status === 'finished' && bezRezultata(rezultat) &&
        !confirm('Utakmica je označena kao „Završeno“, ali nema upisan rezultat. Sačuvati ipak?')) return

    setEditBusy(true)
    const payload: any = {
      status:       em.status,
      home_team_id: em.home_team_id,
      away_team_id: em.away_team_id,
      match_date:   em.match_date || null,
      match_time:   em.match_time || null,
      venue:        em.venue      || null,
      redni_broj:   em.redni_broj || null,
      round:        em.round      || null,
      ...rezultat,
    }
    const err = await upisiUtakmicu(p => supabase.from('matches').update(p).eq('id', em.id), payload)
    if (err) { setEditBusy(false); alert('Izmene nisu sačuvane: ' + err); return }

    // Tabela se preračunava kad je utakmica završena (ili je bila završena pre izmene)
    if (em.status === 'finished' || em.origStatus === 'finished') {
      const r = await recalcStandings(supabase, em.category, em.season,
        { touched: [em.origHome, em.origAway, em.home_team_id, em.away_team_id] })
      if (r.error) alert('Izmene su sačuvane, ali tabela nije preračunata: ' + r.error)
    }

    setEditMatch(null); setEditBusy(false); onRefresh()
  }

  const showScore = form.status === 'finished' || form.status === 'live'

  const statusLabel = (s: string) => ({
    finished:  { text: 'Završeno', cls: 'text-green-400' },
    live:      { text: '● UŽIVO',  cls: 'text-red-400 font-semibold' },
    scheduled: { text: 'Zakazano', cls: 'text-blue-300' },
    postponed: { text: 'Odloženo', cls: 'text-yellow-400' },
  }[s] ?? { text: s, cls: 'text-blue-300' })

  // Utakmice sa timom iz druge kategorije — zbog njih se klub u tabeli pojavljuje dva puta
  const problemi = (matches ?? []).filter((m: any) =>
    pogresnaKat(m.home_team_id, m.category) || pogresnaKat(m.away_team_id, m.category) ||
    (m.home_team_id && m.home_team_id === m.away_team_id))
  const prikaz = samoProblemi && problemi.length ? problemi : matches

  // Razvrstavanje po kategorijama
  const groups = groupByCategory<any>(matches, m => m.category)
  const shownGroups = groupByCategory<any>(prikaz, m => m.category)
  const shown = cat === SVE ? shownGroups : shownGroups.filter(g => g.value === cat)

  const headers = ['KOLO', 'DATUM', 'VREME', 'DOMAĆIN', 'RES.', 'GOSTI', 'STATUS', ...(isReviewer ? [] : [''])]

  function nazivSaUpozorenjem(name: string | undefined, teamId: string, category: string) {
    const kat = pogresnaKat(teamId, category)
    return (
      <>
        {name ?? '—'}
        {kat && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-normal text-amber-300 align-middle"
            title={`Tim je iz kategorije ${katLabel(kat)}, a utakmica je u kategoriji ${katLabel(category)}`}>
            <AlertTriangle className="w-3 h-3" /> {katLabel(kat)}
          </span>
        )}
      </>
    )
  }

  function renderTable(rows: any[]) {
    return (
      <div className="glass rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr>
            {headers.map(h => <th key={h} className="th-style">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((m: any) => {
              const st = statusLabel(m.status)
              const setovi = formatSetova(m.set_scores)
              const imaRez = m.status === 'finished' || m.status === 'live'
              return (
                <tr key={m.id} className={`border-t border-white/5 tr-hover text-sm ${editMatch?.id === m.id ? 'bg-blue-900/20' : ''}`}>
                  <td className="px-3 py-2.5 text-blue-400 text-xs text-center">{m.round || '—'}</td>
                  <td className="px-3 py-2.5 text-blue-200 font-semibold whitespace-nowrap">{fmtDate(m.match_date)}</td>
                  <td className="px-3 py-2.5 text-blue-200 whitespace-nowrap">{fmtTime(m.match_time) || <span className="text-blue-600">—</span>}</td>
                  <td className="px-3 py-2.5 text-white font-semibold">{nazivSaUpozorenjem(m.home_team?.name, m.home_team_id, m.category)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="font-display text-[#f5c518]">
                      {imaRez ? `${m.home_sets ?? 0}:${m.away_sets ?? 0}` : '—'}
                    </div>
                    {imaRez && setovi && (
                      <div className="text-[10px] text-blue-400 whitespace-nowrap leading-tight mt-0.5">{setovi}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-white font-semibold">{nazivSaUpozorenjem(m.away_team?.name, m.away_team_id, m.category)}</td>
                  <td className={`px-3 py-2.5 text-xs ${st.cls}`}>{st.text}</td>
                  {!isReviewer && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => startEditMatch(m)} className="text-blue-400 hover:text-[#f5c518] p-1 transition-colors" title="Uredi"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => del(m)} className="text-red-400 hover:text-red-300 p-1 transition-colors" title="Obriši"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Paginacija (samo kad je izabrana jedna kategorija)
  function renderPagination(total: number, current: number) {
    const totalPages = Math.ceil(total / PAGE_SIZE)
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-blue-400 text-sm">
          Prikazano <span className="text-white font-semibold">{(current-1)*PAGE_SIZE+1}–{Math.min(current*PAGE_SIZE, total)}</span> od <span className="text-white font-semibold">{total}</span> utakmica
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(1)} disabled={current === 1}
            className="px-2 py-1.5 rounded text-xs font-semibold text-blue-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            «
          </button>
          <button onClick={() => setPage(Math.max(1, current-1))} disabled={current === 1}
            className="px-3 py-1.5 rounded text-sm font-semibold text-blue-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 2)
            .reduce((acc: (number|string)[], p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx-1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) => p === '...'
              ? <span key={`dots-${i}`} className="px-2 text-blue-600 text-sm">…</span>
              : <button key={p} onClick={() => setPage(p as number)}
                  className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${current === p ? 'bg-[#f5c518] text-[#002d63]' : 'text-blue-400 hover:text-white hover:bg-white/10'}`}>
                  {p}
                </button>
            )
          }
          <button onClick={() => setPage(Math.min(totalPages, current+1))} disabled={current === totalPages}
            className="px-3 py-1.5 rounded text-sm font-semibold text-blue-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ›
          </button>
          <button onClick={() => setPage(totalPages)} disabled={current === totalPages}
            className="px-2 py-1.5 rounded text-xs font-semibold text-blue-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            »
          </button>
        </div>
      </div>
    )
  }

  // Izbor tima (domaćin/gosti): samo timovi iz kategorije utakmice, sa nazivom kategorije.
  // Ako postojeća utakmica ima tim iz druge kategorije, on se prikazuje sa ⚠ da bi mogao da se zameni.
  function izborTima(category: string, value: string, drugi: string, onChange: (id: string) => void, prazno: string) {
    const lista = timoviZa(category)
    const trenutni = value && !lista.some((t: any) => t.id === value) ? teamById.get(value) : null
    return (
      <select className="field-input" value={value} onChange={e => onChange(e.target.value)}
        disabled={!lista.length && !trenutni} required>
        <option value="">{lista.length ? prazno : '— nema timova u ovoj kategoriji —'}</option>
        {trenutni && <option value={trenutni.id}>⚠ {teamLabel(trenutni)}</option>}
        {lista.map((t: any) => (
          <option key={t.id} value={t.id} disabled={t.id === drugi}>{teamLabel(t)}</option>
        ))}
      </select>
    )
  }

  const nemaTimova = (category: string) => timoviZa(category).length === 0 && (
    <p className="sm:col-span-2 md:col-span-3 -mt-1 text-xs text-amber-300">
      U kategoriji {katLabel(category)} još nema timova. Dodaj ih u tabu TIMOVI (izaberi klub i kategoriju), pa se vrati ovde.
    </p>
  )

  const upozorenjeTima = (teamId: string, category: string, uloga: string) => {
    const kat = pogresnaKat(teamId, category)
    return kat ? (
      <p className="mt-1 text-xs text-amber-300">
        ⚠ {uloga} je tim iz kategorije {katLabel(kat)}. Izaberi tim iz kategorije {katLabel(category)}.
      </p>
    ) : null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-4xl text-white tracking-wider">UTAKMICE</h2>
          <p className="text-blue-400 text-sm mt-1">Sezona: <span className="text-[#f5c518] font-semibold">{aktivnaSezona}</span></p>
        </div>
        {!isReviewer && (
          <div className="flex gap-2">
            <button onClick={toggleAdd} className="btn-yellow"><Plus className="w-4 h-4" /> DODAJ UTAKMICU</button>
          </div>
        )}
      </div>

      <KategorijaFilter groups={groups} total={matches.length} active={cat} onChange={setCat} />

      {/* Upozorenje: utakmice sa timom iz druge kategorije */}
      {problemi.length > 0 && !isReviewer && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Utakmica sa timom iz pogrešne kategorije: <b>{problemi.length}</b>. Zbog njih se isti klub u tabeli pojavljuje dva puta.
              Otvori utakmicu (olovka) i izaberi tim iz prave kategorije.
            </span>
          </p>
          <button onClick={() => setSamoProblemi(v => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 transition-colors">
            {samoProblemi ? 'Prikaži sve utakmice' : 'Prikaži samo njih'}
          </button>
        </div>
      )}

      {/* FORMA ZA NOVU UTAKMICU */}
      {open && !isReviewer && (
        <form onSubmit={add} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/30">
          <h3 className="font-display text-xl text-[#f5c518] tracking-wider mb-1">NOVA UTAKMICA</h3>
          <p className="text-xs text-blue-400 mb-4">Prvo izaberi kategoriju — za domaćina i goste nude se samo timovi iz te kategorije.</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Kategorija *</label>
              <select className="field-input" value={form.category} onChange={e => promeniKategoriju(e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Domaćin *</label>
              {izborTima(form.category, form.home_team_id, form.away_team_id,
                id => setForm(f => ({ ...f, home_team_id: id })), '— Domaćin —')}
            </div>
            <div>
              <label className="label">Gosti *</label>
              {izborTima(form.category, form.away_team_id, form.home_team_id,
                id => setForm(f => ({ ...f, away_team_id: id })), '— Gosti —')}
            </div>
            {nemaTimova(form.category)}
            <div>
              <label className="label">Datum * (DD / MM / YYYY)</label>
              <div className="flex gap-2">
                <input type="number" min="1" max="31" placeholder="DD" className="field-input text-center" style={{width:'64px'}} value={dateDay} onChange={e => updateDate(e.target.value,dateMonth,dateYear)} />
                <input type="number" min="1" max="12" placeholder="MM" className="field-input text-center" style={{width:'64px'}} value={dateMonth} onChange={e => updateDate(dateDay,e.target.value,dateYear)} />
                <input type="number" min="2020" max="2035" placeholder="YYYY" className="field-input text-center" style={{flex:1}} value={dateYear} onChange={e => updateDate(dateDay,dateMonth,e.target.value)} />
              </div>
              {form.match_date && <p className="text-xs text-[#f5c518] mt-1">✓ {fmtDate(form.match_date)}</p>}
            </div>
            <div>
              <label className="label">Vreme (24h)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="23" placeholder="HH" className="field-input text-center" style={{width:'70px'}} value={timeHour} onChange={e => updateTime(e.target.value,timeMin)} />
                <span className="text-[#f5c518] font-display text-xl">:</span>
                <input type="number" min="0" max="59" placeholder="MM" className="field-input text-center" style={{width:'70px'}} value={timeMin} onChange={e => updateTime(timeHour,e.target.value)} />
              </div>
              {form.match_time && <p className="text-xs text-[#f5c518] mt-1">✓ {form.match_time}</p>}
            </div>
            <div>
              <label className="label">Hala / Teren</label>
              <input type="text" className="field-input" placeholder="pr. Teren 4" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} />
            </div>
            <div>
              <label className="label">Sezona *</label>
              <select className="field-input" value={form.season} onChange={e => setForm({...form, season: e.target.value})}>
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status *</label>
              <select className="field-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="scheduled">Zakazano</option>
                <option value="live">Uživo</option>
                <option value="finished">Završeno</option>
                <option value="postponed">Odloženo</option>
              </select>
            </div>
            <div>
              <label className="label">Redni broj utakmice</label>
              <input type="number" min="1" className="field-input" placeholder="pr. 5" value={form.redni_broj} onChange={e => setForm({...form, redni_broj: e.target.value})} />
            </div>
            <div>
              <label className="label">Kolo</label>
              <input type="number" min="1" className="field-input" placeholder="pr. 3" value={form.round} onChange={e => setForm({...form, round: e.target.value})} />
            </div>
            {showScore && (
              <div className="sm:col-span-2 md:col-span-3">
                <SetoviUnos
                  category={form.category} status={form.status}
                  homeName={imeTima(form.home_team_id, 'Domaćin')} awayName={imeTima(form.away_team_id, 'Gosti')}
                  sets={formSets} onSets={setFormSets} ukupno={formUkupno} onUkupno={setFormUkupno} />
              </div>
            )}
          </div>
          {poruka && <p className="mt-4 text-sm text-green-300">{poruka}</p>}
          <div className="flex flex-wrap gap-2 mt-5">
            <button type="submit" disabled={busy} className="btn-yellow"><Save className="w-4 h-4" /> SAČUVAJ</button>
            <button type="submit" disabled={busy} data-sledeca="1" className="btn-ghost"
              title="Sačuvaj, a kategorija, datum, kolo i teren ostaju za sledeću utakmicu">
              <Plus className="w-4 h-4" /> Sačuvaj i dodaj sledeću
            </button>
            <button type="button" onClick={() => { setOpen(false); setPoruka('') }} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </form>
      )}

      {/* EDIT FORMA */}
      {editMatch && !isReviewer && (
        <div ref={editRef} className="glass rounded-2xl p-6 mb-6 border border-[#f5c518]/40 scroll-mt-32">
          <h3 className="font-display text-xl text-white tracking-wider mb-1">UREDI UTAKMICU</h3>
          <p className="text-sm text-blue-300 mb-5 font-semibold">
            {imeTima(editMatch.home_team_id, editMatch.home_name)} <span className="text-[#f5c518] mx-2">VS</span> {imeTima(editMatch.away_team_id, editMatch.away_name)}
            <span className="ml-3 text-xs text-blue-400 font-normal">{katLabel(editMatch.category)}</span>
          </p>

          {/* Status i timovi */}
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Status</label>
              <select className="field-input" value={editMatch.status} onChange={e => setEditMatch((m: any) => ({...m, status: e.target.value}))}>
                <option value="scheduled">Zakazano</option>
                <option value="live">Uživo</option>
                <option value="finished">Završeno</option>
                <option value="postponed">Odloženo</option>
              </select>
            </div>
            <div>
              <label className="label">Domaćin</label>
              {izborTima(editMatch.category, editMatch.home_team_id, editMatch.away_team_id,
                id => setEditMatch((m: any) => ({ ...m, home_team_id: id })), '— Domaćin —')}
              {upozorenjeTima(editMatch.home_team_id, editMatch.category, 'Domaćin')}
            </div>
            <div>
              <label className="label">Gosti</label>
              {izborTima(editMatch.category, editMatch.away_team_id, editMatch.home_team_id,
                id => setEditMatch((m: any) => ({ ...m, away_team_id: id })), '— Gosti —')}
              {upozorenjeTima(editMatch.away_team_id, editMatch.category, 'Gost')}
            </div>
          </div>

          {/* Rezultat po setovima */}
          <div className="mb-4">
            <SetoviUnos
              category={editMatch.category} status={editMatch.status}
              homeName={imeTima(editMatch.home_team_id, editMatch.home_name)}
              awayName={imeTima(editMatch.away_team_id, editMatch.away_name)}
              sets={editSets} onSets={setEditSets} ukupno={editUkupno} onUkupno={setEditUkupno} />
          </div>

          {/* Izmena datuma i vremena */}
          <div className="border-t border-white/10 pt-4 mt-2">
            <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase mb-3">Izmeni datum, vreme, teren i kolo</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Redni broj utakmice</label>
                <input type="number" min="1" className="field-input" placeholder="pr. 5"
                  value={editMatch.redni_broj} onChange={e => setEditMatch((m: any) => ({...m, redni_broj: e.target.value}))} />
              </div>
              <div>
                <label className="label">Kolo</label>
                <input type="number" min="1" className="field-input" placeholder="pr. 3"
                  value={editMatch.round} onChange={e => setEditMatch((m: any) => ({...m, round: e.target.value}))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Hala / Teren</label>
                <input type="text" className="field-input" placeholder="pr. Teren 4"
                  value={editMatch.venue} onChange={e => setEditMatch((m: any) => ({...m, venue: e.target.value}))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Novi datum (DD / MM / YYYY)</label>
                <div className="flex gap-2">
                  <input type="number" min="1" max="31" placeholder="DD" className="field-input text-center" style={{width:'64px'}} value={editDateDay} onChange={e => updateEditDate(e.target.value,editDateMonth,editDateYear)} />
                  <input type="number" min="1" max="12" placeholder="MM" className="field-input text-center" style={{width:'64px'}} value={editDateMonth} onChange={e => updateEditDate(editDateDay,e.target.value,editDateYear)} />
                  <input type="number" min="2020" max="2035" placeholder="YYYY" className="field-input text-center" style={{flex:1}} value={editDateYear} onChange={e => updateEditDate(editDateDay,editDateMonth,e.target.value)} />
                </div>
                {editMatch.match_date && <p className="text-xs text-[#f5c518] mt-1">✓ {fmtDate(editMatch.match_date)}</p>}
              </div>
              <div>
                <label className="label">Novo vreme (24h)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="23" placeholder="HH" className="field-input text-center" style={{width:'70px'}} value={editTimeHour} onChange={e => updateEditTime(e.target.value,editTimeMin)} />
                  <span className="text-[#f5c518] font-display text-xl">:</span>
                  <input type="number" min="0" max="59" placeholder="MM" className="field-input text-center" style={{width:'70px'}} value={editTimeMin} onChange={e => updateEditTime(editTimeHour,e.target.value)} />
                </div>
                {editMatch.match_time && <p className="text-xs text-[#f5c518] mt-1">✓ {editMatch.match_time}</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={saveEditMatch} disabled={editBusy} className="btn-yellow"><Save className="w-4 h-4" /> {editBusy ? 'ČUVANJE...' : 'SAČUVAJ SVE'}</button>
            <button onClick={() => setEditMatch(null)} className="btn-ghost"><X className="w-4 h-4" /> Odustani</button>
          </div>
        </div>
      )}

      {/* UTAKMICE PO KATEGORIJAMA */}
      {shown.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-10 text-center text-blue-500 text-sm">
          {cat === SVE
            ? 'Nema utakmica.'
            : `Nema utakmica u kategoriji ${katLabel(cat)} za sezonu ${aktivnaSezona}.`}
        </div>
      ) : (
        <div className="space-y-8">
          {shown.map(g => {
            // Jedna kategorija → paginacija; Sve kategorije → ceo spisak po blokovima
            const totalPages = Math.max(1, Math.ceil(g.items.length / PAGE_SIZE))
            const current = Math.min(page, totalPages)
            const rows = cat === SVE ? g.items : g.items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
            return (
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
                {renderTable(rows)}
                {cat !== SVE && renderPagination(g.items.length, current)}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
