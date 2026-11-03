import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { ArrowLeft } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import { BiltenDocument, BILTEN_DOC_CSS, catLabel, parseSnapshot, pdfName } from '@/components/bilten/BiltenDocument'
import PrintButton from '@/components/bilten/PrintButton'

type Props = { params: { id: string } }

const getBilten = cache(async (id: string) => {
  const supabase = createClient()
  const { data } = await supabase.from('bilteni').select('*').eq('id', id).maybeSingle()
  return data
})

// Naslov stranice = predloženi naziv PDF fajla pri "Sačuvaj kao PDF"
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBilten(params.id)
  const snap = b ? parseSnapshot(b.meta) : null
  if (!b || !snap) return { title: 'Bilten — MOSL' }
  return {
    title: pdfName(snap),
    description: `${b.naziv} — ${catLabel(snap.category)}, sezona ${snap.season}`,
  }
}

export default async function BiltenPage({ params }: Props) {
  const b = await getBilten(params.id)
  if (!b) notFound()
  if (b.pdf_url) redirect(b.pdf_url) // upload-ovan PDF → otvori fajl
  const snap = parseSnapshot(b.meta)
  if (!snap) notFound()

  return (
    <div className="min-h-screen">
      <div className="bilten-no-print">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/bilteni" className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-[#f5c518] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Svi bilteni
            </Link>
            <h1 className="font-display text-4xl text-white tracking-wider mt-2">{b.naziv}</h1>
            {b.opis && <p className="text-blue-300 text-sm mt-0.5">{b.opis}</p>}
          </div>
          <div className="text-right">
            <PrintButton />
            <p className="text-[11px] text-blue-400 mt-1.5">U prozoru za štampu izaberi „Sačuvaj kao PDF“.</p>
          </div>
        </div>
      </div>

      <div className="bilten-paper-wrap">
        <div className="bilten-paper">
          <BiltenDocument snap={{ ...snap, issued: snap.issued || b.created_at }} />
        </div>
      </div>

      {/* dangerouslySetInnerHTML: inače React na serveru pretvori ">" u "&gt;" i pokvari CSS */}
      <style dangerouslySetInnerHTML={{ __html: BILTEN_DOC_CSS + PAGE_CSS }} />
    </div>
  )
}

// Na ekranu: beli A4 list. Pri štampi: samo bilten, bez menija i pozadine.
const PAGE_CSS = `
.bilten-paper-wrap { overflow-x: auto; padding: 0 16px 48px; }
.bilten-paper { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; border-radius: 4px; box-shadow: 0 12px 40px rgba(0,0,0,0.45); }
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .bilten-no-print { display: none !important; }
  .bilten-paper-wrap { overflow: visible !important; padding: 0 !important; }
  .bilten-paper { width: auto !important; min-height: 0 !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
}
`
