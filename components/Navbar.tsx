'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'
import { CATEGORIES } from '@/lib/types'

export default function Navbar() {
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [timoviOpen, setTimoviOpen]     = useState(false)
  const [utakmiceOpen, setUtakmiceOpen] = useState(false)
  const timoviRef   = useRef<HTMLDivElement>(null)
  const utakmiceRef = useRef<HTMLDivElement>(null)
  const pathname    = usePathname()

  // zatvori dropdown kad se klikne van
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (timoviRef.current   && !timoviRef.current.contains(e.target as Node))   setTimoviOpen(false)
      if (utakmiceRef.current && !utakmiceRef.current.contains(e.target as Node)) setUtakmiceOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = (path: string) => pathname.startsWith(path)

  const dropItem = (href: string, label: string, close: () => void) => (
    <Link
      key={href}
      href={href}
      onClick={close}
      className="block px-5 py-3 text-sm text-blue-100 hover:bg-[#f5c518] hover:text-[#002d63] font-semibold transition-colors border-b border-white/10 last:border-0"
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-50 bg-[#002d63] border-b-2 border-[#f5c518] shadow-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-[#f5c518] flex items-center justify-center font-display text-[#002d63] text-lg group-hover:scale-105 transition-transform">
            MOSL
          </div>
          <div>
            <div className="font-display text-[#f5c518] text-xl tracking-widest leading-none">Međuokružni odbojkaški savez Leskovac </div>
            <div className="text-[10px] text-blue-300 tracking-[0.3em] leading-none mt-0.5">LIGA</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/"
            className={`px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors ${pathname === '/' ? 'text-[#f5c518]' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>
            POČETNA
          </Link>

          {/* Timovi */}
          <div className="relative" ref={timoviRef}>
            <button
              onClick={() => { setTimoviOpen(v => !v); setUtakmiceOpen(false) }}
              className={`flex items-center gap-1 px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors ${isActive('/timovi') ? 'text-[#f5c518]' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>
              TIMOVI
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${timoviOpen ? 'rotate-180' : ''}`} />
            </button>
            {timoviOpen && (
              <div className="nav-drop absolute top-full left-0 mt-1 w-48 bg-[#002d63] border border-[#f5c518]/30 rounded-xl shadow-2xl overflow-hidden">
                {dropItem('/timovi', 'Sve kategorije', () => setTimoviOpen(false))}
                {CATEGORIES.map(c => dropItem(`/timovi?kategorija=${c.value}`, c.label, () => setTimoviOpen(false)))}
              </div>
            )}
          </div>

          {/* Utakmice */}
          <div className="relative" ref={utakmiceRef}>
            <button
              onClick={() => { setUtakmiceOpen(v => !v); setTimoviOpen(false) }}
              className={`flex items-center gap-1 px-4 py-2 rounded text-sm font-semibold tracking-wide transition-colors ${isActive('/utakmice') ? 'text-[#f5c518]' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}>
              UTAKMICE
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${utakmiceOpen ? 'rotate-180' : ''}`} />
            </button>
            {utakmiceOpen && (
              <div className="nav-drop absolute top-full left-0 mt-1 w-48 bg-[#002d63] border border-[#f5c518]/30 rounded-xl shadow-2xl overflow-hidden">
                {dropItem('/utakmice', 'Sve kategorije', () => setUtakmiceOpen(false))}
                {CATEGORIES.map(c => dropItem(`/utakmice?kategorija=${c.value}`, c.label, () => setUtakmiceOpen(false)))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-blue-100 hover:text-white p-2" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#002d63] border-t border-[#f5c518]/20 px-4 py-4 space-y-1">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block py-3 text-blue-100 font-semibold border-b border-white/10">Početna</Link>
          <div className="py-2 border-b border-white/10">
            <p className="text-[#f5c518] font-display tracking-widest text-xs mb-2">TIMOVI</p>
            <Link href="/timovi" onClick={() => setMobileOpen(false)} className="block py-2 pl-3 text-blue-100 hover:text-[#f5c518]">Sve kategorije</Link>
            {CATEGORIES.map(c => (
              <Link key={c.value} href={`/timovi?kategorija=${c.value}`} onClick={() => setMobileOpen(false)} className="block py-2 pl-3 text-blue-100 hover:text-[#f5c518]">{c.label}</Link>
            ))}
          </div>
          <div className="py-2">
            <p className="text-[#f5c518] font-display tracking-widest text-xs mb-2">UTAKMICE</p>
            <Link href="/utakmice" onClick={() => setMobileOpen(false)} className="block py-2 pl-3 text-blue-100 hover:text-[#f5c518]">Sve kategorije</Link>
            {CATEGORIES.map(c => (
              <Link key={c.value} href={`/utakmice?kategorija=${c.value}`} onClick={() => setMobileOpen(false)} className="block py-2 pl-3 text-blue-100 hover:text-[#f5c518]">{c.label}</Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
