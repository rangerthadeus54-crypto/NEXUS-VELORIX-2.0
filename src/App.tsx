import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Crosshair,
  Flame,
  Gamepad2,
  Globe2,
  Menu,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from './auth/AuthContext'
import GameIcon from './components/GameIcon'
import { featuredGames } from './data/games'
import PlatformPages from './pages/PlatformPages'
import './App.css'

type Community = {
  name: string
  game: string
  members: string
  icon: LucideIcon
  color: string
}

const navigation = [
  { label: 'Community', to: '/community' },
  { label: 'Games', to: '/games' },
  { label: 'Players', to: '/players' },
  { label: 'Tournaments', to: '/tournaments' },
  { label: 'Leaderboard', to: '/leaderboards' },
  { label: 'Teams', to: '/teams' },
  { label: 'News', to: '/news' },
  { label: 'Log in', to: '/login' },
]

const communities: Community[] = [
  {
    name: 'NIGHT RAIDERS',
    game: 'Valorant · EU West',
    members: '2.4k',
    icon: Crosshair,
    color: 'violet',
  },
  {
    name: 'DROP ZONE',
    game: 'Apex Legends · Global',
    members: '1.8k',
    icon: Flame,
    color: 'orange',
  },
  {
    name: 'THE LAST ROUND',
    game: 'Counter-Strike 2 · NA',
    members: '980',
    icon: Shield,
    color: 'blue',
  },
]

const tournaments = [
  { game: 'VALORANT', name: 'Nexus Open: Series 04', date: 'NOV 24', prize: '$5,000', icon: Crosshair },
  { game: 'APEX LEGENDS', name: 'Dropzone Showdown', date: 'NOV 27', prize: '$2,500', icon: Flame },
  { game: 'COUNTER-STRIKE 2', name: 'Midnight Masters', date: 'DEC 02', prize: '$7,500', icon: Shield },
]

const leaderboard = [
  { rank: '01', name: 'vexx', tag: '#NXR', game: 'VALORANT', rating: '3,842', change: '+128', avatar: 'V', tone: 'purple' },
  { rank: '02', name: 'Kairo', tag: '#404', game: 'APEX LEGENDS', rating: '3,710', change: '+96', avatar: 'K', tone: 'blue' },
  { rank: '03', name: 's0laris', tag: '#ECL', game: 'COUNTER-STRIKE 2', rating: '3,695', change: '+74', avatar: 'S', tone: 'orange' },
]

