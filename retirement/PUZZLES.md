# Hollow Pines — puzzles, interactions and progression

**Status:** Planned systems and authored content; none of the listed story puzzles, cutscenes or board gates should be assumed implemented. Use [STORY.md](STORY.md) for the narrative truth, [MAP.md](MAP.md) for canonical physical locations/roads, and [FOREST.md](FOREST.md) for existing survival, photo and encounter code.

## Design contract

- The playable loop is **explore a fixed road network → examine real objects → acquire evidence/usable items → solve small challenges → survive the return → bank evidence on the corkboard → unlock the next inference or memory**.
- Obstacles provide a reason to revisit a **known** building. They must not require random wandering to rediscover it. No critical item or solution exists only in procedural forest.
- The player can discover locks **before** finding the corresponding key/solution. Text should record an unresolved lead without making them memorize everything outside the game.
- Keys and tools are **physical inventory**, separate from informational evidence. If the player stores or pins a physical key in their room, they must **take it with them** to use it at a remote lock. They do **not** need to carry a permanently unlocked door's key forever.
- No weapons/combat. Danger is avoidance, pursuit, resource use, and deciding whether to trust a rescuer.
- At most one or two substantial puzzle steps in an ordinary expedition; brief examination and observation remain the default.
- No irreversible softlocks from getting caught. A failed outing loses unbanked clue notes and unsecured finds. A unique plot item is recoverable from its **original fixed spawn** or owner storage depending on what was already banked. The family photo is lost **only if carried on the failed outing**.
- Make puzzles readable: legible close-ups for scar/mole/face differences; text equivalent for clues; input support for keyboard, controller where feasible, and reduced-motion scene alternatives.

## Core mechanics and state model

### Object examination

Every object has `siteId`, `objectId`, descriptive text, optional `clueId`, optional `itemId`, inspectable states, and optional inner-voice comments. The game should display what the player sees **before** offering an interpretation. Examples:

- A worn wooden sign: `Examine` → objective description. If personal annotation is unlocked: *“That's my handwriting.”*
- A desk with a key: `Examine desk` → `Take key` (item physically moves into trip inventory).
- A locked door: `Examine` → specific lock description; if player has a suitable key/item, show `Use [item]`.
- A document with multiple pages: open with next/previous controls. Reading it once unlocks its clue note, but the original remains re-examinable.

### Evidence / usable items / board

| State | What the player can do | Failure behavior |
| --- | --- | --- |
| `unseen` | Find an anchored source at its fixed site | Still there next visit |
| `examined_unbanked` | Read or collect a note during current expedition | Note lost; source remains |
| `item_carried_unbanked` | Use a newly found physical key/tool this outing | Item lost; respawns at source |
| `item_home_stored` | Move a previously banked item from room storage/board to pocket | If carried and lost, allow recovery at source; do not delete its existence as earned story progress |
| `clue_banked` | Pin, rearrange, annotate and connect evidence at home | Never lost by a later forest failure |
| `puzzle_solved_committed` | Use a permanently opened door/route without re-solving | Persists for that player |
| `event_seen` | View an authored one-time scene | May persist as a world/character fact even if associated **clue notes** were not yet banked |

**Safe return must be atomic:** commit collected evidence, secured items, opened gates and eligible cutscene triggers before switching into the home scene. If the player is caught before that boundary, discard temporary evidence/items/gate-openings. Preserve previously committed states. One-time NPC events may remain as history for continuity (Nora cannot reappear alive after her offscreen death), but provide a fixed re-examinable evidence source for anything the player still needs to learn.

**Physical-item presentation:** Items such as `ITEM_ADMIN_KEY` and `ITEM_CLOSET_KEY` can be displayed beside related notes on the board, but the **actual item must be either in room storage or in the player's pocket**; do not keep two usable copies. Selecting `Take` removes it from room storage before the next forest visit. Evidence note remains on board as a record that the player found it.

### Forest navigation and return

