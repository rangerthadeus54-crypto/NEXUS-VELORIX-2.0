import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'

export type ApiResource<T> = {
  data: T | null
  loading: boolean
  error: ApiError | null
  retry: () => void
}

type StoredResource<T> = {
  key: string
  attempt: number
  data: T | null
  loading: boolean
  error: ApiError | null
}

export function useApiResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
  enabled = true,
): ApiResource<T> {
  const [attempt, setAttempt] = useState(0)
  const [stored, setStored] = useState<StoredResource<T>>({
    key: '',
    attempt: -1,
    data: null,
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    let active = true

    void load(controller.signal)
      .then((data) => {
        if (active) setStored({ key, attempt, data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return
        const apiError = error instanceof ApiError
          ? error
          : new ApiError('network', 'The API request could not be completed.')
        setStored({ key, attempt, data: null, loading: false, error: apiError })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [attempt, enabled, key, load])

  const current = !enabled
    ? { key, attempt, data: null, loading: false, error: null }
    : stored.key === key && stored.attempt === attempt
    ? stored
    : { key, attempt, data: null, loading: true, error: null }

  return {
    data: current.data,
    loading: current.loading,
    error: current.error,
    retry: () => setAttempt((previous) => previous + 1),
  }
}
