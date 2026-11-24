/**
 * Server env vars. Never prefixed VITE_ and never sent to the browser.
 * Missing GitHub App credentials mean "auth unavailable" (e.g. preview deployments), not a crash;
 * a partial setup fails with an error naming what's missing.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export interface AuthConfig {
  clientId: string
  clientSecret: string
  sessionSecret: string
  org: string
}

function read(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

/** GitHub App sign-in settings, or null when sign-in isn't configured for this deployment. */
export function getAuthConfig(): AuthConfig | null {
  const clientId = read('GITHUB_CLIENT_ID')
  const clientSecret = read('GITHUB_CLIENT_SECRET')
  // Previews may run without sign-in (the site then shows sample tasks); production may not.
  if (!clientId && !clientSecret && process.env.VERCEL_ENV !== 'production') return null

  const values = {
    GITHUB_CLIENT_ID: clientId,
    GITHUB_CLIENT_SECRET: clientSecret,
    SESSION_SECRET: read('SESSION_SECRET'),
    GITHUB_ORG: read('GITHUB_ORG'),
  }
  const missing = Object.entries(values)
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length > 0) {
    throw new ConfigError(`Missing required environment variable(s): ${missing.join(', ')}.`)
  }
  return {
    clientId: values.GITHUB_CLIENT_ID!,
    clientSecret: values.GITHUB_CLIENT_SECRET!,
    sessionSecret: values.SESSION_SECRET!,
    org: values.GITHUB_ORG!,
  }
}

export interface ProjectConfig {
  org: string
  projectNumber: number
}

/** Which GitHub Project holds the tasks. Both variables are required for task endpoints. */
export function getProjectConfig(): ProjectConfig {
  const org = read('GITHUB_ORG')
  const rawNumber = read('GITHUB_PROJECT_NUMBER')
  const missing = [!org && 'GITHUB_ORG', !rawNumber && 'GITHUB_PROJECT_NUMBER'].filter(Boolean)
  if (missing.length > 0) {
    throw new ConfigError(`Missing required environment variable(s): ${missing.join(', ')}.`)
  }
  const projectNumber = Number(rawNumber)
  if (!Number.isInteger(projectNumber) || projectNumber <= 0) {
    throw new ConfigError('GITHUB_PROJECT_NUMBER must be a positive whole number.')
  }
  return { org: org!, projectNumber }
}

/** Like getAuthConfig, but for code paths that can't run without auth. */
export function requireAuthConfig(): AuthConfig {
  const config = getAuthConfig()
  if (!config) {
    throw new ConfigError(
      'Sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.',
    )
  }
  return config
}

/** True everywhere except real deployments (local `vercel dev`, tests). */
export function isDevEnvironment(): boolean {
  const env = read('VERCEL_ENV')
  return env !== 'production' && env !== 'preview'
}

/**
 * Dev-only testing aid: DEV_TOKEN_REFRESH_AFTER_SECONDS=10 pretends every new GitHub
 * access token is due for refresh 10 seconds after it was issued, so the refresh path can
 * be exercised without waiting ~8 hours. Ignored on production and preview deployments.
 */
export function devRefreshAfterSeconds(): number | undefined {
  if (!isDevEnvironment()) return undefined
  const raw = read('DEV_TOKEN_REFRESH_AFTER_SECONDS')
  if (raw === undefined) return undefined
  const seconds = Number(raw)
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new ConfigError('DEV_TOKEN_REFRESH_AFTER_SECONDS must be a number of seconds.')
  }
  return seconds
}

export interface CalendarConfig {
  calendarId: string
  serviceAccountEmail: string
  /** PEM (PKCS#8), with real newlines. */
  privateKey: string
}

/**
 * The Google service account that reads the team calendar, or null when none of its
 * variables are set ("calendar not connected", e.g. previews). A partial setup names what's
 * missing. Env UIs often store the key with literal "\n": those become real newlines.
 */
export function getCalendarConfig(): CalendarConfig | null {
  const values = {
    GOOGLE_CALENDAR_ID: read('GOOGLE_CALENDAR_ID'),
    GOOGLE_SA_EMAIL: read('GOOGLE_SA_EMAIL'),
    GOOGLE_SA_PRIVATE_KEY: read('GOOGLE_SA_PRIVATE_KEY'),
  }
  if (Object.values(values).every((v) => !v)) return null
  const missing = Object.entries(values)
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length > 0) {
    throw new ConfigError(`Missing required environment variable(s): ${missing.join(', ')}.`)
  }
  return {
    calendarId: values.GOOGLE_CALENDAR_ID!,
    serviceAccountEmail: values.GOOGLE_SA_EMAIL!,
    privateKey: normalizePrivateKey(values.GOOGLE_SA_PRIVATE_KEY!),
  }
}

/** Literal "\n" (and "\r\n") → newlines; surrounding quotes from copy-paste are dropped. */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1)
  }
  return key.replace(/\\r\\n|\\n/g, '\n').replace(/\r\n/g, '\n')
}

/**
 * The Discord application's public key, which every /api/discord request is verified
 * against. Required: without it the endpoint can't tell Discord's requests from anyone's.
 */
export function getDiscordPublicKey(): string {
  const key = read('DISCORD_PUBLIC_KEY')
  if (!key) throw new ConfigError('Missing required environment variable(s): DISCORD_PUBLIC_KEY.')
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new ConfigError('DISCORD_PUBLIC_KEY must be the 64-character hex key from Discord.')
  }
  return key
}

export interface ShameBotConfig {
  /** DISCORD_USER_MAP: JSON of GitHub login → Discord user ID (the same as the shame bot's secret). */
  userMap: string
  /** SHAME_DISPATCH_TOKEN: fine-grained token with Contents: write on dawn-care/Internal-Tools only. */
  dispatchToken: string
}

/**
 * What /shame needs beyond the public key, or the names of what's missing. Missing values
 * are reported to the person in Discord (names only) rather than crashing.
 */
export function getShameBotConfig(): ShameBotConfig | { missing: string[] } {
  const userMap = read('DISCORD_USER_MAP')
  const dispatchToken = read('SHAME_DISPATCH_TOKEN')
  if (userMap && dispatchToken) return { userMap, dispatchToken }
  return {
    missing: [!userMap && 'DISCORD_USER_MAP', !dispatchToken && 'SHAME_DISPATCH_TOKEN'].filter(
      (v): v is string => Boolean(v),
    ),
  }
}

/**
 * ARTIFACTS_GITHUB_TOKEN (optional): a fine-grained token with read-only "Contents" access to
 * dawn-care/Artifacts. The repo is public, so /api/artifacts works without it; the token adds
 * each document's "Updated" date and lifts GitHub's 60-calls-an-hour anonymous limit.
 */
export function getArtifactsToken(): string | null {
  return read('ARTIFACTS_GITHUB_TOKEN') ?? null
}
