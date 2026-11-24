/*
 * A small GitHub-flavored Markdown parser for the Artifacts documents. It produces a tree
 * that src/components/artifacts/Markdown.tsx renders as React elements, so no HTML string
 * is ever injected into the page. Raw HTML in a document is shown as text (except <br>).
 *
 * Supported: ATX headings, paragraphs, hard line breaks, emphasis (*, _, **, __, ***),
 * ~~strikethrough~~, `code`, fenced code blocks, block quotes, nested bullet / ordered /
 * task lists, tables with alignment, thematic breaks, links, images, autolinks, backslash
 * escapes and HTML entities. Not supported: setext headings, indented code blocks,
 * reference-style links, footnotes.
 */

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'strong' | 'em' | 'del'; children: Inline[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; title?: string; children: Inline[] }
  | { type: 'image'; src: string; alt: string; title?: string }
  | { type: 'break' }

export type Align = 'left' | 'center' | 'right' | null

export interface ListItem {
  /** null for a plain item; true/false for a task item ("- [x]" / "- [ ]"). */
  checked: boolean | null
  children: Block[]
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; id: string; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; start: number; tight: boolean; items: ListItem[] }
  | { type: 'blockquote'; children: Block[] }
  | { type: 'code'; lang: string; value: string }
  | { type: 'table'; align: Align[]; head: Inline[][]; rows: Inline[][][] }
  | { type: 'hr' }

// ─── Blocks ──────────────────────────────────────────────────────────────────

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/
const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/
const QUOTE = /^ {0,3}> ?/
const LIST_ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/
const TABLE_DELIMITER = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/

function isBlank(line: string): boolean {
  return line.trim() === ''
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length
}

interface ListMarker {
  indent: number
  marker: string
  ordered: boolean
  /** Column where the item's content starts. */
  contentOffset: number
  content: string
}

function matchListItem(line: string): ListMarker | null {
  const m = LIST_ITEM.exec(line)
  if (!m) return null
  const [, indent, marker, spacing = '', content = ''] = m
  // "-" alone is an empty item; "-foo" (no space) is not a list item at all.
  if (!spacing && content) return null
  // More than 4 spaces after the marker would start indented code; treat it as one space.
  const gap = spacing.length >= 1 && spacing.length <= 4 ? spacing.length : 1
  return {
    indent: indent.length,
    marker,
    ordered: /\d/.test(marker),
    contentOffset: indent.length + marker.length + gap,
    content: spacing.length > 4 ? spacing.slice(1) + content : content,
  }
}

function sameList(a: ListMarker, b: ListMarker): boolean {
  if (a.ordered !== b.ordered) return false
  // Bullets must match ("-" vs "*" starts a new list); so must ordered delimiters ("." vs ")").
  return a.marker.slice(-1) === b.marker.slice(-1)
}

