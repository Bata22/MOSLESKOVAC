import { Standing } from '@/lib/types'
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

  const medal = (pos: number) => {
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return String(pos)
  }

  const cols = [
    { key: '#',            short: '#'   },
    { key: 'Tim',         short: 'Tim' },
    { key: 'Utakmice',    short: 'UT'  },
    { key: 'Pobede',      short: 'P'   },
    { key: 'Izgubljene',  short: 'I'   },
    { key: 'Setovi +',    short: 'S+'  },
    { key: 'Setovi -',    short: 'S-'  },
    { key: 'Poeni +',     short: 'B+'  },
    { key: 'Poeni -',     short: 'B-'  },
    { key: 'Bodovi',      short: 'BOD' },
  ]

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.key} className="th-style whitespace-nowrap">
                  <span className="hidden sm:inline">{c.key}</span>
                  <span className="sm:hidden">{c.short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const isVranje = row.team?.name?.toLowerCase().includes('vranje')
              return (
                <tr key={row.id} className={`border-b border-white/5 tr-hover ${isVranje ? 'tr-vranje' : ''}`}>
                  <td className="px-4 py-3 text-center text-lg">{medal(row.position || i + 1)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#003f8a]/60 border border-[#003f8a] flex items-center justify-center font-display text-[#f5c518] text-xs">
                        {row.team?.name?.charAt(0) ?? '?'}
                      </div>
                      <span className={`font-semibold text-sm ${isVranje ? 'text-[#f5c518]' : 'text-white'}`}>
                        {row.team?.name ?? '—'}
                        {isVranje && <span className="ml-1.5 text-[10px] bg-[#f5c518]/20 text-[#f5c518] px-1 rounded">naš</span>}
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
                  <td className="px-4 py-3 text-center font-display text-xl text-[#f5c518]">{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* legenda */}
      <div className="px-4 py-2 bg-black/20 text-xs text-blue-500 flex flex-wrap gap-4">
        <span>UT – Utakmice</span><span>P – Pobede</span><span>I – Izgubljene</span>
        <span>S+/- – Setovi</span><span>B+/- – Poeni</span><span>BOD – Bodovi</span>
      </div>
    </div>
  )
}
