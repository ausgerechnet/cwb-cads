export function safeJsonParse<T>(input: unknown, fallback: T | null = null) {
  if (typeof input !== 'string') {
    return {
      data: fallback,
      error: true,
    }
  }
  try {
    return {
      data: JSON.parse(input),
      error: null,
    }
  } catch (e) {
    return {
      data: fallback,
      error: true,
    }
  }
}
