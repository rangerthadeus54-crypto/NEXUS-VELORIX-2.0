import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useRoutes } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  ChevronRight,
  Flame,
  Gamepad2,
  Globe2,
  LockKeyhole,
  Search,
  Shield,
  Trophy,
  Users,
  UserRound,
  Zap,
  X,
} from 'lucide-react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  communitiesApi,
  gamesApi,
  leaderboardsApi,
  profilesApi,
  teamsApi,
  tournamentsApi,
  usersApi,
} from '../api/services'
import type {
  CommunityCreateRequest,
  CommunitySummary,
  GameSummary,
  LeaderboardEntry,
  PlayerProfileRecord,
  PlayerProfileUpdate,
  TeamSummary,
  TournamentSummary,
} from '../api/types'
import GameIcon from '../components/GameIcon'
import GamesSidebar from '../components/GamesSidebar'
import { allGames, featuredGameNames, featuredGames, gamesBySlug, trendingGames } from '../data/games'
import { useApiResource } from '../hooks/useApiResource'
import type { ApiResource } from '../hooks/useApiResource'
import { useRecentlyPlayedGames } from '../hooks/useRecentlyPlayedGames'
import './PlatformPages.css'

const gameOptions = ['All games', ...featuredGameNames]
const profileGameNames = allGames.map(({ name }) => name)
const communityIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

const playerData = [
  { name: 'vexx', tag: '#NXR', game: 'Valorant', country: 'Sweden', region: 'Europe', rank: 'Radiant', avatar: 'V', color: 'purple', looking: 'Ranked · evenings' },
  { name: 'Kairo', tag: '#404', game: 'Apex Legends', country: 'Canada', region: 'North America', rank: 'Master', avatar: 'K', color: 'blue', looking: 'Chill games · weekends' },
  { name: 's0laris', tag: '#ECL', game: 'Counter-Strike 2', country: 'Germany', region: 'Europe', rank: 'Global Elite', avatar: 'S', color: 'orange', looking: 'Premier · team practice' },
  { name: 'Mori', tag: '#LUNA', game: 'League of Legends', country: 'Japan', region: 'Asia Pacific', rank: 'Diamond', avatar: 'M', color: 'teal', looking: 'Flex queue · evenings' },
]

const teamData = [
  { name: 'ECLIPSE', game: 'Valorant', region: 'Europe', members: '5 / 7', focus: 'Tournament roster', description: 'A developing competitive roster looking for two flexible players for regular scrims.', color: 'purple' },
  { name: 'NORTHSTAR', game: 'Apex Legends', region: 'North America', members: '9 / 12', focus: 'Competitive & community', description: 'A mixed competitive and community squad with room for new teammates.', color: 'blue' },
  { name: 'AFTER HOURS', game: 'Counter-Strike 2', region: 'Global', members: '14 / 20', focus: 'Premier · relaxed pace', description: 'A laid-back group for Premier games and late-night queues across regions.', color: 'orange' },
]

function PageIntro({ eyebrow, title, description, children }: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <header className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="page-intro-aside">{children}</div>
    </header>
  )
}

function PreviewLabel({ children = 'SAMPLE DATA' }: { children?: string }) {
  return <span className="sample-tag">{children}</span>
}

function PreviewNote({ children = 'Demonstration content only. No live platform data is connected.' }: { children?: ReactNode }) {
  return <p className="page-preview-note"><Zap size={13} aria-hidden="true" />{children}</p>
}

function ApiDataNotice<T>({
  resource,
  sourceName,
  fallbackText,
}: {
  resource: ApiResource<T>
  sourceName: string
  fallbackText: string
}) {
  if (resource.data !== null) {
    return <p className="api-data-notice is-live" role="status">{sourceName} loaded from the API.</p>
  }

  if (resource.loading) {
    return <p className="api-data-notice" role="status">Loading {sourceName}. {fallbackText}</p>
  }

  return (
    <div className="api-data-notice is-error" role="alert">
      <span>{sourceName} is unavailable: {resource.error?.message ?? 'The request failed.'} {fallbackText}</span>
      <button type="button" onClick={resource.retry}>Retry</button>
    </div>
  )
}

function gameNameForId(gameId: string, games: GameSummary[] | null) {
  return games?.find((game) => game.game_id === gameId)?.name
}

function formatStartDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function PreviewDialog({
  title,
  children,
  onClose,
  eyebrow = 'FEATURE PREVIEW',
  autoFocusClose = true,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  eyebrow?: string
  autoFocusClose?: boolean
}) {
  return (
    <div className="preview-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title">
        <div className="preview-dialog-heading">
          <div><p className="eyebrow">{eyebrow}</p><h2 id="preview-dialog-title">{title}</h2></div>
          <button type="button" className="preview-dialog-close" onClick={onClose} aria-label="Close dialog" autoFocus={autoFocusClose}><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function SearchField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="page-search">
      <Search size={16} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} />
    </label>
  )
}

function FilterSelect({ value, onChange, options, label, disabled = false }: {
  value: string
  onChange: (value: string) => void
  options: string[]
  label: string
  disabled?: boolean
}) {
  return (
    <label className="page-filter">
      <span className="visually-hidden">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronRight size={14} aria-hidden="true" />
    </label>
  )
}

type CommunityDraft = {
  name: string
  gameSlug: string
  region: string
  description: string
  logoUrl: string
  bannerUrl: string
}

type CommunityIdempotencyEntry = {
  fingerprint: string
  key: string
  createdAt: number
}

const communityIdempotencyStoragePrefix = 'nexus-velorix.community-create-idempotency.v1'
const communityIdempotencyRetentionMs = 30 * 24 * 60 * 60 * 1000
const communityIdempotencyMaxEntries = 20
const communityIdempotencyEntryPattern = /^[0-9a-f]{64}$/
const inMemoryCommunityIdempotency = new Map<string, string>()

async function hashIdempotencyValue(value: string): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle || typeof TextEncoder === 'undefined') return null

  try {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

function isCommunityIdempotencyEntry(value: unknown): value is CommunityIdempotencyEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<CommunityIdempotencyEntry>
  return typeof entry.fingerprint === 'string'
    && communityIdempotencyEntryPattern.test(entry.fingerprint)
    && typeof entry.key === 'string'
    && communityIdPattern.test(entry.key)
    && typeof entry.createdAt === 'number'
    && Number.isFinite(entry.createdAt)
}

function readCommunityIdempotencyEntries(storageKey: string): CommunityIdempotencyEntry[] | null {
  if (typeof window === 'undefined') return null

  let serialized: string | null
  try {
    serialized = window.localStorage.getItem(storageKey)
  } catch {
    return null
  }
  if (!serialized) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      return []
    }
    return []
  }
  if (!Array.isArray(parsed)) return []

  const oldestAllowed = Date.now() - communityIdempotencyRetentionMs
  return parsed
    .filter(isCommunityIdempotencyEntry)
    .filter(({ createdAt }) => createdAt >= oldestAllowed && createdAt <= Date.now())
    .slice(-communityIdempotencyMaxEntries)
}

function writeCommunityIdempotencyEntries(storageKey: string, entries: CommunityIdempotencyEntry[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(entries.slice(-communityIdempotencyMaxEntries)))
  } catch {
    // Storage is best-effort; the in-memory cache still supports retries in this page session.
  }
}

async function getCommunityIdempotencyKey(userId: string, payload: CommunityCreateRequest): Promise<string> {
  const serializedPayload = JSON.stringify(payload)
  const [userScope, fingerprint] = await Promise.all([
    hashIdempotencyValue(userId),
    hashIdempotencyValue(serializedPayload),
  ])
  const memoryFingerprint = `${userScope ?? userId}:${fingerprint ?? serializedPayload}`
  const cachedKey = inMemoryCommunityIdempotency.get(memoryFingerprint)
  if (cachedKey) return cachedKey

  if (userScope && fingerprint) {
    const storageKey = `${communityIdempotencyStoragePrefix}.${userScope}`
    const entries = readCommunityIdempotencyEntries(storageKey)
    const existing = entries?.find((entry) => entry.fingerprint === fingerprint)
    if (existing) {
      inMemoryCommunityIdempotency.set(memoryFingerprint, existing.key)
      return existing.key
    }

    const key = crypto.randomUUID()
    const nextEntries = [
      ...(entries ?? []),
      { fingerprint, key, createdAt: Date.now() },
    ].slice(-communityIdempotencyMaxEntries)
    writeCommunityIdempotencyEntries(storageKey, nextEntries)
    inMemoryCommunityIdempotency.set(memoryFingerprint, key)
    return key
  }

  const key = crypto.randomUUID()
  inMemoryCommunityIdempotency.set(memoryFingerprint, key)
  return key
}