function splitRow(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1)
  const cells: string[] = []
  let current = ''
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '\\' && row[i + 1] === '|') {
      current += '\\|'
      i++
    } else if (ch === '|') {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function isTableStart(lines: string[], i: number): boolean {
  const header = lines[i]
  const delimiter = lines[i + 1]
  if (delimiter === undefined || !header.includes('|') || !delimiter.includes('|')) return false
  if (!TABLE_DELIMITER.test(delimiter)) return false
  return splitRow(header).length === splitRow(delimiter).length
}

/** Whether `lines[i]` starts a block that ends (interrupts) a paragraph. */
function interruptsParagraph(lines: string[], i: number): boolean {
  const line = lines[i]
  if (FENCE.test(line) || HEADING.test(line) || HR.test(line) || QUOTE.test(line)) return true
  const item = matchListItem(line)
  // As in GFM, only a non-empty item can interrupt, and an ordered one only if it starts at 1.
  if (item && item.content.trim() && (!item.ordered || parseInt(item.marker, 10) === 1)) {
    return true
  }
  return isTableStart(lines, i)
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (isBlank(line)) {
      i++
      continue
    }

    const fence = FENCE.exec(line)
    if (fence && !(fence[1][0] === '`' && fence[2].includes('`'))) {
      const marker = fence[1]
      const indent = indentOf(line)
      const closing = new RegExp(
        `^ {0,3}${marker[0] === '`' ? '`' : '~'}{${marker.length},}[ \\t]*$`,
      )
      const body: string[] = []
      i++
      while (i < lines.length && !closing.test(lines[i])) {
        // Content lines lose up to the opening fence's indentation.
        body.push(lines[i].slice(Math.min(indent, indentOf(lines[i]))))
        i++
      }
      i++ // the closing fence (or the end of the document)
      blocks.push({
        type: 'code',
        lang: fence[2].trim().split(/\s+/)[0] ?? '',
        value: body.join('\n'),
      })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6
      blocks.push({ type: 'heading', level, id: '', children: parseInline(heading[2] ?? '') })
      i++
      continue
    }

    if (HR.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    if (QUOTE.test(line)) {
      const inner: string[] = []
      while (i < lines.length && !isBlank(lines[i])) {
        if (QUOTE.test(lines[i])) inner.push(lines[i].replace(QUOTE, ''))
        else if (interruptsParagraph(lines, i)) break
        else inner.push(lines[i]) // lazy continuation
        i++
      }
      blocks.push({ type: 'blockquote', children: parseBlocks(inner) })
      continue
    }

    const item = matchListItem(line)
    if (item) {
      i = parseList(lines, i, item, blocks)
      continue
    }

    if (isTableStart(lines, i)) {
      i = parseTable(lines, i, blocks)
      continue
    }

    const paragraph: string[] = [line]
    i++
    while (i < lines.length && !isBlank(lines[i]) && !interruptsParagraph(lines, i)) {
      paragraph.push(lines[i])
      i++
    }
    blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n').trim()) })
  }
  return blocks
}

function parseList(lines: string[], start: number, first: ListMarker, out: Block[]): number {
  const items: ListItem[] = []
  let tight = true
  let i = start
  let marker: ListMarker | null = first

  while (marker) {
    const itemLines = [marker.content]
    const offset = marker.contentOffset
    i++
    while (i < lines.length) {
      const line = lines[i]
      if (isBlank(line)) {
        let next = i + 1
        while (next < lines.length && isBlank(lines[next])) next++
        if (next < lines.length && indentOf(lines[next]) >= offset) {
          for (; i < next; i++) itemLines.push('')
          continue
        }
        break
      }
      if (indentOf(line) >= offset) {
        itemLines.push(line.slice(offset))
      } else if (matchListItem(line) || interruptsParagraph(lines, i)) {
        break
      } else if (itemLines[itemLines.length - 1].trim() !== '') {
        itemLines.push(line.trimStart()) // lazy continuation of the item's paragraph
      } else {
        break
      }
      i++
    }

    // A blank line between two of the item's own blocks makes the list loose.
    const lastContent = itemLines.reduce((last, l, n) => (l.trim() ? n : last), 0)
    if (itemLines.slice(0, lastContent).some((l) => l.trim() === '')) tight = false
    items.push(parseListItem(itemLines.slice(0, lastContent + 1)))

    // The next sibling, possibly after blank lines (which make the list loose).
    let next = i
    while (next < lines.length && isBlank(lines[next])) next++
    const sibling: ListMarker | null = next < lines.length ? matchListItem(lines[next]) : null
    if (sibling && sibling.indent < offset && sameList(first, sibling)) {
      if (next > i) tight = false
      i = next
      marker = sibling
    } else {
      marker = null
    }
  }

  out.push({
    type: 'list',
    ordered: first.ordered,
    start: first.ordered ? parseInt(first.marker, 10) : 1,
    tight,
    items,
  })
  return i
}

function parseListItem(lines: string[]): ListItem {
  const task = /^\[([ xX])\][ \t]+/.exec(lines[0])
  if (task) {
    return {
      checked: task[1] !== ' ',
      children: parseBlocks([lines[0].slice(task[0].length), ...lines.slice(1)]),
    }
  }
  return { checked: null, children: parseBlocks(lines) }
}

function parseTable(lines: string[], start: number, out: Block[]): number {
  const head = splitRow(lines[start])
  const align = splitRow(lines[start + 1]).map((cell): Align => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    return left && right ? 'center' : right ? 'right' : left ? 'left' : null
  })
  const rows: Inline[][][] = []
  let i = start + 2
  while (i < lines.length && !isBlank(lines[i]) && !interruptsParagraph(lines, i)) {
    const cells = splitRow(lines[i])
    rows.push(head.map((_, c) => parseInline(cells[c] ?? '')))
    i++
  }
  out.push({ type: 'table', align, head: head.map((cell) => parseInline(cell)), rows })
  return i
}

