# D.A.W.N. Team Site

Internal website for our RIT SWEN 561/562 senior project team working on D.A.W.N.
(Daily Awareness & Well-being Navigator), a tablet-based morning orientation app for
people living with dementia, sponsored by Gerry Garavuso and in beta at St. Ann's Home.
Faculty coach: Drew Saur.

## Purpose
A lightweight hub for the team, sponsor, and coach: see upcoming/past meeting agendas,
browse project artifacts, and (team only) manage tasks, track sprint progress, see a
personal developer dashboard, and view the team's meeting calendar.
Agendas and artifacts live in Google Drive; the site only reads them. Meetings live in
the shared "DAWN Team" Google Calendar; the site only reads it. Tasks live in our
GitHub Project; the site reads and writes them through GitHub's API.

## Stack (do not add to this without asking)
- React 18+ with Vite, TypeScript (strict)
- Tailwind CSS v4 via @tailwindcss/vite, CSS-first config with @theme in src/index.css
- react-router-dom (BrowserRouter)
- lucide-react for icons
- Vercel serverless functions (Node.js runtime) in /api for everything that needs a secret
- jose (session cookie encryption + Google service-account JWTs), @vercel/blob
  (burndown snapshots)
- No state library. No UI component library. No chart library (charts are hand-built SVG).
  No googleapis package.
- No database. GitHub Projects is the task store; Vercel Blob holds only daily snapshot totals.

## Public data: Google Drive
- Google Drive API v3, called from the browser with an API key.
- Content comes from *sources*, declared in src/config/sources.ts. Two source kinds:
  - "dated-feed": recurring files named "YYYY-MM-DD <Suffix>" in a working folder,
    pulled automatically. A feed is defined by { folderId, suffix }, and several feeds
    can share one folder. Current: agendas (suffix "Agenda") and fourUps (suffix
    "4Up"), both in the Agendas folder. Planned later: sprintArtifacts (do NOT build
    yet, but adding it must only require a new config entry).
  - "published-library": a curated folder whose subfolders are categories; the team
    manually uploads final artifacts into them. Current: publishedArtifacts. The
    Artifacts pages show only this library (agendas and 4Ups live on /agendas).
- Env vars (Vite): VITE_GOOGLE_API_KEY, VITE_AGENDAS_FOLDER_ID, VITE_PUBLISHED_FOLDER_ID
- If VITE_GOOGLE_API_KEY is missing, use mock data from src/lib/drive/mock.ts so the
  site runs locally without credentials. If one source's folder ID is missing, hide
  that source's UI rather than erroring.
- Fetch each folder once. Feeds that share a folder share the fetch and the cache.
- Filenames in the Agendas folder: exactly "YYYY-MM-DD Agenda" or "YYYY-MM-DD 4Up"
  (suffix match is case-insensitive, whitespace-tolerant). Files matching neither are
  ignored, with a console.warn in dev only. An Agenda and a 4Up with the same date
  form one "meeting".
- Agenda docs for official meetings are auto-created in Drive by a Google Apps Script
  outside this repo (it reads the DAWN Team calendar and copies a template). The site
  never creates, edits, or deletes Drive files.
- Published library: each subfolder is a category; files directly in the root folder are
  ignored. Subfolders and files both use an optional "NN " prefix for ordering (e.g.
  "02 Requirements", "01 Project Plan.pdf"): sort by the number, strip it for display.
  Unprefixed items sort after prefixed ones, by name.
- Every published artifact is a PDF, so artifact names are displayed without ".pdf".
  This applies only to artifacts: agendas and 4Ups are not PDFs and keep their names.

## Backend: /api (Vercel functions)
- Route files live in /api. Shared server code lives in /api/_lib (underscore = not a
  route). Server code has its own tsconfig (Node target) separate from the Vite app.
- Vercel Hobby allows at most 12 functions per deployment. Consolidate with dynamic
  routes (e.g. /api/auth/[action].ts handles login, callback, logout, me). Report the
  function count whenever you add a route.
- vercel.json SPA rewrite: source "/((?!api/|@)[^.]*)" → "/index.html". It only rewrites
  extensionless paths that don't start with api/ or @, so `vercel dev` still serves
  Vite's module requests (/src/*.tsx, /@vite/client, /node_modules/...). Do not
  "simplify" it to "/(.*)"; that breaks local dev.
