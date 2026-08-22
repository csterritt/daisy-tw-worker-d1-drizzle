import { expect, test } from '@playwright/test'

import { skipIfNotExactMode } from '../support/mode-helpers'
import type { SignUpMode } from '../support/mode-helpers'
import { BASE_URLS } from '../support/test-data'

const PROTECTED_ROUTES = [
  { method: 'GET', path: '/private' },
  { method: 'GET', path: '/profile' },
  { method: 'POST', path: '/profile' },
  { method: 'GET', path: '/profile/delete-confirm' },
  { method: 'POST', path: '/profile/delete' },
] as const

const SIGN_UP_MODES = [
  'OPEN_SIGN_UP',
  'NO_SIGN_UP',
  'GATED_SIGN_UP',
  'INTEREST_SIGN_UP',
  'BOTH_SIGN_UP',
] as const satisfies readonly SignUpMode[]

test.describe('Authorization boundaries', () => {
  for (const { method, path } of PROTECTED_ROUTES) {
    test(`${method} ${path} rejects an unauthenticated request`, async ({ request }) => {
      const response = await request.fetch(path, {
        method,
        headers: { Origin: BASE_URLS.HOME },
        maxRedirects: 0,
      })

      expect(response.status()).toBe(303)
      expect(response.headers().location).toContain('/auth/sign-in')
    })
  }

  for (const mode of SIGN_UP_MODES) {
    test(`direct Better Auth signup is unavailable in ${mode}`, async ({ request }) => {
      await skipIfNotExactMode(mode)

      const response = await request.post('/api/auth/sign-up/email', {
        data: {
          name: 'Raw API Signup',
          email: `raw-api-signup-${mode.toLowerCase()}@example.com`,
          password: 'raw-api-password-123',
        },
      })

      expect(response.status()).toBe(404)
    })
  }

  test('explicitly enabled test routes are reachable by the E2E runner', async ({ request }) => {
    const response = await request.get('/test/sign-up-mode')

    expect(response.status()).toBe(200)
    expect(SIGN_UP_MODES).toContain((await response.text()).trim() as SignUpMode)
  })
})
