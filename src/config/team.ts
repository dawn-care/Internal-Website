export interface Person {
  name: string
  role: string
  /** GitHub login, for matching people in GitHub data (e.g. PR metrics). */
  login?: string
}

export const sponsor: Person = { name: 'Gerry Garavuso', role: 'Sponsor' }

export const coach: Person = { name: 'Drew Saur', role: 'Faculty coach' }

// Must match the `team` map in dawn-care/DAWN's .github/pr-metrics.config.json.
export const members: Person[] = [
  { name: 'Tess Hacker', role: 'Developer', login: 'saltyypanda' },
  { name: 'Ashton Michelstein', role: 'Developer', login: 'ashton-michelstein' },
  { name: 'Jay Doody', role: 'Developer', login: 'jmd9268' },
  { name: 'Haroon Aziz', role: 'Developer', login: 'ha4716' },
  { name: 'Alex Bruno', role: 'Developer', login: 'AJBruno23' },
  { name: 'David Holt', role: 'Developer', login: 'dgh4572' },
]

const nameByLogin = new Map(
  members.flatMap((m) => (m.login ? [[m.login.toLowerCase(), m.name] as const] : [])),
)

/** A team member's name for a GitHub login (case-insensitive), else "@login". */
export function nameForLogin(login: string): string {
  return nameByLogin.get(login.toLowerCase()) ?? `@${login}`
}