// ─── Inlines ─────────────────────────────────────────────────────────────────

const PUNCTUATION = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  middot: '·',
  times: '×',
  rarr: '→',
  larr: '←',
  copy: '©',
  reg: '®',
  trade: '™',
}

function isWhitespace(ch: string | undefined): boolean {
  return ch === undefined || /\s/.test(ch)
}

function isAlphanumeric(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}]/u.test(ch)
}

function decodeEntity(src: string, i: number): { value: string; length: number } | null {
  const m = /^&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]{2,8}));/.exec(src.slice(i, i + 12))
  if (!m) return null
  if (m[3]) {
    const value = ENTITIES[m[3]]
    return value ? { value, length: m[0].length } : null
  }
  const code = m[1] ? parseInt(m[1], 10) : parseInt(m[2], 16)
  const valid = code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
  return { value: valid ? String.fromCodePoint(code) : '\ufffd', length: m[0].length }
}

/** Backslash escapes and entities in a link destination or title. */
function unescape(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\' && PUNCTUATION.test(text[i + 1] ?? '')) {
      out += text[++i]
    } else if (text[i] === '&') {
      const entity = decodeEntity(text, i)
      if (entity) {
        out += entity.value
        i += entity.length - 1
      } else {
        out += '&'
      }
    } else {
      out += text[i]
    }
  }
  return out
}

/** Length of the run of `ch` starting at i. */
function runLength(src: string, i: number, ch: string): number {
  let n = 0
  while (src[i + n] === ch) n++
  return n
}

/** Index just past the code span starting at i, or -1 if its backticks are never closed. */
function codeSpanEnd(src: string, i: number): number {
  const ticks = runLength(src, i, '`')
  let j = i + ticks
  while (j < src.length) {
    if (src[j] === '`') {
      const run = runLength(src, j, '`')
      if (run === ticks) return j + run
      j += run
    } else {
      j++
    }
  }
  return -1
}

/**
 * Where the emphasis opened at `start` (a run of `ch` of which `size` characters open it)
 * closes: the index of the closing delimiter, or -1. Code spans, escapes and links are
 * skipped; runs of a different size are nested emphasis and are stepped over.
 */
function findCloser(src: string, start: number, ch: string, size: number): number {
  let j = start
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') {
      j += 2
      continue
    }
    if (c === '`') {
      const end = codeSpanEnd(src, j)
      j = end === -1 ? j + runLength(src, j, '`') : end
      continue
    }
    if (c === ch) {
      const run = runLength(src, j, ch)
      const before = src[j - 1]
      const after = src[j + run]
      const canClose = j > start && !isWhitespace(before) && (ch !== '_' || !isAlphanumeric(after))
      // A closer must be at least as long as the opener; a longer one keeps its extra
      // characters for an outer (or inner) emphasis.
      if (canClose && (run === size || run >= 3 || (size === 1 && run !== 2))) {
        return j + run - size
      }
      j += run
      continue
    }
    j++
  }
  return -1
}

interface LinkParts {
  dest: string
  title?: string
  /** Index just past the closing ")". */
  end: number
}

/** Parses "(dest "title")" starting at the "(" at index i. */
function parseLinkTail(src: string, i: number): LinkParts | null {
  if (src[i] !== '(') return null
  let j = i + 1
  while (src[j] === ' ' || src[j] === '\n') j++
  let dest = ''
  if (src[j] === '<') {
    const close = src.indexOf('>', j)
    if (close === -1 || src.slice(j, close).includes('\n')) return null
    dest = src.slice(j + 1, close)
    j = close + 1
  } else {
    let depth = 0
    while (j < src.length && !/\s/.test(src[j])) {
      if (src[j] === '\\' && j + 1 < src.length) {
        dest += src[j] + src[j + 1]
        j += 2
        continue
      }
      if (src[j] === '(') depth++
      if (src[j] === ')') {
        if (depth === 0) break
        depth--
      }
      dest += src[j]
      j++
    }
  }
  while (src[j] === ' ' || src[j] === '\n') j++
  let title: string | undefined
  const quote = src[j]
  if (quote === '"' || quote === "'" || quote === '(') {
    const closeChar = quote === '(' ? ')' : quote
    let k = j + 1
    while (k < src.length && src[k] !== closeChar) k += src[k] === '\\' ? 2 : 1
    if (k >= src.length) return null
    title = unescape(src.slice(j + 1, k))
    j = k + 1
    while (src[j] === ' ' || src[j] === '\n') j++
  }
  if (src[j] !== ')') return null
  return { dest: unescape(dest), title, end: j + 1 }
}

