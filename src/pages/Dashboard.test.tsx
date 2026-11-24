// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '../lib/auth'
import { AuthContext } from '../lib/auth/context'
import { MOCK_USER } from '../lib/auth/mock'
import { enableSampleMode } from '../lib/sampleMode'
import Dashboard from './Dashboard'

afterEach(cleanup)

beforeAll(() => {
  enableSampleMode()
})

function renderDashboard(auth: Partial<AuthState>) {
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
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<p>Sign-in panel</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

describe('Dashboard', () => {
  it('sends signed-out visitors to the sign-in panel', () => {
    renderDashboard({ user: null })
    expect(screen.getByText('Sign-in panel')).toBeTruthy()
  })

  it('renders every widget from sample data', async () => {
    renderDashboard({})
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/^Good \w+, Sample$/)

    const reviews = await screen.findByRole('region', { name: /Reviews waiting on me/ })
    expect(await within(reviews).findByText('Past 24 business hours')).toBeTruthy()
    expect(within(reviews).getByText('1,240 lines, 19 files')).toBeTruthy()
    expect(within(reviews).getByText('Ticket #61 (from branch)')).toBeTruthy()

    // Feature PRs need one approval; the methodology's checks show as warnings.
    const prs = screen.getByRole('region', { name: /My pull requests/ })
    expect(within(prs).getByText('CI failing')).toBeTruthy()
    expect(within(prs).getAllByText('1/1 approval').length).toBeGreaterThan(0)
    expect(within(prs).getByText('No photo or video')).toBeTruthy()
    expect(within(prs).getByText('Ticket has no focus-area label')).toBeTruthy()
    expect(within(prs).getByText('Wrong base branch')).toBeTruthy()
    expect(within(prs).getByText('Should target canary')).toBeTruthy()
    expect(within(prs).getByText('Changes requested')).toBeTruthy()

    const waiting = screen.getByRole('list', { name: 'Waiting on you:' })
    const links = within(waiting).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toContain('#reviews')
    expect(within(waiting).getByText('1 PR with failing CI')).toBeTruthy()
    // Not the draft: only ready PRs are nagged about.
    expect(within(waiting).getByText('2 PRs to fix up')).toBeTruthy()

    // The deadline's checklist, including the release waiting on its second approval.
    const deadline = screen.getByRole('region', { name: /Deadline/ })
    expect(within(deadline).getByText('Before the deadline')).toBeTruthy()
    expect(within(deadline).getByText(/canary → main \(dawn-app#65\)/)).toBeTruthy()
    expect(within(deadline).getByText('1/2 approvals')).toBeTruthy()

    const meetings = screen.getByRole('region', { name: /Upcoming meetings/ })
    expect(within(meetings).getAllByRole('listitem').length).toBeGreaterThan(0)
    screen.getByRole('region', { name: /My PR metrics/ })
    expect(screen.queryByRole('region', { name: /Sprint|to-dos/i })).toBeNull()

    const tasks = screen.getByRole('region', { name: /My work/ })
    const boxes = within(tasks).getAllByRole('checkbox')
    expect(boxes.length).toBeGreaterThan(0)
    fireEvent.click(boxes[0])
    expect((boxes[0] as HTMLInputElement).checked).toBe(true)
  })
})
