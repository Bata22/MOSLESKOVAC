import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Trophy, ChevronRight, Info, FileText, Building2, Scale } from 'lucide-react'
import { CATEGORIES_MUSKI, CATEGORIES_ZENSKE } from '@/lib/types'

// ✏️ PROMENITI OVDE link za dokumentaciju
const DOKUMENTACIJA_URL = 'https://www.ossrb.org/dokumenta.html'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-[#001530] via-[#002d63] to-[#001530] py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-[#f5c518]"
              style={{ left: `${5 + i * 10}%`, transform: 'skewX(-15deg)' }} />
          ))}
        </div>
        <div className="relative max-w-7xl mx-auto px-4">
          <span className="inline-flex items-center gap-2 bg-[#f5c518]/10 border border-[#f5c518]/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#f5c518] animate-pulse" />
            <span className="text-[#f5c518] text-xs font-semibold tracking-widest">SEZONA 2025/2026</span>
          </span>
          <h1 className="font-display text-6xl sm:text-9xl text-white leading-none tracking-wide mb-6">
            Međuokružni<br />
            odbojkaški<br />
            <span className="text-[#f5c518]">savez</span><br />
            Leskovac
          </h1>
          <p className="text-blue-200 text-lg max-w-lg mb-10">
            Pratite tabele, rezultate i raspored utakmica za sve kategorije.
          </p>
          <div className="flex flex-wrap gap-4">
            {/* btn-yellow text-lg  U slucaju da hoce da vrati*/}
            <Link href="/mos-info" className="border-2 border-[#f5c518] text-[#f5c518] px-6 py-2.5 rounded-lg font-display text-lg tracking-wide hover:bg-[#f5c518]/10 transition-colors flex items-center gap-2 ">
              <Info className="w-5 h-5" /> MOS INFO <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/klubovi"
              className="border-2 border-[#f5c518] text-[#f5c518] px-6 py-2.5 rounded-lg font-display text-lg tracking-wide hover:bg-[#f5c518]/10 transition-colors flex items-center gap-2">
              <Building2 className="w-5 h-5" /> KLUBOVI
            </Link>
            <Link href="/sudije" className="border-2 border-[#f5c518] text-[#f5c518] px-6 py-2.5 rounded-lg font-display text-lg tracking-wide hover:bg-white/5 transition-colors flex items-center gap-2">
              <Scale className="w-5 h-5" /> SUDIJE 
            </Link>
            <Link href="/treneri" className="border-2 border-[#f5c518] text-[#f5c518] px-6 py-2.5 rounded-lg font-display text-lg tracking-wide hover:bg-white/5 transition-colors flex items-center gap-2">
              <Info className="w-5 h-5 " />TRENERI 
            </Link>
            <a href={DOKUMENTACIJA_URL} target="_blank" rel="noopener noreferrer"
              className="border-2 border-[#f5c518] text-[#f5c518] px-6 py-2.5 rounded-lg font-display text-lg tracking-wide hover:bg-white/5 transition-colors flex items-center gap-2">
              <FileText className="w-5 h-5" /> DOKUMENTACIJA
            </a>
            
            
            <Link href="/bilteni" className="border-2 border-[#f5c518] text-[#f5c518] px-6 py-2.5 rounded-lg font-display text-lg tracking-wide hover:bg-white/5 transition-colors flex items-center gap-2">
              <FileText className="w-5 h-5" /> BILTENI 
            </Link>
          </div>
        </div>
      </section>

      {/* KATEGORIJE — dve kolone */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="font-display text-3xl text-[#f5c518] tracking-widest mb-8 text-center">KATEGORIJE</h2>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-8">

          {/* Muška kolona */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[#003f8a]/50" />
              <h3 className="font-display text-xl text-[#f5c518] tracking-widest whitespace-nowrap">MUŠKARCI</h3>
              <div className="h-px flex-1 bg-[#003f8a]/50" />
            </div>
            <div className="flex flex-col gap-2">
              {CATEGORIES_MUSKI.map(cat => (
                <Link key={cat.value} href={`/timovi?kategorija=${cat.value}`}
                  className="glass card-hover rounded-xl px-5 py-3 flex items-center justify-between group border border-[#003f8a]/40 hover:border-[#f5c518]/50">
                  <span className="font-display text-lg text-white tracking-wider group-hover:text-[#f5c518] transition-colors">
                    {cat.label.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-blue-400 group-hover:text-[#f5c518] transition-colors">
                    Tabela <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Ženska kolona */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-pink-900/40" />
              <h3 className="font-display text-xl text-pink-300 tracking-widest whitespace-nowrap">ŽENE</h3>
              <div className="h-px flex-1 bg-pink-900/40" />
            </div>
            <div className="flex flex-col gap-2">
              {CATEGORIES_ZENSKE.map(cat => (
                <Link key={cat.value} href={`/timovi?kategorija=${cat.value}`}
                  className="card-hover rounded-xl px-5 py-3 flex items-center justify-between group border border-pink-900/40 hover:border-pink-400/50 transition-all"
                  style={{ background: 'rgba(180,60,100,0.08)' }}>
                  <span className="font-display text-lg text-pink-200 tracking-wider group-hover:text-pink-300 transition-colors">
                    {cat.label.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-pink-400 group-hover:text-pink-300 transition-colors">
                    Tabela <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#001530] border-t border-[#003f8a]/40 py-8 text-center">
        <div className="font-display text-[#f5c518] text-xl tracking-widest mb-1">Međuokružni odbojkaški savez Leskovac</div>
        <p className="text-blue-500 text-sm">© {new Date().getFullYear()} Međuokružni odbojkaški savez Leskovac</p>
        <Link href="/admin/login" className="text-blue-700 text-sm mt-3 inline-block hover:text-blue-400 transition-colors">
          Admin pristup
        </Link>
        <p className="text-blue-500 text-xs mt-1">Kreirao: Bratislav Nikolić</p>
        <a href="mailto:bratislav901@gmail.com?subject=Subject%20Here&body=Message%20Body%20Here">
          <button className="text-blue-500 text-xs">Kontakt programera</button>
        </a>
      </footer>
    </div>
  )
}
