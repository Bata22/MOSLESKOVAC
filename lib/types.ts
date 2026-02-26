export type Category =
  // Muška vertikala
  | 'seniori' | 'juniori' | 'kadeti' | 'pioniri' | 'predpioniri' | 'mini-muski'
  // Ženska vertikala
  | 'seniorke' | 'juniorke' | 'kadetkinje' | 'pionirke' | 'predpionirke' | 'mini-zenske'

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed'

export interface Team {
  id: string
  name: string
  category: Category
  city: string
  created_at: string
}

export interface Standing {
  id: string
  team_id: string
  team?: Team
  category: Category
  season: string
  position: number
  played: number
  won: number
  lost: number
  sets_won: number
  sets_lost: number
  points_won: number
  points_lost: number
  points: number
}

export interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  home_team?: Team
  away_team?: Team
  category: Category
  season: string
  match_date: string
  match_time?: string
  venue?: string
  home_score?: number
  away_score?: number
  home_sets?: number
  away_sets?: number
  status: MatchStatus
  round?: string
  notes?: string
}

export const CATEGORIES_MUSKI: { value: Category; label: string }[] = [
  { value: 'seniori',     label: 'Seniori'      },
  { value: 'juniori',     label: 'Juniori'      },
  { value: 'kadeti',      label: 'Kadeti'       },
  { value: 'pioniri',     label: 'Pioniri'      },
  { value: 'predpioniri', label: 'Predpioniri'  },
  { value: 'mini-muski',  label: 'Mini (muški)' },
]

export const CATEGORIES_ZENSKE: { value: Category; label: string }[] = [
  { value: 'seniorke',     label: 'Seniorke'       },
  { value: 'juniorke',     label: 'Juniorke'       },
  { value: 'kadetkinje',   label: 'Kadetkinje'     },
  { value: 'pionirke',     label: 'Pionirke'       },
  { value: 'predpionirke', label: 'Predpionirke'   },
  { value: 'mini-zenske',  label: 'Mini (ženski)'  },
]

// Sve kategorije zajedno (za admin forme, itd.)
export const CATEGORIES = [...CATEGORIES_MUSKI, ...CATEGORIES_ZENSKE]

// Helper: da li je kategorija ženska
export function isZenska(cat: Category): boolean {
  return CATEGORIES_ZENSKE.some(c => c.value === cat)
}

export const SEASONS = ['2025/2026','2026/2027','2027/2028','2028/2029','2029/2030']
