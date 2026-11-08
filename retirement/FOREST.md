# The Forest: design decisions

Status: **being built. Stages 1 (the forest itself), 2 (family) and 3 (encounters) are done**; see "Build status" at the end for
what's built and the judgement calls made along the way. This records what we've decided for the
forest beyond the Sunset Acres grounds and why. Numbers marked _(tune)_ are starting points to adjust after
play-testing. The story is in [STORY.md](STORY.md), a **draft** for the team to react to.

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
- **Slow dread, and one jumpscare.** Tension comes from darkness, sound, things at the edge of the
  light, people who are subtly wrong, and small decisions with uncertain outcomes. Nothing leaps at
  the screen, with one exception (changed after play-testing stage 3): **being caught** is a
  jumpscare, the way /game does them (a random image filling the screen, a random scream). It only
  ever happens as the result of a mistake you made, never out of nowhere.
- **A surprise, not a feature.** No opt-in, no gate, no warning sign. It's for the internal team,
  and finding it by wandering off the edge of the map is part of the fun. (Your pet growling or
  hissing at the treeline, below, is an in-world hint, not a sign: it never stops you.)
- **The horror is the experience of confusion, not people with dementia.** It's told from the
  frightened resident's point of view and never mocks them.
- **Fair, not random.** Every risky choice has a clue an observant player can learn to read. The
  forest teaches its rules over time, and those rules end up on your wall.

## Getting there

### The outskirts: a long walk out

- **The grounds get bigger.** Around the established community (the home, the Kitchen, the
  garden, the henhouse, the pond: everything with buildings and paths) there's a wide band of
  **outskirts**, so reaching the forest's edge takes **a bit of walking**. Nothing is out there
  but open country: grass, the odd tree or fence post, a path that peters out. _(tune: about 20–30
  tiles from the last building to the treeline on each side.)_
- **The world fades as you walk out.** The further you get from the established area, the more
  (as built: see "Build status"; the music goes completely silent for the last stretch):
  - **the colours desaturate**: the property's bright colour grade (`MOODS.property` in
    src/game.ts) eases step by step towards a drained, greyer one, and only reaches the forest's
    full `MOODS.forest` inside the forest;
  - **the music fades into the distance** (`setMusicLevel` in src/music.ts, down to barely
    audible near the treeline), and the birdsong thins out with it;
  - **the grass gets sparser and greyer**: fewer tufts and flowers, more bare earth, and a duller,
    yellow-grey green.
    It's gradual, worked out from your distance to the established area, so it never feels like a
    line you crossed. Walking back in brings everything back the same way.
- Nothing stops you or tells you anything: no sign, no text. The fading is the warning.
- **Only once you're close to the forest's edge does your pet react** (growling or hissing, see
  "Your pet" below). Out in the outskirts it still follows you, a little more slowly and closer
  than usual.

### The treeline

- The trees around the edge of the grounds are a solid wall today. A few **gaps that look like
  ordinary undergrowth** let you push through into the forest. Nothing marks them.
- Crossing over: the music fades out (`setMusicLevel` in src/music.ts), the light closes in, the
  bird/cricket ambience fades and creepy forest ambience fades up.
- **Each visit is a different forest**, generated fresh (seeded per visit), so nobody can memorize
  the way.
- **Your pet knows.** When you've crossed the outskirts and get really close to the treeline
  with your pet out with you, **a dog growls and a cat hisses** at the trees (see "Your pet"
  below). After the slow fade of the walk out, it's the clearest hint that the forest is
  dangerous.

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
- Each relative also has **what they call you** ("Mum", "Gran", your name), shown on the photo:
  a fake can get it wrong (see the tells, and Maggie's _"If they call you something your family
  never called you, run."_).
- Existing characters without a family get the step **the first time they go into the forest**
  (decided): it opens at the gap, before the forest.

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

- A jumpscare (see "Build status"), then black. Then, fading in on the black screen, the truth: **"That was not your son."** /
  **"That was not your daughter."** / **"That was not a nurse."** (using the real relationship).
- You **wake up in the home's infirmary** with the real Nurse Ada: _"They found you wandering by
  the fence again, dear."_
- You **lose that trip's notes** (_"…you can't remember what you found."_), any light you found
  on that trip, and the family photo if you were carrying it. Your room, garden and saved notes
  are never touched.

## Your pet

### At the edge of the grounds: growling and hissing

- When you come **really close to the community's bounds** (the treeline beyond the outskirts,
  not the edge of the established area) with your pet following you, it stops, faces the trees, and **a dog growls / a cat hisses**,
  with a short animation (hackles up, ears back, tail puffed). This tells you, in the world, that
  the forest is dangerous, before you ever find a way in.
