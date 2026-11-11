# The Forest: design decisions

Status: **forest survival, family/photo and encounter systems built (stages 1–3)**. **Stage 4
is in progress:** the fixed map's backbone (IMPLEMENTATION.md M1: roads, fork, camp fence and
gates, the off-path lost rule) is built, and part of M2 (examining, the notepad, keeping clues
only on a safe return, the corkboard). Physical keys and room storage, puzzle gates, cutscenes,
Nora, the locked room's interior and false Sunset Acres are **planned**. The Build status section
at the end records what the code does now (Stage 4 lists what's built so far).

Documentation responsibilities:

- [STORY.md](STORY.md): canonical history, characters, supernatural rules, clue IDs, acts, memory scenes, ending.
- [MAP.md](MAP.md): **fixed** roads, structures, gates, location IDs, adjacency, safe corridor/lost-forest rule.
- [PUZZLES.md](PUZZLES.md): puzzle solutions, NPC scenes, item/evidence lifecycle, gating, save/retry rules.
- [COMMUNITY.md](COMMUNITY.md): ordinary multiplayer Sunset Acres. Its economy and features stay intact.

Tune numbers are initial suggestions, not verified balance values.

## The idea in one line

Sunset Acres is warm, social and safe. In the forest, you explore unfamiliar places, examine
clues, and discover instructions in **your own handwriting** that you cannot remember writing.
Some people who offer to lead you home are impostors. You can save what you learned only by
returning alive and putting the evidence on your room's board.

## Core principles

- **Community inside, isolated outside.** On the grounds you can see and talk to everyone.
  Other players cannot see or contact you in the forest. Once the companion system is built,
  your **own pet may sometimes be with you**, but it can become separated, leaving you alone.
- **Helplessness, not combat.** There are **no weapons, no armour and no fighting** of any kind.
  You can't fight confusion; you can only hold on to what you know and hope someone brings you
  home. What you have is light, your notes, your judgement, and your legs.
- **Slow dread, and one jumpscare.** (A persistent hunter is planned to raise the stakes: "The
  thing in the deep" below.) Tension comes from darkness, sound, things at the edge of the
  light, people who are subtly wrong, and small decisions with uncertain outcomes. Nothing leaps at
  the screen, with one exception (changed after play-testing stage 3): **being caught** is a
  jumpscare, the way /game does them (a random image filling the screen, a random scream). It only
  ever happens as the result of a mistake you made, never out of nowhere.
- **A surprise, not a feature.** No opt-in, no gate, no warning sign. It's for the internal team,
  and finding it by wandering off the edge of the map is part of the fun. (Your pet growling or
  hissing at the treeline, below, is an in-world hint, not a sign: it never stops you.)
- **The horror is the experience of confusion, not people with dementia.** It's told from the
  frightened resident's point of view and never mocks them.
- **Fair, not random.** Every risky choice has an observable clue an attentive player can
  learn to read. Rules are mechanically consistent; an old handwritten *interpretation* of a
  rule may be mistaken or incomplete. Evidence reaches the wall only after a safe return.
- **Exploration over combat.** Distinct places and examinable objects advance the mystery.
  Each discovery can provoke a brief inner thought, add an unbanked clue, or challenge an
  earlier note. The core loop is examine → decide how much to risk → return → connect evidence.
- **Your past self as investigator.** Discovering notes in your own handwriting gradually
  reveals that you have investigated this forest before, although you cannot remember why.

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
- **The established roads, trail forks, buildings, entrances, clue sites and key locations are fixed**
  between visits. Only the wilderness **between/away from** their authored corridors changes
  procedurally. See [MAP.md](MAP.md). Players are meant to learn landmark locations and backtrack.
- **Your pet knows.** When you've crossed the outskirts and get really close to the treeline
  with your pet out with you, **a dog growls and a cat hisses** at the trees (see "Your pet"
  below). After the slow fade of the walk out, it's the clearest hint that the forest is
  dangerous.

## Getting lost for real

- **Staying on a known path preserves your bearings, regardless of depth.** The path network and
  buildings have authored, per-player coordinates. You may always walk back toward Sunset Acres
  along connected paths unless a visible authored gate blocks passage.
- **Leaving the path is the danger.** Give authored roads/clearings a forgiving walkable corridor.
  When the player strays far enough past it, environmental cues fade, the connected road is no
  longer available, and the client transitions to the **procedural lost forest**. (Built in
  stage 4: the earlier straight-line ~40-tile point of no return is gone; only the off-path rule
  is active. See Build status, Stage 4.)
- **Once lost, you need a genuine rescuer**: real family member, Nurse Ada, or the real pet. The
  one other way out is a **safe bus ride** (P04): a scheduled bus, full of the replayed crew, from
  the copied stop back to the camp gate.
  The forest can offer convincing impostors; only genuine escorts bank notes safely.
- **Safety net:** while lost, keep rescuer/threat opportunities coming _(tune: every 1.5–4 min)_.
  If the player remains lost too long _(tune: ~12 min)_ they collapse, awaken in the infirmary,
  lose the expedition's unbanked evidence and unsecured items, and lose the family photo
  **only when it was carried on that failed trip**. A photo left at home, banked board,
  stored keys, room furniture, coins and garden progress remain intact.
- **Barriers matter:** camp fences extend beyond the safe navigation margin; walking around
  them transitions to lost forest instead of bypassing the office, service gate or final shelter.

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
- **Disorientation touches, used sparingly:** your name in the HUD flickers, item labels in
  your basket briefly turn into nonsense, the clock jumps backwards, a path you just walked
  down isn't there when you turn around.
- **Inner voice (planned):** brief first-person unease and observations triggered by movement,
  examining objects, hearing cues, returning to familiar landmarks and connecting banked
  evidence. Start mundane ("It's too quiet.") and gradually become personal ("I don't
  remember writing this."). Don't have it constantly spoil hidden threats or assert facts
  that an examination hasn't established. See STORY.md for tone and progression.

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
  a fake can get it wrong. Handwritten observations from the protagonist's earlier expeditions
  can teach players to notice this tell.
- Existing characters without a family get the step **the first time they go into the forest**
  (decided): it opens at the gap, before the forest.

### Carrying the family photo

- The photo normally hangs on the wall in your room. **Taking it along is optional:** before an
  expedition, remove it from the wall and place it in your pocket, using one slot.
- **Why bring it:** during a family encounter, choose **"Look at the photo"** to compare the
  relative's face and identifying details side by side.
- **What it costs:** looking takes time, your light flickers as you inspect the photo, and the
  photo occupies a pocket slot that could hold a meal or another useful item.
- **Leaving it home:** the photo remains on the wall, safely available for later expeditions.
  You must assess encounters from memory without in-forest access to the picture.
- **Losing it:** if you are caught or collapse **while carrying the photo**, it is lost along
  with that trip's unbanked notes. If the photo stayed at home, **it is not lost**, even when
  the expedition ends in the infirmary. If the photo is already missing, failure does not
  remove anything else from the wall.
- **Replacing it:** ask Nurse Ada for a replacement print. **40 coins** is the existing instant
  reprint price _(tune)_. Coins are easy to earn at Sunset Acres by growing crops on your own
  community garden plot and selling the harvest to **Chef Rosa**. Photo replacement should be
  an affordable setback, not a progression blocker. **Design rule: replacements are purchased.**
  The implementation currently also offers a free reprint after one game day; remove that
  option when implementing the planned photo-loss and replacement rules.
- **Trustworthiness:** a genuine reprint is an accurate reference. Do not secretly alter a
  replacement photo while impostor identification relies on it as an answer key.
- **Meaningful choice:** carry a reliable visual memory aid and risk losing it, or leave it
  safe in the room and rely on your memory when evaluating a rescuer.

## Encounters: the nurse and the family

People find you in the forest: a **nurse** (who looks like Nurse Ada from the home) or **one of
your family members**, by the names you entered. They offer to take you home.

### Real or fake

- **Everyone is real until the service gate's padlock is open** (P05: solved this trip or kept
  from an earlier one). Play-testing: copies turning up before the camp's papers gave away what
  happened to Bell (and Evie) before the player had found any of it. Once it's open:
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
  - for the nurse: wrong name, an unfamiliar **Hollow Pines** badge rather than her Sunset
    Acres badge, or not quite Ada's look (the alternate badge is implemented as a visual tell;
    the camp employed its own staff, but the badge does not mean Nurse Ada worked there)

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
- **Failure rule:** lose **all notes, collected clues and other unbanked progress from this
  outing**. The family photo is also lost **only when it was in your pocket during the trip**;
  a photo left on the room wall is safe. Previously banked board notes and links, room
  decorations, coins, and garden progress remain intact. Nurse Ada can provide a replacement
  photo; community garden harvests sold to Chef Rosa make the cost manageable. The code already
  removes a carried photo when caught; apply the same conditional rule to collapse when the
  unbanked-notes system is added.

## Your pet

### At the edge of the grounds (built behavior)

- With your pet following you, approaching the treeline makes a dog **growl** or a cat **hiss**;
  it faces the trees, trembles and stops near the gap. This is a diegetic warning, not a barrier.
- **As implemented in stage 1**, the pet stays behind at the treeline and waits while you enter.
  It sleeps at home at night. The sound effects are `sfx/pet-growl.mp3` and
  `sfx/pet-hiss.mp3`; current distances, cooldowns and animations remain recorded under
  "Build status" below. Keep them until the new companion behavior is implemented.

### In the forest (planned)

- **Allow intermittent companionship.** Sometimes the player's dog or cat follows into the
  shallower forest; sometimes it refuses at the edge, and it can become separated deeper in.
  Its absence after familiar footsteps and small animations should increase unease. It always
  reappears safely at home after a failed trip and is **never permanently hurt or killed**.
- **Behavioral clues, not an answer key.** It may growl at an impostor, a harmless place, or
  something the player can't see; it may also stay quiet near a fake. Do not couple its growl
  deterministically to the `isFake` flag. It should not make the photo-comparison encounter
  pointless.
- **A reunion can be a safe exit.** Occasionally the pet comes to find you while you're lost.
  It is **always your actual pet, never a mimic**, and choosing to follow it home **always
  succeeds**, banking that trip's notes. Hearing its collar or paws first can signal the rescue.
- **Chance:** an initial idea was roughly **1 in 8 eligible rescue opportunities** _(tune)_,
  **not** a 1-in-8 roll every second or action. Trigger through the scheduled encounter/rescue
  system with an interval or cooldown, never through idling as a farming exploit. The existing
  draft used ~10% of rescues; neither number has been play-tested.
- **Pet hearts** already exist in `save.pet` (`kind`, `coat`, `name`, `hearts` 0–10). More hearts
  could influence reunion frequency, but **never reliability**; the pet is always a safe escort.
- **Solo-player isolation remains.** Other residents never appear or chat in your forest session
  even when your own pet is present; this doesn't change the client-only forest model.

## Things you avoid

- Besides the impostors there are **one or two stalking threats** you can only avoid, never fight:
  hide, keep to the light, keep moving. For example _(draft)_:
  - **The Visitor:** a tall figure that only moves while you aren't looking at it (like the basement
    statue in `/game`). Touching it is being caught.
  - **The Wanderers** (working threat name): ambiguous figures walking slow loops between
    trees. Harmless unless they see you in the dark, then they follow. **Their origin is not
    decided** and should stay unspecified until the story bible establishes one.
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
- **Not used in the main story:** the recorded murmured prayer. Keep as an unused sound asset unless a specific, authored site calls for it.

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
  never below 45%) and its jaw drops at least halfway; keep coming and it has you: "You should
  never have gone closer." **As it drifts closer its grin opens wider** (the jaw drops up to
  `GRIN_DROP` px, in step with how far it has come from where it opened to where it has you), and
  **it gasps**: `forest-gasp`, over and over, every 4.2 s when it has just opened down to every
  1.5 s when it's on you, and louder each time (15% to full: `GASP_FAR`, `GASP_NEAR`, `GASP_QUIET`),
  a crescendo as it comes. (The real face and its false-alarm cue gasp alike.)
