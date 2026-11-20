import { getCurrentAccessToken } from '../auth/supabase'

export type ApiErrorKind =
  | 'configuration'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'http'
  | 'network'
  | 'session'
  | 'invalid_response'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null

  constructor(
    kind: ApiErrorKind,
    message: string,
    status: number | null = null,
  ) {
    super(message)
    this.kind = kind
    this.status = status
    this.name = 'ApiError'
  }
}

export type ApiRequestOptions = {
  authenticated?: boolean
  accessToken?: string | null
  headers?: HeadersInit
  signal?: AbortSignal
}

type ApiMethod = 'GET' | 'POST' | 'PATCH'

function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!configuredUrl) {
    throw new ApiError(
      'configuration',
      'The API is not configured. Set VITE_API_BASE_URL to the FastAPI base URL.',
    )
  }

  try {
    const url = new URL(configuredUrl)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Invalid API URL')
    }
    return configuredUrl.replace(/\/+$/, '')
  } catch {
    throw new ApiError('configuration', 'VITE_API_BASE_URL must be a valid HTTP or HTTPS URL.')
  }
}

function errorKind(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  return 'http'
}

function statusMessage(status: number, detail: string | null) {
  if (status === 401) return 'Your session is missing, invalid, or expired. Sign in again and retry.'
  if (status === 403) return 'You do not have permission to access this resource.'
  if (status === 404) return 'The requested resource was not found.'
  return detail ?? `The API request failed with status ${status}.`
}

function responseDetail(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return null
  if (typeof body.detail === 'string') return body.detail
  if (!Array.isArray(body.detail)) return null

  const messages = body.detail.flatMap((issue: unknown) => {
    if (typeof issue !== 'object' || issue === null || !('msg' in issue)) return []
    if (typeof issue.msg !== 'string') return []
    const location = 'loc' in issue && Array.isArray(issue.loc)
      ? issue.loc.filter((part): part is string | number => (
          typeof part === 'string' || typeof part === 'number'
        )).slice(1).join('.')
      : ''
    return [location ? `${location}: ${issue.msg}` : issue.msg]
  })

  return messages.length > 0 ? messages.join(' ') : null
}

async function apiRequest<T>(
  path: string,
  method: ApiMethod,
  options: ApiRequestOptions & { body?: unknown } = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  let token: string | null | undefined

  if (options.authenticated === true) {
    token = options.accessToken
    if (token === undefined) {
      try {
        token = await getCurrentAccessToken()
      } catch {
        throw new ApiError(
          'session',
          'The current Supabase session could not be read. Sign in again and retry.',
          401,
        )
      }
    }
  }

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.authenticated === true) {
    if (typeof token !== 'string' || token.trim() === '') {
      throw new ApiError('unauthorized', 'Sign in to access this resource.', 401)
    }
    headers.set('Authorization', `Bearer ${token.trim()}`)
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw error
    }
    throw new ApiError(
      'network',
      'Could not reach the API. Check that FastAPI is running and CORS allows this site.',
    )
  }

  const bodyText = await response.text()
  let body: unknown = null
  if (bodyText) {
    try {
      body = JSON.parse(bodyText) as unknown
    } catch {
      if (response.ok) {
        throw new ApiError('invalid_response', 'The API returned invalid JSON.', response.status)
      }
    }
  }

  if (!response.ok) {
    const kind = errorKind(response.status)
    throw new ApiError(kind, statusMessage(response.status, responseDetail(body)), response.status)
  }

  if (body === null) {
    throw new ApiError('invalid_response', 'The API returned an empty JSON response.', response.status)
  }

  return body as T
}

export function apiGet<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(path, 'GET', options)
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(path, 'PATCH', { ...options, body })
}

export function apiPost<T>(
  path: string,
  body: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(path, 'POST', { ...options, body })
}
