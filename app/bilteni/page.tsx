import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import { FileText, Download, Calendar } from 'lucide-react'

async function fetchBilteni() {
  const supabase = createClient()
  const { data } = await supabase.from('bilteni').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export default async function BilteniPage() {
  const bilteni = await fetchBilteni()

  function fmtDate(d: string) {
    if (!d) return ''
    const dt = new Date(d)
    return `${dt.getDate().toString().padStart(2,'0')}.${(dt.getMonth()+1).toString().padStart(2,'0')}.${dt.getFullYear()}`
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-gradient-to-r from-[#002d63] to-[#003f8a] border-b border-[#f5c518]/20">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-[#f5c518]" />
            <span className="font-display tracking-widest text-sm text-[#f5c518]">MOSL</span>
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">BILTENI</h1>
          <p className="text-blue-300 text-sm mt-1">Zvanični bilteni Međuokružnog odbojkaškog saveza Leskovac</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {bilteni.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-blue-700 mx-auto mb-3 opacity-40" />
            <p className="text-blue-400">Administrator još nije objavio biltene.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="bg-[#002d63]/60 px-6 py-4 border-b border-[#f5c518]/20">
              <h2 className="font-display text-2xl text-[#f5c518] tracking-wider">
                OBJAVLJENI BILTENI
                <span className="ml-3 text-base text-blue-400 font-sans font-normal">({bilteni.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {bilteni.map((b: any) => (
                <div key={b.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-900/40 border border-red-700/40 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{b.naziv}</p>
                      {b.opis && <p className="text-blue-400 text-sm mt-0.5">{b.opis}</p>}
                      <div className="flex items-center gap-1 text-xs text-blue-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(b.created_at)}
                      </div>
                    </div>
                  </div>
                  <a href={b.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#f5c518]/10 hover:bg-[#f5c518]/20 border border-[#f5c518]/30 text-[#f5c518] px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0">
                    <Download className="w-4 h-4" /> PDF
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