- It's a **warning, never a wall**: it doesn't block you, take you back or show any text box. If
  you keep going, the pet hangs back at the edge (it won't follow you into the forest; that's
  what makes it finding you in there later, below, special) and is waiting for you when you come
  back.
- It reacts most strongly near the hidden gaps in the treeline, so it's also a fair clue to
  where they are _(decide: only near gaps, or anywhere along the edge, stronger near gaps)_.
- Only when your pet is out with you: at night it's asleep at home, so you get no warning then.
  That's deliberate.
- Distance and cooldown _(tune: within ~2 tiles of the edge; at most once every ~20 s, so it
  doesn't nag)_. Neighbours' pets near you react too, so a group at the treeline hears it.
- **Sound:** needs recordings of **a dog growl and a cat hiss**, processed like the other pet
  sounds (`scripts/cut-sfx.sh`, into `sfx/pet-growl.mp3` and `sfx/pet-hiss.mp3`; see CLAUDE.md
  "Music and sound").
- Build it with stage 1 (the forest itself) or earlier: pets and the treeline already exist, so
  it can go in before the forest does.

### In the forest

- **Rarely, your dog or cat finds you in the forest** _(tune: ~10% of rescues once lost)_.
- It's **always real and 100% safe**: follow it and it leads you home with your notes kept.
- **The pet is never faked.** It's the one thing in the forest you can always trust.
- Pets are built (COMMUNITY.md): `save.pet` has the kind, coat, name and **hearts** (0–10,
  from daily petting and treats), so the rescue chance can grow with hearts if we want.

## Things you avoid

- Besides the impostors there are **one or two stalking threats** you can only avoid, never fight:
  hide, keep to the light, keep moving. For example _(draft)_:
  - **The Visitor:** a tall figure that only moves while you aren't looking at it (like the basement
    statue in `/game`). Touching it is being caught.
  - **The Wanderers:** shapes of former residents walking slow loops between the trees. Harmless
    unless they see you in the dark, and then they follow. (In the story bible, STORY.md, they're the people
    who went with the wrong face.)
- Being caught by one of these is the same as being caught by an impostor (fade to black, a line
  of text, the infirmary).

## How the forest looks

Redrawn after play-testing ("the forest itself just isn't very scary"): it was the property's
storybook forest made darker (symmetrical Christmas-tree pines, round puffy trees, pebbles,
ferns, an even brown floor, warm colours). Now:

- **Trees:** grown from limbs that wander, taper and split, ending in twigs that hook down like
  fingers. Gnarled trees: a thick, twisted, leaning trunk, bare clawing limbs, a few dark tatters of
  leaves. Pines: ragged and almost black, lopsided tiers with gaps where branches died, dead grey
  limbs low down. Dead trees: grey, leaning, the top snapped off. All with roots clawing over the
  ground. The treeline round the grounds and the outskirts' dead trees use them too.
- **The floor:** cold, drained grey-brown, with big soft near-black patches, dark rotting leaves,
  sickly grey-green moss, and the odd pale scrap (a twig, a bit of bone).
- **Undergrowth:** tangles of dark thorny brambles instead of ferns; jagged, broken dark stones
  instead of round pebbles.
- **Mist** lying low in wide, flat banks, more of it.
- **Colour:** a colder, more drained grade (saturation 0.42 to 0.26) and a cold blue-black dark.
  Not pitch black: you can just make out the shapes beyond your light (`DARK_NEAR` 0.72).

## Recorded sounds in the forest

Added with the recordings in retirement/sounds (CLAUDE.md "Music and sound" has the cuts). On top of
the synthesized wind, heartbeat and drone:

- **Drone beds:** a dark drone rises under the wind from about 15% deep and is full by 65%; once
  you're lost a heavier one takes over. Both duck to half as an encounter's dread builds.
