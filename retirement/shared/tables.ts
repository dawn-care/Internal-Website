import { SaveError, type MapId } from './schema.js'

/*
 * Board-game tables: where they stand, the games' rules, and who is playing. Shared by the game
 * (to draw boards and show legal moves), the offline stand-in, and the server, which checks every
 * action against these same rules before storing it.
 *
 * A table is one tile with a stool on each side (seat places 0 = west and 1 = east). The two people
 * sitting on the stools are the ones who can start a game; once started, the game belongs to those
 * two logins, and only the one whose turn it is can move (while sitting at that table). Each
 * stored state carries a version: an action must name the version it was made against, so two
 * clicks can't overwrite each other.
 */

export type GameKind = 'connect4' | 'checkers'
export const GAME_KINDS: readonly GameKind[] = ['connect4', 'checkers']
export const GAME_NAMES: Record<GameKind, string> = { connect4: 'Connect 4', checkers: 'Checkers' }

/**
 * The tables on the grounds: the table tile, with stools at x - 1 and x + 1. A matching pair on the
 * lawns either side of the plaza, and one by the pond, in line with the Kitchen's path.
 */
export const TABLES: readonly { id: string; x: number; y: number }[] = [
  { id: 'table:14,13', x: 14, y: 13 },
  { id: 'table:33,13', x: 33, y: 13 },
  { id: 'table:40,21', x: 40, y: 21 },
]
export const TABLE_MAP: MapId = 'grounds'
const TABLE_IDS = new Set(TABLES.map((t) => t.id))

export function isTableId(v: unknown): v is string {
  return typeof v === 'string' && TABLE_IDS.has(v)
}

/** The seat id of a table's stool (see seatId in schema.ts). */
export function tableSeat(tableId: string, side: Side): string {
  return `${tableId}:${side}`
}

/** The table a seat id belongs to, and which side it is, if it's a stool. */
export function tableOfSeat(seat: string | undefined): { id: string; side: Side } | null {
  const m = seat ? /^(table:\d+,\d+):([01])$/.exec(seat) : null
  if (!m || !TABLE_IDS.has(m[1])) return null
  return { id: m[1], side: Number(m[2]) as Side }
}

export type Side = 0 | 1

export interface TableResult {
  /** null for a draw. */
  winner: Side | null
  why: 'win' | 'draw' | 'resign'
}

export interface TableState {
  id: string
  game: GameKind
  /** Logins playing each side (side 0 sits west, side 1 east). */
  players: [string, string]
  names: [string, string]
  /** Who moved first: red in Connect 4, dark in checkers. Alternates each game at a table. */
  first: Side
  turn: Side
  /**
   * Connect 4: 6 rows × 7 columns, row 0 at the top; 0 empty, 1 side 0, 2 side 1.
   * Checkers: 8 × 8, row 0 at the top; 0 empty, 1 side-0 man, 2 side-0 king, 3 side-1 man,
   * 4 side-1 king. Side 0 starts at the bottom (rows 5–7) and moves up.
   */
  board: number[]
  /** Cells touched by the last move, to highlight it. */
  last: number[]
  /** Checkers: plies in a row with no capture and no man moving (a draw at QUIET_DRAW). */
  quiet: number
  result: TableResult | null
  /** Games started at this table, so who goes first can alternate. */
  round: number
  version: number
  updatedAt: number
}

export type TableAction =
  | { type: 'start'; game: GameKind }
  /** Connect 4: [column]. Checkers: the squares visited, starting with the piece's own. */
  | { type: 'move'; path: number[] }
  | { type: 'resign' }

/** Who is sitting on each stool: login and name, or null. */
export type Seated = [
  { login: string; name: string } | null,
  { login: string; name: string } | null,
]

export const C4_COLS = 7
export const C4_ROWS = 6
export const CK = 8
/** 40 moves each without a capture or a man moving: a draw. */
export const QUIET_DRAW = 80
const MAX_PATH = 12

// --- Connect 4 -------------------------------------------------------------------------------

/** The row a piece dropped in `col` lands on, or -1 if the column is full. */
export function c4Drop(board: number[], col: number): number {
  for (let r = C4_ROWS - 1; r >= 0; r--) if (board[r * C4_COLS + col] === 0) return r
  return -1
}

/** The four (or more) cells in a row through (r, c), if the piece there has made one. */
export function c4Line(board: number[], r: number, c: number): number[] | null {
  const v = board[r * C4_COLS + c]
  if (!v) return null
  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    const cells = [r * C4_COLS + c]
    for (const s of [1, -1]) {
      let rr = r + dr * s
      let cc = c + dc * s
      while (rr >= 0 && rr < C4_ROWS && cc >= 0 && cc < C4_COLS && board[rr * C4_COLS + cc] === v) {
        cells.push(rr * C4_COLS + cc)
        rr += dr * s
        cc += dc * s
      }
    }
    if (cells.length >= 4) return cells
  }
  return null
}

