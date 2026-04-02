export async function apiFetch(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `Erro ${res.status}`)
  }

  return data
}
