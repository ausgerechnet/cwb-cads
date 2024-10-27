export function errorString(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  } else if (typeof error === 'string') {
    return error
  } else if (error && typeof error === 'object') {
    return JSON.stringify(error, null, 2)
  } else {
    return 'An unknown error occurred'
  }
}