- Fixed paths and landmarks do not regenerate between expeditions. Trees/off-road areas do. Losing the route is **not** a function of distance along a road; leaving its authored navigation corridor is the risk. A player can walk home from any fixed connected path if they never become lost.
- Once lost, replace the authored map with procedural lost forest. Real Nurse Ada, real family, and the real pet can rescue. Wrong-looking copies may offer the same help.
- A real pet reunion, when eligible, is **always** safe. Starting tune is about **1 in 8 rescue opportunities**, not a roll per second. Pet companionship is intermittent and cannot provide a guaranteed fake detector.
- The family photo is optional equipment. If left on the room wall it is safe; when carried into a failed trip it is lost. Nurse Ada provides an affordable **paid** replacement (existing 40 coins is a reasonable starting point). Money is readily earned by selling community-garden produce to Chef Rosa; don't invent a second grind.
- Dying/caught is shown as a jumpscare/blackout and awakening in the infirmary. In-world the player is recovered unconscious; Nora's death is a genuinely fatal event. The player's pre-existing banked notes and the real community are never lost.

### Evidence board and memories

- A corkboard in `SA_ROOM` has flexible note placement, player annotations, connecting strings and unresolved-lead markers. **Arbitrary freeform string placement is not required for main-story progression** except the explicit `P09` chronology widget.
- Crucial clue/cutscene triggers use **banked** clue IDs, not mere inspection. When a safe return satisfies a cutscene prerequisite from [STORY.md](STORY.md), queue that memory for the return transition/next board interaction. One scene plays at a time. The player can skip or replay it later.
- For document-based puzzles, the board retains a short summary, a source site, and any literal code or name the player found. Do not force memorizing one-off numbers without an in-game record.
- General storyline order can be flexible; the code must not require clues in one precise order unless a physically locked route makes that order inevitable.

## Puzzle overview

| ID | Name | Solve location | Solution source | Main-story required? |
| --- | --- | --- | --- | --- |
| `P01` | Administration office key | `ADMIN_OFFICE` | `ITEM_ADMIN_KEY` at `FOREMAN_CABIN` | **Yes** |
| `P02` | Daniel Bell's locker | `BUNKHOUSE` | Fire record/employee number at `MAINTENANCE` | Optional |
| `P03` | Jammed storage shutter | `MAINTENANCE` | Local pulley/safety mechanism | Optional |
| `P04` | Route 9 bus rule | `BUS_STOP` (or its copy while lost) | Warning and timetable at the same stop; or the real pet aboard | Optional |
| `P05` | Night-crew service gate | `SERVICE_GATE` | Code registry at `ADMIN_OFFICE` | **Yes** |
| `P06` | Sunset Acres closet | `SA_ROOM` | `ITEM_CLOSET_KEY` at `SURVEY_LOOKOUT` | **Yes** |
| `P07` | Escape false Sunset Acres | `FALSE_SUNSET` | Compare fixed personal anchor details | **Yes** |
| `P08` | Ravine sluice / final access | `RAVINE_CULVERT` | `drainage_survey` in `HIDDEN_ROOM` + local mechanism | **Yes** |
| `P09` | Evie's chronology | `SA_ROOM` evidence board | Banked Sep 14 / Sep 16 / Sep 20 evidence | **Yes** |

`P01`, `P05`, `P06` and `P08` gate **locations**. `P07` gates return from the one-time false-world scene. `P09` gates the ending after final evidence is banked. Optional challenges never hold critical clues hostage.

## Exact puzzle specifications

### `P01` — Locked administration office (required)

- **Observed at:** `ADMIN_OFFICE` in `CAMP_YARD`. Door: old keyhole; no electronic scanner. Initial examine: *“It's locked. Someone kept this office secure long after the camp closed.”*
- **Solution at:** `FOREMAN_CABIN`: an old brass **`ITEM_ADMIN_KEY`** marked *ADMINISTRATION* hanging inside a foreman's desk drawer. Examine prompt: *“An old Hollow Pines key. I wonder if any of these locks still take it.”*
- **Player actions:** take key → perhaps bank it at home → take it on a later trip → return to admin → `Use administration key` → door opens.
- **Success:** access permanent historical archives and the service-road code source; mark `puzzle.P01=true` **when safe return commits**. Physical door opens immediately for the outing.
- **Failure:** if caught before returning, unbanked key and opened-door state reset; key respawns at cabin if not already banked. If key was banked on an earlier trip, it can be retrieved from room storage even after a later failure.
- **Don't:** require the key to be pinned or a magic card reader from the 1970s; make the cabin or office randomly shift.

