export const gameCategories = [
  'FPS / Shooter',
  'Battle Royale',
  'Adventure / RPG',
  'Sports',
  'Racing',
  'Fighting',
  'Strategy',
  'Sandbox',
  'Casual / Multiplayer',
] as const

export type GameCategory = (typeof gameCategories)[number]

export type Game = {
  slug: string
  name: string
  category: GameCategory
  genre: string
  tone: 'violet' | 'blue' | 'orange' | 'green' | 'gold' | 'rose' | 'teal'
  artwork: string
  description?: string
  featuredLabel?: string
  homeCardClass?: string
}

export const allGames: Game[] = [
  { slug: 'call-of-duty', name: 'Call of Duty', category: 'FPS / Shooter', genre: 'Military FPS', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1938090/header.jpg' },
  { slug: 'valorant', name: 'Valorant', category: 'FPS / Shooter', genre: 'Tactical FPS', tone: 'violet', artwork: 'https://store-images.s-microsoft.com/image/apps.43432.13898029070941789.b9070612-bb75-4081-8f05-4acaf8e47425.19aed1bf-e497-497c-8140-1e0c100cba49', description: 'Combine precise gunplay with agent abilities in team-based tactical rounds.', featuredLabel: 'TACTICAL · FPS', homeCardClass: 'game-card--valorant' },
  { slug: 'counter-strike-2', name: 'Counter-Strike 2', category: 'FPS / Shooter', genre: 'Tactical FPS', tone: 'blue', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/header.jpg', description: 'Coordinate utility, aim, and round strategy in a competitive tactical shooter.', featuredLabel: 'TACTICAL · FPS', homeCardClass: 'game-card--counter' },
  { slug: 'overwatch-2', name: 'Overwatch 2', category: 'FPS / Shooter', genre: 'Hero shooter', tone: 'orange', artwork: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/blt45586c965db08717/6823abc24dee72d806fff5e2/OpenGraph.jpg' },
  { slug: 'rainbow-six-siege', name: 'Rainbow Six Siege', category: 'FPS / Shooter', genre: 'Tactical shooter', tone: 'blue', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/359550/header.jpg' },
  { slug: 'battlefield-6', name: 'Battlefield 6', category: 'FPS / Shooter', genre: 'Military FPS', tone: 'green', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2807960/header.jpg' },
  { slug: 'destiny-2', name: 'Destiny 2', category: 'FPS / Shooter', genre: 'Action MMO shooter', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1085660/header.jpg' },
  { slug: 'doom-eternal', name: 'DOOM Eternal', category: 'FPS / Shooter', genre: 'Arena shooter', tone: 'rose', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/782330/header.jpg' },
  { slug: 'the-finals', name: 'THE FINALS', category: 'FPS / Shooter', genre: 'Team-based FPS', tone: 'teal', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2073850/header.jpg' },
  { slug: 'halo-infinite', name: 'Halo Infinite', category: 'FPS / Shooter', genre: 'Arena FPS', tone: 'green', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1240440/header.jpg' },
  { slug: 'escape-from-tarkov', name: 'Escape from Tarkov', category: 'FPS / Shooter', genre: 'Extraction shooter', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3932890/4dd12ea3b00a4f8b67bfd629f3b9abbf8d5cab05/header_alt_assets_2.jpg' },
  { slug: 'team-fortress-2', name: 'Team Fortress 2', category: 'FPS / Shooter', genre: 'Class-based FPS', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/440/header.jpg' },

  { slug: 'fortnite', name: 'Fortnite', category: 'Battle Royale', genre: 'Battle royale', tone: 'violet', artwork: 'https://store-images.s-microsoft.com/image/apps.52548.70702278257994163.f7265b8a-f10e-49c4-8115-73c4d800af63.a0e057ff-c216-4206-a6b9-65bfc7d54fb0' },
  { slug: 'pubg-battlegrounds', name: 'PUBG: Battlegrounds', category: 'Battle Royale', genre: 'Battle royale', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/578080/header.jpg' },
  { slug: 'apex-legends', name: 'Apex Legends', category: 'Battle Royale', genre: 'Hero battle royale', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg', description: 'Build a squad around distinct Legends and compete in a fast-moving battle royale.', featuredLabel: 'BATTLE ROYALE', homeCardClass: 'game-card--apex' },
  { slug: 'call-of-duty-warzone', name: 'Call of Duty: Warzone', category: 'Battle Royale', genre: 'Battle royale', tone: 'green', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1962663/header.jpg' },
  { slug: 'fall-guys', name: 'Fall Guys', category: 'Battle Royale', genre: 'Party battle royale', tone: 'rose', artwork: 'https://store-images.s-microsoft.com/image/apps.9916.14285042010965430.749d90f0-b4ea-409c-9c82-00ed83f65c96.96222148-9510-4dad-9cda-0570627fd146' },
  { slug: 'naraka-bladepoint', name: 'NARAKA: BLADEPOINT', category: 'Battle Royale', genre: 'Action battle royale', tone: 'teal', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1203220/header.jpg' },

  { slug: 'genshin-impact', name: 'Genshin Impact', category: 'Adventure / RPG', genre: 'Open-world action RPG', tone: 'teal', artwork: 'https://store-images.s-microsoft.com/image/apps.58853.14057893183113088.c7459eb1-fd61-4f8d-9636-e286ca6b3f52.1fca4e5c-8445-4fda-a44d-cf68d967866d' },
  { slug: 'honkai-star-rail', name: 'Honkai: Star Rail', category: 'Adventure / RPG', genre: 'Turn-based RPG', tone: 'violet', artwork: 'https://fastcdn.hoyoverse.com/mi18n/hkrpg_global/m20261014hy1hr30em8/upload/2ec5d303c81b22595b93ec5be47deec6_303728547429006971.png' },
  { slug: 'baldurs-gate-3', name: "Baldur's Gate 3", category: 'Adventure / RPG', genre: 'Fantasy RPG', tone: 'rose', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg' },
  { slug: 'elden-ring', name: 'Elden Ring', category: 'Adventure / RPG', genre: 'Action RPG', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg' },
  { slug: 'cyberpunk-2077', name: 'Cyberpunk 2077', category: 'Adventure / RPG', genre: 'Open-world RPG', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg' },
  { slug: 'the-witcher-3', name: 'The Witcher 3', category: 'Adventure / RPG', genre: 'Fantasy RPG', tone: 'blue', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg' },
  { slug: 'final-fantasy-xiv', name: 'Final Fantasy XIV', category: 'Adventure / RPG', genre: 'MMORPG', tone: 'blue', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/39210/header.jpg' },
  { slug: 'monster-hunter-wilds', name: 'Monster Hunter Wilds', category: 'Adventure / RPG', genre: 'Action RPG', tone: 'green', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2246340/header.jpg' },
  { slug: 'skyrim', name: 'The Elder Scrolls V: Skyrim', category: 'Adventure / RPG', genre: 'Open-world RPG', tone: 'teal', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/489830/header.jpg' },
  { slug: 'zelda-tears-of-the-kingdom', name: 'The Legend of Zelda: Tears of the Kingdom', category: 'Adventure / RPG', genre: 'Adventure', tone: 'green', artwork: 'https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto/f_auto/dpr_2.0/store/software/switch/70010000063714/fb30eab428df3fc993b41c76e20f72e4d76d49734d17d31996b5ab61c414b117' },

  { slug: 'ea-sports-fc-26', name: 'EA SPORTS FC 26', category: 'Sports', genre: 'Football simulation', tone: 'green', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3405690/2d96aa1b06e453cd62dae9029d412f19e61932c3/header.jpg' },
  { slug: 'efootball', name: 'eFootball', category: 'Sports', genre: 'Football simulation', tone: 'blue', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1665460/header.jpg' },
  { slug: 'nba-2k26', name: 'NBA 2K26', category: 'Sports', genre: 'Basketball simulation', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3472040/f7e126add75c3b09779b44cd349be93d31b0a80b/header.jpg' },
  { slug: 'madden-nfl-26', name: 'Madden NFL 26', category: 'Sports', genre: 'American football', tone: 'rose', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3230400/979a5bffcde6f49d7e56ca9db6980256d3a96ad6/header.jpg' },
  { slug: 'mlb-the-show-26', name: 'MLB The Show 26', category: 'Sports', genre: 'Baseball simulation', tone: 'blue', artwork: 'https://image.api.playstation.com/vulcan/ap/rnd/202607/0816/791b0f1880e27c1d8f52187daea36abfe5fd3b0ff1144007.png' },
  { slug: 'wwe-2k25', name: 'WWE 2K25', category: 'Sports', genre: 'Wrestling', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2878960/header.jpg' },
  { slug: 'pga-tour-2k25', name: 'PGA TOUR 2K25', category: 'Sports', genre: 'Golf simulation', tone: 'green', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2385530/header.jpg' },

  { slug: 'forza-horizon-5', name: 'Forza Horizon 5', category: 'Racing', genre: 'Open-world racing', tone: 'teal', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg' },
  { slug: 'gran-turismo-7', name: 'Gran Turismo 7', category: 'Racing', genre: 'Motorsport simulation', tone: 'blue', artwork: 'https://image.api.playstation.com/vulcan/ap/rnd/202511/0707/303f5701426596a09891f9f33fa93e49ae522d5295b26dce.png' },
  { slug: 'f1-25', name: 'F1 25', category: 'Racing', genre: 'Formula racing', tone: 'rose', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3059520/76dc8ac45f1bd6dec26e04434ca1c8814e7bb330/header.jpg' },
  { slug: 'need-for-speed-unbound', name: 'Need for Speed Unbound', category: 'Racing', genre: 'Street racing', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1846380/header.jpg' },
  { slug: 'mario-kart-8-deluxe', name: 'Mario Kart 8 Deluxe', category: 'Racing', genre: 'Kart racing', tone: 'violet', artwork: 'https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto/f_auto/dpr_2.0/store/software/switch/70010000000153/de697f487a36d802dd9a5ff0341f717c8486221f2f1219b675af37aca63bc453' },

  { slug: 'tekken-8', name: 'Tekken 8', category: 'Fighting', genre: '3D fighting', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1778820/header.jpg' },
  { slug: 'mortal-kombat-1', name: 'Mortal Kombat 1', category: 'Fighting', genre: 'Fighting', tone: 'rose', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1971870/header.jpg' },
  { slug: 'street-fighter-6', name: 'Street Fighter 6', category: 'Fighting', genre: '2D fighting', tone: 'blue', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1364780/header.jpg' },
  { slug: 'super-smash-bros-ultimate', name: 'Super Smash Bros. Ultimate', category: 'Fighting', genre: 'Platform fighter', tone: 'gold', artwork: 'https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto/f_auto/dpr_2.0/store/software/switch/70010000012332/ac4d1fc9824876ce756406f0525d50c57ded4b2a666f6dfe40a6ac5c3563fad9' },
  { slug: 'guilty-gear-strive', name: 'Guilty Gear -Strive-', category: 'Fighting', genre: 'Anime fighter', tone: 'violet', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1384160/header.jpg' },

  { slug: 'league-of-legends', name: 'League of Legends', category: 'Strategy', genre: 'MOBA', tone: 'gold', artwork: 'https://store-images.s-microsoft.com/image/apps.18996.14127010465288187.f9de4a96-0ee4-4da3-bf66-d4132b38c599.caf661a7-e0b3-492d-b91b-63627e47283e', description: 'Choose a champion and work with your team to outplay opponents in the arena.', featuredLabel: 'MOBA', homeCardClass: 'game-card--league' },
  { slug: 'dota-2', name: 'Dota 2', category: 'Strategy', genre: 'MOBA', tone: 'rose', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/570/header.jpg' },
  { slug: 'starcraft-ii', name: 'StarCraft II', category: 'Strategy', genre: 'Real-time strategy', tone: 'blue', artwork: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltbe2068a317e02d9f/6966bac0fb2fd910dbda4a26/og_image.webp' },
  { slug: 'civilization-vii', name: 'Civilization VII', category: 'Strategy', genre: 'Turn-based strategy', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1295660/header.jpg' },
  { slug: 'age-of-empires-iv', name: 'Age of Empires IV', category: 'Strategy', genre: 'Real-time strategy', tone: 'green', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1466860/header.jpg' },
  { slug: 'teamfight-tactics', name: 'Teamfight Tactics', category: 'Strategy', genre: 'Auto battler', tone: 'violet', artwork: 'https://store-images.s-microsoft.com/image/apps.2151.13993220746278015.3cfa64ba-d9fb-4f85-821e-1ed66f33225c.e8c8ed15-317e-4fa7-93f6-c0d9677c9c27' },

  { slug: 'minecraft', name: 'Minecraft', category: 'Sandbox', genre: 'Sandbox survival', tone: 'green', artwork: 'https://store-images.s-microsoft.com/image/apps.808.14492077886571533.be42f4bd-887b-4430-8ed0-622341b4d2b0.c8274c53-105e-478b-9f4b-41b8088210a3' },
  { slug: 'roblox', name: 'Roblox', category: 'Sandbox', genre: 'User-created worlds', tone: 'blue', artwork: 'https://store-images.s-microsoft.com/image/apps.3683.68327322396008232.ddd32983-30da-4856-a0ef-70bb8840e88d.cb3ff148-2c1f-4b84-9eea-ff80eda50c2d' },
  { slug: 'grand-theft-auto-v', name: 'Grand Theft Auto V (GTA V)', category: 'Sandbox', genre: 'Open-world action', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3240220/header.jpg' },
  { slug: 'terraria', name: 'Terraria', category: 'Sandbox', genre: 'Sandbox adventure', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/105600/header.jpg' },
  { slug: 'palworld', name: 'Palworld', category: 'Sandbox', genre: 'Survival crafting', tone: 'teal', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1623730/header.jpg' },
  { slug: 'the-sims-4', name: 'The Sims 4', category: 'Sandbox', genre: 'Life simulation', tone: 'violet', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1222670/header.jpg' },

  { slug: 'rocket-league', name: 'Rocket League', category: 'Casual / Multiplayer', genre: 'Arcade sports', tone: 'blue', artwork: 'https://store-images.s-microsoft.com/image/apps.6066.65187692735347017.3990a461-2db8-41ef-8bf8-33d50ff2e82a.7bb9a856-df77-4e8b-a605-7863390a7aa0' },
  { slug: 'among-us', name: 'Among Us', category: 'Casual / Multiplayer', genre: 'Social deduction', tone: 'rose', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/945360/header.jpg' },
  { slug: 'lethal-company', name: 'Lethal Company', category: 'Casual / Multiplayer', genre: 'Co-op horror', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1966720/header.jpg' },
  { slug: 'phasmophobia', name: 'Phasmophobia', category: 'Casual / Multiplayer', genre: 'Co-op horror', tone: 'teal', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/739630/header.jpg' },
  { slug: 'overcooked-2', name: 'Overcooked! 2', category: 'Casual / Multiplayer', genre: 'Co-op party', tone: 'orange', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/728880/header.jpg' },
  { slug: 'stardew-valley', name: 'Stardew Valley', category: 'Casual / Multiplayer', genre: 'Cozy simulation', tone: 'green', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/413150/header.jpg' },
  { slug: 'dead-by-daylight', name: 'Dead by Daylight', category: 'Casual / Multiplayer', genre: 'Multiplayer horror', tone: 'rose', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/381210/header.jpg' },
  { slug: 'sea-of-thieves', name: 'Sea of Thieves', category: 'Casual / Multiplayer', genre: 'Co-op adventure', tone: 'blue', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1172620/header.jpg' },
  { slug: 'helldivers-2', name: 'Helldivers 2', category: 'Casual / Multiplayer', genre: 'Co-op shooter', tone: 'gold', artwork: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg' },
]

const gameNameKeys = allGames.map(({ name }) => name.toLowerCase())
const gameSlugs = allGames.map(({ slug }) => slug)

if (new Set(gameNameKeys).size !== allGames.length || new Set(gameSlugs).size !== allGames.length) {
  throw new Error('The game catalog must not contain duplicate names or slugs.')
}

export const gamesBySlug = new Map(allGames.map((game) => [game.slug, game]))

const featuredGameSlugs = ['valorant', 'apex-legends', 'counter-strike-2', 'league-of-legends']

export const featuredGames = featuredGameSlugs.map((slug) => {
  const game = gamesBySlug.get(slug)
  if (!game) {
    throw new Error(`Featured game '${slug}' is missing from the game catalog.`)
  }
  return game
})

const trendingGameSlugs = ['fortnite', 'minecraft', 'rocket-league', 'elden-ring', 'tekken-8', 'helldivers-2']

export const trendingGames = trendingGameSlugs.map((slug) => {
  const game = gamesBySlug.get(slug)
  if (!game) {
    throw new Error(`Trending game '${slug}' is missing from the game catalog.`)
  }
  return game
})

export const featuredGameNames = featuredGames.map(({ name }) => name)