- **Caught by a threat:** the same jumpscare as being caught by an impostor.
- **When:** the first 25–50 s into a trip, then every 30–70 s, up to twice as often deep in or once
  you're lost; never the same kind twice running; never during an encounter (and encounters wait
  for them); the collapse waits too.
- **Still planned for stage 6:** the Visitor and the Wanderers. More ideas for later stages: sounds
  that are only sounds, things from home in the forest, your name called from far off.

Numbers: `THREAT_*`, `FALSE_ALARM`, `STALK_*`, `ARM_FROM`, `EYES_*`, `LIGHT_TAKEN`, `LIGHT_LEAST` in
src/forest/tuning.ts; the code is src/forest/threats.ts.

## The thing in the deep (built: see "The thing, unease and energy" in the Build status)

Proposed after play-testing: the forest's stakes still felt low. One creature, the one drawn for
the empty bus (`thingSprite` in `story/ride.ts`: too tall and thin, grey-white, arms past its
knees, blood down its chin and front), hunts you through the forest on every trip. It's the
forest's one persistent danger, alongside the rarer cues and encounters.

**Where it is:**
- Each trip it starts **deep**: far up the deep road beyond the service gate, or out in the lost
  forest. From there it drifts towards you, slowly, never straight at you, and faster the longer
  you're out.
- On the map near the trailhead it's a distant worry, which keeps the early places learnable. On
  the deep road it's close.
- **The empty bus** drops you deep, where it is: riding alone means it finds you much sooner.
  That gives the bus rule real teeth without the old scene in the aisle.
- Lost, it's never far off.

**Keeping it fair** (FOREST.md "Fair, not random"):
- It's never on top of you without warning. Its heavy, uneven footsteps carry, and your unease
  climbs as it closes (below).
- You can always get away: it's slower than you hurrying (the chase's numbers are a starting
  point), loses you if you break away out of sight, and gives up after a while.
- Being caught by it is the usual caught: the grab, the jumpscare, the infirmary, the unbanked
  notepad gone.
- No combat, as everywhere in the forest.
- It doesn't speak, wear a face or pretend to be anyone: that's what the copies do. It's what a
  copy is when it stops pretending (STORY.md).

**How it fits what's built:**
- It replaces most of the "real" danger budget (`DANGER_PER_TRIP`). The footsteps behind you and
  the face in the dark become mostly cues, so the forest doesn't pile threats on top of a hunter.
- Fakes still grin and lunge only if you follow them; rescuers still come.
- Its chase reuses the encounter chase's sound and the red edge, at a stage that rises with how
  close it is.

