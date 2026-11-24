import { describe, expect, it } from 'vitest'
import { resolveFields, type RawField } from './github/project.js'
import { InputError, parseCreateTask, parseItemId, parsePatchTask } from './taskInput.js'

const FIELDS: RawField[] = [
  {
    id: 'F_status',
    name: 'Status',
    dataType: 'SINGLE_SELECT',
    options: [
      { id: 'S_pb', name: 'Product Backlog' },
      { id: 'S_ab', name: 'Active Backlog (DEADLINE 12-16-26)' },
      { id: 'S_done', name: 'Done' },
    ],
  },
  {
    id: 'F_iter',
    name: 'Iteration',
    dataType: 'ITERATION',
  },
  { id: 'F_est', name: 'Estimate', dataType: 'NUMBER' },
  {
    id: 'F_pri',
    name: 'Priority',
    dataType: 'SINGLE_SELECT',
    options: [{ id: 'PR_0', name: 'P0' }],
  },
  { id: 'F_done', name: 'Estimated done date', dataType: 'DATE' },
  {
    id: 'F_type',
    name: 'Type',
    dataType: 'SINGLE_SELECT',
    options: [{ id: 'T_dev', name: 'Dev' }],
  },
]

const META = resolveFields({ id: 'PVT', url: 'u' }, FIELDS)

const create = (body: unknown) => parseCreateTask(body, META)
const patch = (body: unknown) => parsePatchTask(body, META)

describe('parseCreateTask', () => {
  it('accepts a full, valid task and maps each key to its field', () => {
    expect(
      create({
        title: '  Write the test plan  ',
        body: 'Notes',
        assigneeIds: ['U1', 'U1', 'U2'],
        estimateHours: 4.5,
        priorityOptionId: 'PR_0',
        doneBy: '2026-10-05',
        typeOptionId: 'T_dev',
        statusOptionId: 'S_done',
      }),
    ).toEqual({
      title: 'Write the test plan',
      body: 'Notes',
      assigneeIds: ['U1', 'U2'],
      fields: {
        status: { kind: 'singleSelect', optionId: 'S_done' },
        estimate: { kind: 'number', number: 4.5 },
        priority: { kind: 'singleSelect', optionId: 'PR_0' },
        doneBy: { kind: 'date', date: '2026-10-05' },
        type: { kind: 'singleSelect', optionId: 'T_dev' },
      },
    })
  })

  it('defaults status to Product Backlog', () => {
    expect(create({ title: 't' }).fields.status).toEqual({
      kind: 'singleSelect',
      optionId: 'S_pb',
    })
  })

  it.each([
    [{}, /Title is required/],
    [{ title: '   ' }, /Title is required/],
    [{ title: 42 }, /Title must be text/],
    [{ title: 'x'.repeat(257) }, /at most 256/],
    [{ title: 't', estimateHours: -1 }, /between 0 and 200/],
    [{ title: 't', estimateHours: 200.5 }, /between 0 and 200/],
    [{ title: 't', estimateHours: '3' }, /must be a number/],
    [{ title: 't', doneBy: '2026-02-30' }, /must be a date/],
    [{ title: 't', doneBy: '2026-10-05T00:00:00Z' }, /must be a date/],
    [{ title: 't', doneBy: '10/05/2026' }, /must be a date/],
    [{ title: 't', priorityOptionId: 'nope' }, /Priority option is not one of/],
    [{ title: 't', statusOptionId: 'PR_0' }, /Status option is not one of/],
    // Sprints are gone: the site no longer reads or writes the Iteration field.
    [{ title: 't', iterationId: 'I_2' }, /Unknown field\(s\): iterationId/],
    [{ title: 't', sizeOptionId: 'SZ_m' }, /no "Size" field/],
    [{ title: 't', assigneeIds: 'U1' }, /list of GitHub user ids/],
    [{ title: 't', assigneeIds: [''] }, /list of GitHub user ids/],
    [{ title: 't', assigneeIds: Array.from({ length: 11 }, (_, i) => `U${i}`) }, /at most 10/],
    [{ title: 't', priorityOptionId: null }, /can't be empty/],
    [{ title: 't', colour: 'red' }, /Unknown field\(s\): colour/],
    [null, /JSON object/],
    [['t'], /JSON object/],
  ])('rejects %j', (body, message) => {
    expect(() => create(body)).toThrow(InputError)
    expect(() => create(body)).toThrow(message)
  })

  it('accepts the estimate bounds', () => {
    expect(create({ title: 't', estimateHours: 0 }).fields.estimate).toEqual({
      kind: 'number',
      number: 0,
    })
    expect(create({ title: 't', estimateHours: 200 }).fields.estimate).toBeTruthy()
  })
})

describe('parsePatchTask', () => {
  it('turns null into a clear, and keeps only the keys sent', () => {
    expect(patch({ priorityOptionId: null, doneBy: '2026-10-01' })).toEqual({
      fields: { priority: null, doneBy: { kind: 'date', date: '2026-10-01' } },
    })
  })

  it('accepts content-only changes', () => {
    expect(patch({ title: 'New', assigneeIds: [] })).toEqual({
      title: 'New',
      assigneeIds: [],
      fields: {},
    })
  })

  it('does not apply a default status', () => {
    expect(patch({ estimateHours: 2 }).fields).not.toHaveProperty('status')
  })

  it.each([
    [{}, /Nothing to change/],
    [{ title: '' }, /Title is required/],
    [{ estimateHours: 999 }, /between 0 and 200/],
    [{ sizeOptionId: null }, /no "Size" field/],
    [{ itemId: 'x' }, /Unknown field/],
  ])('rejects %j', (body, message) => {
    expect(() => patch(body)).toThrow(message)
  })
})

describe('parseItemId', () => {
  it('accepts node ids and rejects anything else', () => {
    expect(parseItemId('PVTI_lADOA-12_x')).toBe('PVTI_lADOA-12_x')
    expect(parseItemId(['PVTI_1'])).toBe('PVTI_1')
    expect(() => parseItemId('../etc')).toThrow(InputError)
    expect(() => parseItemId(undefined)).toThrow(InputError)
  })
})
