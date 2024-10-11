import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
/// <reference types="vitest" />
// This does not need to be imported in every test file
import '@testing-library/jest-dom'

afterEach(() => cleanup())
