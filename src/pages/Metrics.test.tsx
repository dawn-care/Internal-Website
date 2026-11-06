// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '../lib/auth'
import { AuthContext } from '../lib/auth/context'
import { MOCK_USER } from '../lib/auth/mock'
import { fetchReviewerMetrics } from '../lib/reviewers/client'
import { clearReviewerMetricsCache } from '../lib/reviewers/data'
import Metrics from './Metrics'

vi.mock('../lib/reviewers/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/reviewers/client')>()),
  fetchReviewerMetrics: vi.fn(),
}))

afterEach(() => {
  cleanup()
  clearReviewerMetricsCache()
  vi.mocked(fetchReviewerMetrics).mockReset()
})

function SignIn() {
  const location = useLocation()
  return <p>Sign-in panel {location.search}</p>
}

function renderMetrics(auth: Partial<AuthState>) {
  const value: AuthState = {
    user: MOCK_USER,
    loading: false,
    authAvailable: true,
    preview: false,
    sessionExpired: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...auth,
  }
  render(
    <AuthContext value={value}>
      <MemoryRouter initialEntries={['/metrics']}>
        <Routes>
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/tasks" element={<SignIn />} />
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

describe('Metrics page', () => {
  it('sends signed-out visitors to sign in, returning to /metrics', () => {
    renderMetrics({ user: null })
    expect(screen.getByText('Sign-in panel ?returnTo=%2Fmetrics')).toBeTruthy()
  })

  it('renders the Reviews widget, ranked by trailing-window count, with its own anchor', async () => {
    vi.mocked(fetchReviewerMetrics).mockResolvedValue({
      generatedAt: '2026-11-05T05:00:00Z',
      windowDays: 14,
      allTime: { 'river-b': 14, 'sam-k': 6 },
      trailingWindow: { 'river-b': 1, 'sam-k': 5 },
    })
    renderMetrics({})

    const reviews = await screen.findByRole('region', { name: 'Reviews' })
    expect(document.getElementById('reviews')).toBe(reviews)

    const rows = within(reviews).getAllByRole('row')
    // rows[0] is the header row; sam-k outranks river-b on the trailing window despite
    // having fewer all-time reviews.
    expect(within(rows[1]).getByRole('link', { name: /@sam-k/ })).toBeTruthy()
    expect(within(rows[2]).getByRole('link', { name: /@river-b/ })).toBeTruthy()
    expect(within(reviews).getByText(/Trailing 14 days as of Nov 5, 2026/)).toBeTruthy()

    const link = within(reviews).getByRole('link', { name: /@sam-k/ })
    expect(link.getAttribute('href')).toBe(
      `https://github.com/dawn-care/DAWN/pulls?q=${encodeURIComponent('is:pr is:merged reviewed-by:sam-k')}`,
    )
  })

  it("shows an empty state when the workflow hasn't generated the file yet", async () => {
    vi.mocked(fetchReviewerMetrics).mockResolvedValue(null)
    renderMetrics({})
    expect(await screen.findByText(/haven.t been generated yet/)).toBeTruthy()
  })

  it('shows an error with retry, which recovers', async () => {
    vi.mocked(fetchReviewerMetrics)
      .mockRejectedValueOnce(new Error('Request failed (500): error'))
      .mockResolvedValue({
        generatedAt: '2026-11-05T05:00:00Z',
        windowDays: 14,
        allTime: {},
        trailingWindow: {},
      })
    renderMetrics({})

    expect(await screen.findByText('Request failed (500): error')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/No reviews recorded/)).toBeTruthy()
  })
})
