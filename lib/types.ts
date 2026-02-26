export type Category = 'seniori' | 'juniori' | 'kadeti' | 'pioniri'| 'predpioniri'
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

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'seniori',  label: 'Seniori'  },
  { value: 'juniori',  label: 'Juniori'  },
  { value: 'kadeti',   label: 'Kadeti'   },
  { value: 'pioniri',  label: 'Pioniri'  },
  { value: 'predpioniri',  label: 'PredPioniri'},
]

export const SEASONS = ['2025/2026','2026/2027','2027/2028','2028/2029','2029/2030',]
