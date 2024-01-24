import { apiClient } from '@/rest-client'

export function isAuthenticated() {
  const key = localStorage.getItem(KEY_AUTH)
  if (!key) {
    return false
  }
  try {
    JSON.parse(key)
    return true
  } catch (e) {
    console.error(e)
    localStorage.removeItem(KEY_AUTH)
    return false
  }
}