// --- checkers --------------------------------------------------------------------------------

export function ckOwner(v: number): Side | -1 {
  return v === 1 || v === 2 ? 0 : v === 3 || v === 4 ? 1 : -1
}
export function ckKing(v: number): boolean {
  return v === 2 || v === 4
}

function ckStart(): number[] {
  const b = new Array<number>(CK * CK).fill(0)
  for (let r = 0; r < CK; r++)
    for (let c = 0; c < CK; c++) {
      if ((r + c) % 2 === 0) continue
      if (r < 3) b[r * CK + c] = 3
      else if (r > 4) b[r * CK + c] = 1
    }
  return b
}

function ckDirs(v: number): number[][] {
  if (ckKing(v))
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]
  const fwd = ckOwner(v) === 0 ? -1 : 1
  return [
    [fwd, -1],
    [fwd, 1],
  ]
}

const onBoard = (r: number, c: number) => r >= 0 && r < CK && c >= 0 && c < CK

/** Jump sequences from `sq` (piece `v`), each the list of squares landed on. */
function ckJumps(board: number[], sq: number, v: number): number[][] {
  const out: number[][] = []
  const r = Math.floor(sq / CK)
  const c = sq % CK
  for (const [dr, dc] of ckDirs(v)) {
    const mr = r + dr
    const mc = c + dc
    const lr = r + 2 * dr
    const lc = c + 2 * dc
    if (!onBoard(lr, lc)) continue
    const mid = mr * CK + mc
    const land = lr * CK + lc
    const o = ckOwner(board[mid])
    if (o === -1 || o === ckOwner(v) || board[land] !== 0) continue
    const next = board.slice()
    next[sq] = 0
    next[mid] = 0
    // A man that reaches the far row is crowned, and that ends the move.
    const crowned = !ckKing(v) && (lr === 0 || lr === CK - 1)
    next[land] = crowned ? v + 1 : v
    const more = crowned ? [] : ckJumps(next, land, v)
    if (more.length) for (const m of more) out.push([land, ...m])
    else out.push([land])
  }
  return out
}

/**
 * Every legal move for `side`, as full paths (the piece's square, then each square it lands on).
 * Captures are compulsory, and a capture must carry on while it can.
 */
export function ckMoves(board: number[], side: Side): number[][] {
  const jumps: number[][] = []
  const steps: number[][] = []
  for (let sq = 0; sq < CK * CK; sq++) {
    const v = board[sq]
    if (ckOwner(v) !== side) continue
    for (const j of ckJumps(board, sq, v)) jumps.push([sq, ...j])
    if (jumps.length) continue
    const r = Math.floor(sq / CK)
    const c = sq % CK
    for (const [dr, dc] of ckDirs(v)) {
      const to = (r + dr) * CK + (c + dc)
      if (onBoard(r + dr, c + dc) && board[to] === 0) steps.push([sq, to])
    }
  }
  return jumps.length ? jumps : steps
}

/** Plays a legal path; returns the new board and whether it captured or moved a man. */
function ckPlay(board: number[], path: number[]): { board: number[]; reset: boolean } {
  const b = board.slice()
  const v = b[path[0]]
  let piece = v
  let reset = !ckKing(v)
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1]
    const to = path[i]
    const fr = Math.floor(from / CK)
    const tr = Math.floor(to / CK)
    if (Math.abs(tr - fr) === 2) {
      b[((fr + tr) / 2) * CK + ((from % CK) + (to % CK)) / 2] = 0
      reset = true
    }
    b[from] = 0
    if (!ckKing(piece) && (tr === 0 || tr === CK - 1)) piece += 1
    b[to] = piece
  }
  return { board: b, reset }
}

// --- actions ---------------------------------------------------------------------------------

/** Whether the game on this table can be replaced by a new one. */
export function canStart(t: TableState | null, seated: Seated): boolean {
  if (!seated[0] || !seated[1] || seated[0].login === seated[1].login) return false
  if (!t || t.result) return true
  // A game in progress belongs to its two players; it's abandoned once they've left the stools.
  return t.players[0] !== seated[0].login || t.players[1] !== seated[1].login
}

/**
 * Applies `action` by `login` to table `id`. `seated` is who is on the stools right now. Throws a
 * SaveError (a 400) with a friendly message if the action isn't allowed. The version is bumped.
 */
