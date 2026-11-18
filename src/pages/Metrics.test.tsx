// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '../lib/auth'
import { AuthContext } from '../lib/auth/context'
import { MOCK_USER } from '../lib/auth/mock'
import { fetchPrMetrics } from '../lib/prMetrics/client'
import { clearPrMetricsCache } from '../lib/prMetrics/data'
import { mockPrMetrics } from '../lib/prMetrics/mock'
import Metrics from './Metrics'

vi.mock('../lib/prMetrics/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/prMetrics/client')>()),
  fetchPrMetrics: vi.fn(),
}))

afterEach(() => {
  cleanup()
  clearPrMetricsCache()
  vi.mocked(fetchPrMetrics).mockReset()
})

function SignIn() {
  const location = useLocation()
  return <p>Sign-in panel {location.search}</p>
}

function renderMetrics(auth: Partial<AuthState>, url = '/metrics') {
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
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/tasks" element={<SignIn />} />
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

const CARDS = [
  'PR Metrics Summary',
  'PR Size',
  'Review and Merge Time',
  'Author and Review Balance',
  'Focus-Area Coverage',
  'Breadth of Knowledge',
]

describe('Metrics page', () => {
  it('sends signed-out visitors to sign in, returning to /metrics', () => {
    renderMetrics({ user: null })
    expect(screen.getByText('Sign-in panel ?returnTo=%2Fmetrics')).toBeTruthy()
  })

  it('renders all six PR cards from one fetch, for the entire project by default', async () => {
    vi.mocked(fetchPrMetrics).mockResolvedValue(mockPrMetrics())
    renderMetrics({})

    const summary = await screen.findByRole('region', { name: 'PR Metrics Summary' })
    for (const name of CARDS) expect(screen.getByRole('region', { name })).toBeTruthy()
    expect(fetchPrMetrics).toHaveBeenCalledTimes(1)
    expect((screen.getByLabelText('Scope') as HTMLSelectElement).value).toBe('')
    expect(screen.getByText(/102 PRs merged/)).toBeTruthy()
    expect(within(summary).getByText('68%')).toBeTruthy()
  })

  it('shows one iteration from ?iteration=', async () => {
    vi.mocked(fetchPrMetrics).mockResolvedValue(mockPrMetrics())
    renderMetrics({}, '/metrics?iteration=Deadline%202')

    const summary = await screen.findByRole('region', { name: 'PR Metrics Summary' })
    expect((screen.getByLabelText('Scope') as HTMLSelectElement).value).toBe('Deadline 2')
    expect(within(summary).getByText('65%')).toBeTruthy()
    expect(within(summary).getByText('88% / 88%')).toBeTruthy()
    expect(within(summary).getByText('98%')).toBeTruthy()

    const balance = screen.getByRole('region', { name: 'Author and Review Balance' })
    expect(within(balance).getByText('Over-authoring')).toBeTruthy()
    expect(within(balance).getByText('Under-authoring')).toBeTruthy()
    expect(within(balance).getByText('Over-reviewing')).toBeTruthy()

    const coverage = screen.getByRole('region', { name: 'Focus-Area Coverage' })
    expect(within(coverage).getByText('(59 of 60 PRs)')).toBeTruthy()
  })

  it('switches iterations with the picker', async () => {
    vi.mocked(fetchPrMetrics).mockResolvedValue(mockPrMetrics())
    renderMetrics({})

    const picker = (await screen.findByLabelText('Scope')) as HTMLSelectElement
    fireEvent.change(picker, { target: { value: 'Deadline 1' } })
    const coverage = screen.getByRole('region', { name: 'Focus-Area Coverage' })
    expect(within(coverage).getByText('(37 of 40 PRs)')).toBeTruthy()
  })

  it("shows an empty state in every card when the file isn't generated yet", async () => {
    vi.mocked(fetchPrMetrics).mockResolvedValue(null)
    renderMetrics({})
    expect(await screen.findAllByText(/haven.t been generated yet/)).toHaveLength(6)
    expect(screen.queryByLabelText('Scope')).toBeNull()
  })

  it('shows an error with retry, and one retry reloads every card', async () => {
    vi.mocked(fetchPrMetrics)
      .mockRejectedValueOnce(new Error('Request failed (500): error'))
      .mockResolvedValue(mockPrMetrics())
    renderMetrics({})

    const errors = await screen.findAllByText('Request failed (500): error')
    expect(errors).toHaveLength(6)
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0])
    expect(await screen.findByLabelText('Scope')).toBeTruthy()
    expect(screen.queryByText('Request failed (500): error')).toBeNull()
  })
})
