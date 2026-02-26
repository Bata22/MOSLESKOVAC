import { Standing } from '@/lib/types'
import { isZenska } from '@/lib/types'
import { Trophy } from 'lucide-react'

export default function StandingsTable({ standings }: { standings: Standing[] }) {
  if (!standings.length) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <Trophy className="w-12 h-12 text-[#003f8a] mx-auto mb-3 opacity-40" />
        <p className="text-blue-400">Nema podataka u tabeli.</p>
        <p className="text-blue-600 text-sm mt-1">Administrator još nije uneo podatke.</p>
      </div>
    )
  }

  const zenski = standings.length > 0 && isZenska(standings[0].category)

  const medal = (pos: number) => {
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return String(pos)
  }

  const thClass = zenski
    ? 'bg-gradient-to-r from-pink-900 to-pink-700 text-pink-200 font-family-bebas letter-spacing px-4 py-3 text-left text-xs font-bold tracking-widest'
    : 'th-style'

  return (
    <div className={`rounded-2xl overflow-hidden border ${zenski ? 'border-pink-900/40' : 'border-[#003f8a]/30'}`}
      style={{ background: zenski ? 'rgba(180,60,100,0.06)' : 'rgba(0,63,138,0.1)', backdropFilter: 'blur(10px)' }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['#','Tim','Utakmice','Pobede','Izgub.','S+','S-','B+','B-','Bodovi'].map((h, i) => (
                <th key={h} className={zenski
                  ? `px-4 py-3 text-left text-xs font-bold tracking-widest ${i === 0 ? 'text-center' : ''} ${i === 9 ? 'text-center' : ''}`
                  : `th-style ${i === 0 || i === 9 ? 'text-center' : ''}`}
                  style={zenski ? { background: 'linear-gradient(135deg, #6b1a3a, #9b2d5a)', color: '#f9a8d4' } : {}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const isHome = row.team?.name?.toLowerCase().includes('leskovac') ||
                             row.team?.name?.toLowerCase().includes('mosl')
              return (
                <tr key={row.id} className={`border-b border-white/5 tr-hover ${isHome ? (zenski ? 'tr-zenska-home' : 'tr-vranje') : ''}`}>
                  <td className="px-4 py-3 text-center text-lg">{medal(row.position || i + 1)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-xs ${zenski ? 'bg-pink-900/50 border border-pink-700 text-pink-300' : 'bg-[#003f8a]/60 border border-[#003f8a] text-[#f5c518]'}`}>
                        {row.team?.name?.charAt(0) ?? '?'}
                      </div>
                      <span className={`font-semibold text-sm ${isHome ? (zenski ? 'text-pink-300' : 'text-[#f5c518]') : 'text-white'}`}>
                        {row.team?.name ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-blue-300 text-sm">{row.played}</td>
                  <td className="px-3 py-3 text-center text-green-400 font-semibold text-sm">{row.won}</td>
                  <td className="px-3 py-3 text-center text-red-400 text-sm">{row.lost}</td>
                  <td className="px-3 py-3 text-center text-blue-300 text-sm">{row.sets_won}</td>
                  <td className="px-3 py-3 text-center text-blue-300 text-sm">{row.sets_lost}</td>
                  <td className="px-3 py-3 text-center text-blue-300 text-sm">{row.points_won}</td>
                  <td className="px-3 py-3 text-center text-blue-300 text-sm">{row.points_lost}</td>
                  <td className={`px-4 py-3 text-center font-display text-xl ${zenski ? 'text-pink-300' : 'text-[#f5c518]'}`}>{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-black/20 text-xs text-blue-500 flex flex-wrap gap-4">
        <span>S+/- – Setovi</span><span>B+/- – Poeni</span>
      </div>
    </div>
  )
}
