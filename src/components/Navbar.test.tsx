// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from '../lib/auth'
import { AuthContext } from '../lib/auth/context'
import { ThemeProvider } from '../lib/theme'
import Navbar from './Navbar'

afterEach(cleanup)

function renderNavbar(auth: Partial<AuthState>) {
  const value: AuthState = {
    user: null,
    loading: false,
    authAvailable: true,
    preview: false,
    sessionExpired: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...auth,
  }
  render(
    <ThemeProvider>
      <AuthContext value={value}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </AuthContext>
    </ThemeProvider>,
  )
}

const tasksLinks = () => screen.queryAllByRole('link', { name: 'Tasks' })

describe('Navbar', () => {
  it('hides Tasks when signed out, in the desktop and mobile menus', () => {
    renderNavbar({ user: null })
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getAllByRole('link', { name: 'Agendas' })).toHaveLength(2)
    expect(tasksLinks()).toHaveLength(0)
  })

  it('hides Tasks while sign-in status is still loading', () => {
    renderNavbar({ user: null, loading: true })
    expect(tasksLinks()).toHaveLength(0)
  })

  it('shows Tasks when signed in, in both menus', () => {
    renderNavbar({ user: { login: 'ada', name: 'Ada', avatarUrl: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(tasksLinks()).toHaveLength(2)
  })

  const menuLinks = () =>
    Array.from(
      screen.getByRole('navigation', { name: 'Main' }).querySelectorAll('ul a'),
      (a) => a.textContent,
    )

  it('orders Dashboard, Tasks, Meetings, Metrics, then the public pages when signed in', () => {
    renderNavbar({ user: { login: 'ada', name: 'Ada', avatarUrl: '' } })
    expect(menuLinks()).toEqual([
      'Dashboard',
      'Tasks',
      'Meetings',
      'Metrics',
      'Agendas',
      'Artifacts',
    ])
    cleanup()
    renderNavbar({ user: null })
    expect(menuLinks()).toEqual(['Agendas', 'Artifacts'])
  })

  it('has no Home item', () => {
    renderNavbar({ user: { login: 'ada', name: 'Ada', avatarUrl: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.queryAllByRole('link', { name: 'Home' })).toHaveLength(0)
  })

  it('points the logo at the home page for everyone', () => {
    const logo = () => screen.getByRole('link', { name: 'D.A.W.N. home' }).getAttribute('href')
    renderNavbar({ user: { login: 'ada', name: 'Ada', avatarUrl: '' } })
    expect(logo()).toBe('/')
    cleanup()
    renderNavbar({ user: null })
    expect(logo()).toBe('/')
    cleanup()
    renderNavbar({ user: { login: 'sample', name: 'Sample', avatarUrl: '' }, preview: true })
    expect(logo()).toBe('/')
  })
})
