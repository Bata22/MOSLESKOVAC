import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import { Users, Phone, Mail, Hash, Building2 } from 'lucide-react'

async function fetchTreneri() {
  const supabase = createClient()
  const { data } = await supabase.from('treneri').select('*').order('ime_prezime')
  return data ?? []
}

export default async function TreneriPage() {
  const treneri = await fetchTreneri()

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-gradient-to-r from-[#002d63] to-[#003f8a] border-b border-[#f5c518]/20">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#f5c518]" />
            <span className="font-display tracking-widest text-sm text-[#f5c518]">MOSL</span>
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">TRENERI</h1>
          <p className="text-blue-300 text-sm mt-1">Licencirani treneri Međuokružnog odbojkaškog saveza Leskovac</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {treneri.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Users className="w-12 h-12 text-blue-700 mx-auto mb-3 opacity-40" />
            <p className="text-blue-400">Administrator još nije uneo podatke o trenerima.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="bg-[#002d63]/60 px-6 py-4 border-b border-[#f5c518]/20">
              <h2 className="font-display text-2xl text-[#f5c518] tracking-wider">
                LISTA TRENERA
                <span className="ml-3 text-base text-blue-400 font-sans font-normal">({treneri.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {treneri.map((t: any) => (
                <div key={t.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#003f8a]/60 border border-[#003f8a] flex items-center justify-center shrink-0">
                    <span className="font-display text-[#f5c518] text-xl">{t.ime_prezime?.charAt(0) ?? 'T'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-display text-xl tracking-wide mb-1">{t.ime_prezime}</h3>
                    <div className="flex flex-col gap-1.5">
                      {t.broj_dozvole && (
                        <div className="flex items-center gap-2 text-sm">
                          <Hash className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-blue-300">Dozvola: <span className="text-white font-semibold">{t.broj_dozvole}</span></span>
                        </div>
                      )}
                      {t.klub && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-blue-300">{t.klub}</span>
                        </div>
                      )}
                      {t.telefon && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <a href={`tel:${t.telefon}`} className="text-blue-300 hover:text-[#f5c518] transition-colors">{t.telefon}</a>
                        </div>
                      )}
                      {t.mail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <a href={`mailto:${t.mail}`} className="text-blue-300 hover:text-[#f5c518] transition-colors">{t.mail}</a>
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