**Unease and energy: two new gauges beside stamina** (built):
- **Unease**: how close the thing is, or anything else bad (a fake beginning to change, a threat
  that's real).
  - It rises as it nears, falls as you get away, and never says which way: you know it's close,
    not where. The heartbeat and the drone can follow it.
  - The name "Unease" (not "Anxiety") is a proposal, so a care-home game doesn't label a medical
    feeling; change freely.
  - Being uneasy changes nothing mechanically at first. Later ideas: your light trembling, tells
    harder to notice when you're very afraid.
- **Energy**: how long until you collapse, which nothing shows today (the collapse comes 5
  minutes after getting lost, unseen).
  - It drains slowly the whole trip and faster when lost, hurrying or very uneasy.
  - It refills a little sitting down to wait (but sitting is when the thing closes in), and with
    the planned meals ("Meals" below: soup, pie, tea).
  - Empty: you collapse, as now.
  - That makes the planned cooking matter: food lets you stay out longer.
- Both are upright gauges like stamina, each with its text label and an aria value: never colour
  alone.

**The insides are a refuge** (decided):
- It never comes through a door. Inside a building you're safe from it, as from encounters and
  threats.
- It can follow you to the door and wait out there: your unease stays up while it's close, so
  you know it's still about. It drifts off again after a while.
- Hiding isn't free: energy still drains indoors, a little more slowly, so you can catch your
  breath but not wait it out forever.
- The rule has to be learnable, not assumed. Your earlier self should have noticed it too, e.g. a
  line in the lost pages or a later note in your own hand ("It won't come through a door.").
- STORY.md says the camp is forest territory where copies can attack. This is a rule about the
  thing only: the camp's buildings stay forest territory for everything else the story needs.

**Decided** (the open questions): it hunts only once the service gate is open (P05, kept or solved
this trip), and whenever you're lost or let off the empty bus; on the map it never comes south of
the creek; it starts fresh each trip; meals go in your pocket. Energy pauses while you ride the
crew bus (the forest stops) and resets each trip.

## Exploring, examining and documenting (planned)

**The core loop:** explore a **fixed** trail network; examine authored objects at known sites;
collect clues, physical tools or warnings; survive the journey back; pin and connect evidence
on the room board; return with the proper items to unlock obstacles. [MAP.md](MAP.md) specifies
where, and [PUZZLES.md](PUZZLES.md) specifies how. **Do not randomize physical story-site
locations or the source of any essential clue.** Only ambient wilderness between roads is random.

- **Inspect before interpretation.** Text and object close-ups tell the player what is physically
  there. The protagonist's short inner voice may express dread or recognize handwriting but must
  not reveal objective facts not yet discovered.
- **Evidence has canonical clue IDs.** Documents remain at their fixed sources and can be read
  again. Some produce unbanked notepad entries; other inspections are environmental only.
  Existing paper content never mutates secretly to confuse the player.
- **Two kinds of pickups:** informational notes/clippings for the board, and **usable physical
  items** such as `ITEM_ADMIN_KEY` and `ITEM_CLOSET_KEY`. A key stored or displayed at home
  must be physically **taken back into the player's pocket** to open a remote lock on a later trip.
- **Banking:** returning to real Sunset Acres by fixed roads or genuine escort commits that
  expedition's evidence/items. Being caught, collapsing or quitting mid-expedition discards
  unbanked findings. Previously saved board evidence remains. Opened routes are persisted as
  described in PUZZLES.md; all critical items remain recoverable on failure.
- **Board:** the default corkboard in the resident's room supports arranging, annotating,
  linking notes and replaying memory vignettes. The final chronological deduction `P09` is a
  controlled board interaction; arbitrary string geometry is not a hidden mandatory solution.
- **Cutscenes:** major recollections play **only after the triggering clues are banked on a
  successful return**. A failure/infirmary transition never plays a clue reward. See STORY.md.

### Failure and photo policy

| Outcome | Trip evidence/items | Previously banked evidence | Family photo |
| --- | --- | --- | --- |
| Walk back on fixed path | Bank | Preserved | Preserved |
| Real family/Nurse Ada escort | Bank | Preserved | Preserved |
| Real pet rescue | Bank | Preserved | Preserved |
| Caught, collapses or expedition abandoned | Lose unbanked findings; recover unique plot items from source | Preserved | **Only lost when carried into the failed expedition** |

The family's reference photo is optional equipment; a genuine reprint remains accurate.
A replacement is purchased from Nurse Ada _(current 40-coin price, tune)_. Coins come from
ordinary community-garden produce sold to **Chef Rosa**, so this is an affordable setback.

### Authored locations and challenges

The locations are physically fixed and have stable IDs: Route 9 bus stop, foreman's cabin,
Nora's creek campsite, the fenced Hollow Pines courtyard, workers' bunkhouse, maintenance
shed, administrative office, service gate, watchman's shelter, logging fork, ravine,
survey lookout, ruined first-aid shelter and the player's hidden room/false Sunset Acres.
All roads and interiors are defined in MAP.md.

Required gates in PUZZLES.md:

- `P01` foreman's **physical key** → administration office.
- `P05` **NIGHT CREW** code from admin registry → locked deep service-road gate.
- `P06` room-number key from survey lookout → locked Sunset Acres room door.
- `P07` recognize accurate personal details → escape private false Sunset Acres.
- `P08` hidden-room drainage plan + working ravine sluice → final shelter.
- `P09` arrange dated Evie evidence on board → story conclusion.

Optional challenges include Bell's locker (`P02`), an old manual storage-shutter mechanism
(`P03`), and the Route 9 bus rule (`P04`). None blocks the required route.

**Route 9 rule:** “DO NOT RIDE THE BUS ALONE.” The forest still runs the bus on the old crew
timetable (06:00, 14:00, 22:00, from `route9_timetable`). A **scheduled** bus comes full: faint
shapes of people standing in its windows, the replayed crew, who ignore you. It takes you to the
**public stop at CAMP_GATE**, even from the lost forest. So does any bus with the **real pet**
aboard. An **empty** bus off the timetable is a lure (SUNSET ACRES on its board). Ride it alone
and it drives a long way, faster and faster, and lets you off deep in the lost forest, where the
dark closes in further. Never use the bus as a way home, nor a mandatory shortcut.
Keep the existing pet's treeline refusal until planned intermittent companionship is
implemented. (PUZZLES.md P04 has the details.)

**Character encounters:** Real Nora has two brief guaranteed conversations at `CAMP_YARD`.
Later an **imitation** of Nora bangs on the watchman's shelter door, the player's own double
appears at the logging fork, and Nora's real body is found at the ravine. The double killed
her before the fake-door scene; opening the door does **not** make copying possible. These
beats have stable event IDs and fair outcome branches in PUZZLES.md.

### The room and false Sunset Acres (planned)

The owner-only locked bedroom door exists from the beginning. A physical key at
`SURVEY_LOOKOUT`, labeled with the player's current room number, unlocks it after being
brought home alive. The interior is a cramped copy of an older home with documents and the
**imitation's** blue raincoat. That coat is **evidence of duplication, not a magical anchor
or finale object**. On the first exit, the player enters a private, distorted copy of
Sunset Acres and solves a brief recognition puzzle to return to the real social world.
The actual residents, garden, furniture and chat are never changed. Losing the scene is
retryable without permanent item or board loss. The final forest objective is recovering
proof of the **real Evie's death**, surviving a final false-Evie encounter, returning home,
and solving the board chronology; the forest itself is not destroyed.

## Meals

Food cooked on the property (see COMMUNITY.md, "Cooking") helps you survive, never fight. **Built
so far:** click a meal in your basket to put one in your pocket (a slot each; two of the same is
fine); in the forest, click it in your pocket to eat it: energy back (`MEAL_ENERGY`, 40%), and
vegetable soup refills your stamina too. At home, click it to take it back out. The table below is
still the plan for the other effects.

Example meals _(recipes and numbers to tune)_:

| Meal                    | Made from                     | In the forest                                                                                 |
| ----------------------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| Vegetable soup          | radish, carrot, tomato        | Refills your stamina                                                                          |
| Strawberry jam toast    | strawberries                  | Stamina refills faster for a while                                                            |
| Pumpkin pie             | pumpkin                       | A bigger stamina bar for the whole trip                                                       |
| Roasted sunflower seeds | sunflower                     | A bigger circle of light for a while                                                          |
| Mushroom broth          | vegetables + forest mushrooms | **Calm**: the darkness and disorientation build more slowly for a while                       |
| Herbal tea              | forest herbs                  | **Clarity**: visual tells are slightly easier to notice for a while; it does not restore memory |

Rules: meals never make you faster than an impostor for good; effects wear off; you can only carry
a few _(tune)_; clarity stays a subtle nudge, never a label; forest-only ingredients make the best
meals, so the forest and the garden feed each other.

## Story

[STORY.md](STORY.md) defines the full **planned** mystery. Detective Evelyn “Evie” Mercer
investigated disappearances at Hollow Pines in 1978; the forestry camp shut in 1979. In
1987 Evie died in the forest after disappearing, but something wearing her face later
returned to the protagonist's house. The protagonist investigated for decades, left
notes to their future self, and now lives with dementia at Sunset Acres. A present-day
historian, **Nora Vale**, becomes a brief ally; a copy of the player kills her and a copy
of Nora later begs for entry to a shelter. A hidden closet opens onto a private distorted
Sunset Acres. Ultimately the player finds Evie's remains and returns with evidence to
solve the timeline on the board. The forest's **origin** remains unknown and the forest
remains after the ending. **None of this plot is implemented in the current build.**

## Build stages

**Stages 1–3 are built and stage 4 is in progress** (Build status says exactly what). The
rest are specified by STORY.md, MAP.md and PUZZLES.md and must not be described as shipped:

1. **Built — base forest:** outskirts, darkness, procedural woods, isolation, collapse/infirmary,
   treeline warning. (Its straight-line point of no return was replaced in stage 4.)
2. **Built — family/photo:** family editor, reference photo, Nurse Ada reprints. Preserve the
   rule that death takes the photo **only when carried**; remove free reprint when enforcing
   the intended paid replacement (40 coins starting price).
3. **Built — rescue encounters:** genuine/fake family and nurse, tells, photo comparison,
   transformation/chase/caught. Keep fair cues; reuse these systems for the final false Evie.
4. **In progress — map backbone:** authored fixed roads, forks, fences, building exteriors and
   the corridor-based lost state are built (M1). Still to come: entrance interiors and route
   persistence (MAP.md).
5. **Built — examination and board (M2):** examining, the notepad, keeping clues on a safe
   return, the corkboard with notes and strings, physical keys with the key hook at home,
   unresolved leads, the rough site map, and the saved story progress (`save.story`) with its
   server validation. Puzzle, event and cutscene state is stored and validated, but nothing sets
   it yet (M3 onwards).
6. **Built — camp puzzles and evidence (M3):** P01/P02/P03/P05, the four camp insides, and the
   work records (`jonah_journal`, `bell_fire_record`) with `evie_photo_before`. **Next:** the Evie
   files (M4) and the first memory vignettes.
7. **Next — Nora and deep forest:** real meetings, watch shelter fake knock, own-double sighting,
   ravine body, fixed survey lookout, recoverable room key.
8. **Next — room and final shelter:** P06/P07/P08/P09, private false-home scene, final Evie
   evidence, escapable false-Evie encounter, cutscene queue and ending.
9. **Optional/later — the bus and the pet:** the timetable bus (P04: full and safe on schedule,
   empty off it, dropping you deep in the lost forest) can come first; then intermittent pet companionship/rescue (always
   safe) and the pet's half of P04; extra avoidance threats, found lights, forest ingredients and
   food effects.

Build in slices with testable save migration paths; do not add all lore before navigation
and retry behavior work.

## Technical notes

- **The outskirts** remain part of the shared grounds. Color/music fade and pet warning
  continue before the path enters private forest. Existing engine locations (`src/game.ts`,
  `src/maps.ts`, `src/music.ts`) are the integration points for the transition.
- **Forest architecture target:** fixed tile-level centerlines, authored site polygons and
  interior maps layered into the client forest. The per-expedition seed generates only
  surrounding trees/understory/ambient events. Off-corridor travel can trigger a *separate*
  fully procedural lost state. (Done in stage 4: the straight-line point of no return is gone.)
- **Persistence:** validate per-player `bankedClues`, key storage, puzzle states, story-event
  flags, cutscene flags and board annotations in `shared/schema.ts`. Temporary expedition
  notes and physical finds remain client-side until a safe-return commit. `PUZZLES.md`
  gives an illustrative model and acceptance tests; use current project conventions.
- **Mandatory data IDs:** stable clue IDs from STORY.md, location IDs from MAP.md, and
  item/puzzle/event IDs from PUZZLES.md. All authored sources stay fixed; unique quest items
  are recoverable after failure. Story scene conditions depend on **banked** clues.
- **Multiplayer privacy:** the forest and false Sunset Acres are per-player. Preserve shared
  presence/chat in real Sunset Acres; render the echo in a separate scene/instance without
  mutating shared map or account gardening/furniture data.
- **Visual tells:** family photo is trustworthy; Evie scar and Nora mole have text/portrait
  inspection. Copies can be wrong in appearance or behavior, but never impossible to detect.
- **Sound/art:** prefer existing sprite, portrait, audio and dialogue systems. Use ambient
  warmth versus drained woods; short in-engine recollections rather than external video files.
- **Economy:** replacement family photo is paid and affordable via Chef Rosa's crop purchases;
  no extra shop or resource grind needed.
- **Engineering snapshot:** historical code/tune notes in Build status remain useful for
  migration, not normative story/location requirements.

## Still open

The **narrative truth, map topology, mandatory objects and puzzle solutions** are established
in STORY.md, MAP.md and PUZZLES.md. These engineering/tuning details still require testing:

- Authored corridor widths, lost transition threshold, fence collider dimensions and
  pathfinding around branches. Preserve the safe walk home while the player stays on roads.
- Timings/visuals for fake Nora's door choice, own-double sighting and final Evie encounter.
- How physical keys and room storage fit existing inventory slots, and migration of existing
  saves when adding puzzle/event flags. Ensure no duplicate keys or softlocks.
- Exact cutscene queue/skip/replay UI, detailed portrait assets for Evie's eyebrow scar and
  Nora's cheek mole, and accessible descriptions.
- Final choice of audio, collision, window and lighting behavior in the false-home level;
  it must never touch real shared-world state.
- Pet companion separation, rescue cadence (~1/8 eligible rescue opportunities as a tuning
  starting point), hearts effect and bus boarding once pet companionship exists.
- Existing threat frequencies, stamina, light radius, chase speeds, photo cost and collapse
  interval. The **current distance-based point of no return is replaced** by corridor loss.
- Whether additional optional rule-horror sites belong on the map. They should only be added
  with fixed site IDs and complete learnable rules, not random lore fragments.
- Consent/accessibility and tone review for a dementia-care themed community; ensure the
  hidden horror and depictions of dementia are appropriate for intended users.

## Build status

**Implementation snapshot:** the details below record the forest, family, and encounter
systems as built and play-tested. They are engineering records, not evidence that the
story, examination system, evidence board, fixed mapped paths, or intermittent pet companionship
is already implemented, except where Stage 4 below says so. Stages 1–3 are kept as they were
built; where stage 4 changed something (the point of no return, the random forest map), the
earlier note says so. Any planned behavior described elsewhere must be implemented explicitly.

Tuning numbers live in `src/forest/tuning.ts` (and the grounds' size in `shared/grounds.ts`).
`?forestfast` (dev builds only) shortens the off-path distance at which you're lost to 6 tiles and
the collapse to 25 seconds, for testing.

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
- **The point of no return** _(replaced in stage 4 by being lost off the paths)_ was straight-line
  distance from where you came in (40 tiles). After
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
- **Reprints in the code:** Nurse Ada offers "Tomorrow is fine" (free after one game day,
  24 real minutes) or "Right away (40 coins)"; she hangs it herself. `REPRINT_WAIT_MS` and
  `REPRINT_COST` live in `src/forest/tuning.ts`. The purchase can be funded by selling
  community-garden crops to Chef Rosa. **Planned purchase-only rule:** remove the free
  delayed option when the replacement flow is implemented.
- **Photo loss in the code:** capture removes the photo only when it was in the pocket.
  Collapsing does not currently remove it. The intended collapse behavior is **conditional**:
  remove a carried photo, but never remove a photo left at home. `window.game.losePhoto()`
  (dev) can test loss. The paid replacement rule also requires removing the current free
  delayed reprint option.
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
  Sunset Acres one (cream with a sun). To make the badge learnable, **Nurse Ada always wears
  her Sunset Acres badge** in her portrait, at home too. Eye colour is an implemented visual
  tell, but its associated clue text has not yet been written.
- **A wrong colour is always obvious** (decided): a fake's wrong hair, cardigan or eye colour can be
  in the same family as the real one (light against dark brown, cornflower against navy) but never a
  near miss: it's at least `TELL_COLOR_MIN` apart (80 on a perceptual scale; eyes, being a few pixels,
  `TELL_EYE_MIN` 90). This rules out pale grey against the lavender and blue rinses, and the two brown
  eye colours.
- **Being caught never says what you missed** (decided). Only "That was not your son."
  Every tell should be learnable through examination and story fragments in stages 4–5.
  The protagonist's own forgotten investigation can leave observations about blinking,
  shadows, familiar forms of address, the photo, eye colour, Nurse Ada's badge and name, and
  silent footsteps. **These explanatory fragments are not implemented yet.**
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
  a replacement is obtained.)
