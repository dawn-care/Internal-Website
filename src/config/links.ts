/**
 * External links used by the footer and the Home quick-links grid.
 * Leave an href empty ('') to show it as "Not set yet" instead of a link.
 */
export interface ExternalLinkConfig {
  label: string
  href: string
}

export const links = {
  repo: {
    label: 'GitHub repo',
    href: 'https://github.com/dawn-care/DAWN',
  },
  taskBoard: { label: 'Task board', href: '' },
  teamChat: { label: 'Team chat', href: '' },
  driveFolder: { label: 'Drive folder', href: '' },
} satisfies Record<string, ExternalLinkConfig>
