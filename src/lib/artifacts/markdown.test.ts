import { describe, expect, it } from 'vitest'
import { blocksText, headingSlugger, parseInline, parseMarkdown, type Block } from './markdown'

const text = (value: string) => ({ type: 'text', value })

describe('parseInline', () => {
  it('parses strong, emphasis, strikethrough and code', () => {
    expect(parseInline('a **b** *c* _d_ ~~e~~ `f`')).toEqual([
      text('a '),
      { type: 'strong', children: [text('b')] },
      text(' '),
      { type: 'em', children: [text('c')] },
      text(' '),
      { type: 'em', children: [text('d')] },
      text(' '),
      { type: 'del', children: [text('e')] },
      text(' '),
      { type: 'code', value: 'f' },
    ])
  })

  it('nests emphasis inside strong and the other way round', () => {
    expect(parseInline('**a *b* c**')).toEqual([
      {
        type: 'strong',
        children: [text('a '), { type: 'em', children: [text('b')] }, text(' c')],
      },
    ])
    expect(parseInline('*a **b** c*')).toEqual([
      {
        type: 'em',
        children: [text('a '), { type: 'strong', children: [text('b')] }, text(' c')],
      },
    ])
    expect(parseInline('***both***')).toEqual([
      { type: 'strong', children: [{ type: 'em', children: [text('both')] }] },
    ])
  })

  it('keeps unmatched or spaced-out delimiters literal', () => {
    expect(parseInline('2 * 3 * 4')).toEqual([text('2 * 3 * 4')])
    expect(parseInline('snake_case_name')).toEqual([text('snake_case_name')])
    expect(parseInline('**open')).toEqual([text('**open')])
  })

  it('handles backslash escapes and entities', () => {
    expect(parseInline('\\# 1\\. \\*not em\\* &amp; &#8594; &copy;')).toEqual([
      text('# 1. *not em* & → ©'),
    ])
  })

  it('parses links with titles, angle destinations and nested parentheses', () => {
    expect(parseInline('[Feature List](Feature%20List.md "The list")')).toEqual([
      {
        type: 'link',
        href: 'Feature%20List.md',
        title: 'The list',
        children: [text('Feature List')],
      },
    ])
    expect(parseInline('[a](<my file.md>) [b](https://x.test/a_(b))')).toEqual([
      { type: 'link', href: 'my file.md', children: [text('a')] },
      text(' '),
      { type: 'link', href: 'https://x.test/a_(b)', children: [text('b')] },
    ])
  })

  it('parses images and autolinks, trimming trailing punctuation from bare URLs', () => {
    expect(parseInline('![Domain model](diagrams/model.png)')).toEqual([
      { type: 'image', src: 'diagrams/model.png', alt: 'Domain model' },
    ])
    expect(parseInline('see https://github.com/dawn-care/DAWN/issues.')).toEqual([
      text('see '),
      {
        type: 'link',
        href: 'https://github.com/dawn-care/DAWN/issues',
        children: [text('https://github.com/dawn-care/DAWN/issues')],
      },
      text('.'),
    ])
    expect(parseInline('<https://a.test>')).toEqual([
      { type: 'link', href: 'https://a.test', children: [text('https://a.test')] },
    ])
  })

  it('makes hard breaks from two trailing spaces, a backslash, or <br>', () => {
    expect(parseInline('a  \nb\\\nc<br>d\ne')).toEqual([
      text('a'),
      { type: 'break' },
      text('b'),
      { type: 'break' },
      text('c'),
      { type: 'break' },
      text('d\ne'),
    ])
  })

  it('shows other raw HTML as text', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual([text('<script>alert(1)</script>')])
  })

  it('does not parse markup inside code spans', () => {
    expect(parseInline('`**a** [b](c)`')).toEqual([{ type: 'code', value: '**a** [b](c)' }])
  })
})

