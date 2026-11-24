import { compareArtifactPaths, folderForPath, titleForPath, uniqueSlugs } from './paths'
import type { ArtifactsResponse } from './types'

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

const DOCS: [path: string, updatedDaysAgo: number, markdown: string][] = [
  [
    'Project Synopsis.md',
    2,
    `# **D.A.W.N: Daily Awareness & Well-being Navigator**

## **Introduction/Background**

People with dementia often wake up to a confusing world. *Sample data:* this is a stand-in
for the real synopsis in the dawn-care/Artifacts repo.

## **Project Description**

* **Always-on screen:** the day and time of day in very large type.
* **Playback:** family members schedule videos to play at set times.
  * Content plays full screen with no tap needed.
  * The screen returns to the always-on view afterward.

| App | Used by | What it does |
|---|---|---|
| Caregiver web app | Family | Upload media and schedule playback |
| Carepartner tablet app | Resident | Shows the always-on screen |
| Staff app | Facility staff | Starts and stops a clip |

The requirements are in [Functional and Non-Functional Requirements](Functional%20and%20Non-Functional%20Requirements.md),
broken into user stories in the [Feature List](Feature%20List.md#carepartner-tablet).
`,
  ],
  [
    'Feature List.md',
    5,
    `# **Feature List**

## **How to read this list**

* **Priority:** **Must (beta)**, **Should**, or **Could (later)**.
* **Issues:** the related issues in [dawn-care/DAWN](https://github.com/dawn-care/DAWN/issues).

## **Carepartner tablet**

| ID | Story | Priority | Status |
| :---- | :---- | :----: | :---- |
| CP-1 | As a resident, I see the day of the week in very large type. | Must (beta) | Done |
| CP-8 | As staff, when I press Play the clip starts within 3 seconds. *Needs media caching.* | Must (beta) | Partly done |
| CP-9 | As a resident with hearing loss, I see large captions. | Should | Not started |

## **Open questions**

- [x] Can floor staff carry phones on shift? *Answered: yes.*
- [ ] Is there a photo release on file for each resident?
`,
  ],
  [
    'Functional and Non-Functional Requirements.md',
    12,
    `# Functional and Non-Functional Requirements

## Functional

1. The tablet shows the day and time of day at all times.
2. Scheduled media plays without a tap.
3. Staff can start and stop a clip from their phone.

## Non-functional

> Every API request needs sign-in or a device token.

Requests from the staff app reach the tablet in under \`3 s\`.
`,
  ],
  [
    '02 Design/01 Architecture.md',
    20,
    `# Architecture

The system is three apps on one backend; see the [synopsis](../Project%20Synopsis.md).

\`\`\`
tablet  ←──  backend  ──→  caregiver app
                ↑
            staff app
\`\`\`

---

The diagram source lives in [diagrams/Domain Model.drawio](../diagrams/Domain%20Model.drawio) (opens on GitHub).
`,
  ],
]

/** Fake /api/artifacts for VITE_TASKS_MOCK=true, so local dev needs no network. */
export function mockArtifacts(): ArtifactsResponse {
  const sorted = [...DOCS].sort((a, b) => compareArtifactPaths(a[0], b[0]))
  const slugs = uniqueSlugs(sorted.map(([path]) => path))
  return {
    source: { url: 'https://github.com/dawn-care/Artifacts', branch: 'main' },
    documents: sorted.map(([path, days, markdown]) => ({
      path,
      slug: slugs.get(path)!,
      title: titleForPath(path),
      folder: folderForPath(path),
      updatedAt: daysAgo(days),
      markdown,
    })),
    assets: [],
    generatedAt: new Date().toISOString(),
  }
}
