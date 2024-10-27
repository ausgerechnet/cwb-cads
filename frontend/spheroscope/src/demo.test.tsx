import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Vitest setup', () => {
  test('can run basic tests', () => {
    expect(1).toBe(1)
  })

  test('can render JSX', () => {
    render(<div>hello</div>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
