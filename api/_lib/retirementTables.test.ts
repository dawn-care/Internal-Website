import { describe, expect, it } from 'vitest'
import {
  CK,
  applyTableAction,
  ckMoves,
  seatedAt,
  type Seated,
  type TableState,
} from '../../retirement/shared/tables.js'

/* The board-game rules shared by the server, the game and the offline stand-in. */

const T = 'table:14,13'
const seated: Seated = [
  { login: 'ada', name: 'Ada' },
  { login: 'grace', name: 'Grace' },
]
const sq = (r: number, c: number) => r * CK + c

function checkers(place: Record<number, number>, turn: 0 | 1 = 0): TableState {
  const t = applyTableAction(T, null, { type: 'start', game: 'checkers' }, 'ada', seated, 0)
  t.board = new Array<number>(CK * CK).fill(0)
  for (const [i, v] of Object.entries(place)) t.board[Number(i)] = v
  t.turn = turn
  return t
}

describe('checkers rules', () => {
  it('starts with twelve pieces each on the dark squares', () => {
    const fresh = applyTableAction(T, null, { type: 'start', game: 'checkers' }, 'ada', seated, 0)
    expect(fresh.board.filter((v) => v === 1)).toHaveLength(12)
    expect(fresh.board.filter((v) => v === 3)).toHaveLength(12)
    expect(fresh.board.every((v, i) => !v || (Math.floor(i / CK) + (i % CK)) % 2 === 1)).toBe(true)
  })

  it('moves men forward only, kings both ways', () => {
    expect(ckMoves(checkers({ [sq(5, 2)]: 1 }).board, 0).sort()).toEqual(
      [
        [sq(5, 2), sq(4, 1)],
        [sq(5, 2), sq(4, 3)],
      ].sort(),
    )
    expect(ckMoves(checkers({ [sq(5, 2)]: 2 }).board, 0)).toHaveLength(4)
  })

  it('makes captures compulsory and carries on a multiple jump', () => {
    const t = checkers({
      [sq(6, 1)]: 1,
      [sq(5, 2)]: 3,
      [sq(3, 4)]: 3,
      [sq(7, 6)]: 1,
      [sq(0, 7)]: 3,
    })
    expect(ckMoves(t.board, 0)).toEqual([[sq(6, 1), sq(4, 3), sq(2, 5)]])
    expect(() =>
      applyTableAction(T, t, { type: 'move', path: [sq(7, 6), sq(6, 5)] }, 'ada', seated, 1),
    ).toThrow(/compulsory/)
    expect(() =>
      applyTableAction(T, t, { type: 'move', path: [sq(6, 1), sq(4, 3)] }, 'ada', seated, 1),
    ).toThrow()
    const next = applyTableAction(
      T,
      t,
      { type: 'move', path: [sq(6, 1), sq(4, 3), sq(2, 5)] },
      'ada',
      seated,
      1,
    )
    expect(next.board[sq(5, 2)]).toBe(0)
    expect(next.board[sq(3, 4)]).toBe(0)
    expect(next.board[sq(2, 5)]).toBe(1)
    expect(next.turn).toBe(1)
  })

  it('crowns a man on the far row, and the crowning ends the move', () => {
    const t = checkers({ [sq(2, 1)]: 1, [sq(1, 2)]: 3, [sq(1, 4)]: 3, [sq(7, 0)]: 3 })
    // Jumping to (0,3) crowns it; it may not then jump on as a king over (1,4).
    expect(ckMoves(t.board, 0)).toEqual([[sq(2, 1), sq(0, 3)]])
    const next = applyTableAction(
      T,
      t,
      { type: 'move', path: [sq(2, 1), sq(0, 3)] },
      'ada',
      seated,
      1,
    )
    expect(next.board[sq(0, 3)]).toBe(2)
  })

  it('wins when the other side has no move left', () => {
    const t = checkers({ [sq(3, 2)]: 1, [sq(2, 3)]: 3 })
    const next = applyTableAction(
      T,
      t,
      { type: 'move', path: [sq(3, 2), sq(1, 4)] },
      'ada',
      seated,
      1,
    )
    expect(next.result).toEqual({ winner: 0, why: 'win' })
  })

  it('needs the player to be sitting at the table to move', () => {
    const t = checkers({ [sq(5, 2)]: 1, [sq(0, 1)]: 3 })
    expect(() =>
      applyTableAction(
        T,
        t,
        { type: 'move', path: [sq(5, 2), sq(4, 3)] },
        'ada',
        [null, seated[1]],
        1,
      ),
    ).toThrow(/Sit back down/)
  })
})

describe('Connect 4 rules', () => {
  it('finds diagonal wins and full-board draws', () => {
    let t = applyTableAction(T, null, { type: 'start', game: 'connect4' }, 'ada', seated, 0)
    for (const [who, col] of [
      ['ada', 0],
      ['grace', 1],
      ['ada', 1],
      ['grace', 2],
      ['ada', 2],
      ['grace', 3],
      ['ada', 2],
      ['grace', 3],
      ['ada', 3],
      ['grace', 6],
      ['ada', 3],
    ] as const)
      t = applyTableAction(T, t, { type: 'move', path: [col] }, who, seated, 1)
    expect(t.result).toEqual({ winner: 0, why: 'win' })
    expect(t.last).toHaveLength(4)
  })
})

describe('seatedAt', () => {
  it('gives each stool to whoever sat first, on the grounds only', () => {
    const p = (login: string, sit: string, sitAt: number, map = 'grounds') => ({
      login,
      map: map as 'grounds',
      sit,
      sitAt,
      look: { name: login },
    })
    expect(
      seatedAt(T, [
        p('grace', `${T}:0`, 200),
        p('ada', `${T}:0`, 100),
        p('lin', `${T}:1`, 50, 'hall'),
        p('bo', 'table:33,13:1', 10),
      ]),
    ).toEqual([{ login: 'ada', name: 'ada' }, null])
  })
})
