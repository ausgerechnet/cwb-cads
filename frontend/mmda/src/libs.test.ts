import { describe, expect, test } from 'vitest'
import { legalDefaultValue } from '@cads/shared/lib/legal-default-value'

describe('legal default value', () => {
  test('selects default value if valid', () => {
    expect(legalDefaultValue('word', ['lemma', 'word', 'pos'], 'lemma')).toBe(
      'word',
    )
    expect(legalDefaultValue('word', ['word', 'lemma', 'pos'], 'lemma')).toBe(
      'word',
    )
  })

  test('selects fallback value if given value is invalid', () => {
    expect(legalDefaultValue('hurz', ['lemma', 'word', 'pos'], 'lemma')).toBe(
      'lemma',
    )
    expect(legalDefaultValue('hurz', ['word', 'lemma', 'pos'], 'lemma')).toBe(
      'lemma',
    )
  })

  test('selects first given valid value if neither default nor fallback are vaid', () => {
    expect(
      legalDefaultValue(
        'invalid',
        ['lemma', 'word', 'pos'],
        'invalid-fallback',
      ),
    ).toBe('lemma')
    expect(
      legalDefaultValue('invalid', ['word', 'pos'], 'invalid-fallback'),
    ).toBe('word')
  })
})
