import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import { Info, MapPin, Mail, CreditCard, Hash, Phone, User } from 'lucide-react'

async function fetchMosInfo() {
  const supabase = createClient()
  const [info, admins] = await Promise.all([
    supabase.from('mos_info').select('*').limit(1).maybeSingle(),
    supabase.from('mos_uprava').select('*').order('pozicija'),
  ])
  return { info: info.data, admins: admins.data ?? [] }
}

export default async function MosInfoPage() {
  const { info, admins } = await fetchMosInfo()

  const infoFields = [
    { key: 'naziv',      label: 'Naziv',       icon: Info       },
    { key: 'adresa',     label: 'Adresa',      icon: MapPin     },
    { key: 'pib',        label: 'PIB',         icon: Hash       },
    { key: 'mail',       label: 'Mail',        icon: Mail       },
    { key: 'ziro_racun', label: 'Žiro račun',  icon: CreditCard },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#002d63] to-[#003f8a] border-b border-[#f5c518]/20">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-[#f5c518]" />
            <span className="font-display tracking-widest text-sm text-[#f5c518]">O SAVEZU</span>
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">MOS INFO</h1>
          <p className="text-blue-300 text-sm mt-1">Međuokružni odbojkaški savez Leskovac</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* Osnovne informacije */}
        {info ? (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="bg-[#002d63]/60 px-6 py-4 border-b border-[#f5c518]/20">
              <h2 className="font-display text-2xl text-[#f5c518] tracking-wider">INFORMACIJE O SAVEZU</h2>
            </div>
            <div className="divide-y divide-white/5">
              {infoFields.map(({ key, label, icon: Icon }) => info[key] ? (
                <div key={key} className="px-6 py-4 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[#003f8a]/50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#f5c518]" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-400 font-semibold tracking-widest uppercase mb-0.5">{label}</p>
                    <p className="text-white font-semibold">{info[key]}</p>
                  </div>
                </div>
              ) : null)}
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center text-blue-400">
            Administrator još nije uneo informacije o savezu.
          </div>
        )}

        {/* Administracija saveza */}
        {admins.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="bg-[#002d63]/60 px-6 py-4 border-b border-[#f5c518]/20">
              <h2 className="font-display text-2xl text-[#f5c518] tracking-wider">ADMINISTRACIJA SAVEZA</h2>
            </div>
            <div className="divide-y divide-white/5">
              {admins.map((u: any) => (
                <div key={u.id} className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                  <div className="min-w-[200px]">
                    <span className="font-display text-[#f5c518] tracking-wide text-lg">{u.pozicija}</span>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-white font-semibold">{u.ime_prezime}</span>
                    </div>
                    {u.telefon && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-blue-300 text-sm">{u.telefon}</span>
                      </div>
                    )}
                    {u.mail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <a href={`mailto:${u.mail}`} className="text-blue-300 text-sm hover:text-[#f5c518] transition-colors">{u.mail}</a>
                      </div>
                    )}
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
