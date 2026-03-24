import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import { Building2, Phone, Mail, User } from 'lucide-react'

async function fetchKlubovi() {
  const supabase = createClient()
  const { data } = await supabase.from('klubovi').select('*').order('naziv')
  return data ?? []
}

export default async function KluboviPage() {
  const klubovi = await fetchKlubovi()

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#002d63] to-[#003f8a] border-b border-[#f5c518]/20">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-[#f5c518]" />
            <span className="font-display tracking-widest text-sm text-[#f5c518]">ČLANOVI SAVEZA</span>
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">KLUBOVI</h1>
          <p className="text-blue-300 text-sm mt-1">Registrovani klubovi Međuokružnog odbojkaškog saveza Leskovac</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {klubovi.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Building2 className="w-12 h-12 text-blue-700 mx-auto mb-3 opacity-40" />
            <p className="text-blue-400">Administrator još nije uneo podatke o klubovima.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="bg-[#002d63]/60 px-6 py-4 border-b border-[#f5c518]/20">
              <h2 className="font-display text-2xl text-[#f5c518] tracking-wider">
                REGISTROVANI KLUBOVI
                <span className="ml-3 text-base text-blue-400 font-sans font-normal">({klubovi.length})</span>{/* Zakomentarisi ako zelis da ne ostane broj  */}
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {klubovi.map((klub: any) => (
                <div key={klub.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-start gap-4">

                  {/* Inicijal / ikona */}
                  <div className="w-12 h-12 rounded-xl bg-[#003f8a]/60 border border-[#003f8a] flex items-center justify-center shrink-0">
                    <span className="font-display text-[#f5c518] text-xl">
                      {klub.naziv?.charAt(0) ?? 'K'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-display text-xl tracking-wide mb-2">{klub.naziv}</h3>

                    <div className="flex flex-col gap-1.5">
                      {klub.kontakt_osoba && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-blue-200">{klub.kontakt_osoba}</span>
                        </div>
                      )}
                      {klub.telefon && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <a href={`tel:${klub.telefon}`} className="text-blue-300 hover:text-[#f5c518] transition-colors">
                            {klub.telefon}
                          </a>
                        </div>
                      )}
                      {klub.mail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <a href={`mailto:${klub.mail}`} className="text-blue-300 hover:text-[#f5c518] transition-colors">
                            {klub.mail}
                          </a>
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