/** Index of the "]" matching the "[" at i, or -1. */
function closingBracket(src: string, i: number): number {
  let depth = 0
  for (let j = i; j < src.length; j++) {
    const c = src[j]
    if (c === '\\') {
      j++
    } else if (c === '`') {
      const end = codeSpanEnd(src, j)
      if (end !== -1) j = end - 1
    } else if (c === '[') {
      depth++
    } else if (c === ']') {
      depth--
      if (depth === 0) return j
    }
  }
  return -1
}

const AUTOLINK = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/i
const BARE_URL = /^https?:\/\/[^\s<]+/i
const BR_TAG = /^<br\s*\/?>/i

/** Drops trailing punctuation from a bare URL, keeping a ")" only if it's balanced. */
function trimBareUrl(url: string): string {
  let end = url.length
  while (end > 0) {
    const c = url[end - 1]
    if (/[.,:;!?'"*_~]/.test(c)) {
      end--
    } else if (c === ')') {
      const text = url.slice(0, end)
      const opens = text.split('(').length - 1
      const closes = text.split(')').length - 1
      if (closes > opens) end--
      else break
    } else {
      break
    }
  }
  return url.slice(0, end)
}

export function parseInline(src: string): Inline[] {
  const nodes: Inline[] = []
  let text = ''

  const flush = () => {
    if (text) nodes.push({ type: 'text', value: text })
    text = ''
  }
  const push = (node: Inline) => {
    flush()
    nodes.push(node)
  }

  let i = 0
  while (i < src.length) {
    const c = src[i]

    if (c === '\\') {
      const next = src[i + 1]
      if (next === '\n') {
        push({ type: 'break' })
        i += 2
        continue
      }
      if (next !== undefined && PUNCTUATION.test(next)) {
        text += next
        i += 2
        continue
      }
      text += c
      i++
      continue
    }

    if (c === '\n') {
      // Two or more trailing spaces make a hard break; otherwise it's a soft break.
      const trailing = text.length - text.trimEnd().length
      text = text.trimEnd()
      if (trailing >= 2) push({ type: 'break' })
      else text += '\n'
      i++
      while (src[i] === ' ') i++
      continue
    }

    if (c === '`') {
      const end = codeSpanEnd(src, i)
      const ticks = runLength(src, i, '`')
      if (end === -1) {
        text += src.slice(i, i + ticks)
        i += ticks
        continue
      }
      let value = src.slice(i + ticks, end - ticks).replace(/\n/g, ' ')
      if (value.length > 2 && value.startsWith(' ') && value.endsWith(' ') && value.trim()) {
        value = value.slice(1, -1)
      }
      push({ type: 'code', value })
      i = end
      continue
    }

    if (c === '!' && src[i + 1] === '[') {
      const close = closingBracket(src, i + 1)
      const tail = close === -1 ? null : parseLinkTail(src, close + 1)
      if (tail) {
        push({
          type: 'image',
          src: tail.dest,
          alt: inlineText(parseInline(src.slice(i + 2, close))),
          title: tail.title,
        })
        i = tail.end
        continue
      }
    }

    if (c === '[') {
      const close = closingBracket(src, i)
      const tail = close === -1 ? null : parseLinkTail(src, close + 1)
      if (tail) {
        push({
          type: 'link',
          href: tail.dest,
          title: tail.title,
          children: parseInline(src.slice(i + 1, close)),
        })
        i = tail.end
        continue
      }
    }

    if (c === '<') {
      const auto = AUTOLINK.exec(src.slice(i))
      if (auto) {
        push({ type: 'link', href: auto[1], children: [{ type: 'text', value: auto[1] }] })
        i += auto[0].length
        continue
      }
      const br = BR_TAG.exec(src.slice(i))
      if (br) {
        push({ type: 'break' })
        i += br[0].length
        continue
      }
    }

    if ((c === 'h' || c === 'H') && !isAlphanumeric(src[i - 1])) {
      const bare = BARE_URL.exec(src.slice(i))
      if (bare) {
        const url = trimBareUrl(bare[0])
        if (url.length > 'https://'.length) {
          push({ type: 'link', href: url, children: [{ type: 'text', value: url }] })
          i += url.length
          continue
        }
      }
    }

    if (c === '&') {
      const entity = decodeEntity(src, i)
      if (entity) {
        text += entity.value
        i += entity.length
        continue
      }
    }

    if (c === '~' && src[i + 1] === '~' && src[i + 2] !== '~' && !isWhitespace(src[i + 2])) {
      const close = src.indexOf('~~', i + 2)
      if (close > i + 2 && !isWhitespace(src[close - 1])) {
        push({ type: 'del', children: parseInline(src.slice(i + 2, close)) })
        i = close + 2
        continue
      }
    }

    if (c === '*' || c === '_') {
      const run = runLength(src, i, c)
      const before = src[i - 1]
      const after = src[i + run]
      const canOpen =
        !isWhitespace(after) &&
        (c !== '_' || !isAlphanumeric(before)) &&
        // "a * b" isn't emphasis: a delimiter followed by punctuation needs space before it.
        (!PUNCTUATION.test(after ?? '') || isWhitespace(before) || PUNCTUATION.test(before ?? ''))
      if (canOpen) {
        const sizes = run >= 3 ? [3, 2, 1] : run === 2 ? [2, 1] : [1]
        let matched = false
        for (const size of sizes) {
          const open = i + run - size
          const close = findCloser(src, open + size, c, size)
          if (close === -1) continue
          text += src.slice(i, open) // unmatched extra delimiters stay literal
          const inner = parseInline(src.slice(open + size, close))
          if (size === 3) {
            push({ type: 'strong', children: [{ type: 'em', children: inner }] })
          } else {
            push({ type: size === 2 ? 'strong' : 'em', children: inner })
          }
          i = close + size
          matched = true
          break
        }
        if (matched) continue
      }
      text += src.slice(i, i + run)
      i += run
      continue
    }

    text += c
    i++
  }
  flush()
  return nodes
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Plain text of inline nodes (images contribute their alt text). */
export function inlineText(nodes: readonly Inline[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'code':
          return node.value
        case 'image':
          return node.alt
        case 'break':
          return '\n'
        default:
          return inlineText(node.children)
      }
    })
    .join('')
}

