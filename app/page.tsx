import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Trophy, Calendar, ChevronRight } from 'lucide-react'
import { CATEGORIES_MUSKI, CATEGORIES_ZENSKE } from '@/lib/types'

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
            <Link href="/timovi" className="btn-yellow text-lg">
              <Trophy className="w-5 h-5" /> TABELA LIGE <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="/utakmice"
              className="border-2 border-[#f5c518] text-[#f5c518] px-6 py-2.5 rounded-lg font-display text-lg tracking-wide hover:bg-[#f5c518]/10 transition-colors flex items-center gap-2">
              <Calendar className="w-5 h-5" /> RASPORED
            </Link>
          </div>
        </div>
      </section>

      {/* MUŠKA VERTIKALA */}
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-[#003f8a]/50" />
          <h2 className="font-display text-2xl text-[#f5c518] tracking-widest">MUŠKARCI</h2>
          <div className="h-px flex-1 bg-[#003f8a]/50" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES_MUSKI.map(cat => (
            <Link key={cat.value} href={`/timovi?kategorija=${cat.value}`}
              className="glass card-hover rounded-2xl p-4 text-center group border border-[#003f8a]/40 hover:border-[#f5c518]/50">
              <div className="font-display text-xl text-white tracking-wider group-hover:text-[#f5c518] transition-colors mb-1 leading-tight">
                {cat.label.toUpperCase()}
              </div>
              <div className="text-xs text-blue-400 flex items-center justify-center gap-0.5">
                Tabela <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ŽENSKA VERTIKALA */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-pink-900/40" />
          <h2 className="font-display text-2xl text-pink-300 tracking-widest">ŽENE</h2>
          <div className="h-px flex-1 bg-pink-900/40" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES_ZENSKE.map(cat => (
            <Link key={cat.value} href={`/timovi?kategorija=${cat.value}`}
              className="card-hover rounded-2xl p-4 text-center group border border-pink-900/40 hover:border-pink-400/50 transition-all"
              style={{ background: 'rgba(180,60,100,0.08)' }}>
              <div className="font-display text-xl text-pink-200 tracking-wider group-hover:text-pink-300 transition-colors mb-1 leading-tight">
                {cat.label.toUpperCase()}
              </div>
              <div className="text-xs text-pink-400 flex items-center justify-center gap-0.5">
                Tabela <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
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
