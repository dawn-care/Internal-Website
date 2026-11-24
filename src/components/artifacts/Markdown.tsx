import { ImageOff, Square, SquareCheck } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  inlineText,
  resolveArtifactImage,
  resolveArtifactLink,
  type Align,
  type ArtifactDoc,
  type ArtifactsResponse,
  type Block,
  type Inline,
} from '../../lib/artifacts'
import ExternalLinkLabel from '../ExternalLinkLabel'

/*
 * Renders a parsed Artifacts document (src/lib/artifacts/markdown.ts) as React elements:
 * no HTML strings, so a document can't inject markup or scripts. Colors are semantic tokens
 * only, so it follows the light/dark theme.
 */

export interface MarkdownContext {
  doc: ArtifactDoc
  /** Repo path → slug of every document, for links between documents. */
  slugByPath: ReadonlyMap<string, string>
  /** The GitHub repo, for links to files the site doesn't show. */
  source: ArtifactsResponse['source']
  /** Repo paths of images /api/artifacts can serve. */
  assets: ReadonlySet<string>
}

const LINK = 'rounded-sm text-link underline underline-offset-4 hover:decoration-2'

const HEADING_CLASSES: Record<number, string> = {
  1: 'text-4xl font-semibold',
  2: 'mt-12 text-2xl font-semibold',
  3: 'mt-8 text-xl font-semibold',
  4: 'mt-6 text-lg font-semibold',
  5: 'mt-6 font-semibold',
  6: 'mt-6 text-sm font-semibold tracking-wider text-ink-muted uppercase',
}

const ALIGN_CLASSES: Record<Exclude<Align, null>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export default function Markdown({
  blocks,
  context,
}: {
  blocks: Block[]
  context: MarkdownContext
}) {
  return <div className="text-ink">{renderBlocks(blocks, context)}</div>
}

function renderBlocks(blocks: Block[], ctx: MarkdownContext): ReactNode {
  return blocks.map((block, i) => <Fragment key={i}>{renderBlock(block, ctx, i === 0)}</Fragment>)
}

function renderBlock(block: Block, ctx: MarkdownContext, first: boolean): ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as const
      // The first heading of the document sits right under the page header.
      const spacing =
        first && block.level > 1
          ? HEADING_CLASSES[block.level].replace(/mt-\d+/, 'mt-0')
          : HEADING_CLASSES[block.level]
      return (
        <Tag id={block.id} className={spacing}>
          {renderInlines(block.children, ctx, true)}
        </Tag>
      )
    }
    case 'paragraph':
      return (
        <p className={first ? 'leading-relaxed' : 'mt-4 leading-relaxed'}>
          {renderInlines(block.children, ctx, false)}
        </p>
      )
    case 'list': {
      const hasTasks = block.items.some((item) => item.checked !== null)
      const listClass = `${first ? '' : 'mt-4'} space-y-1.5 ${hasTasks ? 'pl-1' : 'pl-6'} ${
        block.ordered ? 'list-decimal' : 'list-disc'
      } marker:text-ink-muted`
      const items = block.items.map((item, i) => (
        <li
          key={i}
          className={`leading-relaxed ${item.checked !== null ? 'flex list-none items-start gap-2' : ''}`}
        >
          {item.checked !== null && <TaskBox checked={item.checked} />}
          <div className={item.checked !== null ? 'min-w-0' : 'contents'}>
            {renderListItem(item.children, ctx, block.tight)}
          </div>
        </li>
      ))
      return block.ordered ? (
        <ol start={block.start === 1 ? undefined : block.start} className={listClass}>
          {items}
        </ol>
      ) : (
        <ul className={listClass}>{items}</ul>
      )
    }
    case 'blockquote':
      return (
        <blockquote className="mt-4 border-l-4 border-accent pl-4 text-ink-muted">
          {renderBlocks(block.children, ctx)}
        </blockquote>
      )
    case 'code':
      return (
        <pre
          tabIndex={0}
          className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface p-4 font-mono text-sm leading-relaxed"
        >
          <code>{block.value}</code>
        </pre>
      )
    case 'table':
      return <Table block={block} ctx={ctx} />
    case 'hr':
      return <hr className="my-10 horizon-line w-24" />
  }
}

/** A list item's blocks. In a tight list its text isn't a spaced-out paragraph. */
function renderListItem(blocks: Block[], ctx: MarkdownContext, tight: boolean): ReactNode {
  return blocks.map((block, i) => {
    if (block.type === 'list') {
      return (
        <div key={i} className="mt-1.5">
          {renderBlock(block, ctx, true)}
        </div>
      )
    }
    if (tight && block.type === 'paragraph') {
      return (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderInlines(block.children, ctx, false)}
        </Fragment>
      )
    }
    return <Fragment key={i}>{renderBlock(block, ctx, i === 0)}</Fragment>
  })
}

