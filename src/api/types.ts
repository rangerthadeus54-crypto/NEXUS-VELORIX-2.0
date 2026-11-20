export type UserSummary = {
  user_id: string
  display_name: string
}

export type PlayerProfileRecord = {
  user_id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  favorite_games: string[]
  platform: string | null
  country: string | null
}

export type PlayerProfileUpdate = Omit<PlayerProfileRecord, 'user_id'>

export type GameSummary = {
  game_id: string
  slug: string
  name: string
  genre: string | null
}

export type CommunitySummary = {
  community_id: string
  name: string
  game_id: string
  region: string
  member_count: number
  description: string | null
  logo_url?: string | null
  banner_url?: string | null
}

export type CommunityCreateRequest = {
  name: string
  game_id: string
  region: string
  description: string
  logo_url: string | null
  banner_url: string | null
}

export type TeamSummary = {
  team_id: string
  name: string
  game_id: string
  region: string
  member_count: number
}

export type TournamentStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'completed'

export type TournamentSummary = {
  tournament_id: string
  name: string
  game_id: string
  starts_at: string
  status: TournamentStatus
}

export type LeaderboardEntry = {
  rank: number
  user_id: string
  game_id: string
  score: number
}
