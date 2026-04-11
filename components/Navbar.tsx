'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'
import { CATEGORIES_MUSKI, CATEGORIES_ZENSKE } from '@/lib/types'
import Image from 'next/image'

export default function Navbar() {
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [timoviOpen,   setTimoviOpen]   = useState(false)
  const [utakmiceOpen, setUtakmiceOpen] = useState(false)
  const timoviRef   = useRef<HTMLDivElement>(null)
  const utakmiceRef = useRef<HTMLDivElement>(null)
  const pathname    = usePathname()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (timoviRef.current   && !timoviRef.current.contains(e.target as Node))   setTimoviOpen(false)
      if (utakmiceRef.current && !utakmiceRef.current.contains(e.target as Node)) setUtakmiceOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = (path: string) => pathname.startsWith(path)

  function DropdownContent({ base, close }: { base: string; close: () => void }) {
    return (
      <div className="nav-drop absolute top-full left-0 mt-1 w-52 bg-[#002d63] border border-[#f5c518]/30 rounded-xl shadow-2xl overflow-hidden">
        <Link href={base} onClick={close}
          className="block px-4 py-2.5 text-xs text-blue-300 hover:bg-white/10 font-semibold tracking-wider border-b border-white/10">
          SVE KATEGORIJE
        </Link>
        <div className="px-4 pt-2 pb-1">
          <p className="text-[10px] text-blue-400 tracking-widest font-bold uppercase mb-1">Muškarci</p>
        </div>
        {CATEGORIES_MUSKI.map(c => (
          <Link key={c.value} href={`${base}?kategorija=${c.value}`} onClick={close}
            className="block px-4 py-2 text-sm text-blue-100 hover:bg-[#f5c518] hover:text-[#002d63] font-semibold transition-colors border-b border-white/5 last:border-0">
            {c.label}
          </Link>
        ))}
        <div className="px-4 pt-2 pb-1 border-t border-white/10">
          <p className="text-[10px] text-pink-300 tracking-widest font-bold uppercase mb-1">Žene</p>
        </div>
        {CATEGORIES_ZENSKE.map(c => (
          <Link key={c.value} href={`${base}?kategorija=${c.value}`} onClick={close}
            className="block px-4 py-2 text-sm text-pink-200 hover:bg-pink-400/80 hover:text-white font-semibold transition-colors border-b border-white/5 last:border-0">
            {c.label}
          </Link>
        ))}
      </div>
    )
  }

  const navLink = (href: string, label: string) => (
    <Link key={href} href={href}
      className={`px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors whitespace-nowrap ${isActive(href) ? 'text-[#f5c518]' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-50 bg-[#002d63] border-b-2 border-[#f5c518] shadow-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-display text-[#002d63] text-sm font-bold group-hover:scale-105 transition-transform">
            <Image src="/mos.png" alt='MOSL' width={40} height={40} />
          </div>
          <div>
            <div className="font-display text-[#f5c518] text-lg tracking-widest leading-none">Međuokružni odbojkaški savez</div>
            <div className="text-[10px] text-blue-300 tracking-[0.3em] leading-none mt-0.5">LESKOVAC — LIGA</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto">
          <Link href="/"
            className={`px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors ${pathname === '/' ? 'text-[#f5c518]' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>
            POČETNA
          </Link>

          {/* Timovi dropdown */}
          <div className="relative" ref={timoviRef}>
            <button onClick={() => { setTimoviOpen(v => !v); setUtakmiceOpen(false) }}
              className={`flex items-center gap-1 px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors ${isActive('/timovi') ? 'text-[#f5c518]' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>
              TIMOVI
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${timoviOpen ? 'rotate-180' : ''}`} />
            </button>
            {timoviOpen && <DropdownContent base="/timovi" close={() => setTimoviOpen(false)} />}
          </div>

          {/* Utakmice dropdown */}
          <div className="relative" ref={utakmiceRef}>
            <button onClick={() => { setUtakmiceOpen(v => !v); setTimoviOpen(false) }}
              className={`flex items-center gap-1 px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors ${isActive('/utakmice') ? 'text-[#f5c518]' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>
              UTAKMICE
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${utakmiceOpen ? 'rotate-180' : ''}`} />
            </button>
            {utakmiceOpen && <DropdownContent base="/utakmice" close={() => setUtakmiceOpen(false)} />}
          </div>

          {navLink('/mos-info', 'MOS INFO')}
          {navLink('/klubovi',  'KLUBOVI')}
          {navLink('/treneri',  'TRENERI')}
          {navLink('/sudije',   'SUDIJE')}
          {navLink('/bilteni',  'BILTENI')}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-blue-100 hover:text-white p-2" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#002d63] border-t border-[#f5c518]/20 px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block py-3 text-blue-100 font-semibold border-b border-white/10">Početna</Link>
          <Link href="/mos-info" onClick={() => setMobileOpen(false)} className="block py-3 text-blue-100 font-semibold border-b border-white/10">MOS Info</Link>
          <Link href="/klubovi"  onClick={() => setMobileOpen(false)} className="block py-3 text-blue-100 font-semibold border-b border-white/10">Klubovi</Link>
          <Link href="/treneri"  onClick={() => setMobileOpen(false)} className="block py-3 text-blue-100 font-semibold border-b border-white/10">Treneri</Link>
          <Link href="/sudije"   onClick={() => setMobileOpen(false)} className="block py-3 text-blue-100 font-semibold border-b border-white/10">Sudije</Link>
          <Link href="/bilteni"  onClick={() => setMobileOpen(false)} className="block py-3 text-blue-100 font-semibold border-b border-white/10">Bilteni</Link>

          {/* Mobile Timovi */}
          <div className="py-2 border-b border-white/10">
            <p className="text-[#f5c518] font-display tracking-widest text-xs mb-2">TIMOVI</p>
            <Link href="/timovi" onClick={() => setMobileOpen(false)} className="block py-2 pl-3 text-blue-300 hover:text-[#f5c518] text-sm">Sve kategorije</Link>
            <p className="pl-3 pt-2 text-[10px] text-blue-400 tracking-widest">MUŠKARCI</p>
            {CATEGORIES_MUSKI.map(c => (
              <Link key={c.value} href={`/timovi?kategorija=${c.value}`} onClick={() => setMobileOpen(false)}
                className="block py-2 pl-4 text-blue-100 hover:text-[#f5c518] text-sm">{c.label}</Link>
            ))}
            <p className="pl-3 pt-2 text-[10px] text-pink-300 tracking-widest">ŽENE</p>
            {CATEGORIES_ZENSKE.map(c => (
              <Link key={c.value} href={`/timovi?kategorija=${c.value}`} onClick={() => setMobileOpen(false)}
                className="block py-2 pl-4 text-pink-200 hover:text-pink-400 text-sm">{c.label}</Link>
            ))}
          </div>

          {/* Mobile Utakmice */}
          <div className="py-2">
            <p className="text-[#f5c518] font-display tracking-widest text-xs mb-2">UTAKMICE</p>
            <Link href="/utakmice" onClick={() => setMobileOpen(false)} className="block py-2 pl-3 text-blue-300 hover:text-[#f5c518] text-sm">Sve kategorije</Link>
            <p className="pl-3 pt-2 text-[10px] text-blue-400 tracking-widest">MUŠKARCI</p>
            {CATEGORIES_MUSKI.map(c => (
              <Link key={c.value} href={`/utakmice?kategorija=${c.value}`} onClick={() => setMobileOpen(false)}
                className="block py-2 pl-4 text-blue-100 hover:text-[#f5c518] text-sm">{c.label}</Link>
            ))}
            <p className="pl-3 pt-2 text-[10px] text-pink-300 tracking-widest">ŽENE</p>
            {CATEGORIES_ZENSKE.map(c => (
              <Link key={c.value} href={`/utakmice?kategorija=${c.value}`} onClick={() => setMobileOpen(false)}
                className="block py-2 pl-4 text-pink-200 hover:text-pink-400 text-sm">{c.label}</Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