- **The transformation:** flesh shifting as its colour drains (stage 2), and at the last stage the
  flesh again and then bones cracking as it stretches; a rise as it stands still, peaking just as
  it comes for you; a moan fading into the trees when you lose it.
- **Caught:** a heavy hit and bones cracking at the grab (with the swell, the racing heart, the
  light collapsing).
- **Footsteps behind you:** once the arm reaches in, you hear it breathing, close behind you, until
  you turn or it has you.
- **Not used yet:** the murmured prayer, kept for the chapel (stage 5).

## Threats between encounters

Added after play-testing stage 3: with nothing able to hurt you between encounters, you could
stand in the forest and feel nothing, and ambience alone didn't help ("if nothing ever harms or
blocks you then there's nothing to be scared about"). So the forest's cues are sometimes real
threats, and sometimes nothing (`FALSE_ALARM`, 35%), so you can never safely ignore one. Each has a
rule you can learn; get it right and nothing happens, get it a little wrong and it costs you
(some light, your breath), get it badly wrong and you're caught (the same grab, the infirmary, a
carried photo lost; no face, just the line).

- **Footsteps behind you.** Rule: turn round. Steps on the leaves behind you, a beat after yours,
  stopping a beat after you stop. Keep going without facing them and they close in (about 9 s);
  from a little before halfway an arm creeps into your light from behind (slowly at first, easing in;
  hidden by the dark until it reaches your light, with only the faintest trace of it out in the dark): dark, wet flesh, too long and crooked
  where it shouldn't bend, streaked and dripping with blood, with long jointed, clawed fingers
  that twitch as it reaches (redrawn after play-testing: the first, pale skeletal arm felt corny).
  Turn to face them in time and it's gone; turn once the arm is in sight and it snatches your breath
  as it goes (stamina emptied); never turn and it has you: "It was right behind you."
- **The face in the dark.** Rule: never walk towards it. (It started as a pair of eyes, which didn't
  read as eyes, then a full face, which was too much of a face; redrawn after play-testing to
  follow the reference: no head at all.) Out of the dark just beyond your light: two small pale
  eyes, set wide and not quite level, and under them a jagged grin of uneven teeth hanging in the
  black, lit on one side and shaded on the other, upper teeth pointing down, lower ones up,
  interlocking. Round them, a tall, thin, dark shape you can only just make out (a head the face sits in, sloping
  shoulders, arms hanging too low, a body that thins away into the dark; added after play-testing,
  since the face alone looked disembodied). The eyes and teeth are muted greys drawn faintly (`FACE_ALPHA`),
  so it only just stands out from the dark (toned down after play-testing: bright white looked
  goofy). Our own design. Back away and it fades; leave it and it
  goes after 12 s. Walk towards it and it takes some of your light (18% for the rest of the trip,
  never below 45%) and its jaw drops, the teeth parting; keep coming and it has you: "You should
  never have gone closer."
- **Caught by a threat:** the same jumpscare as being caught by an impostor.
- **When:** the first 25–50 s into a trip, then every 30–70 s, up to twice as often deep in or once
  you're lost; never the same kind twice running; never during an encounter (and encounters wait
  for them); the collapse waits too.
- **Still planned for stage 6:** the Visitor and the Wanderers. More ideas for later stages: sounds
  that are only sounds, things from home in the forest, your name called from far off.

Numbers: `THREAT_*`, `FALSE_ALARM`, `STALK_*`, `ARM_FROM`, `EYES_*`, `LIGHT_TAKEN`, `LIGHT_LEAST` in
src/forest/tuning.ts; the code is src/forest/threats.ts.

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

## Story

The story (Hollow Pines, Maggie, what players can learn, and the spoiler story bible) is in
[STORY.md](STORY.md), so it can be edited on its own. Everything in the forest that carries story
(fragments, events, what people say, the voice in your head) has to stay consistent with it.

## Build stages

Each stage is playable before the next:

1. **The forest itself:** the bigger grounds with the outskirts (the gradual desaturation, music
   fade and sparser, greyer grass as you walk out); treeline exits; a freshly generated, effectively endless forest each
   visit; darkness, fog, forest ambience and footsteps, music fade; being alone (hidden presence,
   quiet chat, "wandered off…"); walking back before you're lost; the point of no return; the
   collapse safety net and the infirmary wake-up; your pet growling or hissing at the treeline and
   staying behind at the edge (needs growl and hiss recordings).
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

