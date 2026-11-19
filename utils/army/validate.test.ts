import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pointsTotal, validateList, type BuilderList, type BuilderUnit } from './validate.ts'

const sheet = (id: number, role: BuilderUnit['datasheet']['role'] = 'other', leads: number[] = []) => ({
  id,
  name: `Sheet ${id}`,
  role,
  factionId: 1,
  leads,
})
let n = 0
const unit = (datasheet: BuilderUnit['datasheet'], extra: Partial<BuilderUnit> = {}): BuilderUnit => ({
  id: `u${++n}`,
  datasheet,
  points: 100,
  enhancement: null,
  attachedToId: null,
  ...extra,
})
const list = (units: BuilderUnit[], extra: Partial<BuilderList> = {}): BuilderList => ({
  pointsLimit: 2000,
  allowedFactionIds: [1],
  detachmentId: 10,
  units,
  ...extra,
})
const messages = (l: BuilderList) => validateList(l).map((i) => `${i.level}: ${i.message}`)

test('an empty list has no issues', () => {
  assert.deepEqual(validateList(list([], { detachmentId: null })), [])
})

test('a legal list has no issues', () => {
  const captain = sheet(1, 'character', [2])
  const troops = sheet(2, 'battleline')
  const t = unit(troops)
  assert.deepEqual(
    messages(
      list([
        t,
        unit(captain, { attachedToId: t.id, enhancement: { id: 5, name: 'Charm', points: 15, detachmentId: 10 } }),
      ]),
    ),
    [],
  )
})

test('points over the limit', () => {
  const l = list([unit(sheet(1), { points: 1500 }), unit(sheet(2), { points: 600 })])
  assert.equal(pointsTotal(l.units), 2100)
  assert.deepEqual(messages(l), ['error: 100 pts over the 2000 pt limit.'])
})

test('enhancement points count towards the total', () => {
  const u = unit(sheet(1, 'character'), { points: 80, enhancement: { id: 1, name: 'E', points: 20, detachmentId: 10 } })
  assert.equal(pointsTotal([u]), 100)
})

test('Rule of Three, with Battleline at six and Epic Heroes at one', () => {
  const s = sheet(1)
  const b = sheet(2, 'battleline')
  const e = sheet(3, 'epic_hero')
  const units = [
    ...Array.from({ length: 4 }, () => unit(s, { points: 1 })),
    ...Array.from({ length: 6 }, () => unit(b, { points: 1 })),
    unit(e, { points: 1 }),
    unit(e, { points: 1 }),
  ]
  assert.deepEqual(messages(list(units)), [
    'error: Sheet 1 is included 4 times; the limit is 3.',
    'error: Sheet 3 is an Epic Hero and can only be included once.',
  ])
})

test('enhancements: characters only, once each, from the detachment, three at most', () => {
  const ch = sheet(1, 'character')
  const enh = (id: number, detachmentId = 10) => ({ id, name: `E${id}`, points: 0, detachmentId })
  const units = [
    unit(ch, { enhancement: enh(1) }),
    unit(ch, { enhancement: enh(1) }),
    unit(sheet(2, 'epic_hero'), { enhancement: enh(2) }),
    unit(sheet(3), { enhancement: enh(3, 99) }),
  ]
  assert.deepEqual(messages(list(units)), [
    'error: 4 Enhancements; an army can have at most 3.',
    "error: Sheet 2 is an Epic Hero and can't take an Enhancement.",
    "error: Sheet 3 isn't a Character, so it can't take E3.",
    "error: E3 isn't from this army's detachment.",
    'error: E1 is taken more than once.',
  ])
})

test('leaders must be allowed to lead the unit, and one per unit is the norm', () => {
  const troops = sheet(2)
  const t = unit(troops)
  const goodLeader = sheet(1, 'character', [2])
  const badLeader = sheet(3, 'character', [99])
  const units = [t, unit(goodLeader, { attachedToId: t.id }), unit(badLeader, { attachedToId: t.id })]
  assert.deepEqual(messages(list(units)), [
    "error: Sheet 3 can't lead Sheet 2.",
    'warning: Sheet 2 has 2 Leaders attached; most units allow only one.',
  ])
})

test('units from other factions and a missing detachment are flagged', () => {
  const foreign = { ...sheet(1), factionId: 7 }
  assert.deepEqual(messages(list([unit(foreign)], { detachmentId: null })), [
    'warning: Choose a detachment.',
    "error: Sheet 1 isn't from this army's faction.",
  ])
})