- **If the conversation is closed without an answer** (Escape), they ask again. Someone you keep
  walking away from loses you after 25 seconds.

**Encounter dialogue in the code** (all in `src/forest/encounters.ts`): the family's greeting ("{calls}!
Oh, thank goodness. It's me, {name}. We've been looking everywhere for you." / "You're freezing.
Come on, {calls}, let's get you home before it's properly dark."), "This way. Hold on to my arm,
{calls}.", the hurt lines' second half ("I'll come back for you. I promise I'll come back."), the
three stages of asking again ("{calls}, please. It's me. Come home with me." / "Why won't you look
at me, {calls}? Don't you remember me?" / "Remember me. Please. Please remember me."), the nurse's
versions of all of those (her last: "Don't forget me. Everyone forgets me. Don't you forget me."),
"What is it, {calls}? It's getting dark. Come on." after you look at the photo, the walking-home
lines, and "Your pocket is empty. The photo is gone." The impostors' motives are not
established; confirm that their pleading language fits once the story bible is written.

### Stage 4: the fixed map and examining (in progress)

Built so far: IMPLEMENTATION.md **M1** (the map's backbone) and part of **M2** (examining, the
notepad, keeping clues on a safe return, the corkboard). The map is data in
`src/forest/story/map.ts`, worked out tile by tile in `layout.ts`; `layout.test.ts` walks it.

**The map (MAP.md 02–12).** Tiles, with the gap you came in by at (0, 0) and north negative:

- A footpath north from the treeline to **the fork** (about 26 tiles in), with a signpost: ROUTE 9
  west, CREEK TRAIL east, CAMP under both.
- **West:** a path to the old Route 9 road (about 45 tiles in). The road runs north over the creek
  on a bridge, past **the foreman's cabin** (about 90), then east along a straight stretch past
  **the bus stop** (about 108) to the camp gate.
- **East:** the creek trail passes **Nora's campsite** (about 57) and crosses the creek on a
  footbridge.
- Both reach **the camp gate** (125 tiles in): an open gate in a wire perimeter fence. Inside is
  **the courtyard** (43 × 30 tiles of gravel) with **the bunkhouse**,
  **the maintenance shed**, **the administrative office**, a flagpole, benches and a truck.
- **The service gate** on the north fence is always locked for now (P05 comes with M3). The deep
  road is laid out beyond it but has nothing on it yet (MAP.md 13–18 come later).

Landmark ids are MAP.md's location ids.

**Judgement calls (change freely):**

- **Clearings keep the forest floor** (play-testing: the fork's grass was "a weird square"). Areas
  are rectangles, so only the fenced courtyard gets its own ground (gravel); the fork, the cabin
  and Nora's camp are just cleared of trees. The footpath runs right into the fork, so the three
  paths meet in a Y.
- **Route 9 dead-ends** a little west of where the path from the fork joins it, at a ROAD CLOSED sign. Past it the road is
  just trees, so walking on means getting lost.
- **Gone from the earlier map**, since they had no place in MAP.md:
  - the ruined house plot (gatepost 14, the windmill floor tiles, the chimney)
  - the picnic ground (the moving swings, the carved E.M.)
  - the car with the 1987 tax disc
  - the bridge's weight-limit plate

  The red-mitten keepsake moved to a litter bin at the bus stop.
- **`evie_card`** is behind "Look inside" at the cabin door until the cabin's interior and its
  field envelope exist (M3).
- **Nora's campsite** is drawn and examinable: warm ashes with a tin mug of tea, the dented kettle,
  a bedroll with a damp notebook under its string. The notebook and the thermos are invented.
  There's no Nora yet (M4).
- **Invented text:** the fork signpost, the camp's closure notice ("THIS CAMP IS CLOSED... 1979"),
  the padlock's wording around NIGHT CREW, the bunkhouse/shed/office/fence descriptions, and the
  courtyard's props. The office's locked-door line is PUZZLES.md's own.
- **The random teacup find is no longer warm** (STORY.md: no phantom warm tea). It's full of
  rainwater now.
- **Fence tiles count as their nearest side** (play-testing: running up against the fence from
  inside the courtyard got you lost on the spot). Your feet collide just above your position, so
  walking down into a fence you can stop within 0.02 of a tile of it, with your position already
  in the fence's row, and the fence counted as infinitely far from the paths. Now, after the
  distances are worked out, each fence tile takes its nearest side's distance (0 from the
  courtyard). It's done after, so nothing is ever measured through the fence. `layout.test.ts`
  checks every fence edge.
- **The perimeter:** the south and north fences run 40 tiles beyond the camp's sides (MAP.md
  "fences extend beyond the safe corridor"). The fence is a barrier: how far you are from the
  paths is measured round it, never through it. So walking along its outside gets you lost
  within a few steps of the courtyard, and nothing goes round a gate.

**Getting lost (replaces the point of no return):**

- You're lost once you're further from every road, path or clearing than half the screen's
  diagonal (at least `OFF_PATH_LOST` 13 tiles, at most `OFF_PATH_LOST_MAX` 24). A thought warns
  you as the path leaves the screen.
- MAP.md suggests a 3–5 tile corridor. Play-testing showed that losing the path while it's still
  on screen reads as a bug, so the corridor is "out of sight" instead.
- The 24-tile cap is there because a very wide window would otherwise stretch the corridor far
  enough to walk round the fence ends.
- `layout.test.ts` checks that every site is reachable on foot without getting lost, that
  nothing beyond the service gate is, and that the courtyard is only reachable through the camp
  gate.
- Once you're lost, everything out of sight is made again as plain forest. The map is gone until
  someone brings you home.
