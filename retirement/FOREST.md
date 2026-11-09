# The Forest: design decisions

Status: **forest survival, family/photo and encounter systems built (stages 1–3)**; the fixed
road network, authored story, examination, inventory puzzle gates, memory board, cutscenes,
Nora, locked room and false Sunset Acres are **planned**. The Build status section at the end
preserves an implementation snapshot, including behavior the planned map system must change.

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
  longer available, and the client transitions to the **procedural lost forest**. The earlier
  implementation uses a straight-line ~40-tile point of no return; replace that with
  corridor-based disorientation when implementing the fixed map. Do not leave both loss rules
  active.
- **Once lost, you need a genuine rescuer**: real family member, Nurse Ada, or the real pet.
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

**Route 9 rule:** “DO NOT RIDE THE BUS ALONE.” With the **real pet physically aboard**, the
bus reaches a **public stop at CAMP_GATE**, not behind any story lock. Alone, it deposits the
player in lost forest with a fair, escapable threat. Never use the bus as a way home, nor a
mandatory shortcut requiring a random pet spawn. Keep the existing pet's treeline refusal
until planned intermittent companionship is implemented.

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

**Only stages 1–3 below are in the implementation snapshot.** These future milestones are
specified by STORY.md, MAP.md and PUZZLES.md and must not be described as shipped:

1. **Built — base forest:** outskirts, darkness, procedural woods, isolation, straight-line
   point of no return, collapse/infirmary, treeline warning. The **planned fixed road network
   and corridor-based lost rule are not yet built**.
2. **Built — family/photo:** family editor, reference photo, Nurse Ada reprints. Preserve the
   rule that death takes the photo **only when carried**; remove free reprint when enforcing
   the intended paid replacement (40 coins starting price).
3. **Built — rescue encounters:** genuine/fake family and nurse, tells, photo comparison,
   transformation/chase/caught. Keep fair cues; reuse these systems for the final false Evie.
4. **Next — map backbone:** authored fixed roads, forks, fences, buildings, entrance interiors,
   corridor-based lost state, path backtracking and route persistence (MAP.md).
5. **Next — examination and board:** object registry, notepad, physical keys/storage, bank-on-safe-
   return, annotations, clue ID persistence, unresolved leads, save validation (PUZZLES.md).
6. **Next — camp puzzles and evidence:** P01/P02/P03/P05 and the Hollow Pines work records,
   Evie files, reliable return-to-site mapping, and first memory vignettes.
7. **Next — Nora and deep forest:** real meetings, watch shelter fake knock, own-double sighting,
   ravine body, fixed survey lookout, recoverable room key.
8. **Next — room and final shelter:** P06/P07/P08/P09, private false-home scene, final Evie
   evidence, escapable false-Evie encounter, cutscene queue and ending.
9. **Optional/later — pet and rule bus:** intermittent pet companionship/rescue (always safe),
   then P04; extra avoidance threats, found lights, forest ingredients and food effects.

Build in slices with testable save migration paths; do not add all lore before navigation
and retry behavior work.

## Technical notes

- **The outskirts** remain part of the shared grounds. Color/music fade and pet warning
  continue before the path enters private forest. Existing engine locations (`src/game.ts`,
  `src/maps.ts`, `src/music.ts`) are the integration points for the transition.
- **Forest architecture target:** fixed tile-level centerlines, authored site polygons and
  interior maps layered into the client forest. The per-expedition seed generates only
  surrounding trees/understory/ambient events. Off-corridor travel can trigger a *separate*
  fully procedural lost state. Replace the currently built straight-line point of no return;
  do not keep it active along fixed roads.
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
is already implemented. **In particular, the straight-line point of no return and per-visit
randomized forest map are current code behaviors that must be replaced when building MAP.md.**
Any planned behavior described elsewhere must be implemented explicitly.

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
