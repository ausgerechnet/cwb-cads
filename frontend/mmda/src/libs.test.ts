import { describe, expect, test } from 'vitest'
import { defaultValue } from '@cads/shared/lib/legal-default-value'

describe('legal default value', () => {
  test('selects default value if valid', () => {
    expect(defaultValue(['lemma', 'word', 'pos'], 'invalid', 'lemma')).toBe(
      'lemma',
    )
    expect(defaultValue(['word', 'lemma', 'pos'], 'lemma')).toBe('lemma')
  })

  test('selects first value if no valid value is given', () => {
    expect(defaultValue(['lemma', 'word', 'pos'], 'invalid')).toBe('lemma')
    expect(defaultValue(['word', 'lemma', 'pos'])).toBe('word')
  })

  test('returns undefined if no legal values are given', () => {
    expect(defaultValue([], 'invalid')).toBe(undefined)
    expect(defaultValue(undefined, 'invalid')).toBe(undefined)
    expect(defaultValue(undefined)).toBe(undefined)
  })
})