- Server env vars (never prefixed VITE_, never sent to the browser):
  GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET, GITHUB_ORG,
  GITHUB_PROJECT_NUMBER, BLOB_READ_WRITE_TOKEN, GOOGLE_CALENDAR_ID, GOOGLE_SA_EMAIL,
  GOOGLE_SA_PRIVATE_KEY. (GITHUB_SNAPSHOT_TOKEN and CRON_SECRET are reserved for an
  optional future scheduled snapshot job; don't require them.)
- Server code must fail with a clear error naming any missing required env var, except:
  missing GitHub App vars mean "auth unavailable" (preview deployments), and missing
  Google calendar vars mean "calendar not connected". Neither is a crash.
- Every endpoint returns JSON { error: { code, message } } on failure with a correct
  status code. Never return raw GitHub/Google error bodies or tokens to the client.
- Local dev with the API: `npx vercel dev` (port 3000). `npm run dev` runs the frontend only.
  Local env vars come from Vercel's Development environment via
  `npx vercel env pull .env.local`. .env.local is never committed. Development points
  GITHUB_PROJECT_NUMBER at the SANDBOX project, not the real one.

## Auth: Sign in with GitHub (GitHub App)
- A GitHub App (not an OAuth App) provides sign-in. Permissions are configured on the
  app, not requested via scopes: repo Metadata/Pull requests/Checks/Commit statuses
  read, Issues read & write; org Projects read & write, Members read. The app is
  installed on the org, including the private D.A.W.N. repos. Do not add a `scope`
  param to the authorize URL.
- One app serves both environments. It has two registered callback URLs; always send
  an explicit redirect_uri built from the request's own origin + /api/auth/callback.
- Flow: /api/auth/login sets a random `state` in a short-lived HttpOnly cookie and
  redirects to GitHub; /api/auth/callback verifies state, exchanges the code, checks the
  user is an ACTIVE member of GITHUB_ORG (GET /user/memberships/orgs/{org}), then sets
  the session cookie. Non-members get redirected to /tasks?error=not-a-member.
  returnTo only accepts relative paths starting with "/"; default after sign-in is
  /dashboard.
- User tokens EXPIRE (~8h) and come with a refresh token (~6 months). The session cookie
  (JWE via jose, key from SESSION_SECRET; HttpOnly, Secure except localhost,
  SameSite=Lax, Path=/, Max-Age 7 days) stores access token, its expiry, refresh token,
  and { login, name, avatarUrl }. Tokens never reach browser JavaScript. Keep the
  cookie under 4KB.
- /api/_lib/session.ts exposes getValidToken(req, res): if the access token expires
  within 5 minutes, refresh it (POST https://github.com/login/oauth/access_token with
  grant_type=refresh_token), re-set the cookie, and return the new token. Concurrent
  refreshes in one request share a single promise. If refresh fails, clear the session
  and respond 401 with code "session-expired". Every endpoint gets tokens ONLY via
  getValidToken. The frontend handles "session-expired" by signing out locally with a
  friendly "sign in again" message.
- Sign-out revokes the token (DELETE /applications/{client_id}/token, basic auth with
  client id/secret) and then clears the cookie. If revocation fails, still clear it.
- /api/auth/me returns { user } or { user: null, authAvailable } (authAvailable is false
  when GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / SESSION_SECRET are missing, e.g. on
  preview deployments).
- Mutating endpoints (POST/PATCH/DELETE) also require the Origin header to match the
  site's own origin.
- When a GitHub call fails because the app isn't installed on a repo, show: "The DAWN
  Team Site app isn't installed on <repo>. Ask an org owner to add it."
- Frontend: src/lib/auth (AuthProvider + useAuth). Signed in: nav order is Dashboard,
  Tasks, Meetings, then the public pages (Agendas, Artifacts). There is no "Home" nav item:
  the logo always links to "/", signed in or not; avatar menu has Dashboard, My tasks,
  Sign out. Signed out: "Sign in with GitHub" button.

## Tasks: GitHub Projects v2
- All task reads/writes go through /api/tasks* using the SIGNED-IN USER'S token, so
  GitHub attributes changes to them and enforces permissions. Server GraphQL client
  lives in /api/_lib/github.
- Project fields are found BY NAME at runtime (cache per function instance). All field
  and option names live in one server config file (/api/_lib/config.ts) so a rename is
  a one-line fix:
  - Status (single select): Product Backlog, Sprint Backlog, In progress, In review,
    Done, Blocked. "Done" = complete; everything else is open. "Blocked" is flagged.
  - Iteration (iteration): the ONLY source of truth for sprint membership.
  - Estimate (number, HOURS). The burndown's unit.
  - Priority (single select: P0, P1, P2). Badge, filter, secondary sort (P0 first).
  - Size (single select: XS, S, M, L, XL). Display only, never used in math.
  - Estimated done date (project DATE field): overdue/due-soon logic. In code, call
    this `doneBy`; in the UI label it "Done by".
  - Type (single select: Dev, Docs, Admin).
  - Ignore "Sub-issues progress" and any other issue-level fields, except labels: issue/PR
    labels are shown read-only on task rows (drafts can't have labels). The site never
    edits labels.
  There is no Story Points field (it was removed from the project); the site doesn't read
  or write it, and ignores it if it reappears. The burndown is measured in Estimate hours
  (BURNDOWN_UNIT = "estimateHours"); never mix units in one chart.
  Required fields: Status, Iteration, Estimated done date, Estimate. If one is missing,
  fail with a readable error naming it. All other fields (Type, Priority, Size) are
  optional: hide their UI
  (badges, filters, and dialog fields) when absent.
- New Task dialog: the sprint (Iteration) defaults to "none"; the user can pick one.
- Status colors come from GitHub's option colors (fetched with the project meta), mapped
  to the status-* tokens in src/index.css via statusColorTokens in src/lib/tasks; unknown
  or missing → GRAY. Every status display (lists, dialog, inline status select) uses the
  one StatusBadge component (and StatusDot in selects): the name is always shown as text,
  Blocked gets an AlertCircle instead of the dot, and Done tasks' titles are dusk with a
  line-through.
- New items created on the site get Status "Sprint Backlog" if an iteration is set,
  otherwise "Product Backlog", unless the user picks a status explicitly.
- Items GitHub returns redacted (content the user's token can't read) are skipped but
  counted; /tasks shows how many are hidden, with a "Sign in again" button.
- Items can be draft issues, issues, or PRs. New task creates real ISSUES only, never
  drafts: createIssue in the repository linked to the project, then addProjectV2ItemById,
  then the field updates. The repository is found at runtime from the project's linked
  repositories (fetched with the project meta): the only linked repo, or, if several are
  linked, the one named by ISSUE_REPOSITORY in /api/_lib/config.ts. With none (or an
  ambiguous set), refuse before writing anything, with a readable error naming the fix. If
  the issue is created but can't be added to the project, say which issue exists (so nobody
  retries into a duplicate). The site can edit fields on any item, title/notes on drafts
  (existing ones; drafts can still be made on the GitHub board), assignees on drafts and
  issues, and links out to GitHub for everything else. Archived items are excluded.
- Write safety:
  - Never call GitHub's API directly (gh CLI, curl, scripts) to create, edit, or delete
    project items. Test writes only through mocks or against the sandbox project that
    the Development env points to.
  - PATCH requests send only fields the user actually changed. A field is cleared only
    when the user explicitly clears it, never because it was absent or unchanged.
  - The site never deletes or archives items.
- A failed /api/tasks request (401/404/500) shows an error with retry, never the
  "no tasks" empty state. When a view is empty because of filters, say so (e.g. "12
  tasks hidden by filters") with a way to show them.
- "Current iteration" = the iteration where startDate <= today < startDate + duration.
- Dates: GitHub date fields are calendar dates. Parse them as local dates
  (America/New_York), never as UTC midnight. Overdue = Estimated done date before today
  and not Done.
- Frontend mock: when VITE_TASKS_MOCK=true, the Tasks, Dashboard, and Meetings UIs use
  mock data and a fake signed-in user, and writes only update in-memory state. Show a
  "Sample data" banner whenever mock mode is on. Never used in production.
- Preview mode: when /api/auth/me says authAvailable: false (a preview deployment without
  GitHub App vars), the Tasks UI runs on the same sample data (src/lib/sampleMode.ts) under
  a "Preview: sample data" banner. A failing /api is NOT a preview. On
  VERCEL_ENV=production, missing GitHub App vars are a config error, so production can
  never show sample data.
- An expired/revoked session (401 session-expired or unauthenticated from any /api call)
  signs the user out app-wide (src/lib/auth/sessionEvents.ts) with a friendly message.

## Team to-dos (small chores, NOT GitHub)
- Small team chores ("Email Gerry…", "Set up St. Ann's visit") live in the private Vercel
  Blob store, one JSON file per item: todos/<id>.json (id = crypto.randomUUID()). They
  never touch the GitHub Project, the burndown, or GitHub at all.
- Shape: { id, title, description?, dueDate? ("YYYY-MM-DD", America/New_York calendar
  date), assignees (GitHub logins, one or more; [] = for everyone), done, doneBy?,
  doneAt?, createdBy, createdAt, updatedBy, updatedAt, version }. createdBy/updatedBy/doneBy
  come from the session, never from the request body. A to-do with no assignees is for the
  whole team and is shown with no assignee label (never "Unassigned"). Older files with a
  single `assignee` are read as [assignee] and saved in the new shape on their next write.
- Validation (server): title 1–200 chars (trimmed), description ≤ 2000, dueDate valid
  YYYY-MM-DD, assignees ≤ 20, each a current org member login (from the team list),
  de-duplicated. PATCH `assignees` replaces the whole list.
- Concurrency: one file per item so different items never collide. PATCH/DELETE must
  send the item's current `version`; if it doesn't match what's stored, respond 409
  "changed by someone else, reload" and change nothing. Writes bump version.
- API: one function, /api/todos.ts, with a vercel.json rewrite /api/todos/:id →
  /api/todos?id=:id (Vercel's non-Next functions treat [[...id]] like [...id], so the bare
  /api/todos 404s; don't use it): GET (list), POST (create), PATCH /:id
  (partial update, only changed fields), DELETE /:id. Signed-in only; mutating requests
  require same-origin. GET returns open items + items done within the last 14 days
  (older done items stay stored but aren't returned). In-memory list cache ≤ 15s per
  function instance, invalidated by any write in that instance.
- Blob: access "private", server-side only, never expose blob URLs. Reuse the Blob
  helpers from /api/_lib (same store as burndown). Overwrites must be visible on the next
  read (no stale CDN copy); use the smallest cache TTL the SDK allows for todos/.
- Code: /api/_lib/todos.ts (storage + validation), src/lib/todos (types, useTodos hook
  with optimistic updates + rollback, mock data).
- UI: "To-dos" tab on /tasks and a "Team to-dos" dashboard widget (see below). Mock mode
  and preview sample-data mode use src/lib/todos mock data, in-memory writes only.
- Store nothing sensitive beyond what the team types; to-dos are team-internal and are
  never shown to signed-out visitors.

## Burndown
- Snapshots are VIEW-TRIGGERED: there is no scheduled job and no server-owned GitHub
  token. When a signed-in user loads /api/burndown for the CURRENT iteration, the server
  computes today's totals with that user's token and upserts today's entry
  (America/New_York date) into burndown/<iterationId>.estimateHours.json. Days nobody
  views are gaps.
- File shape: { iteration: {id,title,startDate,duration}, days: [{ date, remaining,
  done, scope, unestimatedCount, unit }] }, measured in hours (unit "estimateHours").
  Upsert by date (the latest view of the day wins). Plain burndown/<iterationId>.json
  files are older Story Points snapshots: never read, list, or overwrite them. If the unit
  ever changes again, start a new file rather than mixing units. Past iterations are
  read-only (never rewritten).
- Vercel Blob store is PRIVATE: read/write with access "private", server-side only;
  never send blob URLs to the client.
- Store only totals, never task titles or assignees.
- Keep the snapshot computation in one function (/api/_lib/burndown.ts) that takes a
  token, so a scheduled job (cron + a read-only token) can reuse it later if the gaps
  become a problem.

## Developer dashboard (/dashboard, signed-in only)
- One endpoint, GET /api/dashboard, returns every widget's data in one response:
  { me, sprint, tasks, reviewQueue, myPrs, meetings, generatedAt }. Each widget is
  computed independently: if one source fails (e.g. PR search), that widget gets
  { error } and the others still return. The UI renders per-widget errors.
- PRs come from GitHub GraphQL `search` (type: ISSUE) scoped to `org:GITHUB_ORG`:
  review queue = `is:pr is:open review-requested:@me`, mine = `is:pr is:open author:@me`.
  For each PR: title, url, repo, number, isDraft, createdAt, baseRefName, requested
  reviewers, submitted reviews, and the head commit's statusCheckRollup state.
- Team process rules the dashboard checks (keep them in src/config/process.ts):
  2 required reviewers per PR; reviews due within 1 business day (Mon–Fri,
  America/New_York); PR descriptions must include a demo video (detect a video link or
  GitHub video attachment in the body: .mp4/.mov/.webm, youtube, loom, drive, or
  github.com/user-attachments); PR flow is feature branch → canary → main.
- meetings = the next 5 calendar events (now through +14 days), from the same calendar
  code as /api/meetings; the client joins agendas.
- Cache /api/dashboard responses per user for 60s in memory. Never share cached data
  across users.

## Meetings (Google Calendar)
- The shared "DAWN Team" Google Calendar is the ONLY source of meetings:
  - Official: "Sponsor Meeting", Tuesdays (the ONLY meetings with agendas and 4Ups)
  - Retro: "Sprint Retro", Mon 20:00 (no agenda)
  - Ad hoc: anything else on the calendar (no agenda), including the "Team Meeting"
    Tue & Thu 17:00–18:15 America/New_York
  The site never stores a schedule of its own and never writes to the calendar.
- Server reads it with a Google service account (GOOGLE_SA_EMAIL,
  GOOGLE_SA_PRIVATE_KEY, GOOGLE_CALENDAR_ID): sign a JWT with jose (RS256, scope
  https://www.googleapis.com/auth/calendar.readonly), exchange it at
  https://oauth2.googleapis.com/token, cache the access token until 5 min before expiry.
  The private key env var may contain literal "\n": replace with real newlines.
  Code lives in /api/_lib/google/calendar.ts.
- Always call events.list with singleEvents=true, orderBy=startTime,
  timeZone=America/New_York so Google expands recurrences and applies cancellations.
- Normalize each event to Meeting { id, title, start, end, allDay, kind:
  "official" | "retro" | "adhoc", recurring, joinUrl?, htmlLink }. kind: title contains
  OFFICIAL_MEETING_KEYWORD ("Sponsor Meeting") → official; contains RETRO_KEYWORD ("Retro")
  → retro; else adhoc (keywords in src/config/meetings.ts, case-insensitive).
  recurring = the event has a recurringEventId (part of a repeating series).
  joinUrl from hangoutLink / conferenceData / a URL in location.
- Meeting tags in the UI: "Retro" for retros, "Recurring" for any other recurring event,
  no tag for one-off events. kind is never shown as "Official"/"Ad hoc"; it only decides
  agenda linking.
- NEVER return attendee emails, descriptions, or organizer info to the client (they can
  contain private notes/links). "Details" links to htmlLink in Google Calendar.
- Only official meetings are joined (joinAgendas) to the Agendas AND 4Ups feed items with
  the same date (America/New_York): an "Agenda" link and a "4Up" link when they exist,
  otherwise "Agenda not posted yet" / "4Up not posted yet" (past meetings: "No agenda
  posted" / "No 4Up posted"). Show nothing for a feed that hasn't loaded. Retro and ad hoc
  meetings never show agenda or 4Up state.
- GET /api/meetings?from=YYYY-MM-DD&to=YYYY-MM-DD (signed-in only; max range 62 days).
  Cache per range for 5 minutes in memory (calendar data is team-wide, not per-user).
- /meetings page (signed-in only): 3-week list + week grid, past 2 weeks of official
  meetings with agenda and 4Up links, "Add a meeting" opens Google Calendar (the site never
  creates events), "Subscribe" → CALENDAR_URL.
- Missing calendar env vars: meetings UI shows "Calendar not connected" (mock meetings
  when VITE_TASKS_MOCK=true), never a crash.

## Design system: "First Light" (light + dark)
Brand palette (raw values; use ONLY inside token definitions and decorative art like the
hero gradient, sun arc, horizon lines, logo): night #1E2140, cream #FFF8EF, dusk
#5B6091, ember #B4533A, apricot #E07A5F, gold #F2B84B, lavender #8A8FB5.

Components use SEMANTIC tokens only, never brand colors or raw hex:
| token          | light              | dark                         |
| page           | #FFF8EF (cream)    | #14162B                      |
| surface        | #FFFFFF            | #1E2140 (night)              |
| surface-raised | #FFFFFF            | #272A4F                      |
| nav            | #1E2140 (night)    | #0F1124                      |
| on-nav         | #FFF8EF            | #F3EDE4                      |
| ink            | #1E2140 (night)    | #F3EDE4                      |
| ink-muted      | #5B6091 (dusk)     | #A9ADD0                      |
| link           | #B4533A (ember)    | #F2A488                      |
| accent         | #E07A5F (apricot)  | #E07A5F                      |
| on-accent      | #1E2140            | #1E2140                      |
| border         | #EDE3D6            | #3A3E6B                      |
| focus          | #F2B84B (gold)     | #F2B84B                      |
Status badge tokens (status-<color>-bg / -text) have light and dark values; dark values:
GRAY #2E3150/#D4D6E8, BLUE #23305E/#BFCBF5, GREEN #1F3D2C/#AEDDBC, YELLOW #3D3419/#F2D98C,
PURPLE #34295A/#D5C6F2, ORANGE #452A1F/#F5BFA6, RED #4A2226/#F4B4B4, PINK #452337/#F2B8D2.

Implementation:
- src/index.css: light values on :root, dark values on [data-theme="dark"], exposed to
  Tailwind with `@theme inline { --color-page: var(--page); ... }` so utilities are
  bg-page, text-ink, text-link, border-border, etc. Add
  `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` for the rare
  one-off override. Set `color-scheme: light` / `dark` per theme (native controls,
  scrollbars).
- Theme preference: "system" (default) | "light" | "dark", stored in localStorage key
  "theme" (wrapped in try/catch). An inline script in index.html, before the CSS, resolves
  it (system → prefers-color-scheme) and sets data-theme on <html> before first paint.
  In system mode, follow live OS changes via matchMedia.
- src/lib/theme: ThemeProvider + useTheme() → { preference, resolved, setPreference }.
- Toggle: icon button in the navbar (Sun / Moon / Monitor from lucide), cycling
  system → light → dark, with an aria-label stating the current mode and a tooltip.
  Also listed in the avatar menu for signed-in users.
- Charts (hand-built SVG) use currentColor / CSS vars, never hardcoded colors.

Rules (both themes):
- Text: ink (primary), ink-muted (secondary). Links/active states: link.
- accent is a fill with on-accent text on top. gold and lavender are decorative only,
  never text.
- Fonts: Fraunces (headings), Inter (body).
- Cards: surface, rounded-2xl. Light: soft warm shadow, hover lift. Dark: 1px border,
  hover → surface-raised (shadows are invisible on dark).
- Signature motifs: sunrise hero gradient (light: night → lavender → apricot → gold;
  dark: #14162B → #1E2140 → #5B6091 → #B4533A → #C98F2F), gold→apricot "horizon line"
  dividers, sun-arc SVG behind the wordmark. The motifs keep their warm colors in dark.
- Embedded Google previews stay white; frame them with a border.
- Respect prefers-reduced-motion. Meet WCAG AA in BOTH themes. Fully keyboard
  navigable, visible focus rings (focus token).
- Color is never the only signal: every badge/tag also has a text label.

## /game (jumpscare)
- jumpscare/ is a standalone trivia game, unrelated to D.A.W.N. After 5 questions it turns
  into a first-person walk through a house (jumpscare/src/house: a canvas raycaster with
  drawn textures; all its sound is synthesized with Web Audio, no new dependencies). The
  trivia itself has no jumpscares; the house does. Memories (paintings) and door riddles live
  in jumpscare/src/house/story.ts and are placed by key in the map in map.ts. The last door
  leads outside to the fog and a giant; reaching you there is the (current) ending. It is
  not part of the React app (no nav link, no Layout, no design tokens). vite.game.config.ts builds it
  with the site's own dependencies into dist/game (base "/game/") as the last step of
  `npm run build`; vercel.json rewrites /game and /game/ to /game/index.html (before the
  SPA rewrite). `npm run dev:game` serves it at localhost:5173/game/. It's excluded
  from the site's lint config but type-checked by `tsc -b`.

## Conventions
- src/pages/* for routes, src/components/* for shared UI, src/lib/* for non-UI logic.
- Keep Drive API code isolated in src/lib/drive so it can be swapped for a build-time
  manifest later without touching pages.
- Keep all GitHub API code server-side in /api/_lib/github and all Google Calendar code
  in /api/_lib/google. The browser only talks to /api (and the public Drive API).
- Every data view handles loading (skeletons), error (friendly message + retry), and empty.
- Run `npm run build` and `npm run lint` before declaring a task done. At the end of a
  task, list every file created or changed.