- **The outskirts** are part of the grounds map (it grows), so presence, chat and other players
  work there as normal. "How far out you are" is one number (distance from the established
  area's outline, 0 inside it, 1 at the treeline) that drives the colour grade, the music level,
  the ambience level and which grass tiles are drawn (sparse, grey variants baked into the ground
  layer by distance). The server's presence bounds (x, y up to 200) already allow a much larger
  map. Plot upgrades (COMMUNITY.md) will want room for a bigger garden; keep it inside the
  established area.
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
- The full story text: the story in STORY.md is a first version that will be revised as we go; more
  fragments and events still need writing, consistent with the story bible.
- Pocket size: 3 slots for now (only the photo exists yet); revisit when light and meals arrive.
- Whether the camera or lighting changes too near the treeline (e.g. a slight vignette). (The
  outskirts' width and fading, and the pet's warning, were settled in stage 1: see "Build
  status".)
- Who can reach the game. The site belongs to a dementia-care project. The forest's horror comes
  from the resident's own point of view and doesn't mock anyone, but if the sponsor or anyone
  from St. Ann's can sign in, they could stumble into it. Worth deciding whether that's fine.

## Build status

Tuning numbers live in `src/forest/tuning.ts` (and the grounds' size in `shared/grounds.ts`).
`?forestfast` (dev builds only) shortens the point of no return to 12 tiles and the collapse to 25
seconds, for testing.

### Stage 1: the forest itself (built)

Built: the bigger grounds with the outskirts (grade, music, birdsong and grass all fading with
distance), the treeline and its hidden gaps, a fresh forest each visit (chunks from a per-visit
seed), darkness with a circle of light, fog, the home's lights glowing behind you, synthesized
forest ambience, leaf footsteps and twig snaps, being alone (no position sent, "wandered off…",
quiet chat), walking back before you're lost, the point of no return, the collapse and waking in
the infirmary, and your pet warning at the treeline and waiting there.

Judgement calls (change freely):

- **Size.** The grounds are 138 × 139: the established area (48 × 49, unchanged inside) sits in
  the middle with **40 tiles of outskirts** on every side (about 12 seconds' walk, widened after
  play-testing so the walk out builds tension) and a **treeline 5 tiles deep** at the edge (deep
  enough to read as a wall of trees with the camera stopped at the map's edge). Everything on the
  grounds moved by 45 tiles, so the games tables' ids changed: any game in progress at deploy is
  dropped once.
- **The outskirts' look.** The grass's colours step all the way to a dead grey-brown in 8 bands,
  tufts thin out, and patches of grey bare earth open up where a soft noise is low (most of the
  ground by the treeline). Flowers thin out with the square of the distance. Scenery: lone trees
  and bushes in the nearer half; from halfway out (`DEAD_FROM`) **dead trees and stumps** instead.
  Four broken runs of old fence posts, and the main path running on east and west and breaking up.
  No vignette (left open).
- **The treeline** is made of the forest's own sprites (dark pines, murky broad-leaved trees, the
  odd dead trunk, dark undergrowth along its edge), not the property's bright trees, so the dying
  outskirts end at something that already looks like the forest.
- **Fading numbers.** Colour grade from the property's (saturate 1.18) to saturate 0.7,
  brightness 0.94 at the treeline, in 10 steps. The **music fades out over the first 55% of the
  walk and is completely silent from there to the treeline** (about 18 tiles of silence) and in
  the forest (changed after play-testing: the silent walk builds the tension). Birdsong thins to
  0.12. From 60% out, the forest's synthesized wind starts to reach you, up to 40% of its forest
  level at the treeline.
- **The point of no return's sign.** With no music in the forest, the sign is the home's lights:
  they glow through the trees behind you, fainter as you go, and are gone exactly at the point of
  no return. (This replaces "the last trace of the music disappearing".)
- **Gaps.** Six fixed gaps, the same for everyone: two north, two south, one west, one east, each
  2 tiles wide. They're undergrowth you can walk through, among the (solid) bushes along the
  treeline's inner edge, with the treeline's trees closing over them. Walking out through the
  last tile takes you in.
- **Which way the forest goes.** You keep walking the way you were going when you came in.
  Behind you is the treeline, solid except for a **3-tile-wide strip of undergrowth**; walking
  2.4 tiles back down it (before you're lost) brings you out at the gap you used.
- **The point of no return** is straight-line distance from where you came in (40 tiles). After
  it, any piece of forest that held the treeline or the way home is forgotten as soon as it's out
  of sight, and made again as plain forest (from a different seed), so turning back "just leads to
  more forest".
- **The forest's density.** About 6.5% of tiles have a tree near the edge, rising slowly with depth
  (to 12%): pines, dark broad-leaved trees and dead trees. Clearings come from one soft noise,
  winding open paths from another. Trees round you fade more than on the grounds (to 35%, over a
  wider area) so you can always see yourself.
- **Darkness.** Outside your light it's 80% dark at the entry, 94% at 70 tiles deep, and a little
  darker at night. Your light is 6 tiles across at the entry, 3.6 deep in, and flickers slightly.
  The forest's grade drains from saturate 0.55 to 0.35. (Light sources come in stage 6.)
- **The place name** in the corner while you're in the forest is **"Unknown"** (chosen over
  "Among the trees", which sounded too pleasant; "Gone" was the other idea). It never changes at
  the point of no return, since nothing announces that.
- **Sound.** There's no forest recording, so the ambience is synthesized: low wind that swells and
  drops, a thin whistle in the branches, and now and then a creak (a slow, uneven train of clicks
  through a high, narrow band, kept well away from the growl's low buzz so nothing in the forest
  sounds like a dog) or two far-off knocks. Crossing into the forest cuts off any growl or hiss
  still playing at the treeline: nothing from the grounds follows you in. A twig
  snaps on about 1 step in 16.
- **The collapse.** 12 minutes lost. The screen fades to black over 3 seconds and one line fades
  in: _"You sit down among the roots, just for a moment…"_ Then you wake beside a bed in the
  **infirmary** and Nurse Ada says: _"There you are, dear. They found you wandering by the fence
  again."_ / _"You're in the infirmary. Have a little rest before you go back out, won't you?"_ (No
  notes exist yet, so the "you can't remember what you found" line waits for stage 4.)
- **The infirmary** is a small room off the east end of the hallway (a pale door with a red
  cross): three beds behind screens and Nurse Ada. Anyone can visit it.
- **Reloading mid-trip** puts you back on the grounds as usual: trip state is never saved. That's
  also a way out of being lost; since nothing from a trip is kept unless you get home, it costs
  you the trip, like collapsing.
- **Your pet at the treeline** (the open question): it reacts **anywhere along the edge, and
  sooner and louder near a gap**. It warns when it's within 2.8 tiles of the treeline, or 4.5
  tiles if it's within 7 tiles of a gap; at most once every 20 s; neighbours' pets too (quieter
  with distance). The moment it growls or hisses it stops dead, facing the trees, trembling, hackles
  up, for 3.8 s (the growl's length), then follows you again; it never goes within 1.5 tiles of the treeline. Under the recorded growl or hiss there's a low synthesized
  rumble (for cats too). Petting a pet that close to the treeline doesn't please it: _"Rex looks
  nervous... its ears are flat, and it won't take its eyes off the trees."_ (a cat: _"its tail is
  puffed up, and it keeps staring at the trees."_), with a whine from a dog; it still counts as the
  day's petting. While you're in the forest it waits where it stopped and follows you again when
  you come out. (If night falls or you collapse, it goes home as usual.)
- **Recordings:** the growl, the hiss and the forest's leaf footsteps are cut from the recordings
  in retirement/sounds (CLAUDE.md "Music and sound" has the timings). The growl leaves out the
  recording's bark and is made longer (3.8 s) from its two growling parts. The game falls back to a
  synthesized growl/hiss and pitched-down grass steps if those files are ever missing.
- **Not in stage 1:** the disorientation touches (they come with encounters and notes), light
  sources, and everything from stage 2 on.

### Stage 2: family (built)

Built: the "Who's in your family photo?" step after "Who are you?" when you move in, with
Randomize; the photo on your room wall; the photo up close (each relative's portrait, name, who
they are and what they call you); editing your family from the Wardrobe ("Family photo…");
taking the photo with you (a 3-slot **Pocket** in the hotbar, where clicking the photo shows it
anywhere) and hanging it back; a lost photo's empty frame; and the reprint from Nurse Ada.

Decisions (yours) and judgement calls (mine, change freely):

- **Existing characters** set up their family the first time they push through a gap: the
  family step opens there ("Pushing through the branches, you find yourself thinking of home, and
  the photo on your wall. Who's in it?"). You're stepped back just inside the treeline first, so
  closing it leaves you on the grounds; "Go on" carries you into the forest. Their room gets the
  photo on the first free bit of wall (or in storage if the wall is full).
- **Reprints** (decided: coins or a wait): Nurse Ada offers "Tomorrow is fine" (free, on your wall
  after a game day, 24 real minutes) or "Right away (40 coins)". She hangs it herself; a toast says
  so. `REPRINT_WAIT_MS` and `REPRINT_COST` are in src/forest/tuning.ts.
- **Collapsing never loses the photo** (decided). Only being caught does (stage 3). Until then,
  `window.game.losePhoto()` (dev) loses it for testing.
- **"Calls you"** (my addition): every relative has what they call you, filled in from the
  relationship (children: Mum or Dad; grandchildren: Gran or Grandad; nieces and nephews: Auntie
  or Uncle and your name; partners and siblings: your name), editable. Mum/Dad and the rest are
  picked from your body type (skirt or trousers) only as a starting point.
- **Relationships:** son, daughter, husband, wife, partner, grandson, granddaughter, sister,
  brother, niece, nephew. 2–3 people.
- **Randomize** always picks a child, then a spouse, partner or grandchild, and (about two times
  in three) a third: a grandchild, sibling, niece or nephew. Names suit their age; your generation
  gets greys, younger people natural hair colours; children and grandchildren mostly share your
  skin tone. Portraits of your own generation get smile lines.
- **New hair colours:** black, brown, auburn and blonde were added (at the end of the list, so
  old saves are unchanged) for younger relatives. Players can pick them too.
- **The photo piece** is a new wall item, "Your family photo": free, not in the Catalog, movable
  like other wall pieces. New rooms have it where the old "Family photos" piece used to start
  (that piece is still sold in the Catalog). It's drawn as a gilt frame with tiny figures in each
  relative's skin, hair and clothes colours, or an empty board when the photo's away.
- **Neighbours see your photo** in your room while it's on your wall (their Profiles carry the
  relatives' looks and relationships, never what they call you); facing it says whose family it
  is. The offline neighbours have families too.
- **Pictures hung high:** facing the wall now reaches anything hung above you in that column
  (before, a picture in the top wall row couldn't be looked at). Decorating is unchanged.

### Stage 3: encounters (built)

Built: people finding you (Nurse Ada, or someone from your photo), real or fake with one or two
tells; dialogue with a voice per speaker; "Look at the photo"; the four outcomes (walked home,
hurt and leaving, led deeper, the transformation); stamina and the chase; being caught (and losing
a carried photo). The code is src/forest/encounter.ts, the words and tells are data in
src/forest/encounters.ts, and the numbers are in src/forest/tuning.ts. `?forestfast` makes people
turn up after 6–10 seconds.

Judgement calls (change freely):

- **When people come.** The first after 45–90 s in the forest, then 1.5–4 minutes after the last
  one ended, lost or not. Nobody comes during a collapse, and the collapse waits for an encounter
  to finish.
- **Real or fake:** 63% real at first, minus 0.15% per tile of depth and 1% per minute out, never
  below 40%. 35% of the time it's the nurse (always, if you have no family).
- **Tells** (one or two per fake): family can have the wrong hair colour, the wrong cardigan
  colour, an extra (or missing) hat, glasses or scarf, the wrong eye colour (only visible in their
  face), no blinking, no shadow, no footsteps, or the wrong name for you. The nurse can have the
  wrong hair colour or eyes, no blinking, no shadow, no footsteps, the wrong name ("Nurse Ida",
  "Edna", "Ava", "Ada-May", "Agnes") or the **Hollow Pines badge** (grey with a pine) instead of her
  Sunset Acres one (cream with a sun). To make the badge learnable, **Nurse Ada now always wears
  her Sunset Acres badge** in her portrait, at home too. Eye colour was added as a tell from the
  resident's diary in the story ("Her eyes were the wrong colour").
- **A wrong colour is always obvious** (decided): a fake's wrong hair, cardigan or eye colour can be
  in the same family as the real one (light against dark brown, cornflower against navy) but never a
  near miss: it's at least `TELL_COLOR_MIN` apart (80 on a perceptual scale; eyes, being a few pixels,
  `TELL_EYE_MIN` 90). This rules out pale grey against the lavender and blue rinses, and the two brown
  eye colours.
- **Being caught never says what you missed** (decided). Only "That was not your son." Every tell must
  instead be learnable in the world: stage 4/5's fragments need a clue for each one. Maggie's
  warnings already cover blinking ("They never blink."), shadows ("Count the shadows."), the wrong
  name for you ("If they call you something your family never called you, run.") and the face
  ("Look at the photo, not the face."); the diary covers eye colour, and the Hollow Pines story
  the badge. **Still to write: a clue for silent footsteps and for the nurse's wrong name.**
- **Real and fake say exactly the same words** (until a fake starts to change). Only the tells give
  them away, so it's never a guessing game about the script.
- **What a fake calls you:** a near miss: "Mum" becomes "Mother", "Mummy" or "Ma"; "Gran" becomes
  "Granny", "Nana" or "Grandma"; a name becomes "Sweetheart", "Darling", "Dearest" or "Old thing".
- **Voices:** Ada's is the same pitch as at home; relatives by relationship (granddaughters
  highest, husbands lowest). As a fake changes, its voice drops (to 45% of the pitch), the wave
  roughens (triangle, square, sawtooth), the letters type slower (24 → 90 ms each), and the text
  shakes, with neighbouring letters swapping more at each stage.
  Voices in the forest are 2.2 times louder than at home (they were barely audible over the wind and
  drone), and low ones louder still, up to about 4.8 times as a fake's voice drops; no voice goes
  below 90 Hz (small speakers barely play lower), and each blip lasts a little longer as the typing
  slows.
- **The transformation** (three refusals, then it comes for you): stage 1 drains the colour from
  its face and sprite; stage 2 drains it almost to grey and blacks out the eyes, and it stops
  blinking; stage 3 tilts the head and stretches the face until it runs out of the frame, and the
  sprite stands 40% too tall. Your light shrinks to 85%, 70% and 55%. After the last line it
  stands still for a second, then comes.
- **The chase** (made easier and more intense after play-testing: it felt like just running, and
  too hard to escape): it stands still for 1 s after its last line, then moves at 3.8 tiles/s
  (your walk is 3.3, your hurry 5.2) and goes round trees. You lose it by staying 10+ tiles away
  for 2 seconds, or if it hasn't caught you in 20 seconds; walking back out (before you're lost)
  also works. In tests, a runner that steers round trees gets away 39 times in 40, one that runs
  blindly into them about 1 in 4; a typical escape takes about 5 s. A lost chaser comes back later
  in the trip 35% of the time (60–150 s later), already changed, chasing. No lit clearings yet
  (they come with the buildings and light in stages 5 and 6).
- **Dread builds before the chase** (added after play-testing: the sound used to kick in only when
  the chase started). From the first refusal, the chase's sound and the red edge creep in a stage
  at a time: a faint drone at stage 1, your heartbeat from stage 2, louder at stage 3, while the
  forest's wind drops away (it holds its breath). Each refusal brings a slow rising swell (breathy
  noise sweeping up, a low note sliding up under it) as the face changes. While it stands still
  before the chase there's little but your heartbeat; then the chase. Nothing sudden: it all builds
  and fades. The levels are `STAGE_DREAD`, `PAUSE_DREAD`, `CHASE_DREAD`, `DREAD_HUSH` and `SWELL`.
- **How the chase feels:** your light flares back up to 85% so you can see where you're running,
  but gutters and shakes as it closes in; the chaser is drawn faintly even out in the dark (a pale,
  too-tall shape, clearer the closer it gets); the edge of the screen goes dark red as it closes in,
  pulsing with your heartbeat. You hear your heartbeat (from about 70 to 150 beats a minute as it
  closes), a dissonant drone (two notes beating against each other, a fifth and a tritone) that
  throbs faster, rises and brightens, a thin high shimmer when it's near, and its heavy footfalls,
  with ragged breath when it's close (even a fake whose tell was silent steps: once it's chasing,
  the pretending is over). All of it is pitched where laptop and phone speakers can play it: the
  first version's heartbeat and drone were at 40–70 Hz and couldn't be heard on them. It all swells
  and fades: no sudden noises. The numbers are `CHASE_LIGHT`, `CHASE_FLICKER`, `CHASE_SEEN`,
  `CHASE_VIGNETTE` and `CHASE_SOUND`.
