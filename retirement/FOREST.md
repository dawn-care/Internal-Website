# The Forest: design decisions

Status: **designed, not built yet.** This records what we've decided for the forest beyond the
Sunset Acres grounds and why. Numbers marked _(tune)_ are starting points to adjust after
play-testing. The story outline near the end is a **draft** for the team to react to.

## The idea in one line

Sunset Acres is warm, social and safe. The forest around it is the opposite: you're alone, you're
helpless, and the people who come to take you home aren't always who they say they are. You go
in to piece together a story, and you only keep what you learned if you make it back.

## Core principles

- **Community inside, alone outside.** On the grounds you can see and talk to everyone. In the
  forest you can't see anyone and nobody can see you.
- **Helplessness, not combat.** There are **no weapons, no armour and no fighting** of any kind.
  You can't fight confusion; you can only hold on to what you know and hope someone brings you
  home. What you have is light, your notes, your judgement, and your legs.
- **Slow dread, no jumpscares.** Tension comes from darkness, sound, things at the edge of the
  light, people who are subtly wrong, and small decisions with uncertain outcomes. Nothing leaps at
  the screen.
- **A surprise, not a feature.** No opt-in, no gate, no warning sign. It's for the internal team,
  and finding it by wandering off the edge of the map is part of the fun.
- **The horror is the experience of confusion, not people with dementia.** It's told from the
  frightened resident's point of view and never mocks them.
- **Fair, not random.** Every risky choice has a clue an observant player can learn to read. The
  forest teaches its rules over time, and those rules end up on your wall.

## Getting there

- The trees around the edge of the grounds are a solid wall today. A few **gaps that look like
  ordinary undergrowth** let you push through into the forest. Nothing marks them.
- Crossing over: the music fades out (`setMusicLevel` in src/music.ts), the light closes in, the
  bird/cricket ambience fades and creepy forest ambience fades up.
- **Each visit is a different forest**, generated fresh (seeded per visit), so nobody can memorize
  the way.

## Getting lost for real

- **Near the property you can still walk back on your own.** The home's lights glow faintly through
  the trees and the music is barely audible.
- **Past a certain distance, the way home stops existing** _(tune: ~40 tiles from the entry)_.
  Turning around just leads to more forest. Nothing announces it; the last trace of the music
  disappearing is the only sign.
- **After that, the only ways home are a real person (nurse or family member) or your pet.**
- **Safety net:** encounters keep coming while you're lost _(tune: every 1.5–4 minutes)_. If you
  wander long enough without being brought home _(tune: ~12 minutes lost)_, you **collapse** and
  wake up in the infirmary, losing that trip's notes. Nobody is ever stuck forever.

## Alone in the forest

- **Players are invisible to each other in the forest**, even two players there at the same
  time. While you're in the forest the game stops sending your position.
- The neighbours list on the property shows you as **"wandered off…"** with no location, so
  friends notice you're gone but can't follow.
- **Chat goes quiet.** Messages from the property don't reach you and yours don't reach anyone.
  The chat box says something like _"…you can't hear anyone from here."_
- Everything in the forest **runs in your own browser only**: generation, people, events and
  threats. This suits the "alone" theme and needs no real-time game server.

## Atmosphere

- Darkness that **deepens the further you go**, with a limited circle of light around you that a
  found light source makes bigger.
- Fog, sounds you can't place, movement at the edge of the light, and forest footsteps (dry leaves,
  the occasional twig snap).
- **Disorientation touches, used sparingly:** your name in the HUD flickers, item labels in your
  basket briefly turn into nonsense, the clock jumps backwards, a path you just walked down isn't
  there when you turn around.

## What you carry (no combat)

- **Light:** a torch or lantern found in the forest makes your circle of light bigger. It's how far
  you can see, and impostors and stalkers avoid strong light. _(Decide whether it can also be
  bought on the property.)_
- **Your notepad** (see "Notes and the memory wall"). Always with you; it doesn't take a pocket
  slot.