- Every gap in the treeline opens onto the same trailhead, facing north. Keys held while crossing
  the gap are ignored until released.
- Paths are drawn per pixel with soft edges, and glow faintly through the dark (`PATH_GLOW` 0.2).
  The dark deepens slowly once you're lost (`LOST_DEEP`, `DEEP_EASE_S`).
- **Darker the further in** (play-testing: "the forest used to look scarier"). The dark on the map
  had been held at a flat 0.3 so the places could be seen, which made it tame. It now follows
  `MAP_DARK`, by straight-line distance from the gap:
  - 0 at the trailhead, 0.2 at the fork, 0.4 around the bus stop and cabin
  - 0.6 at the camp, 0.8 on the deep road

  Your light shrinks with it, the colour drains and the deep drone comes up. The path glow went
  from 0.4 to 0.2, so the paths show only faintly beyond your light.
- **A little more forest by the paths**, as asked ("don't make the trees close in too much"):
  - trees just off a path from 0.03 to 0.045 per tile, plus 0.015 more per tile further off
    (was 0.012)
  - brambles on the verges from 5% to 9% of tiles

**Examining and keeping (part of M2):**

- Every landmark's props can be examined, as can the trees and stones.
- Clues open as a paper (`story/clues.ts`). Written so far: `route9_timetable`, `bus_warning`,
  `evie_card` and the optional `lost_journal`.
- Clues go into the trip's notepad, with your own note on each. They're kept only if you get home
  safely, by walking back or with a real escort; being caught or collapsing loses them.
- Your first kept clue puts a corkboard (furniture, price 0) in your room's storage. On it you can
  drag cards, write notes and run strings (`save.board`, validated in `shared/schema.ts`).
- Not built yet: the P09 chronology and the cutscenes (memory scenes). Keys, leads and the site map are below
  ("Keys, leads and the site map").
- Every room has a locked closet (`CLOSET`): P06's door.
- **Clue ids** are now STORY.md's list, plus the optional `lost_journal`. No save can hold a
  removed id: only four clues had a source, and all four are kept.
- **Keepsakes** (not in MAP.md or PUZZLES.md; kept as an optional extra, change freely):
  - The name tag, glasses, teacup and ticket among the small random finds, and the mitten at the
    bus stop.
  - Bring one home and it becomes a framed `keep_<id>` furniture piece. Lost if you're caught.
  - The small random finds are scenery: none of them carries the story.

**The inner voice:**

- It speaks sparingly: at most one unprompted thought a minute (`MUSE_GAP_MS`), and never a
  question the player should be asking.
- "Something feels... off." only comes when something really is: a real threat, or a copy.
- At most two "the path was here" lines when you turn back while lost.
- No thoughts once a trip is ending, or on the end screen.
- What you see when you look at something types out at 18 ms a letter (`LOOK_TYPE_MS` in ui.ts),
  faster than thoughts (32 ms), after play-testing found it slow.