### `P02` — Bell's locker (optional; documentary deduction)

- **Observed at:** `BUNKHOUSE`, locker marked *D. BELL*, four digits.
- **Clue 1:** bunkhouse notice: *“Personal lockers use the four-digit employee number unless updated at the office.”*
- **Clue 2:** `bell_fire_record` in `MAINTENANCE`, signed *Daniel Bell — No. 0416*. The document dates the shed fire Jonah wrote about. The crucial fact is that **Bell signed a report about a fire he later said never happened**.
- **Solution:** `0416`. Preserve the leading zero in UI and saved puzzle data.
- **Success:** opens Bell's locker; reveal paired pre/post-return hand photographs and an unsigned note suggesting a returned person is struggling to imitate ordinary family habits. The note **does not prove** what all copies want.
- **Failure:** wrong code only produces a lock rattle; no forced damage. Player can retry or skip entirely. Locker state persists after successful safe return.
- **Voice:** *“He signed the report. How could he have forgotten the fire?”*

### `P03` — Jammed maintenance shutter (optional; environmental)

- **Observed at:** `MAINTENANCE`, an old roller shutter blocked by a jammed ratchet and broken rope; no electricity or improbable working decades-old generator.
- **Clues/actions:** inspect pulley diagram attached to the wall. First release the safety catch; then rotate the manual spool to tension the rope; finally secure the ratchet to keep the shutter raised. Clear animations and affordances should show how each action affects the mechanism.
- **Success:** optional storage shelf with a lantern refill and additional camp photographs, one showing a worker standing outside the bunkhouse while that same worker appears at a window inside. No essential plot data locked behind this.
- **Failure:** wrong order resets pulley after a short mechanical snap, not death. The player can retry.

### `P04` — The Route 9 bus (optional; rule horror)