- **Your family photo, if you choose to bring it** (see "Carrying the family photo").
- **Meals** cooked on the property (see "Meals").
- **Your pocket is small** _(tune: ~3 slots)_: light, meals and the photo compete for space, so
  every trip starts with a choice about what to bring.
- **Stamina:** hurrying drains it; walking refills it.
- Optional small comforts found out there, e.g. **better walking shoes** (stamina refills faster)
  _(decide)_. Nothing that hurts anything.

## Your family

- Character creation gets a step: **"Who's in your family photo?"** You enter **2–3 family
  members**: name, relationship (son, daughter, husband, wife, grandson, sister…) and their look,
  using the same character editor.
- A **"Randomize" button** generates a family (names, relationships, looks) you can keep or edit.
- Editable later from the Wardrobe.
- The family appears in a **photo on your room wall.** Walking up to it shows their names, and
  their faces are the ones in the photo.
- The photo is the **answer key** for the forest: real relatives look exactly like it.
- Existing characters without a family get the step the next time they open the Wardrobe or
  enter the forest _(decide which)_.

### Carrying the family photo

- The photo lives on your room wall. **Taking it with you is optional:** pick it up from the wall
  before a trip and it goes in your pocket, using a slot.
- **Why bring it:** during an encounter you can choose **"Look at the photo"** and compare it side
  by side with the person in front of you.
- **What it costs:** looking takes time. You hold it up to your light while they keep talking and
  your light flickers. And it takes a pocket slot another item could use.
- **Leaving it at home** is safe, but then you only have what you remember from the wall.
- **You can lose it.** If you're caught while carrying it, it's lost in the forest and the frame on
  your wall is empty. Two ways to get it back:
  - **Find it on a later trip**, as an event: your photo, face-down in the leaves. Sometimes it has
    been **subtly changed** (a face that's a little wrong), which you'll only notice if you
    remember the original.
  - **Ask Nurse Ada for a reprint** from your file, after a short wait or for some coins, so the
    loss is never permanent.
- Rationale: choosing whether to carry a memory aid or trust your memory is exactly the kind of
  decision the forest is about.

## Encounters: the nurse and the family

People find you in the forest: a **nurse** (who looks like Nurse Ada from the home) or **one of
your family members**, by the names you entered. They offer to take you home.

### Real or fake

- About **60–65% are real** _(tune)_. Most lean real, but not overwhelmingly, so going with
  someone is always tempting and never safe.
- Fakes get **slightly more common the deeper you go and the longer you stay out.**
- **Fakes are subtly wrong** in ways an observant player can learn to spot:
  - a hair or clothing colour that doesn't match the photo
  - glasses or accessories that weren't there
  - they never blink
  - no shadow
  - no footstep sounds
  - a nickname or detail that isn't on the photo
  - for the nurse: wrong name, the old **Hollow Pines** badge instead of a Sunset Acres one (see the
    story), or not quite Ada's look

  Each fake shows one or two of these, never all of them.

### The four outcomes

| You...           | Real                                                                                                          | Fake                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Go with them** | They walk you **home safely, and your notes are kept.** The reward that makes saying yes tempting.            | They lead you **deeper into the forest**, then: caught (see below). |
| **Refuse**       | They're hurt and leave: _"…alright, Mum. I'll come back for you."_ Safe, but sad, and you've lost a way home. | **Transformation and chase** (see below).                           |

Saying no is the safe choice but never a free one, especially once you're lost and people are the
only way back. The sadness of turning away a real relative is deliberate.

### Dialogue

- Classic pixel-game dialogue: text **types out a letter at a time with a beep per letter**, and
  each speaker's beep has its own pitch (synthesized with Web Audio like the rest of the game's
  synth sound).
- Choices are simple: go with them / refuse.

### Refusing a fake: the transformation

_Groundwork on the property (built with the introduction):_ the dialogue box already shows the
speaker's portrait on the left, and portraits (src/portraits.ts) are drawn from a `Face`
description (skin, hair, outfit and eye colours, blink, talk) one feature at a time. The
transformation stages below are meant to be done by tampering with that Face and the drawn
canvas (drain the colours, black eyes, stop blinking, tilt and stretch the head) rather than with
new art. The forest's grey, dark mood is `MOODS.forest` in src/game.ts.

