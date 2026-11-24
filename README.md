# D.A.W.N. Team Site

Internal hub for the RIT SWEN 561/562 team building D.A.W.N. (Daily Awareness & Well-being
Navigator): meeting agendas and 4Ups, published project artifacts, and (for the team) tasks and
the sprint burndown.

- **Agendas** are read from Google Drive in the browser (API key, read-only).
- **Artifacts** are the Markdown files in the public `dawn-care/Artifacts` repo, read and cached
  by `/api/artifacts` so anyone can view them on the site.
- **Tasks** live in the team's GitHub Project and are read/written through `/api` with each
  person's own GitHub sign-in.
- **Burndown history** is a small daily-totals file per sprint in a private Vercel Blob store.

See `CLAUDE.md` for the full design and conventions.

## Quick start

Requires **Node 22.22+ or 24** (Vite 8, Vitest 5, and jsdom 30 don't support Node 20).

```sh
npm install
npm run dev          # frontend only, http://localhost:5173
```

With no credentials at all, the site still runs: Drive pages use mock data, and `/tasks` shows
sample tasks under a "Preview: sample data" banner. `VITE_TASKS_MOCK=true npm run dev` forces
the sample tasks with a fake signed-in user (never active in production builds).

| Command          | What it does                           |
| ---------------- | -------------------------------------- |
| `npm run dev`    | Vite dev server (no `/api`)            |
| `npx vercel dev` | Frontend + `/api` functions, port 3000 |
| `npm run build`  | Type-check (app + api) and build       |
| `npm run lint`   | ESLint                                 |
| `npm test`       | Vitest (server and UI tests)           |

## Phase 2 setup

Phase 2 adds GitHub sign-in, tasks, and the burndown. Everything secret stays server-side in the
`/api` functions.

### 1. Create the GitHub OAuth Apps

GitHub OAuth Apps allow a single callback host, so create **two** apps under the team's
organization (**Organization → Settings → Developer settings → OAuth Apps → New OAuth App**):

| App        | Homepage URL            | Authorization callback URL                |
| ---------- | ----------------------- | ----------------------------------------- |
| Production | `https://<your-domain>` | `https://<your-domain>/api/auth/callback` |
| Local dev  | `http://localhost:3000` | `http://localhost:3000/api/auth/callback` |

For each, note the **Client ID** and generate a **Client secret** (shown once).

The site asks for the scopes `read:user read:org project repo`. `repo` is needed because the
team's repository is private: without it, GitHub hides those issues in project items.

Preview deployments get **no** OAuth app on purpose: without OAuth vars, a preview shows sample
tasks with a "Preview: sample data" banner and never touches GitHub.

### 2. Get the apps approved by the organization

If the organization restricts third-party access (the default for new orgs), members can't use
an OAuth App until an owner approves it:

1. Sign in on the site once. GitHub's consent screen lists the organization with a
   **Request** button: click it.
2. An org owner approves it at **Organization → Settings → Third-party access → OAuth app
   policy**.

Until then, sign-in works but tasks fail with "the organization hasn't approved this app". Do
this for both apps. Only **active** org members can sign in; pending invitees see a message
asking them to accept the invitation first.

### 3. Create the private Blob store

In the Vercel project: **Storage → Create → Blob**, choose **Private** access, and connect it
to the Production and Development environments. That adds `BLOB_READ_WRITE_TOKEN`. The store
holds only daily totals per sprint (`burndown/<iterationId>.estimateHours.json`), never task
titles or assignees, and the server never sends blob URLs to the browser.

### 4. Set the environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. Server variables are
never prefixed `VITE_` and never reach the browser.

| Variable                 | Production        | Preview | Development     | Notes                                                       |
| ------------------------ | ----------------- | ------- | --------------- | ----------------------------------------------------------- |
| `GITHUB_CLIENT_ID`       | prod app          | unset   | local-dev app   | Unset = sign-in off (sample data). Required in production.  |
| `GITHUB_CLIENT_SECRET`   | prod app          | unset   | local-dev app   | Secret.                                                     |
| `SESSION_SECRET`         | random ≥ 32 chars | unset   | a different one | Encrypts the session cookie. `openssl rand -base64 48`      |
| `GITHUB_ORG`             | org login         | unset   | org login       | e.g. `dawn-team`; sign-in requires active membership.       |
| `GITHUB_PROJECT_NUMBER`  | number            | unset   | number          | From the project URL: `/orgs/<org>/projects/<number>`.      |
| `BLOB_READ_WRITE_TOKEN`  | from Blob store   | unset   | from Blob store | Added by connecting the store.                              |
| `VITE_GOOGLE_API_KEY`    | key               | key     | key             | Browser key; restrict it to the Drive API and your domains. |
| `VITE_AGENDAS_FOLDER_ID` | folder id         | same    | same            | Missing = hide agendas/4Ups.                                |
| `ARTIFACTS_GITHUB_TOKEN` | token (optional)  | same    | same            | Lifts GitHub's anonymous rate limit (see below).            |

`ARTIFACTS_GITHUB_TOKEN` is optional: `dawn-care/Artifacts` is public, so `/artifacts` (including
each document's "Last updated" date) works without it. Without a token the site makes about one
GitHub API call per refresh (plus one per changed file), well under GitHub's limit of 60
anonymous calls an hour; set a token if that limit is ever hit (dates would go missing).
Use a **fine-grained personal access token** with resource owner `dawn-care`, repository
access **Only select repositories → Artifacts**, and permission **Contents: Read-only**
(nothing else). If it expires, `/artifacts` shows an error until it's replaced or removed.

If sign-in is partly configured (e.g. a client ID without `SESSION_SECRET`), the API fails with
an error naming exactly what's missing. On production, missing OAuth vars are an error rather
than "preview mode", so the real site can never show sample data.

### 5. Run it locally with the API

```sh
npx vercel link            # once: connect this folder to the Vercel project
npx vercel env pull .env.local   # Development env vars → .env.local (git-ignored; never commit it)
npx vercel dev             # http://localhost:3000, frontend + /api
```

Sign in at `http://localhost:3000` (the local-dev OAuth app's callback is on port 3000, so
`npm run dev` on 5173 can't sign in). Re-run `vercel env pull` whenever the Development
variables change.

## How tasks work

**The GitHub Project is the source of truth.** The site stores no tasks: every read and write
goes to GitHub through `/api` using the signed-in person's own token, so GitHub records who made
each change and enforces their permissions. Edits made on the GitHub board show up on the site
(it refetches when you come back to the tab), and vice versa.

- **New task** creates a real issue in the repository linked to the project, adds it to the
  project, then sets its fields. Draft issues can still be made on the board; the site can edit
  their title and notes.
- **Sprints** are the project's **Iteration** field, and nothing else. The current sprint is
  the iteration whose dates include today (America/New_York).
- **The burndown** is measured in **Estimate** hours. There's no scheduled job: whenever a
  signed-in teammate opens the Sprint tab for the current sprint, today's totals are recorded.
  Days nobody opens it are gaps.
- Issues your token can't read are skipped and counted, never shown redacted.

### Don't rename project fields

The site finds fields and options **by name** at runtime:

| Field                 | Type          | Options / notes                                                        |
| --------------------- | ------------- | ---------------------------------------------------------------------- |
| `Status`              | single select | Product Backlog, Sprint Backlog, In progress, In review, Done, Blocked |
| `Iteration`           | iteration     | Sprint membership                                                      |
| `Estimate`            | number        | Hours; the burndown's unit                                             |
| `Estimated done date` | date          | Shown as "Done by"; drives overdue                                     |
| `Priority`            | single select | P0, P1, P2 (optional)                                                  |
| `Size`                | single select | XS, S, M, L, XL (optional, display only)                               |
| `Type`                | single select | Dev, Docs, Admin (optional)                                            |

Renaming a required field (Status, Iteration, Estimate, Estimated done date) breaks `/tasks`
with an error naming the missing field; renaming an optional one silently hides it. If a rename
is really needed, change the name in `api/_lib/config.ts` in the same step. Adding new
options (e.g. another Status) is fine: unknown statuses count as "open".

## Shame bot: `/shame` in Discord and the `/shame` page

The shame bot lives in `dawn-care/Internal-Tools` (`shame-bot/`, run by
`.github/workflows/shame-bot.yml`). DAWN forwards its PR events there
(`internal-tools-forwarder.yml`). The bot shames people automatically and logs every shame in
`metrics/shame.json` on Internal-Tools' public `metrics` branch. This site adds two things:

- **`/shame @person category reason`** in Discord. It posts a message with an **Endorse**
  button, and it counts once 2 teammates other than the shamer and the person shamed endorse
  it within 24 hours. Then `/api/discord` sends it to Internal-Tools as a `manual-shame`
  repository_dispatch, and the shame bot re-checks it, logs it and posts its own message.
- **The `/shame` page** (signed in, nav "Shame"), which reads `metrics/shame.json` in the
  browser and shows shames per category, per person (and what each person is shamed for
  most), per week, and the recent ones with their reasons, shamers and endorsers.

The page needs no setup. The Discord command needs the steps below, done once by someone with
admin rights on the team's Discord server, the Vercel project, and `dawn-care/Internal-Tools`.

### 1. Create the Discord application

1. Go to <https://discord.com/developers/applications> → **New Application**, name it (e.g.
   "DAWN Shame").
2. On **General Information**, copy the **Application ID** and the **Public Key**.
3. On **Bot**, click **Reset Token** and copy the **bot token** (shown once). It's only used
   to register the command (step 3), never by the site.
4. On **Installation**, under **Guild Install**, add the scope **`applications.commands`**
   (no `bot` scope and no permissions needed). Copy the install link, open it, and add the
   app to the team's server.

### 2. Create the GitHub token for the shame bot

On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens →
Generate new token**.

- **Resource owner**: `dawn-care` (an org owner may have to approve the request).
- **Repository access**: _Only select repositories_ → `dawn-care/Internal-Tools` only.
- **Permissions**: Repository → **Contents: Read and write** (that's what repository_dispatch
  needs; Metadata: read comes with it). Nothing else. DAWN's `TOOLS_DISPATCH_TOKEN` secret (for its forwarder) can be this same token.
- Pick an expiry and put a reminder in the calendar to rotate it before then.

### 3. Set the environment variables on Vercel

**Vercel → Project → Settings → Environment Variables**, for **Production** (add them to
Development too if you want to try it with `vercel dev` and a tunnel):

| Variable               | Value                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `DISCORD_PUBLIC_KEY`   | The application's **Public Key** (64 hex characters).                                                |
| `DISCORD_USER_MAP`     | The same JSON as the shame bot's `DISCORD_USER_MAP` secret: `{"githubLogin": "discordUserId", ...}`. |
| `SHAME_DISPATCH_TOKEN` | The fine-grained token from step 2. Secret.                                                          |

`DISCORD_USER_MAP` decides who's on the team: only people in it can use `/shame`, be shamed,
or endorse (the shame bot checks its own copy again). Keep the two copies in sync when someone joins or
leaves. To get a Discord user ID, turn on **Developer Mode** in Discord's settings, then
right-click a person → **Copy User ID**. Redeploy after changing any of these.

### 4. Register the command

From this repo, with the values from step 1 (`DISCORD_GUILD_ID` is the server's ID: right-click
the server icon → **Copy Server ID**; with it, the command shows up immediately):

```sh
DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... npm run discord:register
```

PowerShell:

```powershell
$env:DISCORD_APPLICATION_ID = '...'; $env:DISCORD_BOT_TOKEN = '...'; $env:DISCORD_GUILD_ID = '...'
npm run discord:register
```

Run it again whenever `api/_lib/discord/command.ts` changes (e.g. a new category, which must
be added to DAWN's `CATEGORIES` in `rules.mjs` first).

### 5. Set the Interactions Endpoint URL

Once the env vars are deployed: Developer Portal → **General Information → Interactions
Endpoint URL** → `https://<your-domain>/api/discord` → **Save**. Discord checks the URL with a
signed `PING` and an unsigned request when you save; if it refuses, check that
`DISCORD_PUBLIC_KEY` is set on Production and that the deployment is live (and not behind
Vercel Deployment Protection).

Then try `/shame` in the server. If a setting is missing, the bot says which one, privately.

### How it works

- Every request is checked against Discord's Ed25519 signature (`api/_lib/discord/verify.ts`);
  unsigned ones get 401.
- **Nothing is stored on the site.** The Endorse button's `custom_id` carries the person
  shamed, the shamer, the category and the endorsers so far; the reason is read back from the
  message text; the 24-hour window comes from the message ID's timestamp. So there's nothing to
  clean up, and the message is the record. If two people click at the exact same moment for
  the first endorsement, one of the clicks can be lost (the message shows who counted, so they
  click again). Two clicks at the same moment for the last endorsement are harmless: DAWN logs
  each message once.
- The message pings only the person shamed (`allowed_mentions`), never anyone named in the
  reason.
- Refusals (not on the team, endorsing your own or someone's shame twice, expired) are
  ephemeral replies to the clicker. If GitHub refuses the dispatch, the button stays and the
  clicker is told to try again.

### Previewing the page locally

`VITE_TASKS_MOCK=true npm run dev` shows made-up shames. To preview the real log, save it as
`public/shame.local.json` (git-ignored) and run with `VITE_SHAME_URL=/shame.local.json`.

## Rotating secrets

Rotate a secret right away if it may have leaked (committed, pasted in chat, a lost laptop with
`.env.local`), and whenever someone with Vercel access leaves the team.

**`SESSION_SECRET`**: set a new random value in Vercel (`openssl rand -base64 48`) and
redeploy. Every existing session cookie stops decrypting, so everyone is signed out and simply
signs in again. Nothing else to do.

**`GITHUB_CLIENT_SECRET`**: in the OAuth App settings, **Generate a new client secret**,
update it in Vercel, redeploy, then **delete the old secret** on GitHub. Existing sessions keep
working (they hold user tokens, not the app secret). For the local-dev app, re-run
`npx vercel env pull .env.local` afterwards.

**Revoking everyone's GitHub access** (e.g. a session cookie or `SESSION_SECRET` may have leaked): in the
OAuth App settings, **Revoke all user tokens**, then rotate `SESSION_SECRET`. Each person
re-approves the app on their next sign-in. A single person can revoke their own grant at
**GitHub → Settings → Applications → Authorized OAuth Apps**; signing out on the site does
this too.

**`BLOB_READ_WRITE_TOKEN`**: in **Vercel → Storage → the Blob store**, rotate the token (or
disconnect and reconnect the store), then redeploy. The burndown history is kept.

**`VITE_GOOGLE_API_KEY`**: this key is public by design (it ships in the browser bundle), so
its protection is its restrictions: Drive API only, HTTP referrers limited to the site's
domains. To rotate, create a new key in Google Cloud with the same restrictions, update Vercel,
redeploy, then delete the old key.

**`SHAME_DISPATCH_TOKEN`**: generate a new fine-grained token (same settings), update it in
Vercel and in DAWN's `TOOLS_DISPATCH_TOKEN` secret, redeploy, then delete the old one on GitHub. **Discord bot token / public key**: the bot
token isn't stored anywhere (only used to register the command); reset it in the Developer
Portal if it leaked. The public key isn't secret.

After any rotation, check the deployment: sign in, open `/tasks`, and open the Sprint tab.
