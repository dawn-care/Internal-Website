# Hollow Pines — implementation document index

**Purpose:** A self-contained Markdown handoff for implementing the forest investigation in the existing Sunset Acres game. **The main story, scripted scenes, fixed-map navigation, evidence board and puzzles are design specifications, not claims about implemented code.** The existing forest/character-photo/rescuer systems are already partly implemented; see `FOREST.md`'s dated engineering snapshot and inspect the repository before coding.

## Read in this order

1. **[STORY.md](STORY.md)** — full chronology, character motivations, causal rules, act progression, exact clue IDs, cutscene triggers, ending. Source of truth for narrative continuity.
2. **[MAP.md](MAP.md)** — fixed trail graph, fence/gate logic, 20 location IDs, every site's evidence, interactions and authored access restrictions. Source of truth for geometry and landmark placement.
3. **[PUZZLES.md](PUZZLES.md)** — nine puzzles, item sources, codes, scene triggers, failure/recovery logic, save-state outline, QA acceptance scenarios. Source of truth for mechanical behavior.
4. **[FOREST.md](FOREST.md)** — design/engineering integration, built stages 1–3, existing class/file references and historical tuning. Source of truth for what already exists and how to integrate the new parts.
5. **[COMMUNITY.md](COMMUNITY.md)** — existing cozy social game. **Unchanged; do not modify for this task.** Gardening sales to Chef Rosa remain the primary source of easy coins.

## Key implementation decisions

- **Fixed forest roads, branches, fences, structures, gates and clues.** Only the wilderness off those authored corridors is generated per expedition. Following roads always allows walking home; crossing sufficiently far off them triggers fully random *lost forest*. Existing straight-line distance-based point of no return is not the target design.
- **Mandatory routes through the camp:** west/east approach paths converge at the open perimeter gate; the administrative office requires a cabin key (`P01`); the deep service road requires a four-digit code (`P05`). Fences prevent safe bypass.
- **Main-story information always at named fixed sites.** Scene triggers rely on banked IDs after a **safe** return; ordinary ambiance and random threats may vary.
- **Two investigations:** Evie's 1970s police case and the protagonist's later handwritten research. Evie was a detective, not a camp administrator or scientist. Nora Vale is a short, real present-day acquaintance, murdered by the **player's double** before an imitation of Nora bangs on the shelter door. **Opening that door is not the cause of the double.**
- **The hidden room:** locked ordinary closet → old-home copy → one-time private distorted Sunset Acres puzzle. Nothing edits other players' actual community state. The blue raincoats are **proof of the copy**, not magical anchors or final quest objects.
- **Ending:** recover original Evie's remains, coat and final journal from the shelter; survive false Evie; return with those findings; solve the dated timeline at the real evidence board. The forest still exists.
- **Failure:** lose unbanked expedition evidence/items. Previously banked board items/room/garden remain. **Family photo is lost only if the player carried it in the forest**. Bought replacement is affordable from normal garden earnings. Unique plot items remain recoverable.
- **Companion:** pet may intermittently enter forest when that planned system is implemented; its occasional rescue is always safe. Pet is never an impostor.

## Recommended delivery order for an implementing agent

| Milestone | Deliverable | Required proof of completion |
| --- | --- | --- |
| M1 | Authored map backbone, camp fence, stable roads, off-road lost transition | Re-enter camp via same junctions on two runs; cannot flank a locked gate; can walk home on roads |
| M2 | Object examine, notepad, bank-on-safe-return, saved board/usable key storage | Collect → die loses new clue; collect → safe return saves; key can be retrieved from room |
| M3 | Camp interiors and early evidence + P01/P02/P03/P05 | Enter office with key; code opens service gate; all key sources recover after death |
| M4 | Evie evidence, family memories, Nora's real meetings and deep-road scripted events | Correct scar/mole details, NPC timing, double predates fake-door invite |
| M5 | Survey key, hidden room, private echo + P06/P07 | Real multiplayer remains unaffected, user can escape/retry, key survives when banked |
| M6 | Drainage/first-aid shelter + P08/P09, final Evie and ending | Failed finale loses unbanked proof; successful bank + correct chronology ends story |
| M7 | Optional Route 9 bus/pet system, extra atmosphere and polish | Solo bus is avoidable danger; real pet safe; no mandatory clue depends on RNG |

## IDs and references

- `siteId` lives in MAP.md; `clueId`, `CS_*` cutscene IDs in STORY.md; `P01`–`P09`, `ITEM_*` and `E_*` event IDs in PUZZLES.md.
- All Markdown file links are relative, so keep these files in the same directory.
- Save schemas, file/module boundaries and rendering details are **proposed integration work**. Do not assume the snippets in PUZZLES.md can be pasted without adapting to current TypeScript structures.
- Resolve any ambiguity by prioritizing STORY.md for *what happened*, MAP.md for *where*, PUZZLES.md for *how*, and FOREST.md's Build status for *what code currently does*. Implementing a future feature must not be mistaken for documenting an already-shipped feature.

## Deliberate non-goals

No multiplayer cooperative forest play; no combat; no scientific origin reveal; no forest-destroying ritual; no random placement of quest-critical locations; no second huge companion storyline; no invulnerable or lethal changes to the real Sunset Acres community.
