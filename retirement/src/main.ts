import { defaultLook, newSave } from '../shared/schema'
import { Game } from './game'
import { LocalNet, NetError, RemoteNet, type MeResult, type Net } from './net'
import { perf } from './perf'
import { initMusic } from './music'
import { initSoundscape } from './soundscape'
import './style.css'
import { UI, familyEditor, wardrobe } from './ui'

/*
 * Sunset Acres: boot. Signs in through the site's GitHub session (the page itself is only
 * served to signed-in team members), loads or creates your save, then starts the game.
 */

const app = document.getElementById('app')!
const loading = document.getElementById('loading')!

function fail(title: string, text: string, signIn = false) {
  loading.replaceChildren()
  const box = document.createElement('div')
  box.className = 'boot-box'
  const h = document.createElement('h1')
  h.textContent = title
  const p = document.createElement('p')
  p.textContent = text
  box.append(h, p)
  const a = document.createElement('a')
  a.className = 'btn primary'
  if (signIn) {
    a.href = '/api/auth/login?returnTo=%2Fretirement'
    a.textContent = 'Sign in with GitHub'
  } else {
    a.href = ''
    a.textContent = 'Try again'
  }
  box.append(a)
  loading.append(box)
}

async function connect(): Promise<{ net: Net; me: MeResult }> {
  const remote = new RemoteNet()
  try {
    return { net: remote, me: await remote.me() }
  } catch (err) {
    // `npm run dev:retirement` has no API: play offline with pretend neighbours.
    if (import.meta.env.DEV && err instanceof NetError && err.code === 'no-api') {
      const local = new LocalNet()
      return { net: local, me: await local.me() }
    }
    throw err
  }
}

async function boot() {
  initMusic()
  initSoundscape()
  let net: Net
  let me: MeResult
  try {
    ;({ net, me } = await connect())
  } catch (err) {
    if (err instanceof NetError && err.status === 401) {
      return fail(
        'Sunset Acres',
        'Sign in with GitHub to visit the home, tend your garden and see your neighbours.',
        true,
      )
    }
    console.error(err)
    return fail(
      "We couldn't open the gates",
      err instanceof Error ? err.message : 'Something went wrong.',
    )
  }

  const start = (save = me.save!) => {
    loading.remove()
    const ui = new UI(app)
    const game = new Game(net, me.user.login, save, me.slot, ui)
    ui.attach(game)
    game.start(app)
    if (import.meta.env.DEV) Object.assign(window, { game, perf }) // for poking at it in devtools
    ui.renderChat()
    if (net.local) ui.toast('Offline practice mode: progress is kept in this browser only.')
    if (me.slot < 0)
      ui.toast(
        'Every plot is taken right now, so you have no garden yet. Nurse Ada can show you to a cot.',
      )
    return game
  }

  if (me.save) {
    start()
    return
  }

  // First visit: make your character.
  loading.replaceChildren()
  const first = me.user.name.split(' ')[0] || me.user.login
  const wrap = document.createElement('div')
  wrap.className = 'panel boot-panel'
  // Two steps: who you are, then who's in your family photo (FOREST.md "Your family").
  const editor = wardrobe(defaultLook(first), {
    title: 'Welcome to Sunset Acres!',
    intro: "You've just moved in. Who are you?",
    confirm: 'Next',
    onDone: (look) => {
      wrap.replaceChildren(
        familyEditor(look, undefined, {
          title: "Who's in your family photo?",
          intro:
            'Two or three of the people you love most. Their photo will hang on your wall. Randomize for ideas, or make them yourself.',
          confirm: 'Move in',
          onDone: (members) => {
            const save = newSave(look, Date.now())
            save.family = { members }
            const game = start(save)
            game.markDirty()
            void game.flushSave()
            // Nurse Ada takes it from here (src/intro.ts).
          },
        }),
      )
      wrap.scrollTop = 0
    },
  })
  wrap.append(editor)
  loading.append(wrap)
}

void boot()