- **Observed at:** `BUS_STOP`, and at the copy of the stop that turns up while the player is lost. Timetable (`route9_timetable`): service ended **1979**, and the crew runs to the camp were **DAY CREW 06:00, SWING 14:00, NIGHT CREW 22:00** on the shared game clock. Warning in the player's handwriting (`bus_warning`): **“DO NOT RIDE THE BUS ALONE.”**
- **What comes** (the story's rule: STORY.md, “The forest replays what it watched for years”):
  - **On the timetable** (it pulls up at a crew time, waiting with its doors open long enough to choose), the bus is **full**: the faint shapes of people standing inside show through its windows before you board. Its passengers are the replayed crew, copies who take no notice of you. Ride it and it drives you to the public `CAMP_GATE` stop, where the crew get off and walk in through the gate and are gone.
  - **Off the timetable**, an **empty** bus comes: dark, empty windows, no one driving, the destination board reading **SUNSET ACRES**. It's a lure.
- **Rule:** riding with company is safe; riding alone is not. Company is the crew of a scheduled run, or the player's **real pet** physically aboard (any bus). Neither ride ever takes the player home or past `SERVICE_GATE`.
- **Riding a safe bus while lost rescues you from being lost:** it puts you back on the fixed map at `CAMP_GATE`. It doesn't bank anything; you still have to get home.
- **Riding the empty bus alone takes you deep into the forest:** the doors shut on empty seats, and it drives a long way, faster and faster. It lets you off far from any path, **lost**, where the dark closes in further than usual until someone finds you, with one more real danger this trip. It never takes you home. Riding alone is risky but not an instant game-over: rescuers still come. The warning is the note in your own handwriting and the empty windows, which anyone can see before boarding; nothing in the game says which bus it is.
- **Choices:** ignore it; wait at the stop for a crew time (the game clock is in the HUD); board a full bus; board with the pet; board the empty one. No fake pets. Family/Nurse Ada rescuers use their normal escort-home mechanic rather than boarding.
- **Learning:** the note gives the condition. The timetable gives the times; the shapes in the windows and the crew getting off at the gate confirm it, and NIGHT CREW is the same label as the service gate's padlock (`P05`), so the word is familiar before the code is found. The crew never give the code away.
- **Dependency:** the timetable rule needs no pet and can be built first; the pet's half waits for the planned pet-in-forest system. **Never** require this puzzle for main progression.

### `P05` — Locked deep-service-road gate (required)

- **Observed at:** `SERVICE_GATE`, chained vehicle barrier. A worn plate on the padlock reads **NIGHT CREW**. Four digits.
- **Solution source:** `ADMIN_OFFICE`, a night-watch registry titled *Forestry Shift Assignments*. The **night-crew allocation** line for the closure period is **2714**. Do not scatter multiple equally plausible four-digit numbers without another discriminating label.
- **Solution:** `2714`.
- **Success:** access to the `WATCH_SHELTER` / `LOGGING_FORK` portion of the fixed map. Persist `puzzle.P05` after safe return.
- **Failure:** wrong entry resets dials; forest encounters continue normally. No timer on the lock itself. If opened on an expedition that fails before banking, it must be re-enterable with the same known code; don't permanently forget or randomly change it.
- **Environment:** fence extends outside walkable path corridor so the player cannot simply flank the gate while remaining on a safe authored road.

### `P06` — The door in your bedroom (required)

- **Observed at:** `SA_ROOM` from the start. Ordinary small door. Examination until unlocked: *“It's locked.”*
- **Solution source:** `SURVEY_LOOKOUT`, a brass **`ITEM_CLOSET_KEY`** on a tag carrying the actual current room number (dynamic player room data) and `closet_key_note` in the protagonist's handwriting.
- **Player actions:** collect key → return home alive and bank/store it → interact with bedroom door → use key.
- **Success:** enter authored `HIDDEN_ROOM`; on its **first** exit, trigger `FALSE_SUNSET`. Subsequent access to the hidden room must not replay the entire false-world trap automatically. The key is no longer required every visit once unlocked.
- **Failure:** dying with an unbanked key means reclaiming it from the fixed lookout. A safely banked key must remain recoverable; the closet doesn't reset permanently. Once the false-world scene is active, `P07` handles its retries.
- **Don't:** use the player's birthday as the answer unless the whole game includes a separate, fair date-code puzzle. This door uses a **physical key**.

### `P07` — Recognize the real bedroom (required; one-time authored horror level)

- **Observed at:** `FALSE_SUNSET`: after exiting the unlocked room, the player's familiar community is empty and subtly wrong. Corridor loops into several superficially similar copies of their own bedroom.
- **Preparation:** at entry, take a non-destructive **snapshot** of stable personal anchors in the actual room: their saved investigation-board arrangement/pin count, exact family-photo people/details, pet bed, and optionally furniture placement. If the room is sparsely furnished or the photo was lost on a prior expedition, fallback to **always-existing anchors** (room number, board, fixed hallway signage) so the puzzle never depends on an absent decoration.
- **Goal:** inspect three accessible bedroom exits. Two disagree with the real personal anchors (e.g. a missing pinned note, altered room number, wrong arrangement, impossible photo portrait). One is correct. Provide both a visual difference and a textual examination hint for each.
- **Solution:** choose the room matching the stored anchors; its door returns player to **real** `SA_ROOM` and banks the evidence from `HIDDEN_ROOM`/echo as a successful return.
- **Failure:** wrong room loops back to the false hallway after a brief sting; no immediate unavoidable death. If a separate telegraphed threat catches the player, wake in infirmary and make the echo scene retryable from the already-unlocked door. Never reset actual community saved data.
- **Memory:** unlocking/delivering `closet_journal` + `false_home_observation` safely can trigger `CS_LOCKING`.
- **Don't:** reveal that all of Sunset Acres was fake or permanently disable multiplayer.

### `P08` — Ravine drainage passage (required; late environmental)

- **Observed early at:** `SHELTER_EXTERIOR`, visibly blocked by collapsed beams. The player can record an unresolved lead but cannot access the interior from the front.
- **Solution source:** `drainage_survey` in `HIDDEN_ROOM` shows that a sluice and narrow service conduit under the **ravine** lead beneath the shelter. The map is always the same; it points to the fixed `RAVINE_CULVERT` site. The drainage clue must be safely retained through the echo escape before it counts toward the final route objective.
- **Actions at `RAVINE_CULVERT`:** locate partly buried sluice plate using the survey; inspect jammed debris; use a nearby hooked pole to pull vegetation free; turn the exposed wheel to lower the water; enter the conduit.
- **Solution:** clear blockage before turning wheel, then open sluice. On success `RAVINE_CULVERT → SHELTER_INTERIOR` is traversable.
- **Failure:** wrong wheel attempt says *“It won't move. Something is wedged against it.”* The player can explore, inspect and retry. No arbitrary death for interacting with old machinery. If the expedition fails before the passage is committed, the mechanism can be worked again next visit.
- **Payoff:** reaches fixed physical evidence of Evie's death; no random boss key.

### `P09` — The actual Evie chronology (required; final deduction)

- **Observed at:** corkboard in real `SA_ROOM` after successfully banking the late shelter evidence.
- **Prerequisites:** banked `evie_missing`, `neighbor_statement`, `returned_evie_photo`, `evie_final_journal`, `evie_original_coat`, and `evie_remains`. The first three can be acquired earlier, in any order.
- **Interaction:** present three dated cards to order or link: *missing — Sep 14*, *died — Sep 16*, *returned — Sep 20*. UI supports drag and/or accessible next/previous controls, and a `Review original evidence` option. Existing freeform string connections are separate and do not have to be drawn in one magic pattern.
- **Correct answer:** Sep 14 → Sep 16 → Sep 20. Player commits conclusion that the returnee could not have been Evie. Unlock `CS_ENDING` and mark `story_complete=true`.
- **Incorrect answer:** show a modest in-character prompt: *“Those dates don't fit. I'll check the documents again.”* No removal of evidence; no punishment.
- **Failure safeguard:** if the player died with the final evidence still unbanked, this puzzle remains unavailable until a successful expedition. All sources remain in `SHELTER_INTERIOR` to revisit.

## Scripted story encounters (not ordinary puzzles)

### `E_NORA_SIGHTING` — an actual person at the edge of the frame

- **Site:** `TRAILHEAD` (one optional early appearance), with physical tea/campsite signs at `CREEK_CAMP`.
- **Beat:** a distant figure notices the player, becomes frightened and flees. No chase or catch-up minigame; this is **real Nora**.
- **Evidence:** the warm tea and extinguished fire are mundane, recent activity from her camp. They foreshadow the person rather than introducing an orphan mystery.

### `E_NORA_MEET_1` and `E_NORA_MEET_2` — two real conversations

- **Site:** `CAMP_YARD` (guaranteed; do not require discovering `CREEK_CAMP`).
- **Meet 1 trigger:** first visit or shortly after a brief camp examination. Nora initially asks the player to stay back, then introduces herself as a local historian. She mentions researching the abandoned camp, not a private family tragedy.
- **Meet 2 trigger:** a later visit after **banked** `evie_case_1978`; she recognizes the protagonist and discusses a finding. This exchange makes it plausible she would later trust someone wearing the protagonist's face. Nora's left-cheek mole is shown in her **genuine** dialogue portrait and noted on an interactable sketch/description.
- **Memory (STORY.md “Memory: how the dementia shows”):** at Meet 2 the protagonist doesn't recognize her (*“Have we met?”*) unless the player has a banked People note about her, in which case the thought is *“Nora. I wrote her down.”* Either way she greets them warmly; when they don't know her she gently introduces herself again and isn't hurt. After Meet 1 (and again after Meet 2) the protagonist writes her into the notepad's **People** page in their own words, including the mole. Banked, it becomes a board card. That note, not the protagonist's memory, is what the player has to go on at `E_NORA_DOOR`.
- **Timeline:** Nora leaves for the deeper road after Meet 2. Her offscreen death is committed on a subsequent expedition as the player enters the deep region. Reaching the deep road before Meet 2 must be possible and not suddenly present fake Nora.
- **Continuity/failure:** NPC encounter flags can persist independently of unbanked notes. Don't resurrect her after the offscreen death or make a random chance necessary to find her.

### `E_NORA_DOOR` — “LET ME IN”

- **Site:** `WATCH_SHELTER`, while the player is inside examining a known object; the small building sits on the only safe crossing into the logging fork, so it is hard to miss on a normal route.
- **Requires:** both real meetings completed, Nora has gone deeper on a later outing, and fake door event not already completed. The woman banging is **an impostor**, missing Nora's left-cheek mole. Nora is already dead.
- **The protagonist's notes:** the notepad's People page (or the banked board card) describing Nora is readable during the scene, so the player compares the face at the window with what they wrote, not with what the protagonist remembers. If they never wrote her down (unlikely, since meeting her writes the note), the portrait and inspection text alone must still show the missing mole.
- **Presentation:** sharp pounding followed by a few seconds to decide. *“LET ME IN! PLEASE! IT'S RIGHT BEHIND ME!”* Her voice is recognizable. Provide readable portrait/peek-through-window inspection at the risk of using decision time; never hide the tell behind an unfair uninspectable timed choice. Pause countdown while dialogue is being read or provide a generous duration, tuned in play-test.
- **Branch OPEN:** she enters, appears frightened, talks naturally, then suggests leaving together via an unsafe route. The player can decline or observe the missing mole and leave via rear exit; insisting on following her toward woods can cause a fair chase/caught outcome. Simply opening the door is **not** instant death and does not grant the forest special powers.
- **Branch KEEP LOCKED:** she keeps pounding, then stops abruptly. Player can later examine scratches, dropped scarf or other ambiguous traces, without seeing a gratuitous murder happening at the door.
- **Both branches:** record the door event as a plot beat; allow the own-double event next. Provide the same eventual Nora-body explanation. Nobody's real family-photo rules change.
- **On failure mid-scene:** preserve enough event state for a safe repeat or recoverable witness account; do not leave the client locked in the shelter forever.

### `E_PLAYER_DOUBLE` — the forest uses your face

- **Site:** `LOGGING_FORK` on an eligible visit after `E_NORA_DOOR`, preferably before the ravine.
- **Presentation:** an NPC drawn from the player's current real appearance stands near the crossing, notices the protagonist and retreats into trees. No automatically forced chase. The player hears their own voice once or recognizes a personal gesture.
- **Meaning:** the copy already existed before the door event and had been used to lure Nora. Do **not** describe the player as an impostor or require the player to invite anyone inside for the copy to exist.
- **Variations:** if the body was discovered earlier due to unusual navigation, alter the inner-voice line; do not suppress the double or contradict the record.

### `E_NORA_BODY` — what the forest did

- **Site:** `RAVINE_CULVERT` after Nora's offscreen death. The scene remains at this **fixed** location for later visits.
- **Evidence:** her unmistakable real left-cheek mole, her distinctive kettle, a damaged notebook, bruising/drag marks and a fatal fall. Final journal entry says a resident she had come to trust offered to show her something by the ravine. Her death is **not** a missing-person disappearance or a fake corpse.
- **Deduction:** the player has seen an imitation of themselves and can infer that this copy murdered her. Provide grounded examination and one restrained thought: *“She thought it was me.”* No cutscene from an unwitnessed perspective.
- **Accessibility/tone:** use readable text and implication, not high-detail gore; never make the character's own memory condition the reason Nora was fooled.

### `E_EVIE_LAST` — final false rescuer

- **Site:** just outside `SHELTER_INTERIOR` after the shelter evidence has been examined.
- **Appearance:** resembles Evie in 1987 (not an impossibly aged real Evie) and **lacks her right-eyebrow scar**. The player has access to previously banked `evie_photo_before` and the inside-shelter physical proof. The NPC should be legible through dialogue portrait and inspection, not a 2-pixel tell.
- **Choice:** go with her → normal fake-rescuer caught consequence; refuse → short, escapable chase (or hide/avoid) using existing mechanics. There must be a fair path back to the fixed roads and opportunities for real rescue.
- **After failure:** same evidence remains at shelter for next attempt. The player cannot complete `P09` until the last proof is banked. The forest does not need to be killed or switched off.

## Suggested progression state schema (illustrative, not an API promise)

```ts
interface ForestStorySave {
  bankedClues: string[];              // canonical clue IDs only, deduplicated
  userNotes: Record<string, string>; // player's annotations
  boardLayout: Record<string, { x: number; y: number }>;
  boardLinks: Array<[string, string]>;
  storedItems: string[];             // recovered physical keys, not duplicates
  solvedPuzzles: string[];           // P01...P09 when committed
  viewedCutscenes: string[];         // CS_* IDs
  queuedCutscenes: string[];
  storyEvents: string[];             // E_* one-time NPC history, owner-only
  falseHomeCompleted: boolean;
  storyComplete: boolean;
}

interface ForestTripState {
  unbankedClues: string[];
  carriedItems: string[];
  provisionalPuzzles: string[];
  isLost: boolean;
  photoWasCarriedIntoForest: boolean;
  // Client-local procedural map seed, encounter and scene state
}
```

Use actual project schema conventions in `shared/schema.ts`, not these literal interfaces blindly. Validate ID enums and lengths server-side. The user must never be able to grant themselves puzzle completion with unauthenticated client flags. Persist per-user story progress; keep current community saves and presence compatible.

## Engineering acceptance checks

1. **Branch order:** east creek branch first, west foreman's cabin first, bunkhouse before office, or office before cabin all result in coherent clues and navigable paths.
2. **Gate integrity:** walk beside each camp/service fence for as long as possible; the player becomes lost before entering a gated region. No random terrain generation opens a secret pass.
3. **Safe path home:** walking backward along the fixed roads from `SURVEY_LOOKOUT` returns to Sunset Acres without becoming lost solely because of distance. Leaving road far enough triggers lost forest and removes those roads.
4. **Office key:** find it, bank it, leave it at home, discover the office locked, return home for it, use it, and later open the office without carrying it again.
5. **Key loss:** find key and die before bank; source reappears. Bank key and die on another trip; stored copy remains available or unique item is recoverable. Never permanent lockout.
6. **Code gates:** P02 accepts `0416` with leading zero; P05 accepts `2714`, refuses wrong codes, and persists after successful bank.
7. **Bus:** a bus at a timetable time is full (shapes in its windows) and reaches the public camp gate, from the map or from lost forest, never past the service gate; an empty off-schedule bus ridden alone lets you off deep in the lost forest, never home; with the pet any bus is safe; regular walking reaches the same region without the bus.
8. **Nora:** optional creek sighting can be skipped; both real meetings remain guaranteed. Real Nora's mole is consistent; fake Nora lacks it. Nora dies before fake door. Your double **already** exists independently of opening door. Her body stays discoverable.
9. **Photo:** death with photo in pocket removes it; death when left on room wall does not. Reprint is affordable through Rosa's regular garden economy.
10. **Evidence:** collecting `evie_final_journal` and dying before home does not unlock the ending; retrieving it and banking it does. Clues do not randomly change wording or site.
11. **False home:** two different players can be in the real community while one enters `FALSE_SUNSET`; other players remain visible to each other. Escaping returns owner to unchanged room and garden.
12. **Cutscenes:** trigger only on banked prerequisite sets, queue without duplication, skip/replay, and never play after death instead of losing notes.
13. **Ending:** final false-Evie encounter has visible scar mismatch and a survival route. P09 chronology can be solved with the banked dates; wrong ordering never deletes proof.
14. **Accessibility:** all critical distinguishing marks, dates, labels and hints are described in text as well as pixels/sound.