- **Stamina** (forest only, an upright gauge in the hotbar beside your pocket): hurrying uses a full bar in about 9 s;
  walking refills it in about 12 s, standing in 7. Run it right out and you can't hurry again until
  it's back to a quarter.
- **Look at the photo** (relatives only, once per encounter, only if the photo is in your pocket):
  the photo and their face side by side. Your light shrinks to 60% and flickers while you look.
  Real or fake, they wait as long as you like, and ask again in the same words when you put it
  away. (At first a fake lost patience after 7 seconds and jumped a stage, but in play that read as
  the game skipping the conversation, and it gave fakes away; removed.) The nurse isn't in the
  photo: you have to remember Ada.
- **Go with a real one:** a black screen ("Rachel walks you home." / "Nurse Ada walks you home, one
  step at a time.") and you're at the front of the home: "You're home." (Notes are kept from stage
  4.)
- **Refuse a real one:** they're hurt ("...Alright, Gran. Alright." / "I'll come back for you. I
  promise I'll come back.") and walk off into the dark. Nothing bad happens except that. Their portrait shows they're
  hurt: brows drawn up, mouth turned down, wet eyes and a tear (added after play-testing).
- **Go with a fake:** you can't stop yourself following it for 5.5 s, along its own path, away from
  where you came in; then the black screen: "That was not your granddaughter." / "That was not a
  nurse."
