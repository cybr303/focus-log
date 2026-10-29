import { format } from 'date-fns'
import type { ActiveSession, AppData, Module, Pause, Productivity, Session, Topic } from './types'

export const BACKUP_APP = 'focuslog'
export const BACKUP_VERSION = 1

export interface Backup {
  app: typeof BACKUP_APP
  version: typeof BACKUP_VERSION
  exportedAt: string
  data: AppData
}

export type ParseResult = { ok: true; data: AppData } | { ok: false; error: string }

export const buildBackup = (data: AppData, now = Date.now()): Backup => ({
  app: BACKUP_APP,
  version: BACKUP_VERSION,
  exportedAt: new Date(now).toISOString(),
  data: { modules: data.modules, sessions: data.sessions, active: data.active },
})

/** 'focuslog-backup-2026-10-29.json' (local calendar date). */
export const backupFilename = (now = Date.now()): string => `focuslog-backup-${format(now, 'yyyy-MM-dd')}.json`

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** '3 modules, 41 sessions'. */
export const summarizeData = (data: AppData): string =>
  `${plural(data.modules.length, 'module')}, ${plural(data.sessions.length, 'session')}`

// ---------- Validation ----------

class Invalid extends Error {}
const fail = (msg: string): never => {
  throw new Invalid(msg)
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const obj = (v: unknown, where: string): Obj => (isObj(v) ? v : fail(`${where} is not an object.`))
const arr = (v: unknown, where: string): unknown[] => (Array.isArray(v) ? v : fail(`${where} is not a list.`))
const str = (o: Obj, key: string, where: string, { nonEmpty = false } = {}): string => {
  const v = o[key]
  if (typeof v !== 'string') return fail(`${where} has no valid "${key}".`)
  if (nonEmpty && !v.trim()) return fail(`${where} has an empty "${key}".`)
  return v
}
const num = (o: Obj, key: string, where: string): number =>
  isNum(o[key]) ? (o[key] as number) : fail(`${where} has no valid "${key}".`)
const ids = (o: Obj, key: string, where: string): string[] => {
  const list = arr(o[key], `${where} "${key}"`)
  if (!list.every((x) => typeof x === 'string')) fail(`${where} "${key}" must contain only ids.`)
  return list as string[]
}

const HEX = /^#[0-9a-f]{6}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/

const parseTopic = (v: unknown, where: string): Topic => {
  const o = obj(v, where)
  return { id: str(o, 'id', where, { nonEmpty: true }), name: str(o, 'name', where, { nonEmpty: true }), createdAt: num(o, 'createdAt', where) }
}

const parseModule = (v: unknown, i: number): Module => {
  const where = `Module ${i + 1}`
  const o = obj(v, where)
  const color = str(o, 'color', where)
  if (!HEX.test(color)) fail(`${where} has an invalid colour "${color}".`)
  const topics = arr(o.topics, `${where} topics`).map((t, j) => parseTopic(t, `${where}, topic ${j + 1}`))
  if (new Set(topics.map((t) => t.id)).size !== topics.length) fail(`${where} has duplicate topic ids.`)
  const m: Module = {
    id: str(o, 'id', where, { nonEmpty: true }),
    name: str(o, 'name', where, { nonEmpty: true }),
    color,
    emoji: str(o, 'emoji', where),
    topics,
    createdAt: num(o, 'createdAt', where),
  }
  if (o.examDate !== undefined && o.examDate !== null) {
    if (typeof o.examDate !== 'string' || !DATE.test(o.examDate)) fail(`${where} has an invalid exam date.`)
    m.examDate = o.examDate as string
  }
  return m
}

/** Checks the module exists and every topic belongs to it. */
const checkRefs = (modules: Map<string, Module>, moduleId: string, topicIds: string[], where: string) => {
  const m = modules.get(moduleId) ?? fail(`${where} refers to a module that doesn't exist.`)
  const own = new Set(m.topics.map((t) => t.id))
  if (topicIds.some((t) => !own.has(t))) fail(`${where} refers to a topic that doesn't exist.`)
}

const parseSession = (v: unknown, i: number, modules: Map<string, Module>): Session => {
  const where = `Session ${i + 1}`
  const o = obj(v, where)
  const s: Session = {
    id: str(o, 'id', where, { nonEmpty: true }),
    moduleId: str(o, 'moduleId', where),
    topicIds: ids(o, 'topicIds', where),
    start: num(o, 'start', where),
    end: num(o, 'end', where),
    pausedMs: num(o, 'pausedMs', where),
  }
  if (s.end < s.start) fail(`${where} ends before it starts.`)
  if (s.pausedMs < 0 || s.pausedMs > s.end - s.start) fail(`${where} has an invalid paused time.`)
  checkRefs(modules, s.moduleId, s.topicIds, where)
  if (o.productivity !== undefined) {
    const p = o.productivity
    if (!isNum(p) || !Number.isInteger(p) || p < 1 || p > 5) fail(`${where} has an invalid productivity rating.`)
    s.productivity = p as Productivity
  }
  if (o.note !== undefined) s.note = typeof o.note === 'string' ? o.note : fail(`${where} has an invalid note.`)
  if (o.manual !== undefined) s.manual = typeof o.manual === 'boolean' ? o.manual : fail(`${where} has an invalid "manual" flag.`)
  return s
}

const parseActive = (v: unknown, modules: Map<string, Module>): ActiveSession | null => {
  if (v === null || v === undefined) return null
  const where = 'The running session'
  const o = obj(v, where)
  const pauses = arr(o.pauses, `${where} pauses`).map((p, j): Pause => {
    const po = obj(p, `${where}, pause ${j + 1}`)
    const pause: Pause = { start: num(po, 'start', `${where}, pause ${j + 1}`) }
    if (po.end !== undefined && po.end !== null) pause.end = num(po, 'end', `${where}, pause ${j + 1}`)
    return pause
  })
  const a: ActiveSession = {
    id: str(o, 'id', where, { nonEmpty: true }),
    moduleId: str(o, 'moduleId', where),
    topicIds: ids(o, 'topicIds', where),
    start: num(o, 'start', where),
    pauses,
  }
  checkRefs(modules, a.moduleId, a.topicIds, where)
  return a
}

/**
 * Validates a backup file (raw JSON text or an already-parsed value) and returns clean AppData.
 * Unknown fields are dropped; anything structurally wrong is rejected with a readable message.
 */
export const parseBackup = (json: unknown): ParseResult => {
  try {
    let raw = json
    if (typeof json === 'string') {
      try {
        raw = JSON.parse(json)
      } catch {
        return { ok: false, error: "This file isn't valid JSON." }
      }
    }
    if (!isObj(raw) || raw.app !== BACKUP_APP) return { ok: false, error: "This doesn't look like a FocusLog backup." }
    if (raw.version !== BACKUP_VERSION) return { ok: false, error: `Unsupported backup version (${String(raw.version)}).` }
    const data = obj(raw.data, 'The backup data')

    const modules = arr(data.modules, 'Modules').map(parseModule)
    const byId = new Map(modules.map((m) => [m.id, m]))
    if (byId.size !== modules.length) fail('Two modules share the same id.')

    const sessions = arr(data.sessions, 'Sessions').map((s, i) => parseSession(s, i, byId))
    if (new Set(sessions.map((s) => s.id)).size !== sessions.length) fail('Two sessions share the same id.')

    const active = parseActive(data.active, byId)
    return { ok: true, data: { modules, sessions, active } }
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: `Invalid backup: ${e.message}` }
    throw e
  }
}