Each refusal (they ask again) pushes it a stage further:

- The text types **slower**, the beep **drops in pitch** and gets **more distorted**; letters
  start **shaking and swapping**.
- The sprite **degrades in stages**: colours drain out, the eyes go black, the head tilts, the body
  stretches too tall, the limbs get too long.
- Your circle of light shrinks as it happens.
- Then it **comes for you.**

### The chase: run, never fight

- **You can only outrun them.** There is nothing to fight with.
- **Stamina:** hurrying drains a stamina bar and walking refills it. The impostor is **faster than
  your walk, slower than your hurry, and never tires**, so you can get away if you manage your
  stamina. _(tune speeds)_
- **The chase ends** when you lose it (out of sight for a while), reach a **lit clearing or
  campfire** it won't enter, or (if you're not lost yet) make it back over the property line.
- **It may come back** later in the same visit.

### Caught

- Fade to black. Then, fading in on the black screen, the truth: **"That was not your son."** /
  **"That was not your daughter."** / **"That was not a nurse."** (using the real relationship).
- You **wake up in the home's infirmary** with the real Nurse Ada: _"They found you wandering by
  the fence again, dear."_
- You **lose that trip's notes** (_"…you can't remember what you found."_), any light you found
  on that trip, and the family photo if you were carrying it. Your room, garden and saved notes
  are never touched.

## Your pet

- **Rarely, your dog or cat finds you in the forest** _(tune: ~10% of rescues once lost)_.
- It's **always real and 100% safe**: follow it and it leads you home with your notes kept.
- **The pet is never faked.** It's the one thing in the forest you can always trust.
- Depends on pets being built first (COMMUNITY.md). Until then, this rescue simply doesn't happen.

## Things you avoid

- Besides the impostors there are **one or two stalking threats** you can only avoid, never fight:
  hide, keep to the light, keep moving. For example _(draft)_:
  - **The Visitor:** a tall figure that only moves while you aren't looking at it (like the basement
    statue in `/game`). Touching it is being caught.
  - **The Wanderers:** shapes of former residents walking slow loops between the trees. Harmless
    unless they see you in the dark, and then they follow. (In the story bible they're the people
    who went with the wrong face.)
- Being caught by one of these is the same as being caught by an impostor (fade to black, a line
  of text, the infirmary).

## Notes and the memory wall

The point of going into the forest: finding pieces of a story and remembering them.

- In the forest you find **story fragments**: writing on walls, letters, newspaper clippings,
  timetables, things people tell you, things you realize after a decision.
- Each one becomes a **sticky note in your pocket notepad.** The game writes a short note in shaky
  handwriting, and **you can add your own words** to it (both, as decided).
- **Notes are only kept if you get home safely**: walking back before you're lost, or being brought
  home by a real person or your pet. If you're caught or collapse, that trip's notes are lost.
- At home, your notes go up on a **memory board (corkboard) in your room**, a default wall piece
  you start with. You can **arrange them and connect them with string.** It becomes your record of
  what you've figured out, "so you don't forget."