async function forgetCommunityIdempotencyKey(userId: string, payload: CommunityCreateRequest, key: string) {
  const serializedPayload = JSON.stringify(payload)
  const [userScope, fingerprint] = await Promise.all([
    hashIdempotencyValue(userId),
    hashIdempotencyValue(serializedPayload),
  ])
  const memoryFingerprint = `${userScope ?? userId}:${fingerprint ?? serializedPayload}`
  if (inMemoryCommunityIdempotency.get(memoryFingerprint) === key) {
    inMemoryCommunityIdempotency.delete(memoryFingerprint)
  }
  if (!userScope || !fingerprint) return

  const storageKey = `${communityIdempotencyStoragePrefix}.${userScope}`
  const entries = readCommunityIdempotencyEntries(storageKey)
  if (entries) {
    writeCommunityIdempotencyEntries(
      storageKey,
      entries.filter((entry) => entry.fingerprint !== fingerprint || entry.key !== key),
    )
  }
}

function isValidHttpsImageUrl(value: string) {
  if (!value.trim()) return true
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

function CommunityDraftPreview({ draft }: { draft: CommunityDraft }) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const [failedBannerUrl, setFailedBannerUrl] = useState<string | null>(null)
  const game = allGames.find(({ slug }) => slug === draft.gameSlug)
  const logoUrl = isValidHttpsImageUrl(draft.logoUrl) ? draft.logoUrl.trim() : ''
  const bannerUrl = isValidHttpsImageUrl(draft.bannerUrl) ? draft.bannerUrl.trim() : ''

  return (
    <aside className="community-create-preview" aria-label="Live community preview">
      <div className="community-create-preview-banner">
        {bannerUrl && failedBannerUrl !== bannerUrl && (
          <img
            src={bannerUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedBannerUrl(bannerUrl)}
          />
        )}
        <div className="community-create-preview-logo">
          {logoUrl && failedLogoUrl !== logoUrl
            ? <img src={logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedLogoUrl(logoUrl)} />
            : <Users size={24} aria-hidden="true" />}
        </div>
      </div>
      <div className="community-create-preview-content">
        <span className="sample-tag">PREVIEW ONLY · NOT SAVED</span>
        <h3>{draft.name.trim() || 'Community name'}</h3>
        <p>{game?.name ?? 'Select a game'}{draft.region.trim() ? ` · ${draft.region.trim()}` : ''}</p>
        <p>{draft.description.trim() || 'Your community description will appear here.'}</p>
      </div>
    </aside>
  )
}

type CommunityCreationFormProps = {
  userId: string
  games: GameSummary[] | null
  gamesLoading: boolean
  gamesError: string | null
  directoryRefreshing: boolean
  directoryRefreshError: string | null
  onRetryGames: () => void
  onCreated: () => void
}

type CommunityFormStatus = {
  kind: 'info' | 'success' | 'error'
  message: string
} | null