const news = [
  {
    category: 'COMMUNITY',
    title: 'The next era of competitive gaming is built together',
    date: 'NOV 18, 2026',
    image:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=85',
    className: 'news-card--feature',
  },
  {
    category: 'TOURNAMENTS',
    title: 'Nexus Open Series 04: registrations are on the horizon',
    date: 'NOV 15, 2026',
    image:
      'https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&w=800&q=85',
    className: '',
  },
]

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Nexus Velorix home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-name">
        <strong>NEXUS</strong>
        <span>VELORIX</span>
      </span>
      <span className="brand-version">2.0</span>
    </Link>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action && (
        <a className="text-link" href={action.href}>
          {action.label} <ArrowRight size={15} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const closeMenu = () => setMenuOpen(false)
  const visibleNavigation = user
    ? [
        ...navigation.filter(({ to }) => ['/community', '/games', '/tournaments', '/leaderboards'].includes(to)),
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'My profile', to: '/profile' },
      ]
    : navigation

  const handleSignOut = async () => {
    const result = await signOut()
    if (result.error) {
      setAuthNotice(result.error)
      return
    }

    setAuthNotice('')
    closeMenu()
    navigate('/')
  }

  return (
    <div className="site-shell">
      <div className="preview-notice">
        <Sparkles size={13} aria-hidden="true" />
        <span>PLATFORM PREVIEW</span>
        <span className="notice-divider" aria-hidden="true" />
        <span>Community, tournament, ranking and news content is illustrative sample data.</span>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav
            className={`primary-navigation${menuOpen ? ' is-open' : ''}`}
            id="primary-navigation"
            aria-label="Main navigation"
          >
            {visibleNavigation.map((item) => (
              <NavLink to={item.to} key={item.label} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}
            {user && <button className="nav-signout" type="button" onClick={handleSignOut}>Sign out</button>}
          </nav>
          <Link className="header-cta" to={user ? '/dashboard' : '/register'} onClick={closeMenu}>
            {user ? 'Dashboard' : 'Create profile'} <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>
      {authNotice && <p className="auth-header-notice" role="alert">{authNotice}</p>}

      {location.pathname === '/' ? (
      <main>
        <section className="hero-section" id="home">
          <div className="hero-backdrop" aria-hidden="true" />
          <div className="hero-content">
            <div className="hero-kicker">
              <span className="live-dot" />
              BUILT FOR THE NEXT GENERATION
            </div>
            <h1>
              YOUR GAME.
              <br />
              <span>YOUR PEOPLE.</span>
              <br />
              YOUR <span className="accent-word">NEXUS.</span>
            </h1>
            <p className="hero-description">
              Find your squad, make your mark, and play your way.
              <br className="desktop-break" /> The global gaming community starts here.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#communities">
                Find your community <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a className="button button-quiet" href="#games">
                <span className="play-icon"><ArrowDownRight size={14} aria-hidden="true" /></span>
                Explore games
              </a>
            </div>
            <div className="hero-social-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span className="avatar avatar-one">R</span>
                <span className="avatar avatar-two">M</span>
                <span className="avatar avatar-three">J</span>
                <span className="avatar avatar-four">A</span>
              </div>
              <p><strong>A place for every player.</strong><span>Find your next teammate.</span></p>
            </div>
          </div>
          <div className="hero-side-note" aria-hidden="true">
            <span>PLAY TOGETHER</span>
            <span className="side-note-line" />
            <span>GO FURTHER</span>
          </div>
          <a className="scroll-cue" href="#games" aria-label="Scroll to featured games">
            <span>SCROLL TO EXPLORE</span>
            <ChevronDown size={16} aria-hidden="true" />
          </a>
        </section>

        <section className="stats-strip" aria-label="Platform preview statistics">
          <div className="stats-intro">
            <span className="status-dot" />
            <span>THE NEXUS, AT A GLANCE</span>
            <span className="sample-tag">SAMPLE</span>
          </div>
          <div className="stat-item"><strong>120<span>K+</span></strong><span>PLAYERS</span></div>
          <div className="stat-item"><strong>48<span>+</span></strong><span>GAMES</span></div>
          <div className="stat-item"><strong>2.6<span>K</span></strong><span>COMMUNITIES</span></div>
          <div className="stat-item"><strong>64</strong><span>COUNTRIES</span></div>
        </section>

        <section className="content-section games-section" id="games">
          <div className="section-topline">
            <SectionHeading
              eyebrow="PICK YOUR PLAYGROUND"
              title="Find your game."
              description="From clutch moments to late-night queues, your next match starts here."
              action={{ label: 'Find game communities', href: '#communities' }}
            />
            <div className="section-index">01 <span>/ 04</span></div>
          </div>
          <div className="games-grid">
            {featuredGames.map((game, index) => (
              <Link
                className={`game-card ${game.homeCardClass ?? ''}`}
                to={`/games/${game.slug}`}
                key={game.slug}
                aria-label={`Open ${game.name} game page`}
              >
                <GameIcon game={game} size="featured" />
                <span className="card-number">0{index + 1}</span>
                <span className="game-card-content">
                  <span className="game-category">{game.featuredLabel}</span>
                  <strong>{game.name.toUpperCase()}</strong>
                  <span className="game-card-bottom">
                    <span>{game.genre}</span>
                    <span className="round-arrow"><ArrowUpRight size={17} aria-hidden="true" /></span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="community-section" id="communities">
          <div className="community-grid">
            <div className="community-copy">
              <p className="eyebrow">MORE THAN A MATCH</p>
              <h2>Good games.<br /><span>Better company.</span></h2>
              <p>Meet players who get your game. Find your people, build your crew, and make every session count.</p>
              <a className="button button-outline" href="#games">
                Start with a game <ArrowRight size={16} aria-hidden="true" />
              </a>
              <div className="community-note"><Globe2 size={15} aria-hidden="true" /> Players, squads, and communities worldwide</div>
            </div>
            <div className="community-list">
              <div className="community-list-heading">
                <span>COMMUNITIES TO EXPLORE</span>
                <span className="sample-tag">SAMPLE</span>
              </div>
              {communities.map((community) => {
                const Icon = community.icon
                return (
                  <article className="community-row" key={community.name}>
                    <span className={`community-emblem ${community.color}`}><Icon size={20} aria-hidden="true" /></span>
                    <span className="community-info">
                      <strong>{community.name}</strong>
                      <span>{community.game}</span>
                    </span>
                    <span className="community-members"><Users size={13} aria-hidden="true" />{community.members}</span>
                    <ArrowUpRight className="community-arrow" size={16} aria-hidden="true" />
                  </article>
                )
              })}
              <a className="community-view-all" href="#games">Browse featured games <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section className="content-section tournament-section" id="tournaments">
          <SectionHeading
            eyebrow="THE NEXT BIG MOMENT"
            title="Play for something."
            description="A first look at the tournaments coming to the Nexus."
          />
          <div className="tournament-panel">
            <div className="tournament-panel-top">
              <span><CalendarDays size={15} aria-hidden="true" /> UPCOMING TOURNAMENTS</span>
              <span className="sample-tag">SAMPLE SCHEDULE</span>
            </div>
            {tournaments.map((tournament) => {
              const Icon = tournament.icon
              return (
                <div className="tournament-row" key={tournament.name}>
                  <span className="tournament-date"><strong>{tournament.date.split(' ')[1]}</strong><span>{tournament.date.split(' ')[0]}</span></span>
                  <span className="tournament-icon"><Icon size={19} aria-hidden="true" /></span>
                  <span className="tournament-name"><span>{tournament.game}</span><strong>{tournament.name}</strong></span>
                  <span className="tournament-prize"><span>PRIZE POOL</span><strong>{tournament.prize}</strong></span>
                  <span className="tournament-arrow"><ArrowUpRight size={17} aria-hidden="true" /></span>
                </div>
              )
            })}
            <div className="tournament-footnote">Demonstration schedule only. Registration and live event data are not connected.</div>
          </div>
        </section>

        <section className="leaderboard-section" id="leaderboard">
          <div className="leaderboard-inner">
            <div className="leaderboard-heading">
              <div>
                <p className="eyebrow">MADE OF MOMENTS</p>
                <h2>Climb the<br /><span>leaderboard.</span></h2>
                <p className="leaderboard-description">Every win tells a story. Make yours one to remember.</p>
                <a className="text-link" href="#news">See what’s next <ArrowRight size={15} aria-hidden="true" /></a>
              </div>
              <div className="leaderboard-visual" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <Trophy size={50} strokeWidth={1.2} />
                <span className="orbit-label">RISE<br />TO THE<br />TOP</span>
              </div>
            </div>
            <div className="leaderboard-card">
              <div className="leaderboard-card-heading">
                <span><Trophy size={15} aria-hidden="true" /> GLOBAL RANKINGS</span>
                <span className="sample-tag">SAMPLE DATA</span>
              </div>
              <div className="leaderboard-table-head"><span>RANK / PLAYER</span><span>GAME</span><span>RATING</span><span>CHANGE</span></div>
              {leaderboard.map((player) => (
                <div className="leaderboard-row" key={player.rank}>
                  <span className="rank-player">
                    <span className={`rank-number rank-${player.rank}`}>{player.rank}</span>
                    <span className={`player-avatar ${player.tone}`}>{player.avatar}</span>
                    <span className="player-name"><strong>{player.name}</strong><span>{player.tag}</span></span>
                  </span>
                  <span className="player-game">{player.game}</span>
                  <strong className="player-rating">{player.rating}</strong>
                  <span className="player-change"><Zap size={12} aria-hidden="true" />{player.change}</span>
                </div>
              ))}
              <div className="leaderboard-footnote">Illustrative player rankings. No live leaderboard data is connected.</div>
            </div>
          </div>
        </section>

        <section className="content-section news-section" id="news">
          <SectionHeading
            eyebrow="FROM AROUND THE NEXUS"
            title="The latest intel."
            description="News, stories, and updates from across the gaming world."
          />
          <div className="news-grid">
            {news.map((story) => (
              <article className={`news-card ${story.className}`} key={story.title}>
                <img src={story.image} alt="" loading="lazy" />
                <span className="news-card-content">
                  <span className="news-meta">{story.category}<span>{story.date}</span></span>
                  <strong>{story.title}</strong>
                  <span className="news-read">Preview story</span>
                </span>
              </article>
            ))}
            <div className="news-callout">
              <div className="callout-icon"><Swords size={19} aria-hidden="true" /></div>
              <p className="eyebrow">YOUR NEXT CHAPTER</p>
              <h3>It starts with<br />one connection.</h3>
              <a className="text-link" href="#communities">Find your people <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
          <p className="news-disclaimer">Preview headlines and editorial content shown for design demonstration.</p>
        </section>
      </main>
      ) : (
        <main className="route-main"><PlatformPages /></main>
      )}

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand-block">
            <Brand />
            <p>Play together. Go further.<br />A home for the global gaming community.</p>
          </div>
          <div className="footer-links">
            <div><span>EXPLORE</span><Link to="/games">Games</Link><Link to="/community">Communities</Link><Link to="/tournaments">Tournaments</Link></div>
            <div><span>THE NEXUS</span><Link to="/leaderboards">Leaderboard</Link><Link to="/news">Gaming news</Link><Link to="/players">Players</Link></div>
            <div><span>GET STARTED</span><Link to="/teams">Teams &amp; clans</Link><Link to="/dashboard">Dashboard</Link><Link to="/profile">My profile</Link><Link to="/settings">Settings</Link><Link to="/login">Log in</Link><Link to="/register">Create profile</Link></div>
          </div>
          <Link className="back-to-top" to="/" aria-label="Back to top"><ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="footer-bottom">
          <span>© 2026 NEXUS VELORIX. ALL PLAYERS WELCOME.</span>
          <span>MADE FOR THE LOVE OF THE GAME <Gamepad2 size={14} aria-hidden="true" /></span>
        </div>
      </footer>
    </div>
  )
}

export default App
