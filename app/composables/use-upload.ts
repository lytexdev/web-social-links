export interface UploadedMedia {
  id: string
  width: number
  height: number
  alt: string
  decorative: boolean
  preview: string
  icon: string
}

export function useUpload() {
  const session = useAdminSession()

  function send(
    path: string,
    file: File,
    onProgress: (fraction: number) => void,
    method: 'POST' | 'PUT' = 'POST',
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(method, path)
      xhr.setRequestHeader('x-csrf-token', session.csrf.value)
      xhr.responseType = 'json'
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total)
      })
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
        else {
          const body = (xhr.response ?? {}) as {
            data?: { code?: string; message?: string; retryAfter?: number }
          }
          reject(
            new ApiFailure(
              xhr.status,
              body.data?.code ?? `http_${xhr.status}`,
              body.data?.message ?? '',
              {},
              body.data?.retryAfter ?? 0,
            ),
          )
        }
      })
      xhr.addEventListener('error', () => reject(new ApiFailure(0, 'network', 'Network error')))
      const form = new FormData()
      form.append('file', file)
      xhr.send(form)
    })
  }

  return { send }
}
