// Registers (or updates) the /shame slash command with Discord. Run it once after creating
// the Discord application, and again whenever api/_lib/discord/command.ts changes:
//
//   DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... \
//     npm run discord:register
//
// With DISCORD_GUILD_ID the command is registered on that one server and shows up right
// away; without it, it's registered globally (every server the app is in). Registering
// overwrites the app's commands in that scope with exactly this one.

import { fileURLToPath } from 'node:url'
import { runnerImport } from 'vite'

// The command is defined in TypeScript (the API uses it too); Vite loads it for plain Node.
const {
  module: { SHAME_COMMAND },
} = await runnerImport(fileURLToPath(new URL('../api/_lib/discord/command.ts', import.meta.url)))

const {
  DISCORD_APPLICATION_ID: appId,
  DISCORD_BOT_TOKEN: token,
  DISCORD_GUILD_ID: guildId,
} = process.env

const missing = [!appId && 'DISCORD_APPLICATION_ID', !token && 'DISCORD_BOT_TOKEN'].filter(Boolean)
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}.`)
  process.exit(1)
}

const url = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`

const res = await fetch(url, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify([SHAME_COMMAND]),
})

if (!res.ok) {
  console.error(`Discord refused the command (${res.status}):`, await res.text())
  process.exit(1)
}
const [command] = await res.json()
console.log(
  `Registered /${command.name} (${command.id}) ${guildId ? `on server ${guildId}` : 'globally'}.`,
)