function CommunityCreationForm({
  userId,
  games,
  gamesLoading,
  gamesError,
  directoryRefreshing,
  directoryRefreshError,
  onRetryGames,
  onCreated,
}: CommunityCreationFormProps) {
  const [draft, setDraft] = useState<CommunityDraft>({
    name: '',
    gameSlug: '',
    region: '',
    description: '',
    logoUrl: '',
    bannerUrl: '',
  })
  const [status, setStatus] = useState<CommunityFormStatus>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdCommunity, setCreatedCommunity] = useState<CommunitySummary | null>(null)
  const submissionInProgress = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const regionInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const selectedDatabaseGame = games?.find(({ slug }) => slug === draft.gameSlug)
  const gameId = selectedDatabaseGame?.game_id
  const hasValidGameId = Boolean(gameId && communityIdPattern.test(gameId))

  const validateDraft = (form: HTMLFormElement) => {
    const name = nameInputRef.current
    const region = regionInputRef.current
    const description = descriptionInputRef.current
    const logo = logoInputRef.current
    const banner = bannerInputRef.current

    name?.setCustomValidity(name.value.trim().length < 3 ? 'Enter a community name with at least 3 non-space characters.' : '')
    region?.setCustomValidity(region.value.trim().length < 2 ? 'Enter a region with at least 2 non-space characters.' : '')
    description?.setCustomValidity(description.value.trim().length < 20 ? 'Enter a description with at least 20 non-space characters.' : '')
    logo?.setCustomValidity(isValidHttpsImageUrl(logo.value) ? '' : 'Enter a valid HTTPS image URL.')
    banner?.setCustomValidity(isValidHttpsImageUrl(banner.value) ? '' : 'Enter a valid HTTPS image URL.')

    return form.reportValidity()
  }

  const handlePreviewValidation = () => {
    const form = formRef.current
    if (!form || !validateDraft(form)) {
      setStatus(null)
      return
    }
    if (!hasValidGameId) {
      setStatus({
        kind: 'error',
        message: 'This game is not available in the connected database catalog and cannot be submitted.',
      })
      return
    }
    setStatus({
      kind: 'info',
      message: 'Draft validation passed. This preview has not been submitted.',
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submissionInProgress.current || createdCommunity) return
    if (!validateDraft(event.currentTarget)) {
      setStatus(null)
      return
    }
    if (!gameId || !communityIdPattern.test(gameId)) {
      setStatus({
        kind: 'error',
        message: 'This game is not available in the connected database catalog and cannot be submitted.',
      })
      return
    }

    const payload: CommunityCreateRequest = {
      name: draft.name.trim(),
      game_id: gameId,
      region: draft.region.trim(),
      description: draft.description.trim(),
      logo_url: draft.logoUrl.trim() || null,
      banner_url: draft.bannerUrl.trim() || null,
    }
    submissionInProgress.current = true
    setSubmitting(true)
    setStatus({ kind: 'info', message: 'Creating community…' })
    try {
      const idempotencyKey = await getCommunityIdempotencyKey(userId, payload)
      const created = await communitiesApi.create(payload, idempotencyKey)
      if (!communityIdPattern.test(created.community_id)) {
        throw new ApiError('invalid_response', 'The API returned an invalid community ID.')
      }
      await forgetCommunityIdempotencyKey(userId, payload, idempotencyKey)
      setCreatedCommunity(created)
      setStatus({
        kind: 'success',
        message: 'Community created. The API confirmed the saved record.',
      })
      onCreated()
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof ApiError
          ? error.message
          : 'Community creation could not be completed. Please try again.',
      })
    } finally {
      submissionInProgress.current = false
      setSubmitting(false)
    }
  }

  const updateImageUrl = (field: 'logoUrl' | 'bannerUrl', value: string, input: HTMLInputElement) => {
    input.setCustomValidity(isValidHttpsImageUrl(value) ? '' : 'Enter a valid HTTPS image URL.')
    setDraft((current) => ({ ...current, [field]: value }))
    setStatus(null)
  }

  return (
    <div className="community-create-layout">
      <form ref={formRef} className="community-create-form" onSubmit={handleSubmit}>
        <p className="community-create-notice">
          Creation is sent to the connected API. A community is saved only after the API confirms the created record.
        </p>
        <div className="profile-form-fields community-create-fields">
          <label className="community-create-full-field">
            Community name
            <input
              ref={nameInputRef}
              autoFocus
              name="communityName"
              type="text"
              value={draft.name}
              onChange={(event) => {
                nameInputRef.current?.setCustomValidity(event.target.value.trim().length < 3 ? 'Enter a community name with at least 3 non-space characters.' : '')
                setDraft((current) => ({ ...current, name: event.target.value }))
                setStatus(null)
              }}
              minLength={3}
              maxLength={120}
              autoComplete="organization"
              required
              disabled={submitting || createdCommunity !== null}
            />
            <small>3–120 characters</small>
          </label>
          <label>
            Game
            <select
              name="game"
              value={draft.gameSlug}
              onChange={(event) => {
                setDraft((current) => ({ ...current, gameSlug: event.target.value }))
                setStatus(null)
              }}
              disabled={gamesLoading || gamesError !== null || submitting || createdCommunity !== null}
              required
            >
              <option value="">Select a game</option>
              {allGames.map((game) => <option key={game.slug} value={game.slug}>{game.name}</option>)}
            </select>
          </label>
          {gamesLoading && <small className="community-create-game-state" role="status">Loading database-backed games…</small>}
          {gamesError && (
            <p className="community-create-game-error" role="alert">
              The game catalog is unavailable: {gamesError}
              <button type="button" onClick={onRetryGames}>Retry games</button>
            </p>
          )}
          {draft.gameSlug && !gamesLoading && !gamesError && !hasValidGameId && (
            <p className="community-create-game-error" role="alert">
              {allGames.find(({ slug }) => slug === draft.gameSlug)?.name ?? 'This game'} is not available in the connected database catalog and cannot be submitted.
            </p>
          )}
          <label>
            Region
            <input
              ref={regionInputRef}
              name="region"
              type="text"
              value={draft.region}
              onChange={(event) => {
                regionInputRef.current?.setCustomValidity(event.target.value.trim().length < 2 ? 'Enter a region with at least 2 non-space characters.' : '')
                setDraft((current) => ({ ...current, region: event.target.value }))
                setStatus(null)
              }}
              minLength={2}
              maxLength={80}
              autoComplete="country-name"
              required
              disabled={submitting || createdCommunity !== null}
            />
          </label>
          <label className="profile-bio-field community-create-full-field">
            Description
            <textarea
              ref={descriptionInputRef}
              name="description"
              value={draft.description}
              onChange={(event) => {
                descriptionInputRef.current?.setCustomValidity(event.target.value.trim().length < 20 ? 'Enter a description with at least 20 non-space characters.' : '')
                setDraft((current) => ({ ...current, description: event.target.value }))
                setStatus(null)
              }}
              minLength={20}
              maxLength={500}
              rows={4}
              required
              disabled={submitting || createdCommunity !== null}
            />
            <small>{draft.description.length}/500 characters · at least 20 required</small>
          </label>
          <label className="community-create-full-field">
            Logo URL <span className="community-create-optional">(optional)</span>
            <input
              ref={logoInputRef}
              name="logoUrl"
              type="url"
              value={draft.logoUrl}
              onChange={(event) => updateImageUrl('logoUrl', event.target.value, event.currentTarget)}
              pattern="https://.+"
              maxLength={2048}
              placeholder="https://example.com/logo.png"
              aria-describedby="community-logo-help"
              disabled={submitting || createdCommunity !== null}
            />
            <small id="community-logo-help">Use a valid HTTPS image URL.</small>
          </label>
          <label className="community-create-full-field">
            Banner URL <span className="community-create-optional">(optional)</span>
            <input
              ref={bannerInputRef}
              name="bannerUrl"
              type="url"
              value={draft.bannerUrl}
              onChange={(event) => updateImageUrl('bannerUrl', event.target.value, event.currentTarget)}
              pattern="https://.+"
              maxLength={2048}
              placeholder="https://example.com/banner.jpg"
              aria-describedby="community-banner-help"
              disabled={submitting || createdCommunity !== null}
            />
            <small id="community-banner-help">Use a valid HTTPS image URL.</small>
          </label>
        </div>
        {status && (
          <p className={`community-create-status is-${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>
            {status.message}
          </p>
        )}
        <div className="community-create-actions">
          <button
            className="button button-outline"
            type="button"
            onClick={handlePreviewValidation}
            disabled={submitting || createdCommunity !== null}
          >
            Validate preview
          </button>
          <button
            className="button button-primary"
            type="submit"
            disabled={submitting || createdCommunity !== null || gamesLoading || gamesError !== null || !hasValidGameId}
          >
            {submitting ? 'Creating…' : 'Create community'}
          </button>
        </div>
        {createdCommunity && (
          <div className="community-create-follow-up">
            {directoryRefreshing ? (
              <p role="status">Refreshing the community directory…</p>
            ) : (
              <>
                {directoryRefreshError ? (
                  <p role="alert">Community creation succeeded, but the directory could not be refreshed: {directoryRefreshError}</p>
                ) : (
                  <p role="status">Community directory refreshed.</p>
                )}
                <Link
                  className="button button-primary"
                  to={`/community/${encodeURIComponent(createdCommunity.community_id)}`}
                >
                  View community <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        )}
      </form>
      <CommunityDraftPreview draft={draft} />
    </div>
  )
}

function CommunityPage() {
  const [query, setQuery] = useState('')
  const [game, setGame] = useState('All games')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const loadCommunities = useCallback(
    (signal: AbortSignal) => communitiesApi.list({ limit: 100, signal }),
    [],
  )
  const loadGames = useCallback(
    (signal: AbortSignal) => gamesApi.list({ limit: 100, signal }),
    [],
  )
  const liveCommunities = useApiResource(loadCommunities, 'communities')
  const liveGames = useApiResource(loadGames, 'community-game-catalog')
  const showingLive = liveCommunities.data !== null
  const filteredLive = (liveCommunities.data ?? []).filter((community) => {
    const gameName = gameNameForId(community.game_id, liveGames.data)
    const matchesQuery = `${community.name} ${community.region} ${community.description ?? ''} ${gameName ?? ''} ${community.game_id}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (game === 'All games' || gameName === game)
  })

  return (
    <div className="platform-page">
      <PageIntro eyebrow="FIND YOUR PEOPLE" title="Communities" description="Explore gaming groups returned by the connected community directory.">
        <div className="page-actions">
          <PreviewLabel>{showingLive ? 'LIVE DIRECTORY' : liveCommunities.loading ? 'LOADING' : 'NO LIVE DATA'}</PreviewLabel>
          <button
            type="button"
            className="button button-outline"
            onClick={() => setShowCreateDialog(true)}
            disabled={authLoading}
            aria-haspopup="dialog"
            aria-expanded={showCreateDialog}
          >
            {authLoading ? 'Checking session…' : 'Create a community'} <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </PageIntro>
      <ApiDataNotice resource={liveCommunities} sourceName="Community directory" fallbackText="No live community listings are available." />
      <div className="directory-toolbar">
        <SearchField value={query} onChange={setQuery} label="Search communities" />
        <FilterSelect value={game} onChange={setGame} options={gameOptions} label="Filter communities by game" />
        <span className="result-count">{showingLive ? `${filteredLive.length} LIVE COMMUNITIES` : liveCommunities.loading ? 'LOADING COMMUNITIES' : 'NO LIVE LISTINGS'}</span>
      </div>
      {showingLive ? (
        <div className="directory-grid">
          {filteredLive.map((community: CommunitySummary) => (
            <Link
              className="directory-card community-directory-card community-directory-link"
              key={community.community_id}
              to={`/community/${encodeURIComponent(community.community_id)}`}
              aria-label={`View ${community.name} community details`}
            >
              <div className="directory-emblem violet"><Users size={22} aria-hidden="true" /></div>
              <div className="directory-card-heading"><span className="live-data-label">LIVE</span><span>{community.region}</span></div>
              <h2>{community.name}</h2>
              <p>{gameNameForId(community.game_id, liveGames.data) ?? `Game ID ${community.game_id.slice(0, 8)}`}</p>
              {community.description && <p>{community.description}</p>}
              <div className="directory-card-foot"><span><Users size={14} aria-hidden="true" /> {community.member_count.toLocaleString()} members</span><span>API RECORD</span></div>
            </Link>
          ))}
          {filteredLive.length === 0 && <div className="page-empty"><Search size={22} /><strong>No live communities found</strong><span>The API returned no records for these filters.</span></div>}
        </div>
      ) : !liveCommunities.loading && (
        <div className="page-empty"><Users size={22} /><strong>No live community listings</strong><span>The directory will show communities when the API returns records.</span></div>
      )}
      {showCreateDialog && (
        <PreviewDialog
          title={user ? 'Create a community' : 'Sign in to create a community'}
          eyebrow={user ? 'COMMUNITY SETUP' : 'ACCOUNT REQUIRED'}
          autoFocusClose={!user}
          onClose={() => setShowCreateDialog(false)}
        >
          {user ? (
            <CommunityCreationForm
              userId={user.id}
              games={liveGames.data}
              gamesLoading={liveGames.loading}
              gamesError={liveGames.error?.message ?? null}
              directoryRefreshing={liveCommunities.loading}
              directoryRefreshError={liveCommunities.error?.message ?? null}
              onRetryGames={liveGames.retry}
              onCreated={liveCommunities.retry}
            />
          ) : (
            <div className="community-auth-gate">
              <p>Sign in to create a community. Your account is required to submit and manage a community.</p>
              <Link className="button button-primary" to="/login">Sign in <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          )}
        </PreviewDialog>
      )}
    </div>
  )
}

function CommunityArtwork({ community }: { community: CommunitySummary }) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const [failedBannerUrl, setFailedBannerUrl] = useState<string | null>(null)

  return (
    <div className="community-detail-artwork">
      {community.banner_url && failedBannerUrl !== community.banner_url && (
        <img
          className="community-detail-banner-image"
          src={community.banner_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedBannerUrl(community.banner_url ?? null)}
        />
      )}
      <div className="community-detail-banner-caption">COMMUNITY PROFILE</div>
      <div className="community-detail-logo">
        {community.logo_url && failedLogoUrl !== community.logo_url
          ? <img src={community.logo_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedLogoUrl(community.logo_url ?? null)} />
          : <Users size={31} aria-hidden="true" />}
      </div>
    </div>
  )
}