/** Plain text of a whole document, for search and excerpts. */
export function blocksText(blocks: readonly Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
        case 'paragraph':
          return inlineText(block.children)
        case 'code':
          return block.value
        case 'blockquote':
          return blocksText(block.children)
        case 'list':
          return block.items.map((item) => blocksText(item.children)).join('\n')
        case 'table':
          return [block.head, ...block.rows]
            .map((row) => row.map((cell) => inlineText(cell)).join(' · '))
            .join('\n')
        case 'hr':
          return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}

/** GitHub's heading anchors: lowercase, punctuation dropped, spaces → "-", repeats get "-1". */
export function headingSlugger(): (text: string) => string {
  const seen = new Map<string, number>()
  return (text) => {
    const base =
      text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
        .replace(/\s/g, '-') || 'section'
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}

function assignHeadingIds(blocks: Block[], slug: (text: string) => string): void {
  for (const block of blocks) {
    if (block.type === 'heading') block.id = slug(inlineText(block.children))
    else if (block.type === 'blockquote') assignHeadingIds(block.children, slug)
    else if (block.type === 'list') {
      for (const item of block.items) assignHeadingIds(item.children, slug)
    }
  }
}

export function parseMarkdown(source: string): Block[] {
  const lines = source
    .replace(/^\ufeff/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    // Tabs count as 4 columns, which is all the indentation rules here need.
    .map((line) => line.replace(/\t/g, '    '))
  const blocks = parseBlocks(lines)
  assignHeadingIds(blocks, headingSlugger())
  return blocks
}
