import { Match } from '@/lib/types'
import { Calendar, Clock, MapPin } from 'lucide-react'

export default function MatchCard({ match }: { match: Match }) {
  const statusMap = {
    finished:  { label: 'Završeno', cls: 'text-green-400 bg-green-400/10 border-green-500/30' },
    live:      { label: '● UŽIVO',  cls: 'text-red-400 bg-red-400/10 border-red-500/30 live-pulse' },
    scheduled: { label: 'Zakazano', cls: 'text-blue-300 bg-blue-400/10 border-blue-400/30' },
    postponed: { label: 'Odloženo', cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  }
  const s = statusMap[match.status]

  // Datum u formatu DD.MM.YYYY
  function fmtDate(d: string) {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
  }

  // Vreme samo HH:MM
  function fmtTime(t?: string) {
    if (!t) return null
    return t.substring(0, 5)
  }

  const showScore = match.status === 'finished' || match.status === 'live'
  const homeWin   = showScore && (match.home_sets ?? 0) > (match.away_sets ?? 0)
  const awayWin   = showScore && (match.away_sets ?? 0) > (match.home_sets ?? 0)
  const time      = fmtTime(match.match_time)

  return (
    <div className="glass card-hover rounded-2xl overflow-hidden">
      {/* header */}
      <div className="bg-[#002d63]/70 px-4 py-2 flex justify-between items-center">
        <span className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-blue-100 font-semibold">
            <Calendar className="w-3.5 h-3.5" style={{color:"#f5c518"}} />
            {fmtDate(match.match_date)}
          </span>
          {time && (
            <span className="flex items-center gap-1.5 text-blue-100 font-semibold">
              <Clock className="w-3.5 h-3.5" style={{color:"#f5c518"}} />
              {time}
            </span>
          )}
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${s.cls}`}>{s.label}</span>
      </div>

      {/* body */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          {/* domaćin */}
          <div className="flex-1 text-right">
            <div className="w-10 h-10 rounded-full bg-[#003f8a]/50 border border-[#003f8a] flex items-center justify-center font-display text-[#f5c518] text-sm ml-auto mb-1">
              {match.home_team?.name?.charAt(0) ?? '?'}
            </div>
            <p className={`text-sm font-semibold leading-tight ${homeWin ? 'text-[#f5c518]' : 'text-white'}`}>
              {match.home_team?.name ?? 'Domaćin'}
            </p>
          </div>

          {/* score / vs */}
          <div className="text-center w-20">
            {showScore ? (
              <>
                <div className="font-display text-3xl leading-none">
                  <span className={homeWin ? 'text-[#f5c518]' : 'text-white'}>{match.home_sets ?? 0}</span>
                  <span className="text-blue-500 mx-1">:</span>
                  <span className={awayWin ? 'text-[#f5c518]' : 'text-white'}>{match.away_sets ?? 0}</span>
                </div>
                {match.home_score !== undefined && (
                  <div className="text-[11px] text-blue-400 mt-0.5">
                    ({match.home_score} : {match.away_score})
                  </div>
                )}
              </>
            ) : (
              <span className="font-display text-2xl text-[#f5c518]">VS</span>
            )}
          </div>

          {/* gosti */}
          <div className="flex-1 text-left">
            <div className="w-10 h-10 rounded-full bg-[#003f8a]/50 border border-[#003f8a] flex items-center justify-center font-display text-[#f5c518] text-sm mr-auto mb-1">
              {match.away_team?.name?.charAt(0) ?? '?'}
            </div>
            <p className={`text-sm font-semibold leading-tight ${awayWin ? 'text-[#f5c518]' : 'text-white'}`}>
              {match.away_team?.name ?? 'Gosti'}
            </p>
          </div>
        </div>

        {/* venue / round / redni broj */}
        {(match.venue || match.round || match.redni_broj) && (
          <div className="mt-3 flex justify-center flex-wrap gap-2 text-xs text-blue-300">
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" style={{color:"#f5c518"}} />{match.venue}
              </span>
            )}
            {match.redni_broj && (
              <span className="bg-[#f5c518]/10 border border-[#f5c518]/20 text-[#f5c518] px-2 py-0.5 rounded font-semibold">
                #{match.redni_broj}
              </span>
            )}
            {match.round && (
              <span className="bg-[#003f8a]/30 px-2 py-0.5 rounded">Kolo {match.round}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