function CommunityDetailPage() {
  const { communityId = '' } = useParams()
  const validCommunityId = communityIdPattern.test(communityId)
  const loadCommunity = useCallback(
    (signal: AbortSignal) => communitiesApi.get(communityId, { signal }),
    [communityId],
  )
  const communityResource = useApiResource(
    loadCommunity,
    `community:${communityId}`,
    validCommunityId,
  )
  const gameId = communityResource.data?.game_id
  const loadGame = useCallback(
    (signal: AbortSignal) => gamesApi.get(gameId ?? '', { signal }),
    [gameId],
  )
  const gameResource = useApiResource(
    loadGame,
    `community-game:${gameId ?? 'unavailable'}`,
    Boolean(gameId),
  )
  const community = communityResource.data
  const notFound = !validCommunityId
    || communityResource.error?.kind === 'not_found'
    || communityResource.error?.status === 404
    || communityResource.error?.status === 422

  return (
    <div className="platform-page">
      <PageIntro
        eyebrow="COMMUNITY PROFILE"
        title={community?.name ?? (notFound ? 'Community not found' : 'Community details')}
        description="Community information is provided by the connected directory."
      >
        <Link className="button button-outline" to="/community">
          <ArrowLeft size={14} aria-hidden="true" /> Back to Communities
        </Link>
      </PageIntro>
      {!validCommunityId ? (
        <div className="community-detail-state page-empty" role="status">
          <Users size={22} aria-hidden="true" />
          <strong>Community not found</strong>
          <span>The community ID in this link is invalid.</span>
        </div>
      ) : communityResource.loading ? (
        <div className="community-detail-state page-empty" role="status">
          <Users size={22} aria-hidden="true" />
          <strong>Loading community</strong>
          <span>Community details are being requested from the API.</span>
        </div>
      ) : notFound ? (
        <div className="community-detail-state page-empty" role="status">
          <Users size={22} aria-hidden="true" />
          <strong>Community not found</strong>
          <span>This community may have been removed or is not available.</span>
        </div>
      ) : communityResource.error ? (
        <div className="community-detail-error api-data-notice is-error" role="alert">
          <span>Community details are unavailable: {communityResource.error.message}</span>
          <button type="button" onClick={communityResource.retry}>Retry</button>
        </div>
      ) : community ? (
        <section className="community-detail-card" aria-label={`${community.name} community details`}>
          <CommunityArtwork community={community} />
          <div className="community-detail-content">
            <section className="community-detail-about" aria-labelledby="community-about-title">
              <p className="eyebrow">ABOUT THIS COMMUNITY</p>
              <h2 id="community-about-title">About the community</h2>
              <p>{community.description || 'No description has been added.'}</p>
            </section>
            <dl className="community-detail-facts">
              <div>
                <dt>GAME</dt>
                <dd>
                  {gameResource.data?.name ?? (gameResource.loading ? 'Loading game details…' : 'Game information unavailable')}
                  {gameResource.error && (
                    <button className="community-game-retry" type="button" onClick={gameResource.retry}>
                      Retry game lookup
                    </button>
                  )}
                </dd>
              </div>
              <div><dt>REGION</dt><dd>{community.region}</dd></div>
              <div><dt>MEMBERS</dt><dd>{community.member_count.toLocaleString()}</dd></div>
              <div><dt>COMMUNITY ID</dt><dd><code>{community.community_id}</code></dd></div>
            </dl>
          </div>
          <div className="community-detail-actions">
            <button className="button button-primary" type="button" disabled>
              Join community <ArrowRight size={14} aria-hidden="true" />
            </button>
            <span>Joining and leaving are not available yet.</span>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function GamesPage() {
  const [query, setQuery] = useState('')
  const { recentlyPlayed, storageAvailable } = useRecentlyPlayedGames()
  const loadDatabaseGames = useCallback(
    (signal: AbortSignal) => gamesApi.list({ limit: 100, signal }),
    [],
  )
  const databaseGames = useApiResource(loadDatabaseGames, 'database-games')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredGames = allGames.filter((game) => (
    !normalizedQuery ||
    `${game.name} ${game.genre} ${game.category}`.toLowerCase().includes(normalizedQuery)
  ))
  const filteredDatabaseGames = (databaseGames.data ?? []).filter((game) => (
    !normalizedQuery ||
    `${game.name} ${game.genre ?? ''} ${game.slug}`.toLowerCase().includes(normalizedQuery)
  ))

  return (
    <div className="platform-page games-page">
      <PageIntro eyebrow="PICK YOUR PLAYGROUND" title="Games" description="Discover the games bringing players together. Find your title, then explore its community.">
        <PreviewLabel>{`${allGames.length} GAME CATALOG`}</PreviewLabel>
      </PageIntro>
      <ApiDataNotice resource={databaseGames} sourceName="Database game catalog" fallbackText="The local 66-game catalog is preserved." />
      {databaseGames.data !== null && (
        <section className="api-live-section" aria-labelledby="database-games-heading">
          <div className="game-discovery-heading">
            <div>
              <p className="eyebrow">DATABASE RECORDS</p>
              <h2 id="database-games-heading">Games available from FastAPI</h2>
              <p>{filteredDatabaseGames.length} live records returned; this does not represent the full local catalog.</p>
            </div>
            <span className="live-data-label">LIVE API</span>
          </div>
          {filteredDatabaseGames.length > 0 ? (
            <div className="api-live-list">
              {filteredDatabaseGames.map((game) => {
                const content = (
                  <>
                    <Gamepad2 size={20} aria-hidden="true" />
                    <span><strong>{game.name}</strong><small>{game.genre ?? 'Genre not provided'} · {game.slug}</small></span>
                    {gamesBySlug.has(game.slug) && <ArrowRight size={14} aria-hidden="true" />}
                  </>
                )
                return gamesBySlug.has(game.slug)
                  ? <Link className="api-live-item" to={`/games/${game.slug}`} key={game.game_id}>{content}</Link>
                  : <article className="api-live-item" key={game.game_id}>{content}</article>
              })}
            </div>
          ) : (
            <div className="page-empty"><Gamepad2 size={22} /><strong>No live game records</strong><span>The API returned an empty games list.</span></div>
          )}
        </section>
      )}
      <div className="game-library-layout">
        <GamesSidebar
          query={query}
          onQueryChange={setQuery}
          recentlyPlayed={recentlyPlayed}
          storageAvailable={storageAvailable}
        />
        <section className="game-library-main" aria-label="All games">
          {!normalizedQuery && (
            <>
              <section className="game-discovery-section" aria-labelledby="featured-games-heading">
                <div className="game-discovery-heading">
                  <div>
                    <p className="eyebrow">HANDPICKED FOR THE NEXUS</p>
                    <h2 id="featured-games-heading">Featured games</h2>
                    <p>Explore standout titles from across the library.</p>
                  </div>
                  <span className="game-curation-label">EDITOR'S PICKS</span>
                </div>
                <div className="game-feature-grid">
                  {featuredGames.map((game) => (
                    <Link className="game-feature-card" to={`/games/${game.slug}`} key={game.slug}>
                      <GameIcon game={game} />
                      <span className="game-feature-copy">
                        <span>{game.category}</span>
                        <strong>{game.name}</strong>
                        <small>{game.description}</small>
                      </span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
              <section className="game-discovery-section game-trending-section" aria-labelledby="trending-games-heading">
                <div className="game-discovery-heading">
                  <div>
                    <p className="eyebrow">COMMUNITY SPOTLIGHT</p>
                    <h2 id="trending-games-heading">Trending games</h2>
                    <p>Curated catalog picks—not live popularity rankings.</p>
                  </div>
                  <span className="game-curation-label"><Flame size={13} aria-hidden="true" /> CURATED</span>
                </div>
                <div className="game-trending-grid">
                  {trendingGames.map((game) => (
                    <Link className="game-trending-card" to={`/games/${game.slug}`} key={game.slug}>
                      <span className="game-trending-art"><GameIcon game={game} size="small" /></span>
                      <span className="game-trending-copy">
                        <strong>{game.name}</strong>
                        <small>{game.category}</small>
                      </span>
                      <span className="game-trending-badge">TRENDING PICK</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
          <div className="game-library-toolbar">
            <div>
              <p className="eyebrow">THE FULL LIBRARY</p>
              <p>{filteredGames.length} {filteredGames.length === 1 ? 'GAME' : 'GAMES'} FOUND</p>
            </div>
            <span>Browse 9 categories</span>
          </div>
          <div className="game-catalog-grid">
            {filteredGames.map((game) => (
              <Link className="game-catalog-card" to={`/games/${game.slug}`} key={game.slug}>
                <GameIcon game={game} />
                <span className="game-catalog-copy">
                  <span>{game.category}</span>
                  <strong>{game.name}</strong>
                  <small>{game.genre}</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
          {filteredGames.length === 0 && (
            <div className="page-empty">
              <Search size={22} />
              <strong>No games found</strong>
              <span>Try a different title, genre, or category.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function GameDetailsPage() {
  const { gameSlug } = useParams()
  const game = gameSlug ? gamesBySlug.get(gameSlug) : undefined
  const [query, setQuery] = useState('')
  const { recentlyPlayed, markPlayed, storageAvailable } = useRecentlyPlayedGames()

  if (!game) return <NotFoundPage />

  const isRecentlyPlayed = recentlyPlayed.some((recentGame) => recentGame.slug === game.slug)

  return (
    <div className="platform-page games-page game-details-page">
      <PageIntro
        eyebrow={game.category.toUpperCase()}
        title={game.name}
        description={`Your ${game.genre.toLowerCase()} destination in the Nexus gaming library.`}
      >
        <PreviewLabel>GAME PROFILE</PreviewLabel>
      </PageIntro>
      <div className="game-library-layout">
        <GamesSidebar
          activeGameSlug={game.slug}
          query={query}
          onQueryChange={setQuery}
          recentlyPlayed={recentlyPlayed}
          storageAvailable={storageAvailable}
        />
        <section className="game-detail-main" aria-label={`${game.name} details`}>
          <section className={`game-detail-hero game-tone--${game.tone}`}>
            <GameIcon game={game} size="large" />
            <div className="game-detail-copy">
              <span>{game.category}</span>
              <h2>{game.name}</h2>
              <p>{game.genre}</p>
              <div className="game-detail-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => markPlayed(game)}
                >
                  <Clock3 size={15} aria-hidden="true" />
                  {isRecentlyPlayed ? 'Play again' : 'Mark as played'}
                </button>
                <Link to="/community" className="button button-primary">
                  Find a community <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
          <p className="game-detail-note" role="status">
            {isRecentlyPlayed
              ? 'Added to your recently played list on this device.'
              : 'Game catalog preview. Community activity and live game data are not connected.'}
          </p>
          {!storageAvailable && (
            <p className="game-detail-note game-detail-note--warning">
              Browser storage is unavailable, so recent games will only last for this session.
            </p>
          )}
          <section className="game-detail-about">
            <p className="eyebrow">GAME PROFILE</p>
            <h2>Find your next session.</h2>
            <p>
              Explore {game.name} communities and meet players with similar interests.
              Game-specific community listings are not loaded on this page yet.
            </p>
            <Link to="/community" className="text-link">
              Browse communities <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </section>
          <section className="game-stat-section" aria-labelledby="game-stats-heading">
            <div className="game-stat-heading">
              <div>
                <p className="eyebrow">COMMUNITY SNAPSHOT</p>
                <h2 id="game-stats-heading">Ratings &amp; player activity</h2>
              </div>
              <span>LIVE DATA UNAVAILABLE</span>
            </div>
            <div className="game-stat-grid">
              <article className="game-stat-card">
                <span>COMMUNITY RATING</span>
                <strong>Unavailable</strong>
                <small>No verified rating data is connected.</small>
              </article>
              <article className="game-stat-card">
                <span>ACTIVE PLAYERS</span>
                <strong>Unavailable</strong>
                <small>Live player statistics are not connected.</small>
              </article>
            </div>
          </section>
        </section>
      </div>
    </div>
  )
}

function PlayersPage() {
  const [query, setQuery] = useState('')
  const [game, setGame] = useState('All games')
  const loadUsers = useCallback(
    (signal: AbortSignal) => usersApi.list({ limit: 100, signal }),
    [],
  )
  const directory = useApiResource(loadUsers, 'player-directory')
  const showingLive = directory.data !== null
  const filteredSample = playerData.filter((player) => `${player.name} ${player.country} ${player.rank}`.toLowerCase().includes(query.toLowerCase()) && (game === 'All games' || player.game === game))
  const filteredLive = (directory.data ?? []).filter((player) => (
    `${player.display_name} ${player.user_id}`.toLowerCase().includes(query.toLowerCase())
  ))

  return (
    <div className="platform-page">
      <PageIntro eyebrow="MEET YOUR NEXT TEAMMATE" title="Player profiles" description={showingLive ? 'Browse public player names from the connected directory.' : 'Get to know the players behind the tags. Search this sample directory by player or game.'}>
        <PreviewLabel>{showingLive ? 'LIVE DIRECTORY' : 'SAMPLE DATA'}</PreviewLabel>
      </PageIntro>
      <ApiDataNotice resource={directory} sourceName="Public player directory" fallbackText="The sample directory is shown instead." />
      <div className="directory-toolbar">
        <SearchField value={query} onChange={setQuery} label="Search players" />
        <FilterSelect value={showingLive ? 'All games' : game} onChange={setGame} options={gameOptions} label="Filter players by game" disabled={showingLive} />
        <span className="result-count">{showingLive ? filteredLive.length : filteredSample.length} {showingLive ? 'LIVE' : 'SAMPLE'} PLAYERS</span>
      </div>
      {showingLive ? (
        <div className="player-grid">
          {filteredLive.map((player) => (
            <article className="player-card api-player-card" key={player.user_id}>
              <div className="profile-avatar"><UserRound size={22} aria-hidden="true" /></div>
              <div className="profile-identity"><h2>{player.display_name}</h2><span>Public player profile</span></div>
              <span className="live-data-label">LIVE</span>
              <div className="profile-detail"><span>PUBLIC USER ID</span><strong>{player.user_id}</strong></div>
            </article>
          ))}
          {filteredLive.length === 0 && <div className="page-empty"><Search size={22} /><strong>No live players found</strong><span>The API returned no records matching this search.</span></div>}
        </div>
      ) : (
        <div className="player-grid">
          {filteredSample.map((player) => (
            <article className="player-card" key={player.name}>
              <div className={`profile-avatar ${player.color}`}>{player.avatar}</div>
              <div className="profile-identity"><h2>{player.name}</h2><span>{player.tag} <span className="profile-dot">·</span> {player.country}</span></div>
              <PreviewLabel />
              <div className="profile-detail"><span>MAIN GAME</span><strong>{player.game}</strong></div>
              <div className="profile-detail"><span>RANK</span><strong>{player.rank}</strong></div>
              <div className="profile-detail"><span>LOOKING FOR</span><strong>{player.looking}</strong></div>
              <div className="profile-region"><Globe2 size={13} aria-hidden="true" /> {player.region}</div>
            </article>
          ))}
          {filteredSample.length === 0 && <div className="page-empty"><Search size={22} /><strong>No sample players found</strong><span>Try another player name or game.</span></div>}
        </div>
      )}
    </div>
  )
}

function TournamentsPage() {
  const [game, setGame] = useState('All games')
  const loadTournaments = useCallback(
    (signal: AbortSignal) => tournamentsApi.list({ limit: 100, signal }),
    [],
  )
  const loadGames = useCallback(
    (signal: AbortSignal) => gamesApi.list({ limit: 100, signal }),
    [],
  )
  const liveTournaments = useApiResource(loadTournaments, 'tournaments')
  const liveGames = useApiResource(loadGames, 'tournament-game-catalog')
  const showingLive = liveTournaments.data !== null
  const filteredLive = (liveTournaments.data ?? []).filter((tournament) => (
    game === 'All games' || gameNameForId(tournament.game_id, liveGames.data) === game
  ))

  return (
    <div className="platform-page">
      <PageIntro eyebrow="COMPETE TOGETHER" title="Tournaments" description="Browse published event listings. Brackets, results, and registration are not available through the current API.">
        <PreviewLabel>{showingLive ? 'LIVE LISTINGS' : liveTournaments.loading ? 'LOADING' : 'NO LIVE DATA'}</PreviewLabel>
      </PageIntro>
      <ApiDataNotice resource={liveTournaments} sourceName="Tournament listings" fallbackText="No live tournament listings are available." />
      <div className="directory-toolbar">
        <FilterSelect value={game} onChange={setGame} options={gameOptions} label="Filter tournaments by game" />
        <span className="result-count">{showingLive ? `${filteredLive.length} LIVE EVENTS` : liveTournaments.loading ? 'LOADING EVENTS' : 'NO LIVE EVENTS'}</span>
      </div>
      {showingLive ? (
        <div className="tournament-page-list">
          {filteredLive.map((tournament: TournamentSummary) => (
            <article className="tournament-page-card" key={tournament.tournament_id}>
              <div className="tournament-page-date"><CalendarDays size={16} aria-hidden="true" /><span>{formatStartDate(tournament.starts_at)}</span></div>
              <div className="tournament-page-main">
                <span>{gameNameForId(tournament.game_id, liveGames.data) ?? `Game ID ${tournament.game_id.slice(0, 8)}`}</span>
                <h2>{tournament.name}</h2>
                <span className="tournament-status">{tournament.status.replaceAll('_', ' ').toUpperCase()} · LIVE</span>
              </div>
              <div className="tournament-page-actions"><span className="live-data-label">API RECORD</span></div>
            </article>
          ))}
          {filteredLive.length === 0 && <div className="page-empty"><CalendarDays size={22} /><strong>No live tournaments found</strong><span>The API returned no records for these filters.</span></div>}
        </div>
      ) : !liveTournaments.loading && (
        <div className="page-empty"><CalendarDays size={22} /><strong>No live tournament listings</strong><span>Published tournaments will appear here when the API returns records.</span></div>
      )}
      <section className="bracket-preview">
        <div className="bracket-heading"><div><p className="eyebrow">EVENT FORMAT</p><h2>Tournament brackets</h2></div><PreviewLabel>NOT AVAILABLE</PreviewLabel></div>
        <div className="page-empty bracket-empty"><Trophy size={22} /><strong>No bracket data</strong><span>The tournament API does not currently provide brackets or matchups.</span></div>
      </section>
      <section className="match-results-preview">
        <div><p className="eyebrow">MATCH RESULTS</p><h2>No results published</h2></div>
        <p>Verified results will appear here when the tournament API supports match data.</p>
        <PreviewLabel>NOT AVAILABLE</PreviewLabel>
      </section>
    </div>
  )
}

function LeaderboardsPage() {
  const [game, setGame] = useState('All games')
  const [scope, setScope] = useState('Global')
  const loadLeaderboard = useCallback(
    (signal: AbortSignal) => leaderboardsApi.list({ scope: 'global', limit: 100, signal }),
    [],
  )
  const loadGames = useCallback(
    (signal: AbortSignal) => gamesApi.list({ limit: 100, signal }),
    [],
  )
  const leaderboard = useApiResource(loadLeaderboard, 'global-leaderboard', scope === 'Global')
  const liveGames = useApiResource(loadGames, 'leaderboard-game-catalog')
  const showingLive = scope === 'Global' && leaderboard.data !== null
  const filteredLive = (leaderboard.data ?? []).filter((entry) => (
    game === 'All games' || gameNameForId(entry.game_id, liveGames.data) === game
  ))
  const displayedGames = new Set(filteredLive.map((entry) => entry.game_id)).size

  return (
    <div className="platform-page">
      <PageIntro eyebrow="PROVE YOUR PLACE" title="Leaderboards" description={showingLive ? 'View global scores returned by the connected leaderboard API.' : scope === 'Country' ? 'Country rankings are unavailable because the API does not provide country ranking data.' : 'Global rankings will appear when the leaderboard API returns records.'}>
        <PreviewLabel>{showingLive ? 'LIVE GLOBAL RANKINGS' : scope === 'Country' ? 'COUNTRY RANKINGS UNAVAILABLE' : leaderboard.loading ? 'LOADING' : 'NO LIVE DATA'}</PreviewLabel>
      </PageIntro>
      {scope === 'Global'
        ? <ApiDataNotice resource={leaderboard} sourceName="Global leaderboard" fallbackText="No live ranking data is available." />
        : <p className="api-data-notice" role="status">Country rankings are unavailable; the API does not expose country ranking data.</p>}
      <div className="directory-toolbar">
        <FilterSelect value={scope} onChange={setScope} options={['Global', 'Country']} label="Select ranking scope" />
        <FilterSelect value={game} onChange={setGame} options={gameOptions} label="Filter leaderboard by game" disabled={scope === 'Country'} />
        {showingLive && <span className="result-count">{filteredLive.length} LIVE RANKED PLAYERS</span>}
      </div>
      {showingLive && (
        <>
          <div className="leaderboard-stats">
            <div><span>VIEW</span><strong>GLOBAL LIVE RANKING</strong></div>
            <div><span>GAMES REPRESENTED</span><strong>{displayedGames}</strong></div>
            <div><span>ACHIEVEMENTS</span><strong>NOT PROVIDED BY API</strong></div>
          </div>
          <section className="ranking-table is-live" aria-label="Live global player rankings">
            <div className="ranking-table-header"><span>RANK</span><span>PUBLIC USER ID</span><span>GAME</span><span>SCORE</span></div>
            {filteredLive.map((entry: LeaderboardEntry) => (
              <div className="ranking-table-row" key={`${entry.game_id}-${entry.user_id}`}>
                <strong>{entry.rank}</strong>
                <span className="api-user-id">{entry.user_id}</span>
                <span>{gameNameForId(entry.game_id, liveGames.data) ?? `Game ID ${entry.game_id.slice(0, 8)}`}</span>
                <strong>{new Intl.NumberFormat().format(entry.score)}</strong>
              </div>
            ))}
            {filteredLive.length === 0 && <div className="page-empty"><Trophy size={22} /><strong>No live rankings found</strong><span>The API returned no records for this filter.</span></div>}
          </section>
        </>
      )}
      {!showingLive && !(scope === 'Global' && leaderboard.loading) && (
        <div className="page-empty"><Trophy size={22} /><strong>{scope === 'Country' ? 'Country rankings unavailable' : 'No live rankings available'}</strong><span>{scope === 'Country' ? 'The API does not provide country ranking data.' : 'Global rankings will appear here when the API returns records.'}</span></div>
      )}
    </div>
  )
}

function TeamsPage() {
  const [query, setQuery] = useState('')
  const [game, setGame] = useState('All games')
  const [selectedTeam, setSelectedTeam] = useState<(typeof teamData)[number] | TeamSummary | null>(null)
  const [showCreateInfo, setShowCreateInfo] = useState(false)
  const loadTeams = useCallback(
    (signal: AbortSignal) => teamsApi.list({ limit: 100, signal }),
    [],
  )
  const loadGames = useCallback(
    (signal: AbortSignal) => gamesApi.list({ limit: 100, signal }),
    [],
  )
  const teams = useApiResource(loadTeams, 'teams')
  const liveGames = useApiResource(loadGames, 'team-game-catalog')
  const showingLive = teams.data !== null
  const matchesSearch = (name: string, region: string) => `${name} ${region}`.toLowerCase().includes(query.toLowerCase())
  const filteredSample = teamData.filter((team) => (
    matchesSearch(team.name, team.region) && (game === 'All games' || team.game === game)
  ))
  const filteredLive = (teams.data ?? []).filter((team) => (
    matchesSearch(team.name, team.region) &&
    (game === 'All games' || gameNameForId(team.game_id, liveGames.data) === game)
  ))

  return (
    <div className="platform-page">
      <PageIntro eyebrow="BETTER AS A SQUAD" title="Teams & clans" description="Find a roster, build a crew, or discover teams looking for their next teammate.">
        <div className="page-actions"><PreviewLabel>{showingLive ? 'LIVE DIRECTORY' : 'SAMPLE DATA'}</PreviewLabel><button type="button" className="button button-outline" onClick={() => setShowCreateInfo(true)}>Create a team <ArrowRight size={14} /></button></div>
      </PageIntro>
      <ApiDataNotice resource={teams} sourceName="Teams directory" fallbackText="Sample team cards remain available." />
      <div className="directory-toolbar">
        <SearchField value={query} onChange={setQuery} label="Search teams" />
        <FilterSelect value={game} onChange={setGame} options={gameOptions} label="Filter teams by game" />
        <span className="result-count">{showingLive ? filteredLive.length : filteredSample.length} {showingLive ? 'LIVE' : 'SAMPLE'} TEAMS</span>
      </div>
      <div className="team-grid">
        {showingLive
          ? filteredLive.map((team: TeamSummary) => (
            <article className="team-card" key={team.team_id}>
              <div className="team-crest blue"><Shield size={23} aria-hidden="true" /></div>
              <PreviewLabel>API RECORD</PreviewLabel>
              <h2>{team.name}</h2>
              <p>{gameNameForId(team.game_id, liveGames.data) ?? `Game ID ${team.game_id.slice(0, 8)}`} <span>·</span> {team.region}</p>
              <div className="team-card-meta"><span><Users size={14} aria-hidden="true" /> {team.member_count} members</span></div>
              <button type="button" className="card-action" onClick={() => setSelectedTeam(team)}>View team details <ArrowRight size={14} aria-hidden="true" /></button>
            </article>
          ))
          : filteredSample.map((team) => (
            <article className="team-card" key={team.name}>
              <div className={`team-crest ${team.color}`}><Shield size={23} aria-hidden="true" /></div>
              <PreviewLabel />
              <h2>{team.name}</h2>
              <p>{team.game} <span>·</span> {team.region}</p>
              <div className="team-card-meta"><span><Users size={14} aria-hidden="true" /> {team.members} players</span><span>{team.focus}</span></div>
              <button type="button" className="card-action" onClick={() => setSelectedTeam(team)}>View team details <ArrowRight size={14} aria-hidden="true" /></button>
            </article>
          ))}
      </div>
      {showingLive && filteredLive.length === 0 && <div className="page-empty"><Users size={22} /><strong>No live teams found</strong><span>The API returned no records for this search and game filter.</span></div>}
      {!showingLive && filteredSample.length === 0 && <div className="page-empty"><Users size={22} /><strong>No sample teams found</strong><span>Try a different search or game filter.</span></div>}
      {selectedTeam && (
        <PreviewDialog title={selectedTeam.name} onClose={() => setSelectedTeam(null)}>
          {'team_id' in selectedTeam ? (
            <>
              <p className="preview-dialog-description">Team record loaded from the API. Recruitment details are not part of the current response.</p>
              <div className="preview-detail-grid"><span>GAME<strong>{gameNameForId(selectedTeam.game_id, liveGames.data) ?? 'Unavailable'}</strong></span><span>REGION<strong>{selectedTeam.region}</strong></span><span>MEMBERS<strong>{selectedTeam.member_count}</strong></span></div>
            </>
          ) : (
            <>
              <p className="preview-dialog-description">{selectedTeam.description}</p>
              <div className="preview-detail-grid"><span>GAME<strong>{selectedTeam.game}</strong></span><span>REGION<strong>{selectedTeam.region}</strong></span><span>ROSTER<strong>{selectedTeam.members} · SAMPLE</strong></span></div>
            </>
          )}
          <p className="action-unavailable">Team applications are not available through the current read-only API. No request will be sent.</p>
          <button type="button" className="button button-primary" disabled title="Membership changes are not supported by the read-only API">Request to join <ArrowRight size={14} /></button>
        </PreviewDialog>
      )}
      {showCreateInfo && (
        <PreviewDialog title="Create a team" onClose={() => setShowCreateInfo(false)}>
          <p className="preview-dialog-description">The teams API currently supports read-only listings. This preview does not save drafts or create records.</p>
          <p className="action-unavailable">Creation is currently unavailable. No data will be submitted or stored.</p>
          <button type="button" className="button button-primary" disabled>Create team <ArrowRight size={14} /></button>
        </PreviewDialog>
      )}
    </div>
  )
}

function NewsPage() {
  return (
    <div className="platform-page">
      <PageIntro eyebrow="FROM AROUND THE NEXUS" title="Gaming news" description="Verified news articles will appear here when the news service is available." />
      <div className="page-empty"><Globe2 size={22} /><strong>No news published</strong><span>There are no verified articles to display right now.</span></div>
    </div>
  )
}

function AuthPage({ registration = false }: { registration?: boolean }) {
  const { user, loading, configured, configurationError, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const title = registration ? 'Create your profile' : 'Welcome back'

  const state = location.state
  const requestedPath = state && typeof state === 'object' && 'from' in state && typeof state.from === 'string'
    ? state.from
    : '/dashboard'
  const redirectPath = requestedPath.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/dashboard'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)

    const result = registration
      ? await signUp(email.trim(), password, displayName)
      : await signIn(email.trim(), password)

    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }

    if (result.authenticated) {
      navigate(registration ? '/profile' : redirectPath, { replace: true })
      return
    }

    setMessage(result.message ?? 'Your request was completed.')
  }

  if (user) {
    return (
      <div className="platform-page auth-page">
        <div className="auth-card">
          <div className="auth-icon"><UserRound size={21} aria-hidden="true" /></div>
          <p className="eyebrow">ALREADY CONNECTED</p>
          <h1>You’re signed in.</h1>
          <p className="auth-description">Continue to your dashboard or manage your player profile.</p>
          <div className="auth-actions">
            <Link className="button button-primary" to="/dashboard">Open dashboard <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link className="text-link" to="/profile">Edit profile <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="platform-page auth-page">
      <div className="auth-card">
        <div className="auth-icon"><LockKeyhole size={21} aria-hidden="true" /></div>
        <p className="eyebrow">{registration ? 'YOUR PLACE IN THE NEXUS' : 'YOUR NEXUS AWAITS'}</p>
        <h1>{title}</h1>
        <p className="auth-description">Use your Nexus account to save your profile and find your people.</p>
        {!configured && <div className="auth-configuration" role="status">{configurationError}</div>}
        {error && <div className="auth-result is-error" role="alert">{error}</div>}
        {message && <div className="auth-result" role="status">{message}</div>}
        <form className="auth-fields" onSubmit={handleSubmit}>
          <fieldset disabled={!configured || loading || busy}>
            {registration && (
              <label>Player name<input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Choose a display name" minLength={2} maxLength={32} autoComplete="nickname" required /></label>
            )}
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete={registration ? 'new-password' : 'current-password'} required /></label>
            <button className="button button-primary auth-submit" type="submit" disabled={!configured || loading || busy}>
              {busy ? 'Please wait…' : registration ? 'Create account' : 'Log in'} <ArrowRight size={15} aria-hidden="true" />
            </button>
          </fieldset>
        </form>
        <div className="auth-switch">
          {registration ? <>Already have an account? <Link to="/login">Log in</Link></> : <>New to the Nexus? <Link to="/register">Create a profile</Link></>}
        </div>
        {!registration && <Link className="recovery-link" to="/password-recovery">Forgot password?</Link>}
      </div>
    </div>
  )
}

function PasswordRecoveryPage() {
  const { user, configured, configurationError, resetPassword, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    const result = user
      ? await updatePassword(password)
      : await resetPassword(email.trim())
    setBusy(false)

    if (result.error) {
      setError(result.error)
      return
    }
    if (user) {
      navigate('/dashboard', { replace: true })
      return
    }

    setMessage(result.message ?? 'If an account exists for that email, a reset link is on its way.')
  }

  return (
    <div className="platform-page auth-page">
      <div className="auth-card">
        <div className="auth-icon"><LockKeyhole size={21} aria-hidden="true" /></div>
        <p className="eyebrow">ACCOUNT ACCESS</p>
        <h1>{user ? 'Choose a new password' : 'Reset password'}</h1>
        <p className="auth-description">{user ? 'Set a new password for your Nexus account.' : 'Enter your email and we’ll send a password reset link if an account exists.'}</p>
        {!configured && <div className="auth-configuration" role="status">{configurationError}</div>}
        {error && <div className="auth-result is-error" role="alert">{error}</div>}
        {message && <div className="auth-result" role="status">{message}</div>}
        <form className="auth-fields" onSubmit={handleSubmit}>
          <fieldset disabled={!configured || busy}>
            {user
              ? <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} autoComplete="new-password" required /></label>
              : <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            }
            <button className="button button-primary auth-submit" type="submit" disabled={!configured || busy}>
              {busy ? 'Please wait…' : user ? 'Update password' : 'Send recovery link'} <ArrowRight size={15} aria-hidden="true" />
            </button>
          </fieldset>
        </form>
        <div className="auth-switch"><Link to="/login">Return to log in</Link></div>
      </div>
    </div>
  )
}

function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="platform-page auth-page" role="status">Checking your Nexus session…</div>
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}

type ProfileDraft = Omit<
  PlayerProfileUpdate,
  'username' | 'avatar_url' | 'bio' | 'platform' | 'country'
> & {
  username: string
  avatar_url: string
  bio: string
  platform: string
  country: string
}

function profileToDraft(profile: PlayerProfileRecord): ProfileDraft {
  return {
    display_name: profile.display_name,
    username: profile.username ?? '',
    avatar_url: profile.avatar_url ?? '',
    bio: profile.bio ?? '',
    favorite_games: profile.favorite_games,
    platform: profile.platform ?? '',
    country: profile.country ?? '',
  }
}

function ProfileAvatar({ url }: { url: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  return (
    <div className="profile-display-avatar">
      {url && failedUrl !== url
        ? <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
        : <UserRound size={25} aria-hidden="true" />}
    </div>
  )
}

function ProfilePage() {
  const { user } = useAuth()
  const editProfileButtonRef = useRef<HTMLButtonElement>(null)
  const displayNameInputRef = useRef<HTMLInputElement>(null)
  const restoreEditButtonFocus = useRef(false)
  const [profileOverride, setProfileOverride] = useState<{
    userId: string
    profile: PlayerProfileRecord
  } | null>(null)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const loadPrivateProfile = useCallback(
    (signal: AbortSignal) => profilesApi.getCurrent({ signal }),
    [],
  )
  const privateProfile = useApiResource(
    loadPrivateProfile,
    `private-profile:${user?.id ?? 'signed-out'}`,
    Boolean(user?.id),
  )
  const profile = profileOverride && profileOverride.userId === user?.id
    ? profileOverride.profile
    : privateProfile.data

  useEffect(() => {
    if (editing) {
      displayNameInputRef.current?.focus()
    } else if (restoreEditButtonFocus.current) {
      editProfileButtonRef.current?.focus()
      restoreEditButtonFocus.current = false
    }
  }, [editing])

  const updateFavoriteGame = (game: string, selected: boolean) => {
    setDraft((current) => {
      if (!current) return current
      if (selected && current.favorite_games.length >= 20) return current
      return {
        ...current,
        favorite_games: selected
          ? [...current.favorite_games, game]
          : current.favorite_games.filter((favorite) => favorite !== game),
      }
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft) return
    setError('')
    setMessage('')
    setBusy(true)

    try {
      const updatedProfile = await profilesApi.updateCurrent({
        display_name: draft.display_name,
        username: draft.username.trim() || null,
        avatar_url: draft.avatar_url.trim() || null,
        bio: draft.bio.trim() || null,
        favorite_games: draft.favorite_games,
        platform: draft.platform.trim() || null,
        country: draft.country.trim() || null,
      })
      setProfileOverride({ userId: updatedProfile.user_id, profile: updatedProfile })
      setDraft(profileToDraft(updatedProfile))
      setEditing(false)
      setMessage('Your player profile has been saved.')
      privateProfile.retry()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The profile could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="platform-page">
      <PageIntro eyebrow="PLAYER PROFILE" title="Make it yours" description="Manage the profile information saved to your private player record.">
        <PreviewLabel>PRIVATE PROFILE</PreviewLabel>
      </PageIntro>
      <ApiDataNotice resource={privateProfile} sourceName="Private player profile" fallbackText="Profile data requires the configured FastAPI service." />
      {message && <div className="auth-result" role="status">{message}</div>}
      {profile && !editing && (
        <section className="profile-view-card" aria-label="Your player profile">
          <div className="profile-view-header">
            <ProfileAvatar url={profile.avatar_url} />
            <div className="profile-view-identity">
              <h2>{profile.display_name}</h2>
              <span>{profile.username ? `@${profile.username}` : 'Username not set'}</span>
            </div>
            <button
              ref={editProfileButtonRef}
              className="button button-outline"
              type="button"
              onClick={() => {
                restoreEditButtonFocus.current = true
                setDraft(profileToDraft(profile))
                setError('')
                setMessage('')
                setEditing(true)
              }}
            >
              Edit profile <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <p className="profile-view-bio">{profile.bio || 'No bio added.'}</p>
          <div className="profile-view-details">
            <div><span>COUNTRY</span><strong>{profile.country || 'Not set'}</strong></div>
            <div><span>GAMING PLATFORM</span><strong>{profile.platform || 'Not set'}</strong></div>
            <div><span>FAVORITE GAMES</span><strong>{profile.favorite_games.length ? profile.favorite_games.join(', ') : 'Not set'}</strong></div>
          </div>
        </section>
      )}
      {editing && draft && (
        <form className="profile-form" onSubmit={handleSubmit} aria-label="Edit player profile">
          <div className="profile-form-top">
            <ProfileAvatar url={draft.avatar_url || null} />
            <div><strong>{draft.display_name || 'Your player name'}</strong><span>Changes are saved to your private database profile.</span></div>
          </div>
          {error && <div className="auth-result is-error" role="alert">{error}</div>}
          <div className="profile-form-fields">
            <label>Display name<input ref={displayNameInputRef} type="text" value={draft.display_name} onChange={(event) => setDraft((current) => current && ({ ...current, display_name: event.target.value }))} minLength={2} maxLength={80} autoComplete="nickname" disabled={busy} required /></label>
            <label>Username<input type="text" value={draft.username} onChange={(event) => setDraft((current) => current && ({ ...current, username: event.target.value.toLowerCase() }))} minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" autoComplete="username" aria-describedby="profile-username-help" disabled={busy} /><small id="profile-username-help">3–24 lowercase letters, numbers, or underscores.</small></label>
            <label>Avatar URL<input type="url" value={draft.avatar_url} onChange={(event) => setDraft((current) => current && ({ ...current, avatar_url: event.target.value }))} maxLength={2048} pattern="https://.+" placeholder="https://example.com/avatar.png" autoComplete="url" aria-describedby="profile-avatar-help" disabled={busy} /><small id="profile-avatar-help">Use an HTTPS image URL.</small></label>
            <label>Country<input type="text" value={draft.country} onChange={(event) => setDraft((current) => current && ({ ...current, country: event.target.value }))} maxLength={56} autoComplete="country-name" disabled={busy} /></label>
            <label>Gaming platform<input type="text" value={draft.platform} onChange={(event) => setDraft((current) => current && ({ ...current, platform: event.target.value }))} maxLength={80} placeholder="PC, PlayStation, Xbox…" disabled={busy} /></label>
            <label className="profile-bio-field">Bio<textarea value={draft.bio} onChange={(event) => setDraft((current) => current && ({ ...current, bio: event.target.value }))} maxLength={280} rows={4} disabled={busy} /><small>{draft.bio.length}/280 characters</small></label>
          </div>
          <fieldset className="favorite-games-fieldset" aria-describedby="favorite-games-help" disabled={busy}>
            <legend>Favorite games</legend>
            <p className="favorite-games-help" id="favorite-games-help">Select up to 20 titles ({draft.favorite_games.length}/20 selected).</p>
            <div className="favorite-games-grid">
              {profileGameNames.map((game) => (
                <label key={game}>
                  <input type="checkbox" checked={draft.favorite_games.includes(game)} disabled={!draft.favorite_games.includes(game) && draft.favorite_games.length >= 20} onChange={(event) => updateFavoriteGame(game, event.target.checked)} />
                  <span>{game}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="profile-form-actions">
            <button className="button button-outline" type="button" disabled={busy} onClick={() => { setEditing(false); setDraft(null); setError('') }}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'} <ArrowRight size={15} aria-hidden="true" /></button>
          </div>
        </form>
      )}
    </div>
  )
}

function DashboardPage() {
  const { user } = useAuth()
  const loadPrivateProfile = useCallback(
    (signal: AbortSignal) => profilesApi.getCurrent({ signal }),
    [],
  )
  const privateProfile = useApiResource(
    loadPrivateProfile,
    `dashboard-profile:${user?.id ?? 'signed-out'}`,
    Boolean(user?.id),
  )
  const playerName = privateProfile.data?.display_name || user?.email?.split('@')[0] || 'player'

  return (
    <div className="platform-page">
      <PageIntro eyebrow="PLAYER DASHBOARD" title={`Welcome, ${playerName}`} description="Your personal home for your games, profile, and next steps in the Nexus.">
        <PreviewLabel>SUPABASE SESSION</PreviewLabel>
      </PageIntro>
      <ApiDataNotice resource={privateProfile} sourceName="Player profile" fallbackText="The dashboard title uses your account email while unavailable." />
      <div className="dashboard-lock-card">
        <div className="auth-icon"><UserRound size={22} aria-hidden="true" /></div>
        <div><h2>Your account is connected</h2><p>Signed in as {user?.email}. Community and tournament activity will appear when those platform services are connected.</p></div>
        <Link className="button button-primary" to="/profile">Edit player profile <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
      <div className="dashboard-preview-grid">
        <article><Users size={19} /><span>YOUR COMMUNITIES</span><strong>Community connections arrive in Phase 5</strong></article>
        <article><Trophy size={19} /><span>YOUR RANK</span><strong>Live rankings are not connected</strong></article>
        <article><CalendarDays size={19} /><span>UPCOMING EVENTS</span><strong>Event data is not connected</strong></article>
      </div>
    </div>
  )
}

function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="platform-page">
      <PageIntro eyebrow="MAKE IT YOURS" title="Settings" description="Manage your profile, preferences, and account security in one place.">
        <PreviewLabel>SUPABASE ACCOUNT</PreviewLabel>
      </PageIntro>
      <PreviewNote>Signed in as {user?.email}. Account settings currently cover your database-backed player profile and password recovery.</PreviewNote>
      <section className="settings-preview">
        <div className="settings-row"><div className="settings-row-icon"><UserRound size={18} /></div><div><strong>Player profile</strong><span>Display name, country, platform, and favorite games</span></div><Link to="/profile" className="settings-row-link">Edit profile <ArrowRight size={14} /></Link></div>
        <div className="settings-row"><div className="settings-row-icon"><Globe2 size={18} /></div><div><strong>Privacy & discovery</strong><span>Public player discovery will be available with the profiles database.</span></div><span className="settings-state">NOT CONNECTED</span></div>
        <div className="settings-row"><div className="settings-row-icon"><LockKeyhole size={18} /></div><div><strong>Account security</strong><span>Change your password using the recovery flow.</span></div><Link to="/password-recovery" className="settings-row-link">Reset password <ArrowRight size={14} /></Link></div>
      </section>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="platform-page not-found-page">
      <div className="not-found-icon"><Gamepad2 size={28} /></div>
      <p className="eyebrow">OFF THE MAP</p>
      <h1>That page isn’t in the queue.</h1>
      <p>Try one of the Nexus destinations or head back to the homepage.</p>
      <Link to="/" className="button button-primary">Back to home <ArrowRight size={15} /></Link>
    </div>
  )
}

export default function PlatformPages() {
  return useRoutes([
    { path: '/community/:communityId', element: <CommunityDetailPage /> },
    { path: '/community', element: <CommunityPage /> },
    { path: '/games', element: <GamesPage /> },
    { path: '/games/:gameSlug', element: <GameDetailsPage /> },
    { path: '/players', element: <PlayersPage /> },
    { path: '/tournaments', element: <TournamentsPage /> },
    { path: '/leaderboards', element: <LeaderboardsPage /> },
    { path: '/teams', element: <TeamsPage /> },
    { path: '/news', element: <NewsPage /> },
    { path: '/login', element: <AuthPage /> },
    { path: '/register', element: <AuthPage registration /> },
    { path: '/password-recovery', element: <PasswordRecoveryPage /> },
    { path: '/profile', element: <RequireSession><ProfilePage /></RequireSession> },
    { path: '/dashboard', element: <RequireSession><DashboardPage /></RequireSession> },
    { path: '/settings', element: <RequireSession><SettingsPage /></RequireSession> },
    { path: '*', element: <NotFoundPage /> },
  ])
}