**Lost: things to do** (built before the new documents; kept, they fit "once lost, you need a
rescuer"):

- Searchers come with torches and call out. A real searcher's light is steady; a copy's gutters,
  and is sometimes heard from the wrong side.
- **Sit down and wait** (E): everything comes 3× as fast (`WAIT_FASTER`).
- You collapse when your energy runs out (about 5 minutes lost from full: the Energy gauge; `COLLAPSE_MS` is gone).
- **Your old lean-to:** red arrow marks on the trees lead to it, and a tin box under it holds
  `lost_journal` (October 1987).
- **A copy of the bus stop** turns up off to one side once you've been lost a minute (only once
  you've found the real one, this trip or before), but only
  when a crew run is 70–170 s away and you'd still be on your feet for it (`BUS_COPY_SOON`). So a
  safe ride is always possible from it. See "The Route 9 bus" below.

**Encounters:**

- Turning a fake away never starts a chase: it stares, then backs off grinning. Follow it and it
  turns and lunges.
- The grin shows facing you, and from behind, where its head has turned all the way round
  (invented). Not side on: a grin up the cheek was tried and dropped after play-testing. Past your light, its teeth and eyes still show in the dark (`GRIN_GLOW`).
- Real danger per trip: `DANGER_PER_TRIP` 1, plus 1 once lost, plus 1 more if you're let off the empty bus.

**Not yet reconciled with the new documents:** a family-photo reprint is still free after a game
day (`REPRINT_WAIT_MS`) as well as 40 coins straight away. The documents want paid only.

### The Route 9 bus (built: PUZZLES.md P04, the timetable half)

The forest still runs the bus on the crew timetable (`route9_timetable`, now a crew service:
6:00 am, 2:00 pm, 10:00 pm at the stop). The code is `story/bus.ts` and `story/ride.ts`; the
numbers are `BUS_*` and `RIDE_*` in `tuning.ts`.

- **Where it runs:** at the real stop on the map, and at the copied stop when you're lost. At the
  real stop it comes out of the trees past the ROAD CLOSED sign and pulls in facing east. Leaving,
  it doesn't drive off down the road: it pulls away and fades out a little way on.
- **On the timetable:** if you're within 26 tiles of the stop, a full bus sets off 6 s ahead of
  the hour so it stops on time. It waits 25 s (25 game minutes) with its doors open.
- **Off the timetable:** an empty one comes once you've been within 9 tiles of the stop for 20 s
  in all. Never with a crew run less than a minute away, and never within 45 s of the last bus.
- **Telling them apart** is up to you: a full bus has dim windows with the shapes of people
  standing in them, only very faintly darker than the glass (play-testing: at first they were too
  dark and stood out); an empty one has black windows. Nothing says which it is (play-testing: a line
  saying "The bus is empty" as it stopped gave the choice away). This departs from PUZZLES.md's
  "text as well as pixels" rule, by choice. Nothing is described when you get on or off either (play-testing: it explained too
  much): the inside of the bus, the crew walking in through the gate and the bus being gone show
  it. The only line is the thought "I shouldn't have got on." after the empty bus lets you off.
- **Inside** (`ride.ts`), drawn like a room: the back wall with the windows and the forest going
  past, seats either side of the aisle, the empty driver's seat, and the door at the front. You
  start a few steps in and can walk the aisle with A/D. Nothing else in the forest happens while
  you ride.
- **The crew run** (9 s): the seats are full of workers in work shirts and caps, most of them
  dozing. One man is in two seats: they're copies. Nobody looks at you.
  - You're let off on the road just outside the camp gate. The crew walk in through the gate ahead
    of you and fade, with no shadows, and the bus is gone.
  - **If you were lost, you're found** (`Forest.found`): the map is made again round you, and your
    lean-to and the copied stop are forgotten. Nothing is kept until you get home.
- **The empty bus** (changed after play-testing: the creature's design was liked, the scene in the
  aisle wasn't):
  - Every seat is empty, the lights are cold and one flickers. It drives 10 s, faster and faster,
    your heartbeat rising, then brakes and the doors open on the dark.
  - You're let off `BUS_DROP` 70 tiles from where you got on, far from any path, **lost**. If you
    were already lost, the forest round you is made again; a copied stop you left is forgotten.
  - Deep in: the dark closes in to `BUS_DEEP` 0.92 (lost is usually 0.75) and stays until you're
    found, and the trip has one more real danger. Then "I shouldn't have got on."
  - It looks and sounds deeper too (play-testing: it should feel as ominous as it is). As the dark
    closes in past being lost:
    - the colour grade goes on past the forest's deepest, almost to grey (`FOREST_DEEPEST` in
      light.ts: saturation 0.1, brightness 0.72)
    - both drones play at once, the deep one and the lost one
    - the wind drops to 30% (`BUS_DEEP_WIND`): the forest holds its breath
  - The creature drawn for the earlier scene (`thingSprite` in `ride.ts`: too tall and thin,
    grey-white, arms past its knees, blood down its chin, front and hands) is kept for later.
- **The collapse waits** while a bus is pulling in or stopped, since it might be your way out.
- **Not built yet:** the pet's half of P04 (any bus is safe with your real pet aboard). It needs
  the pet in the forest.
- **Invented:** the crew's look (red, orange, green, blue or navy shirts, caps), the timetable's
  other stops and times (Millbrook Depot, Old Mill Road).

### Keys, leads and the site map (built: IMPLEMENTATION.md M2)

**Story progress in the save:**
- `save.story` (`StoryProgress` in `shared/story.ts`) holds:
  - the keys on your hook
  - puzzles solved, scripted events that have happened
  - memory scenes seen and waiting
  - the places you've reached
  - your unresolved leads
- Every list is checked on the server against its ids, each id once.
- A key can't be on your hook and in your pocket at the same time.
- Older saves have no `story` and still load. Tests are in `api/_lib/retirement.test.ts`.
- Puzzles, events and memory scenes are stored but nothing sets them yet (M3 onwards).

**Keys** (`ITEM_IDS`; their names in `story/items.ts`):
- **Where a key can be:** in exactly one place: your pocket (`save.pocket`, shared with the
  photo, 3 slots), the key hook in your room, or back where it was found.
- **The administration key** (`ITEM_ADMIN_KEY`, P01) is in the foreman's cabin's desk drawer
  (since M3). The look and thought are PUZZLES.md's own lines.
- **Picking it up:** it goes in your pocket and shows there, but it's only "carried" this trip.
  If your pocket is full you can't take it.
- **Home safe** (walking back, or a real escort): the key is yours, and stays in your pocket.
- **Caught or collapsed:** every key in your pocket is lost, including ones you brought from home,
  and it waits back where it was found. A line after waking: "Your pocket is lighter. The key is
  gone." Keys on your hook are always safe.
  - Judgement call: losing keys on a collapse as well as when caught, since PUZZLES.md treats any
    failed outing alike. The photo, as before, is only lost when caught.
- **The key hook** (`KEY_HOOK` in `shared/catalog.ts`) is on the back wall left of the closet
  door, part of the room like the closet, so nothing can hang over it.
  - Carrying keys, E hangs them all on it. With none in your pocket, E takes them down, as many
    as your pocket holds.
  - The keys show on the hook only in your own room: visitors see an empty hook, since your story
    is yours alone.

**Unresolved leads** (`LEADS` in `shared/story.ts`):
- Looking at a lock you can't open notes it in the notepad under "Unresolved". It's kept if you
  get home, or straight away for the closet in your own room.
- A lead disappears once its puzzle is solved.
- The leads so far: the office door (P01), the service gate's padlock (P05), Bell's locker, the
  locker rule and Bell's employee number (P02), the jammed shutter (P03), your closet (P06).
  There's also one for the first-aid shelter's blocked door (P08), waiting for that place.
- The lead ids and their wording are the game's own; PUZZLES.md names only the puzzles.

**The rough site map** (`story/sitemap.ts`; "Map" in the notepad, and on the corkboard at home):
- A pencil sketch on a notepad page, always at the same scale.
- It shows only the roads, paths and creek within 24 tiles of the places you've reached (kept
  ones and this trip's), the camp's fence as little crosses, each place's name, and a red padlock
  with a question mark beside each lead's lock.
- It never shows a place you haven't been. "home" is marked at the bottom.
- The places are listed in its text label for screen readers.

### The camp, part 1: insides, P01 and P05 (built: IMPLEMENTATION.md M3, first half)

**Insides** (`INTERIORS` and `DOORS` in `story/map.ts`):
- Each building you can go into has its inside as a small walled room in the same forest, off in
  a corner east of everything (x 130 onwards) where nobody can walk.
  - Facing the building's door says "Go in" and puts you inside; facing the inside's front wall
    says "Go out".
  - Being part of the forest, your trip, light, sounds and notepad carry on indoors.
  - Leaving the forest map would have ended the trip, which is why the insides aren't separate
    maps.
- The room's walls (two tiles of back wall, one at the sides and front) are solid and block the
  off-path distance, so it never leaks in or out.
- Round them is a margin of nothing, reaching past the edge of the screen, so nothing outside ever
  shows through the dark. `layout.test.ts` checks the insides are sealed and that you're never
  lost in them.
- **The way out is drawn** (play-testing: it was hard to find, just more wall): a pale plank door
  with a brass latch in the front wall, and a worn red doormat on the floor in front of it.
- Indoors it's as dark as at the building's door.
- Nobody comes to find you indoors and nothing comes for you: encounters and threats wait till
  you're out. Judgement call, so the insides are a place to read in peace; change freely.
- **The foreman's cabin:**
  - the desk drawer with the administration key
  - the field envelope on the desk (Evie's birthday card, and under it her photograph: part 2)
  - a window, a cold stove, paperwork gone to pulp
- **The administrative office:**
  - the noticeboard with the shift register
  - a boarded window, two filing cabinets (Evie's files are M4), a desk with one clean square in
    its dust, a chair
- All the furniture and its descriptions are invented.

**P01, the office door:**
- With the key in your pocket the door says "Unlock the door"; the key turns ("The key turns.")
  and you're in.
- It stays unlocked for the rest of the trip, and for good once you're home safe
  (`save.story.puzzles`). If you're caught or collapse, it's locked again, and the key's back in
  the drawer.
- Without the key it rattles, says PUZZLES.md's locked line, and notes the lead.
- You keep the key afterwards, though it's no longer needed (PUZZLES.md: no need to carry it
  forever).

**The shift register** (`story/docs.ts`, a puzzle document, not a story clue):
- Reading it shows the paper and notes "NIGHT CREW, allocation 2714" in your notepad (the
  `night_crew_code` lead), so the code is never left to memory.
- DAY CREW (1840) and SWING (0933) are there too, each under its own label: the padlock's NIGHT
  CREW plate is what picks the line, as PUZZLES.md asks.
- The names (D. Okafor, M. Lindqvist, J. Reed for Jonah Reed) and the other numbers are invented.

**P05, the service gate:**
- The padlock opens a panel of four dials you set yourself: ▲ ▼, or click a dial and type a digit
  (arrow keys work too).
- The code isn't tied to the time of day: NIGHT CREW names whose lock it is (the register: crew
  gates are set to the crew's allocation), so it opens at any hour. (Asked in play-testing; a
  night-only gate was offered and left out.)
- "Pull the shackle" tries it (the same dials as Bell's locker, P02: `COMBOS` in `story/map.ts`). A wrong code rattles ("It doesn't open."). 2714 springs it open,
  and the gate is drawn swung back against its post with the chain hanging loose.
- Its tiles stop being solid, so you can walk through onto the deep road (`Forest.open`).
- Kept like P01: open for the rest of the trip, and for good once you're home safe. Every later
  trip starts with it open.
- Leads whose lock is open are dropped from your notepad.

### The camp, part 2: the bunkhouse, the shed, P02 and P03 (built: IMPLEMENTATION.md M3, second half)

**Insides:** two more rooms east of the first two (x 170 and 190), with the same walls, margin,
drawn door and doormat.
- **The bunkhouse** (outside door on the bunkhouse's front, where "Try the door" was):
  - four iron bunks (one with J.R. scratched into it), a cold stove with a pan on it, a window
  - the rules in a frame on the wall (`bunkhouse_rules`, a puzzle document: notes the
    `locker_rule` lead; the locker line is PUZZLES.md's own)
  - four tin lockers: three ordinary, and Bell's, D. BELL on tape, with a four-digit dial lock
  - Jonah's journal behind a bunk (`jonah_journal`)
- **The maintenance shed** (a side door is now drawn on the shed, under the stencil, right of the
  shutter; inside, the front wall matches: the shutter's bay on the left, the door on the right):
  - the bench where the fire started, with the clipboard holding Bell's report
    (`bell_fire_record`), and what the fire left (two burnt saws and a split fuel can)
  - a smoke-browned window
  - against the front wall, the storage bay behind the roller shutter (the same shutter you see
    jammed from outside: play-testing caught the inside and outside not matching), the winch
    beside it, and the diagram on a post (`pulley_diagram`)
- All the furniture and its descriptions are invented.

**The clues** (`story/clues.ts`; wording invented around STORY.md's facts):
- `jonah_journal`: ordinary entries (March), the shed fire (9 May 1978: Danny got them all out and
  signed for it), Bell missing (2 June) and back (5 June), then the contradictions (no sugar; "there
  said what fire; sleeping with his eyes open; the office said leave it). No thought (play-testing:
  STORY.md's "He came home. But was it him?" and a follow-up memory echo were too on the nose).
- `bell_fire_record`: an incident report for that fire, signed Daniel Bell, employee no. 0416.
  Opening it notes the `bell_number` lead (a clue's `lead`), so the number is never left to memory.
  The thought is just "He got them all out." (PUZZLES.md's "How could he have forgotten the
  fire?" was dropped as too on the nose: the journal and the report are left for the player to
  compare).
- `evie_photo_before`: in the cabin's envelope under the card (a spot's `also`: the envelope shows
  the card first, then, once that's yours, the photo). Evie on a porch step in a blue raincoat; the
  scar through her right eyebrow is in the description, plainly, among everything else. (An
  underlined "THE SCAR" note on the back was dropped as too on the nose.)

**P02, Bell's locker:**
- The same four dials as the service gate (`COMBOS`), with "Lift the latch". 0416 opens it (kept as
  a string, so the zero stays); a wrong code rattles.
- Open, the locker is drawn swung back on a shirt, and looking in reads `bell_locker`: the two hand
  photographs (a scar across the knuckles in March, none in July) and an unsigned note listing
  small wrong habits, with no conclusion drawn. Wording invented.
- Kept like P05: open for the rest of the trip, for good once you're home safe.

**P03, the shutter:**
- The winch opens a panel with three things to work: release the catch, turn the spool, set the
  ratchet. A little shutter in the panel rises a third with each right step.
- Out of order it rattles and drops back to the start, with a line saying what happened (turning
  the spool against the catch, or setting the ratchet with nothing to hold). No harm and no limit.
- The right order rolls the shutter up for good: the bay is drawn open inside and the shed's
  shutter is drawn up outside (`Forest.open('bay')` and `'shed'`), and looking at it from outside
  says so (a spot's `shut`). Opening a prop only lets you walk through it if it's a barrier, so the
  locker, the bay and the shed stay solid.
- Behind it, the shelf: `camp_photos`, a document (the day crew, the flagpole going up in 1952, and
  Danny outside the bunkhouse waving while the same man stands at its window).
- **Judgement call:** PUZZLES.md also puts a lantern refill on the shelf. There's no lantern fuel
  (your light never runs out) and stamina refills on its own, so there's nothing for it to refill
  yet. It waits for the energy gauge (M3b), where it would be a flask or something to eat.

**Small changes alongside:**
- Re-reading a clue already on your board says "It's on your board at home." (it said "You already
  remember this", the wrong idea for someone who doesn't).
- STORY.md now has "Memory: how the dementia shows", and PUZZLES.md's Nora scenes use it: the
  People page and notes about Nora are planned (M4), not built.

### Evie's papers (built: IMPLEMENTATION.md M4, part 1)

M4 is being built in parts: this first part is the office's Evie evidence (the memory scenes
that came with it have been taken out again: see below). Nora's meetings and the People page (part 2), and the deep road with the
watchman's shelter, your double and the ravine (part 3), are **not built**.

**Evie's papers in the office** (`story/clues.ts`; all wording invented around STORY.md's facts):
- **Evie's case box** on the floor (a file box, SHERIFF on the end): `evie_case_1978` (her 1978
  file: three people back from the woods, Bell among them, one whose chin scar was gone; the
  other two names are invented), then `evie_last_lead` (Jonah's letter of 2 Sept 1987 and the
  survey sketch with STORES BELOW under the first-aid shelter).
- **Your archive**, an old suitcase open on the floor (MAP.md: the post-1987 cache):
  - `evie_missing` (the poster: 14 Sept 1987, blue raincoat, the scar), then `search_roster` (the
    volunteers' sign-in, with your own name on it four days running)
  - `neighbor_statement` (a neighbour, Margaret Hale, saw her at your door on the 20th), then
    `returned_evie_photo` (an instant photo dated Sept 21; her eyebrows described as smooth
    and even, never pointed out)
- **The desk drawer:** `returned_evie_journal` (your diary, 20–23 Sept: she doesn't eat, asks to
  walk at Hollow Pines, then she's gone, her raincoat on your hook and a door that was never there),
  then `player_missing` (the clipping: found after eleven days).
- **Reveal gates** (judgement call; STORY.md puts the returned Evie in Act III): the three
  returned-Evie papers can only turn up once `evie_missing` is on your board, and the clipping once
  `search_roster` is. Until then the spot just describes the folders or the damp diary, with a line
  about it meaning nothing to you yet. Act II's four need nothing.
- Each spot holds two papers (`also`); a spot with neither readable yet shows its own `look`
  (`StoryPlan.clueToShow`).
- **Your name:** papers that name you write `{name}`, replaced with your character's name.

**The memory scenes: not built.** A first version of `CS_GARDEN`, `CS_SEARCH` and
`CS_HOMECOMING` (still shots on a small canvas, queued on a safe return, a Memories button on the
board) was built and then taken out in play-testing, to come back later. Nothing plays them now;
STORY.md's table is still the plan. `save.story.queued` and `seen` stay in the save's schema (old
saves that have them still load), and nothing sets them. Evie's portrait can still carry the scar
(`PortraitOptions.scar`), and Nora's the mole (`mole`).

### Nora's real meetings (built: IMPLEMENTATION.md M4, part 2)

`story/nora.ts` has her look, her lines and the little state machine; `src/game.ts` (`updateNora`,
`noraTalks`) runs the scenes. Her copy at the shelter door, your double and her body at the
ravine are part 3, **not built** (the places themselves are: "The deep road" below).

- **Nora** has a fixed look: long dark hair, a green jacket, a scarf, a lantern (a warm glow that
  moves with her). Her dialogue portrait has the mole on her left cheek (`PortraitOptions.mole`),
  and her People note says so in words. She casts a shadow and is drawn like any real person.
- **Scripted events are kept the moment they happen** (`save.story.events`), even if you don't get
  home (PUZZLES.md: NPC flags persist apart from unbanked notes). While she's on screen, encounters
  and threats don't start.
- **E_NORA_SIGHTING** (optional): once a trip you might see her, a way past the fork on either
  path (about 13 tiles along it: `SIGHTINGS` in story/nora.ts; play-testing: on the footpath in
  she was there the moment you arrived), before you've met her, half the time
  (`NORA_SIGHT_CHANCE`): a figure with a lantern about seven tiles further on stops, looks at you,
  and runs on ahead and off into the trees, fading. West, towards Route 9; east, up the creek
  trail towards her camp. No thought (play-testing: "Someone was there." said the obvious). Only
  before she's first startled in the courtyard.
- **She warms up slowly** (play-testing: going from "stay back" to an apology and her name in
  one conversation was too quick and too on the nose). One beat per trip, each kept the moment it
  happens:
  - **E_NORA_STARTLED** (new id): in the courtyard, once you've looked at anything there or been
    there `NORA_MEET_AFTER` (10) seconds. She's at one of a few fixed spots six to twelve tiles off.
    Within about six tiles she's frightened and hostile ("Stay back! I'm warning you!") and runs
    off east. The dialogue calls her "The woman"; she doesn't give her name.
  - **E_NORA_AGAIN** (new id): a later trip, in the courtyard or at her camp by the creek: "You
    again. Stop following me. I mean it." She leaves quickly, not quite running.
  - **E_NORA_MEET_1**: the trip after, courtyard or camp. She's too tired to keep running, sees
    your Sunset Acres badge and takes you for someone from the home who keeps wandering up here,
    asks if they know you're out, and gives her name: Nora Vale, up here for the camp's history.
    She walks off. A moment later the protagonist repeats her name to themselves ("Nora Vale...
    Nora Vale... Nora Vale...") and her note goes in your notepad.
  - Saves that already had E_NORA_MEET_1 skip the first two.
- **E_NORA_MEET_2** (guaranteed): on a later trip (never the same one), in the courtyard, once
  `evie_case_1978` is on your board. An ordinary moment (play-testing: an excited greeting, a
  research briefing and "don't follow me" was unrealistic): she's sitting at the courtyard's east
  table with her kettle and doesn't come to you. Close enough, she says "Oh. Hello again." Then,
  STORY.md "Memory":
  - **Her note on your board:** the thought is just "Nora.", and she says "Still wandering up
    here, then?"
  - **Not on your board** (never banked, or lost when you were caught): "Have we met?", and she
    tells you again, kindly ("It's Nora. We met up here, the other week. ...It's all right."). You
    write her down again afterwards.
  - Then tea, and in passing what she's reading (someone from the sheriff's, a woman, Mercer,
    asking questions here in 1978; nobody will talk about it), and as small talk her plan to go up
    the deep road tomorrow to see the old first-aid shelter before the snow. Last: "If you see a
    lantern up that way, that's only me." (set up for her copy, which carries one too).
  - She stays at the table when you go, and is gone once you're about 13 tiles away. Her camp by
    the creek is packed up from then on.
  - **Judgement call:** how she gets past the locked gate isn't said.
- **Her People note** (`note_nora`, a clue id with `person: true`): your own words about her,
  ending with the mole on her left cheek, written plainly. It's in the notepad's new
  **People** section (this trip's, and anyone already on your board), banked like any clue, and
  pinned on the board. It's what part 3's door scene will let you check her face against.
- **Her camp by the creek** (MAP.md 06): after the first meeting, its descriptions recognize her
  things ("Nora's kettle..."). From the second meeting on she has packed up: the fire is cold, and
  the kettle and bedroll are gone (drawn as a soot ring and flattened grass; the spots say so).
  Nothing changes while you could be watching: it happens while you're in the courtyard.
- All her lines and the note's wording are invented around PUZZLES.md's beats.
- **Her face follows the scene** (play-testing: she smiled while telling you to stay back).
  Portraits now have moods besides the default smile (`Mood` in src/portraits.ts): `neutral` (a
  straight mouth, no blush), `angry` (brows drawn down to the middle, eyes narrowed, the mouth
  pulled down, teeth as she speaks), `scared` (brows up, eyes wide, mouth open) and the older
  `hurt`. Dialogue takes a mood per line (`DialogueOptions.moods`). Nora: scared when startled,
  angry the second time, neutral (tired, guarded) through the first meeting, neutral greeting at
  the second, then a small smile over the tea and the lantern line, plain for the rest (the
  `*_MOODS` arrays in story/nora.ts). Everyone else is unchanged for now.

**Quieter thoughts and papers** (play-testing: "He came home. But was it him?" and other lines were
far too on the nose). The rule is now in STORY.md "The inner voice": a thought reacts, it never
concludes. Most papers now have no thought; the rest say something small and personal ("Her
handwriting before. Somewhere." (not "I'd know it anywhere": they wouldn't), "Margaret. From across the road.", "That's my kitchen."). The papers
no longer underline the answer (the capitals pointing at the scar and the eyebrow are gone, Bell's
locker note draws no conclusion, Nora doesn't warn that people aren't who they look like). Scars
and the mole are still described in words wherever they show. The clue
mechanisms for a delayed second thought (`then`) and a thought that depends on another clue
(`voiceIf`) are gone with the lines that used them.

**Pictures never show you** (STORY.md, after the story rules): your character is whatever you
made, so the photos, posters and drawings still to be drawn (the nine `art` lines in
story/clues.ts and story/docs.ts) show other people, places and things, never the protagonist.
None of them does today. The removed memory scenes did draw you, with your current look.

**Illustrated photos** (the second exception to drawing everything in code; retirement/CLAUDE.md):
an `art` line on a paper can name a picture in retirement/photos (`img`), shown as the print
itself, with the line's text as its alt text. So far only `evie_photo_before`
(`photos/evie_photo_before.webp`: Evie on a porch step in the blue raincoat; the scar was painted
in more clearly and the colours warmed, see docs/art-reference/edit_evie_photo.py). The other
seven `art` lines are still text. A paper can also be a picture of itself (`Paper.img`): the
missing poster (`photos/evie_missing.webp`) is shown whole, with no paper behind it, and its lines
are the same words, kept for screen readers only (so they have to match the image). Writing it
changed the poster's details to match the image: "MISSING PERSON", age 46, 5′6″, auburn hair,
green eyes, the scar as an identifying mark, last seen Monday 14 September 1987 near the old Hollow
Pines camp road, the blue raincoat, and the County Sheriff's Department. The returned-Evie photo should be made from the same picture
(same face and hair, smooth brows) so the two compare cleanly.

**Memory** (STORY.md "Memory: how the dementia shows", revised after play-testing: the protagonist
seemed too sharp, and forgot Evie while remembering a neighbour). The old past is sure, the recent
present isn't. Built: Evie's margin note is known at once ("Evie’s writing. She always pressed so
hard."); setting out can think "What did I come out here for?" (one of the `enter` lines); reaching
a landmark you reached on an earlier trip (`save.story.sites`) can think "I've been here before.
Haven't I?" (`arrive`, 30%, once a trip, under the once-a-minute limit); waking in the infirmary
always thinks "Where...?" or "This isn't my room." before Nurse Ada speaks (`wake`; the inner voice
is heard in the infirmary now, src/ui.ts `voiceHere`); and a grandchild, niece or nephew reaching you
can give you pause, 35% of the time (`FACE_DOUBT_CHANCE`; spouses, children and siblings are always
known): "I know that face. Don't I?" or "So grown up. When did that happen?", real or fake alike.
Not built: re-reading something already on the board.

**Handwriting** (each writer has their own hand, so you can tell who wrote what, and your own
writing in the woods looks like your notepad): a `hand` line is in the paper's `hand` or its own
`by` (story/clues.ts `Hand`), drawn in that writer's font from retirement/fonts/hands (src/style.css
`.hand.by-<writer>`; licences in fonts/hands/LICENSES.txt, several free for non-commercial use
only). You (Brother Signature): `bus_warning`, `lost_journal`, `returned_evie_journal`,
`note_nora`, and what you type on the notepad and the corkboard's cards. Evie (Notera): the
birthday card and the margin note on her 1978 file. Jonah (Unrulyness): his journal and his letter.
Bell (John Bulgarry): his signature on the fire record ("Reported by:" is now printed above it).
Sgt. P. (Thedoctorisin): the note on the search roster. M. Hale (Lunafreya): the statement's
signature. The note in Bell's locker is unsigned and stays in the anonymous hand. Jonah's, Bell's,
the sergeant's and Hale's fonts have no curly quotes, so their lines are shown with straight ones
(src/ui.ts `handText`). Named hands drop the note paper's bold and double underline. The pen
fonts are thin, so each is drawn larger (`size-adjust`) and thickened with a hairline stroke
(`-webkit-text-stroke`), also on the notepad and the corkboard's cards.

**Pacing changes** (play-testing: things came too early):
- **Nora's sighting** is a way past the fork now, with no thought (above).
- **The bus stop is later:** it's moved up Route 9, past the foreman's cabin, on a new straight
  stretch of road before the camp gate (MAP.md 04; the bus needs a straight run of road). The bus
  is still a choice, just not the first thing you find. Its lost copy only turns up once you've
  found the real stop.
- **The warning comes first:** `bus_warning` ("DO NOT RIDE THE BUS ALONE.") is nailed to the
  trail marker at the trailhead, long before there's a bus to make sense of it. MAP.md's
  `own_warning` (not built) was planned for that marker; it will need another place.
- **The camp gate's sign** no longer thinks "This is where the bus went." (you may not have seen
  the bus stop by then; it also said too much).
- **No copies before the padlock** (Real or fake, above).
- **Evie's 1978 file** lost its summing-up line ("Each came back unhurt... not quite right"); a
  margin note about a phone call is there instead (invented). The three rows are unchanged.

### The deep road (built: IMPLEMENTATION.md M4, part 3, first step)

The places past the service gate, as places you can walk to and examine. **None of part 3's events
is built yet**: Nora's death, her copy at the shelter door (`E_NORA_DOOR`), your double at the
fork (`E_PLAYER_DOUBLE`) and her body and notebook at the ravine all come next. Everything is in
`story/map.ts` (data), `story/layout.ts` (sizes), `story/art.ts` (sprites); `layout.test.ts` walks it.

- **The road** runs north from the service gate to the **stream cut** (a second stream, west to
  east right across the map). Its bridge is gone: the road stops at the water, with a BRIDGE OUT
  board. The only crossing is a **footbridge** a few tiles east, and the path to it passes the
  watchman's shelter's door (MAP.md 13). North of the water the road goes on to the fork. (Tested:
  the only planks over the stream are the footbridge's.)
- **The watchman's shelter** (`WATCH_SHELTER`): a small plank hut with a stovepipe, its window on
  the footbridge side, a board by the door. Inside (`IN_WATCH_SHELTER`): his chair turned to the
  window over the bridge, the watch log on the desk (the last page 1979), a stove wired shut, a
  cupboard with a spare bolt for the door. The inside has one door for now; MAP.md's **rear exit**
  is built with `E_NORA_DOOR`, which needs it.
- **The logging fork** (`LOGGING_FORK`): a three-armed signpost (RAVINE west, SURVEY north, the east
  arm snapped off). West, the old logging road to the ravine. North (the survey trail, MAP.md 16)
  and east (towards the first-aid shelter, MAP.md 17) end in **fallen trees** for now, since those
  places are M5; past a deadfall is just forest, and you get lost.
- **The ravine** (`RAVINE_CULVERT`): a ledge at the end of the logging road, then the edge, a drop,
  the drain at the bottom (water) and the far wall, drawn as rock tiles (`drop`, three kinds) that are
  solid and a barrier like a fence (nothing is measured across). The sluice's rusted wheel stands on
  the ledge; across the ravine, low in the far wall, the drainage opening (`culvert`), half buried,
  is examined from the edge above it (you can't reach the far side). P08 and the way in through the
  culvert are much later.
- None of the new places has an arrival thought. The descriptions are invented.

### The thing, unease and energy (built: IMPLEMENTATION.md M3b)

`src/forest/thing.ts` is the thing; `src/game.ts` (`wakeThing`, `updateThing`, `drawThing`,
`dread`, `eatMeal`, `pocketMeal`) wires it in. Every number is in `tuning.ts` (`THING_*`,
`UNEASE_*`, `ENERGY_*`, `MEAL_ENERGY`).

- **When it hunts:** from the start of a trip once P05 is kept; from the moment you open the gate
  if you do it this trip; and whenever you get lost (35 tiles off) or the empty bus lets you off
  (22 tiles off), before the gate too. It starts at the logging fork (or at least 70 tiles off),
  always out of sight, fresh each trip.
- **Where it can go:** on the map, never south of row -76 (just north of the creek): the trailhead,
  the fork, Route 9's south end and Nora's camp are beyond it. Lost, anywhere.
- **How it comes:** drifting towards you at 1 tile/s, 0.25 faster each minute out (at most 2.4),
  swaying from side to side so it's never straight at you. Out of sight it goes through the woods
  freely (water too); in sight it goes round trees, sliding along them. Sitting down to wait, it
  closes in three times as fast (like everything else).
- **Heard before seen:** heavy, uneven steps (the leaves pitched right down, a long stride then a
  short one), carrying 26 tiles, quieter with distance and panned. It's drawn in your light; past
  it, you only see it once it's coming for you, a pale shape in the dark. Its sprite faces you,
  walks away, or is ride.ts's side view.
- **Coming for you:** within 8 tiles (and you're not inside), the rise (`forest-rise`) and it comes
  at 4.3 tiles/s: faster than you walk (3.3), slower than you hurry (5.2). Get 12 tiles off for
  2.5 s, or last 25 s, and it loses you (`forest-moan`), goes off for 40 s and comes back from 55
  tiles away. Within 0.8 it has you: the usual grab, jumpscare and infirmary, with "It had been
  coming the whole time." The heartbeat, the red edge, the gutter of your light and the hush of
  the wind follow the closer of it and a chasing fake (`dread()`).
- **Indoors is a refuge:** it never comes through a door. It comes to the door you went in by and
  waits 5 tiles off for 35 s (your unease stays up), then drifts off. Come out while it waits and
  it comes for you, with that start on it. Your earlier self noticed: `lost_journal` has a new Day
  7 entry ("It stood at the door till it got light. It didn't come in.").
- **Nobody else on top of it:** while it's coming for you or close (unease from it over 0.55), no
  rescuers or fakes turn up, no other threats, no uncanny moments. Once it hunts, the trip's real
  danger budget for the other threats is 0 (getting lost still adds some), so the footsteps behind
  you and the face in the dark are mostly cues. It waits while someone is talking to you or you're
  reading something.
- **Unease** (gauge beside stamina): the closest of it (1 at 2 tiles, 0 at 32), a fake changing or
  chasing, and a real threat starting (0.45). Quick to rise, slow to settle. It never says which way.
- **Energy** (gauge beside stamina): a full bar lasts about 12 minutes on the map; 2.5× faster lost
  (about 5 minutes), 1.5× hurrying, 1.5× with unease over 0.6, 0.6× indoors; sitting down to wait
  gives a little back. Below 20%, once a trip: "I'm so tired." Empty: you collapse (not while
  someone's talking to you or a bus is pulling in). This replaces the old hidden 5-minute timer.
- **Meals** in your pocket (`meal:<recipe>` in `save.pocket`, validated in shared/schema.ts; old
  saves load unchanged): see "Meals".
- **Not built:** the shed shelf's lantern refill, your light trembling when very uneasy, and tells
  harder to notice when afraid.

