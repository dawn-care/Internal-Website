// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '../lib/auth'
import { AuthContext } from '../lib/auth/context'
import { MOCK_USER } from '../lib/auth/mock'
import { fetchShames } from '../lib/shame/client'
import { clearShamesCache } from '../lib/shame/data'
import { mockShames } from '../lib/shame/mock'
import Shame from './Shame'

vi.mock('../lib/shame/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/shame/client')>()),
  fetchShames: vi.fn(),
}))

afterEach(() => {
  cleanup()
  clearShamesCache()
  vi.mocked(fetchShames).mockReset()
})

function SignIn() {
  const location = useLocation()
  return <p>Sign-in panel {location.search}</p>
}

function renderShame(auth: Partial<AuthState>) {
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
      <MemoryRouter initialEntries={['/shame']}>
        <Routes>
          <Route path="/shame" element={<Shame />} />
          <Route path="/tasks" element={<SignIn />} />
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

const CARDS = ['Shames by Category', 'Shames by Person', 'Shames over Time', 'Recent Shames']

describe('Shame page', () => {
  it('sends signed-out visitors to sign in, returning to /shame', () => {
    renderShame({ user: null })
    expect(screen.getByText('Sign-in panel ?returnTo=%2Fshame')).toBeTruthy()
  })

  it('renders every card from one fetch', async () => {
    vi.mocked(fetchShames).mockResolvedValue(mockShames())
    renderShame({})

    const categories = await screen.findByRole('region', { name: 'Shames by Category' })
    for (const name of CARDS) expect(screen.getByRole('region', { name })).toBeTruthy()
    expect(fetchShames).toHaveBeenCalledTimes(1)
    expect(
      within(categories).getByText(/22 shames for 6 people: 17 caught by the bot, 5 from/),
    ).toBeTruthy()

    const people = screen.getByRole('region', { name: 'Shames by Person' })
    const tess = within(people).getByRole('rowheader', { name: 'Tess Hacker' }).closest('tr')!
    expect(within(tess).getByText('Sleep')).toBeTruthy()

    const recent = screen.getByRole('region', { name: 'Recent Shames' })
    expect(within(recent).getByText('“renamed every variable in the PR to a fruit”')).toBeTruthy()
    expect(
      within(recent).getByText(
        'Shamed by David Holt, endorsed by Jay Doody and Ashton Michelstein',
      ),
    ).toBeTruthy()
  })

  it("shows an empty state in every card when the log doesn't exist yet", async () => {
    vi.mocked(fetchShames).mockResolvedValue(null)
    renderShame({})
    expect(await screen.findAllByText(/Nobody has been shamed yet/)).toHaveLength(4)
  })

  it('shows an error with retry, and one retry reloads every card', async () => {
    vi.mocked(fetchShames)
      .mockRejectedValueOnce(new Error('Request failed (500): error'))
      .mockResolvedValue(mockShames())
    renderShame({})
    expect(await screen.findAllByText('Request failed (500): error')).toHaveLength(4)
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0])
    expect(await screen.findByRole('region', { name: 'Recent Shames' })).toBeTruthy()
    expect(await screen.findByText(/22 shames/)).toBeTruthy()
    expect(screen.queryByText('Request failed (500): error')).toBeNull()
  })
})

describe('fetchShames', () => {
  it('treats a 404 as "not generated yet" and rejects an unexpected shape', async () => {
    const { fetchShames: realFetch } =
      await vi.importActual<typeof import('../lib/shame/client')>('../lib/shame/client')
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
    await expect(realFetch('/x')).resolves.toBeNull()
    fetchMock.mockResolvedValueOnce(Response.json({ shames: 'nope' }))
    await expect(realFetch('/x')).rejects.toThrow(/format this site reads/)
    fetchMock.mockResolvedValueOnce(Response.json(mockShames()))
    await expect(realFetch('/x')).resolves.toMatchObject({ categories: { sleep: 'Sleep' } })
    vi.unstubAllGlobals()
  })
})