- Finding a fragment you already have: _"You already remember this."_
- Notes are saved to your account (they're what persists of the story).

## Small decisions (events)

Along the way you run into small situations with a choice. Each one has:

- **A temptation**, usually an easy way home or relief.
- **A fair clue** that hints at whether it's safe.
- **Two or three choices** with outcomes: home (notes kept), deeper, caught, a story note, an item,
  stamina, or nothing.
- Often **a note either way**, so the forest teaches you its rules.
- Optional **conditions**: your pet is with you, a real relative is walking with you, you have a
  light, it's night, how deep you are, which notes you already have.

Draft events:

| Event                    | What happens                                                                                                                                            | Clue / rule                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The bus stop**         | Over the outdated timetable, painted in red: **"DON'T GET ON THE BUS ALONE."** A few seconds later a bus pulls up; the driver says it'll take you home. | "Alone" is the clue. With your pet or a real relative beside you, it really takes you home. Alone, it drives off into the fog: _"There is no bus route here."_ Either way you can earn the note _"The bus only stops for people who are alone."_ |
| **The payphone**         | A payphone rings in a clearing. It's your daughter (by name) with directions home.                                                                      | If she uses a nickname or detail that isn't on your photo, it's not her.                                                                                                                                                                         |
| **Your own handwriting** | A note in your handwriting you don't remember writing: _"Don't trust the one in the yellow coat."_                                                      | Sometimes true (the next fake wears yellow), sometimes planted. Another note somewhere explains how to tell.                                                                                                                                     |
| **Music from home**      | Faint music from Sunset Acres drifts through the trees.                                                                                                 | Before you're lost, it's real and leads home. After, home can't be found, so it can only lead somewhere else.                                                                                                                                    |
| **The wheelchair**       | An empty wheelchair rolls slowly along a path on its own.                                                                                               | Following it leads to a story location, but it's a dark route.                                                                                                                                                                                   |
| **The cabin**            | A lit window, a whistling kettle. Rest inside to recover stamina.                                                                                       | Then you hear the door lock. Whether you can get out depends on what you noticed coming in (e.g. a back door).                                                                                                                                   |
| **The letter**           | A mailbox with a letter addressed to you, dated tomorrow.                                                                                               | A story fragment; reading it costs time in the dark.                                                                                                                                                                                             |
| **Your footprints**      | Footprints exactly like your shoes go ahead of you down the path.                                                                                       | Following them leads in a loop, unless you notice where they stop.                                                                                                                                                                               |
| **Your photo**           | Only if you lost your family photo on an earlier trip: it's lying face-down in the leaves.                                                              | Sometimes it's been subtly changed (a face that's a little wrong). Take it home or leave it; a changed photo on your wall makes the next trips harder until you get a reprint from Nurse Ada.                                                    |

**Implementation:** events are **plain data** (setting, text, choices, clues, conditions,
outcomes) in one file, so writing a new event is mostly writing, not code. The forest places them
randomly but never too often, rarer ones deeper.

## Buildings

Abandoned places hold the important story pieces and give a reason to go deeper. Each has a few
**hand-designed rooms**, placed at a random spot in the generated forest:

- **The bus stop** (shelter, timetable, a bench), near the edge.
- **The old supply warehouse**, middle depth.
- **The chapel**, middle to deep.
- **The ruins of Hollow Pines**, the old care home, deepest and rarest.

## Meals

Food cooked on the property (see COMMUNITY.md, "Cooking") helps you survive, never fight. You eat
it from your hotbar.

Example meals _(recipes and numbers to tune)_:

| Meal                    | Made from                     | In the forest                                                                                 |
| ----------------------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| Vegetable soup          | radish, carrot, tomato        | Refills your stamina                                                                          |
| Strawberry jam toast    | strawberries                  | Stamina refills faster for a while                                                            |
| Pumpkin pie             | pumpkin                       | A bigger stamina bar for the whole trip                                                       |
| Roasted sunflower seeds | sunflower                     | A bigger circle of light for a while                                                          |
| Mushroom broth          | vegetables + forest mushrooms | **Calm**: the darkness and disorientation build more slowly for a while                       |
| Herbal tea              | forest herbs                  | **Clarity**: a fake's tells are slightly easier to notice for a while (it helps you remember) |

Rules: meals never make you faster than an impostor for good; effects wear off; you can only carry
a few _(tune)_; clarity stays a subtle nudge, never a label; forest-only ingredients make the best
meals, so the forest and the garden feed each other.

## Story (draft, to be revised as we go)

**Working title: _Hollow Pines._** A random forest with a fixed story: the fragments are written,
the places they turn up are random. Each fragment stands on its own and can be found in any order;
the deeper and rarer locations hold the later revelations.

How the story works:

- **We know the full truth; the player only gets part of it.** The truth is written down below in
  the story bible so every fragment stays consistent. Fragments give players enough to form a
  satisfying theory, and the final step is never stated outright.
- **The rules are consistent; the origin stays out of reach.** Players can learn exactly how the
  forest behaves. Why it does is left to conflicting, unreliable sources.

### What players can learn

**The premise.** Long before Sunset Acres, there was another care home deeper in the woods:
**Hollow Pines Home**. It closed in 1979 after residents kept wandering off and never coming back.
The bus route to it was cancelled; the building was left to rot.

**The guide.** Three years ago a Sunset Acres resident, **Margaret "Maggie" Hale**, a retired
schoolteacher, wandered into the forest and was never found. She left **warnings in red paint and
notes signed "M."** across the forest. Her trail is the spine of the story: you're following
someone who got lost before you.

**Why some people are real.** Nurse Ada and families from Sunset Acres really do search the woods
for residents who wander off. The forest has learned to look like them, too.

The story unfolds in four layers, roughly by depth:

1. **The rules** (near the edge): Maggie's warnings. How to survive, never why.
   - _"They never blink."_ / _"Count the shadows."_ / _"If they call you something your family
     never called you, run."_ / _"DON'T GET ON THE BUS ALONE."_ / _"Look at the photo, not the
     face."_
2. **The history** (bus stop, warehouse): Hollow Pines, the disappearances, residents nobody
   visited.
   - Bus stop: a timetable for **Route 9 to Hollow Pines**, last service 1979; a newspaper
     clipping, _"Third resident missing from Hollow Pines Home."_
   - Warehouse (Hollow Pines' supply depot): crates of old name tags; a staff memo, _"Do not let
     residents leave with unregistered visitors"_; a visitors' log with **most pages empty for
     months at a time**; and, on the last page, **your family's names**, in handwriting that isn't
     theirs.
3. **The pattern** (chapel): the Wanderers were people, and the faces are made of forgotten
   things.
   - Memorial plaques for the lost residents, with **Maggie's name freshly scratched** at the end.
   - A Hollow Pines nurse's letter: _"Today I saw myself walk out of the trees and lead Mr. Abbott
     away. She had my face, but not my scar. I don't think it knew about the scar."_
   - A resident's diary: _"My daughter came today. Her eyes were the wrong colour. I couldn't
     remember the right one, so I went with her anyway."_
4. **The edge of the truth** (the ruins of Hollow Pines): conflicting explanations and Maggie's
   last note.
   - Three sources that disagree, each unreliable: **a doctor's memo** blaming an experimental
     memory treatment; **the groundskeeper's journal**, saying the land was always like this;
     **the chaplain's letter**, calling it a kind of grace, _"a place where nothing forgotten is
     ever lost."_
   - Maggie's last note: _"If you're reading this, you came back for me. Don't. Go home with the
     one who knows your real name."_

**Ending (draft):** with every fragment on your wall, a final event appears: you find Maggie, or
something that looks like her, sitting on the old ward's bed. She asks you to leave her and go
home. Whether it's her is never confirmed. Your last note: _"Maggie wanted to be remembered, not
found."_

### Story bible (SPOILERS, for writers only; never stated outright in the game)

- **What the forest is:** where forgotten things go. Names, faces, voices, the details of people
  you love that slip away.
- **What the impostors are:** made from what you've forgotten. A fake son is assembled from the
  parts of him you can't quite remember anymore. This is why the mechanics work the way they do:
  - **The tells are the gaps in your memory.** The wrong hair colour, the nickname nobody used,
    the missing shadow are the pieces you've lost, filled in wrongly.
  - **The family photo is the answer key** because it's a memory aid: it's literally what helps
    you remember what's real.
  - **Clarity** (herbal tea) helps because it helps you remember.
- **What they want: to be remembered.** They aren't evil. They're lonely. A forgotten thing wants
  someone to recognize it, to be somebody's person again. When you go with one, it leads you
  deeper to keep you, so it's never forgotten again. Refusing one is its own small tragedy: being
  forgotten twice. This keeps the horror sad and empathetic rather than monstrous, and it never
  treats people with dementia as monsters.
- **Where they come from: Hollow Pines.** Many of its residents were rarely visited (the empty
  visitors' log). Their longing for faces nobody brought gave the forest its first shapes. That's
  why fake nurses wear Hollow Pines badges: those were the faces residents saw most, so the forest
  learned "nurse" there.
- **What happens to people who are taken:** they become **Wanderers**, the slow shapes walking
  loops between the trees: residents who went with the wrong face, now forgotten themselves.
- **What stays a mystery, even to us:** _why_ the forest does this. The doctor, the groundskeeper
  and the chaplain each believe something different, and none of them is confirmed. Writers should
  keep their accounts contradictory.
- **Maggie** at the end could be the real Maggie, a Wanderer, or the forest's version of her built
  from everything Sunset Acres remembers about her. Her request to be left and for you to go home
  is true in all three cases. Never resolve it.
- **Hint that you've been here before:** the note in your own handwriting you don't remember
  writing. Never confirm it.

## Build stages

Each stage is playable before the next:

1. **The forest itself:** treeline exits; a freshly generated, effectively endless forest each
   visit; darkness, fog, forest ambience and footsteps, music fade; being alone (hidden presence,
   quiet chat, "wandered off…"); walking back before you're lost; the point of no return; the
   collapse safety net and the infirmary wake-up.
2. **Family:** the creation step with randomize, the wall photo, the Wardrobe editor, taking the
   photo with you (pocket slot), and the reprint from Nurse Ada.
3. **Encounters:** dialogue with beeps, real vs fake and the tells, "Look at the photo", the four
   outcomes, the transformation, stamina and the chase, getting caught (losing a carried photo),
   being walked home.
4. **Notes and the memory wall:** fragments, the notepad (auto text plus your own words), keeping
   notes only on a safe return, the corkboard (arrange, connect with string).
5. **Events and buildings:** the event system as data, the draft events, the bus stop, warehouse,
   chapel and Hollow Pines ruins, the story fragments placed in them.
6. **Light and the things you avoid:** found light sources, the Visitor, the Wanderers.
7. **Meals** (after cooking exists; see COMMUNITY.md).
8. **Pet rescue** (after pets exist; see COMMUNITY.md).

## Technical notes

- The forest is a **client-only map**, generated in the browser from a per-visit seed (e.g. in
  chunks around the player, so it can be effectively endless). Nothing about a particular forest is
  stored on the server.
- **What is saved** (new save fields, validated in `shared/schema.ts` like everything else, so the
  server rejects malformed data): family, kept notes (fragment id, your own text, board position,
  string links), found light sources, story progress. Saves stay client-authoritative. Trip state
  (notes in your pocket, how lost you are) is never saved until you're home.
- **Presence:** the server only accepts known map ids (`isMapId`). Add a `forest` map id; while in
  the forest the client sends it without a real position, and other clients show "wandered off…".
- **Story and events are data** (fragments, events, buildings) in their own files, so writing more
  content doesn't need engine changes.
- Art and sound stay procedural or processed like the existing ones (see CLAUDE.md, "Music and
  sound"), including the transformation stages and distorted dialogue beeps. No new dependencies.
- Still one serverless function (api/retirement.ts); the Hobby plan allows 12.

## Still open

- Real/fake ratio, speeds, stamina, light radius, the point-of-no-return distance, encounter
  cadence and collapse time.
- Whether light can be bought on the property or only found.
- When existing characters set up their family.
- The full story text: the story above is a first version that will be revised as we go; more
  fragments and events still need writing, consistent with the story bible.
- Pocket size (how many slots) and the cost or wait for a photo reprint from Nurse Ada.
- Who can reach the game. The site belongs to a dementia-care project. The forest's horror comes
  from the resident's own point of view and doesn't mock anyone, but if the sponsor or anyone
  from St. Ann's can sign in, they could stumble into it. Worth deciding whether that's fine.