function TaskBox({ checked }: { checked: boolean }) {
  const Icon = checked ? SquareCheck : Square
  return (
    <>
      <Icon
        aria-hidden="true"
        className={`mt-1 size-4 shrink-0 ${checked ? 'text-link' : 'text-ink-muted'}`}
      />
      <span className="sr-only">{checked ? 'Done: ' : 'Not done: '}</span>
    </>
  )
}

function Table({ block, ctx }: { block: Extract<Block, { type: 'table' }>; ctx: MarkdownContext }) {
  // Columns of long text (user stories, descriptions) get room to read; the table scrolls
  // sideways on narrow screens instead of squeezing them into a tall sliver.
  const prose = block.head.map((_, c) =>
    block.rows.some((row) => inlineText(row[c] ?? []).length > 60),
  )
  const cellClass = (column: number) => {
    const align = block.align[column]
    return `px-4 py-2.5 align-top ${align ? ALIGN_CLASSES[align] : 'text-left'} ${
      prose[column] ? 'min-w-64' : 'min-w-24'
    }`
  }
  return (
    // Focusable so keyboard users can scroll a wide table sideways.
    <div
      tabIndex={0}
      role="region"
      aria-label="Table"
      className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface"
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {block.head.map((cell, c) => (
              <th key={c} scope="col" className={`${cellClass(c)} font-semibold whitespace-nowrap`}>
                {renderInlines(cell, ctx, false)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r} className="border-t border-border">
              {row.map((cell, c) => (
                <td key={c} className={`${cellClass(c)} leading-relaxed`}>
                  {renderInlines(cell, ctx, false)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderInlines(nodes: Inline[], ctx: MarkdownContext, inHeading: boolean): ReactNode {
  return nodes.map((node, i) => <Fragment key={i}>{renderInline(node, ctx, inHeading)}</Fragment>)
}

function renderInline(node: Inline, ctx: MarkdownContext, inHeading: boolean): ReactNode {
  switch (node.type) {
    case 'text':
      return node.value
    case 'break':
      return <br />
    case 'strong':
      // Exported docs bold every heading; the heading style already carries the weight.
      return inHeading ? (
        renderInlines(node.children, ctx, inHeading)
      ) : (
        <strong className="font-semibold">{renderInlines(node.children, ctx, inHeading)}</strong>
      )
    case 'em':
      return <em>{renderInlines(node.children, ctx, inHeading)}</em>
    case 'del':
      return <del>{renderInlines(node.children, ctx, inHeading)}</del>
    case 'code':
      return (
        <code className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.875em]">
          {node.value}
        </code>
      )
    case 'link':
      return <MarkdownLink node={node} ctx={ctx} inHeading={inHeading} />
    case 'image':
      return <MarkdownImage node={node} ctx={ctx} />
  }
}

function MarkdownLink({
  node,
  ctx,
  inHeading,
}: {
  node: Extract<Inline, { type: 'link' }>
  ctx: MarkdownContext
  inHeading: boolean
}) {
  const children = renderInlines(node.children, ctx, inHeading)
  const target = resolveArtifactLink(node.href, ctx.doc, ctx.slugByPath, ctx.source)
  switch (target.kind) {
    case 'internal':
      return (
        <Link to={target.to} title={node.title} className={LINK}>
          {children}
        </Link>
      )
    case 'anchor':
      return (
        <a href={target.href} title={node.title} className={LINK}>
          {children}
        </a>
      )
    case 'external':
      return (
        <a
          href={target.href}
          title={node.title}
          target="_blank"
          rel="noreferrer"
          className={`${LINK} inline-flex items-baseline gap-1`}
        >
          {children}
          <ExternalLinkLabel />
        </a>
      )
    case 'none':
      // An unsafe or unresolvable URL: keep the words, drop the link.
      return <>{children}</>
  }
}

function MarkdownImage({
  node,
  ctx,
}: {
  node: Extract<Inline, { type: 'image' }>
  ctx: MarkdownContext
}) {
  const src = resolveArtifactImage(node.src, ctx.doc, ctx.assets)
  if (!src) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1 text-sm text-ink-muted">
        <ImageOff aria-hidden="true" className="size-4" />
        {node.alt ? `Image not available: ${node.alt}` : 'Image not available'}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={node.alt}
      title={node.title}
      loading="lazy"
      // Diagrams are usually drawn on white; keep them legible in dark mode too.
      className="my-2 inline-block max-w-full rounded-xl border border-border bg-white"
    />
  )
}
