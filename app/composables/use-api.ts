import { FetchError, ofetch } from 'ofetch'

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
    readonly retryAfter = 0,
  ) {
    super(message)
    this.name = 'ApiFailure'
  }
}

interface ErrorPayload {
  data?: { code?: string; message?: string; fields?: Record<string, string>; retryAfter?: number }
}

export function toFailure(error: unknown): ApiFailure {
  if (error instanceof ApiFailure) return error
  if (error instanceof FetchError) {
    const payload = (error.data ?? {}) as ErrorPayload
    const data = payload.data ?? {}
    return new ApiFailure(
      error.statusCode ?? 0,
      data.code ?? (error.statusCode ? `http_${error.statusCode}` : 'network'),
      data.message ?? error.message,
      data.fields ?? {},
      data.retryAfter ?? 0,
    )
  }
  return new ApiFailure(0, 'unknown', error instanceof Error ? error.message : 'Unknown error')
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export function useApi() {
  const session = useAdminSession()
  const sudo = useSudo()

  async function request<T>(
    path: string,
    options: { method?: Method; body?: unknown } = {},
  ): Promise<T> {
    const method = options.method ?? (options.body === undefined ? 'GET' : 'POST')
    const send = () =>
      ofetch<T>(path, {
        method,
        body: options.body as Record<string, unknown> | FormData | undefined,
        headers: method === 'GET' ? {} : { 'x-csrf-token': session.csrf.value },
        cache: 'no-store',
      })
    try {
      return await send()
    } catch (error) {
      const failure = toFailure(error)
      if (failure.code === 'csrf_invalid') {
        await session.load()
        return await send()
      }
      if (failure.code === 'reauth_required') {
        await sudo.confirm()
        await session.load()
        try {
          return await send()
        } catch (retry) {
          throw toFailure(retry)
        }
      }
      if (failure.status === 401 && failure.code === 'unauthenticated') {
        session.me.value = { authenticated: false }
        await navigateTo('/admin/login')
      }
      if (failure.code === 'setup_required') await navigateTo('/admin/setup')
      throw failure
    }
  }

  return { request }
}
