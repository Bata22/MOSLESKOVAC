import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import { Scale, Phone, Mail, Hash, CreditCard, User } from 'lucide-react'

async function fetchSudije() {
  const supabase = createClient()
  const { data } = await supabase.from('sudije').select('*').order('ime_prezime')
  return data ?? []
}

export default async function SudijePage() {
  const sudije = await fetchSudije()

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-gradient-to-r from-[#002d63] to-[#003f8a] border-b border-[#f5c518]/20">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-[#f5c518]" />
            <span className="font-display tracking-widest text-sm text-[#f5c518]">MOSL</span>
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">SUDIJE</h1>
          <p className="text-blue-300 text-sm mt-1">Licencirane sudije Međuokružnog odbojkaškog saveza Leskovac</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {sudije.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Scale className="w-12 h-12 text-blue-700 mx-auto mb-3 opacity-40" />
            <p className="text-blue-400">Administrator još nije uneo podatke o sudijama.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="bg-[#002d63]/60 px-6 py-4 border-b border-[#f5c518]/20">
              <h2 className="font-display text-2xl text-[#f5c518] tracking-wider">
                LISTA SUDIJA
                <span className="ml-3 text-base text-blue-400 font-sans font-normal">({sudije.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {sudije.map((s: any) => (
                <div key={s.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#003f8a]/60 border border-[#003f8a] flex items-center justify-center shrink-0">
                    <span className="font-display text-[#f5c518] text-xl">{s.ime_prezime?.charAt(0) ?? 'S'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-display text-xl tracking-wide mb-1">{s.ime_prezime}</h3>
                    <div className="flex flex-col gap-1.5">
                      {s.broj_dozvole && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-blue-300">Sudijska dozvola: <span className="text-white font-semibold">{s.broj_dozvole}</span></span>
                        </div>
                      )}
                      {s.telefon && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <a href={`tel:${s.telefon}`} className="text-blue-300 hover:text-[#f5c518] transition-colors">{s.telefon}</a>
                        </div>
                      )}
                      {s.mail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <a href={`mailto:${s.mail}`} className="text-blue-300 hover:text-[#f5c518] transition-colors">{s.mail}</a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