export function applyTableAction(
  id: string,
  t: TableState | null,
  action: TableAction,
  login: string,
  seated: Seated,
  now: number,
): TableState {
  if (action.type === 'start') {
    if (!seated[0] || !seated[1]) throw new SaveError('You need someone sitting opposite to play.')
    if (seated[0].login !== login && seated[1].login !== login)
      throw new SaveError('Sit down at the table to start a game.')
    if (!canStart(t, seated)) throw new SaveError('Finish (or resign) the game in progress first.')
    const round = (t?.round ?? 0) + 1
    const first: Side = round % 2 === 1 ? 0 : 1
    return {
      id,
      game: action.game,
      players: [seated[0].login, seated[1].login],
      names: [seated[0].name, seated[1].name],
      first,
      turn: first,
      board: action.game === 'connect4' ? new Array<number>(C4_ROWS * C4_COLS).fill(0) : ckStart(),
      last: [],
      quiet: 0,
      result: null,
      round,
      version: (t?.version ?? 0) + 1,
      updatedAt: now,
    }
  }
  if (!t) throw new SaveError('There is no game on this table yet.')
  if (t.result) throw new SaveError('That game is over. Start a new one!')
  const side = t.players[0] === login ? 0 : t.players[1] === login ? 1 : -1
  if (side === -1) throw new SaveError("You're not playing this game.")
  const next: TableState = { ...t, version: t.version + 1, updatedAt: now }
  if (action.type === 'resign') {
    next.result = { winner: side === 0 ? 1 : 0, why: 'resign' }
    return next
  }
  if (t.turn !== side) throw new SaveError("It's not your turn yet.")
  if (seated[side]?.login !== login) throw new SaveError('Sit back down at the table to move.')
  const other: Side = side === 0 ? 1 : 0
  if (t.game === 'connect4') {
    const col = action.path[0]
    if (action.path.length !== 1 || !Number.isInteger(col) || col < 0 || col >= C4_COLS)
      throw new SaveError('Pick a column.')
    const row = c4Drop(t.board, col)
    if (row < 0) throw new SaveError('That column is full.')
    next.board = t.board.slice()
    next.board[row * C4_COLS + col] = side + 1
    const line = c4Line(next.board, row, col)
    next.last = line ?? [row * C4_COLS + col]
    if (line) next.result = { winner: side, why: 'win' }
    else if (next.board.every((v) => v !== 0)) next.result = { winner: null, why: 'draw' }
    else next.turn = other
    return next
  }
  const legal = ckMoves(t.board, side)
  const path = action.path
  if (!legal.some((m) => m.length === path.length && m.every((sq, i) => sq === path[i]))) {
    throw new SaveError(
      legal.some((m) => m.length > 2 || Math.abs(m[1] - m[0]) > CK + 1)
        ? 'You have a capture to make: jumping is compulsory.'
        : "That piece can't move there.",
    )
  }
  const played = ckPlay(t.board, path)
  next.board = played.board
  next.last = path
  next.quiet = played.reset ? 0 : t.quiet + 1
  if (!ckMoves(next.board, other).length) next.result = { winner: side, why: 'win' }
  else if (next.quiet >= QUIET_DRAW) next.result = { winner: null, why: 'draw' }
  else next.turn = other
  return next
}

/** A well-formed action, or a SaveError. */
export function validateTableAction(v: unknown): TableAction {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new SaveError('Send an action.')
  const o = v as Record<string, unknown>
  if (o.type === 'resign') return { type: 'resign' }
  if (o.type === 'start') {
    if (typeof o.game !== 'string' || !GAME_KINDS.includes(o.game as GameKind))
      throw new SaveError('Pick Connect 4 or checkers.')
    return { type: 'start', game: o.game as GameKind }
  }
  if (o.type === 'move') {
    const p = o.path
    if (
      !Array.isArray(p) ||
      p.length < 1 ||
      p.length > MAX_PATH ||
      !p.every((n) => Number.isInteger(n) && n >= 0 && n < CK * CK)
    )
      throw new SaveError('That move is not on the board.')
    return { type: 'move', path: p as number[] }
  }
  throw new SaveError('Unknown table action.')
}

/**
 * Who is sitting on each stool of table `id`, from everyone's presence on the table's map (one
 * person per stool: whoever sat first, as with benches).
 */
export function seatedAt(
  id: string,
  players: {
    login: string
    map: MapId
    sit?: string
    sitAt?: number
    look: { name: string }
  }[],
): Seated {
  const out: Seated = [null, null]
  const best: [number, number] = [Infinity, Infinity]
  for (const p of players) {
    if (p.map !== TABLE_MAP) continue
    const s = tableOfSeat(p.sit)
    if (!s || s.id !== id) continue
    const at = p.sitAt ?? 0
    const cur = out[s.side]
    if (at < best[s.side] || (at === best[s.side] && cur && p.login < cur.login)) {
      best[s.side] = at
      out[s.side] = { login: p.login, name: p.look.name }
    }
  }
  return out
}

/** Checks a stored table state is well-formed (e.g. read back from storage). */
export function parseTable(v: unknown): TableState | null {
  if (!v || typeof v !== 'object') return null
  const t = v as TableState
  if (!isTableId(t.id) || !GAME_KINDS.includes(t.game) || !Array.isArray(t.board)) return null
  if (typeof t.version !== 'number' || !Array.isArray(t.players)) return null
  return t
}
