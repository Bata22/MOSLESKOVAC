'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const router   = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Pogrešan email ili lozinka.')
      setLoading(false)
    } else {
      router.push('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001020] via-[#002050] to-[#001020]">
      <div className="w-full max-w-sm px-4">

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#f5c518] flex items-center justify-center mx-auto mb-4 font-display text-[#002d63] text-2xl">OK</div>
          <h1 className="font-display text-3xl text-white tracking-widest">OK VRANJE</h1>
          <p className="text-blue-400 text-sm tracking-widest">ADMIN PANEL</p>
        </div>

        <div className="glass rounded-2xl p-8 border border-[#003f8a]/50">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-[#f5c518]" />
            <span className="font-display text-xl text-white tracking-wider">PRIJAVA</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-blue-400 font-semibold mb-1.5 tracking-wider uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field-input"
                placeholder="admin@okvranje.rs"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-blue-400 font-semibold mb-1.5 tracking-wider uppercase">Lozinka</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="field-input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-yellow w-full justify-center text-lg mt-2">
              {loading ? 'Prijavljivanje...' : 'PRIJAVI SE'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-700 text-xs mt-4">Pristup samo za administratore kluba</p>
      </div>
    </div>
  )
}