describe('parseMarkdown', () => {
  it('parses headings with ids, paragraphs and thematic breaks', () => {
    const blocks = parseMarkdown('# **Title**\n\nSome text\nmore text\n\n---\n\n## Scope\n## Scope')
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'hr', 'heading', 'heading'])
    expect(blocks[0]).toMatchObject({ level: 1, id: 'title' })
    expect(blocks[1]).toEqual({ type: 'paragraph', children: [text('Some text\nmore text')] })
    expect(blocks[3]).toMatchObject({ id: 'scope' })
    expect(blocks[4]).toMatchObject({ id: 'scope-1' })
  })

  it('parses nested tight lists with trailing-space line endings', () => {
    const [list] = parseMarkdown(
      '* **Software**  \n  * Go tests  \n  * Jest\n* Hardware  \n',
    ) as Extract<Block, { type: 'list' }>[]
    expect(list).toMatchObject({ type: 'list', ordered: false, tight: true })
    expect(list.items).toHaveLength(2)
    const [paragraph, nested] = list.items[0].children
    expect(paragraph).toEqual({
      type: 'paragraph',
      children: [{ type: 'strong', children: [text('Software')] }],
    })
    expect(nested).toMatchObject({ type: 'list', items: [{}, {}] })
    expect(list.items[1].children).toEqual([{ type: 'paragraph', children: [text('Hardware')] }])
  })

  it('parses ordered lists with a start number and loose lists', () => {
    const [list] = parseMarkdown('3. one\n\n4. two\n') as Extract<Block, { type: 'list' }>[]
    expect(list).toMatchObject({ ordered: true, start: 3, tight: false })
    expect(list.items).toHaveLength(2)
  })

  it('parses task list items', () => {
    const [list] = parseMarkdown('- [x] done\n- [ ] todo') as Extract<Block, { type: 'list' }>[]
    expect(list.items.map((item) => item.checked)).toEqual([true, false])
    expect(list.items[0].children).toEqual([{ type: 'paragraph', children: [text('done')] }])
  })

  it('does not let a numbered sentence interrupt a paragraph', () => {
    const blocks = parseMarkdown('The year was\n2026. It was good.')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('paragraph')
  })

  it('parses tables with alignment, escaped pipes and ragged rows', () => {
    const [table] = parseMarkdown(
      '| \\# | Metric | Target |\n| :---- | :----: | ---: |\n| 1 | a \\| b |\n| 2 | c | d | extra |',
    ) as Extract<Block, { type: 'table' }>[]
    expect(table.type).toBe('table')
    expect(table.align).toEqual(['left', 'center', 'right'])
    expect(table.head).toEqual([[text('#')], [text('Metric')], [text('Target')]])
    expect(table.rows).toEqual([
      [[text('1')], [text('a | b')], []],
      [[text('2')], [text('c')], [text('d')]],
    ])
  })

  it('parses fenced code and block quotes', () => {
    const blocks = parseMarkdown(
      '```ts\nconst a = 1\n\n*not em*\n```\n\n> quoted\nlazy\n\n> # inner',
    )
    expect(blocks[0]).toEqual({ type: 'code', lang: 'ts', value: 'const a = 1\n\n*not em*' })
    expect(blocks[1]).toEqual({
      type: 'blockquote',
      children: [{ type: 'paragraph', children: [text('quoted\nlazy')] }],
    })
    expect(blocks[2]).toMatchObject({ type: 'blockquote', children: [{ type: 'heading' }] })
  })

  it('treats an unclosed fence as running to the end', () => {
    expect(parseMarkdown('```\ncode')).toEqual([{ type: 'code', lang: '', value: 'code' }])
  })

  it('handles CRLF line endings and a BOM', () => {
    expect(parseMarkdown('\ufeff# A\r\n\r\nb')).toMatchObject([
      { type: 'heading' },
      { type: 'paragraph' },
    ])
  })
})

describe('blocksText', () => {
  it('flattens a document to searchable text', () => {
    const blocks = parseMarkdown('# Title\n\n* **One** item\n\n| a | b |\n| - | - |\n| c | d |')
    expect(blocksText(blocks)).toBe('Title\nOne item\na · b\nc · d')
  })
})

describe('headingSlugger', () => {
  it('matches GitHub anchors', () => {
    const slug = headingSlugger()
    expect(slug('D.A.W.N: Daily Awareness & Well-being Navigator')).toBe(
      'dawn-daily-awareness--well-being-navigator',
    )
    expect(slug('In Scope (this year)')).toBe('in-scope-this-year')
    expect(slug('1. PR Size')).toBe('1-pr-size')
  })
})