- **Being caught: the grab, then a jumpscare** (decided after play-testing: first it just faded to
  black, then the grab with the creature's face drifting in, which felt corny). When something
  catches you (a chaser, a fake leading you off, the footsteps behind you, the face in the dark):
  the grab first (1 s, `CAUGHT_GRAB_MS`: a heavy hit and bones cracking, your light collapsing to
  nothing while the screen shakes, an impostor drawn in front of you, your heart racing); then,
  right after it, the screen goes black with a random image filling it and a random scream, for
  3 s (`SCARE_MS`), just as /game does. The images and sounds are copies of jumpscare/media and jumpscare/sounds, in
  retirement/scares. Each trip picks one of each and loads them as it starts, so the scare is
  instant. Then the black screen with its line, and the infirmary.
- **Caught** (led deeper or reached in the chase): that line, then the infirmary, Nurse Ada ("There
  you are, dear. They found you wandering by the fence again."), and if you had the photo with you,
  it's gone: "Your pocket is empty. The photo is gone." (The frame on your wall stays empty until
  a reprint or, from stage 5, finding it.)
- **If the conversation is closed without an answer** (Escape), they ask again. Someone you keep
  walking away from loses you after 25 seconds.

**Lines I wrote** (all in src/forest/encounters.ts, none in the draft): the family's greeting ("{calls}!
Oh, thank goodness. It's me, {name}. We've been looking everywhere for you." / "You're freezing.
Come on, {calls}, let's get you home before it's properly dark."), "This way. Hold on to my arm,
{calls}.", the hurt lines' second half ("I'll come back for you. I promise I'll come back."), the
three stages of asking again ("{calls}, please. It's me. Come home with me." / "Why won't you look
at me, {calls}? Don't you remember me?" / "Remember me. Please. Please remember me."), the nurse's
versions of all of those (her last: "Don't forget me. Everyone forgets me. Don't you forget me."),
"What is it, {calls}? It's getting dark. Come on." after you look at the photo, the walking-home
lines, and "Your pocket is empty. The photo is gone." The asking-again lines follow the story
bible: they want to be remembered.
