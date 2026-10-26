/**
 * 面试星球的球面点（3D 与背景星图共用）
 * ------------------------------------------------------------
 * 同一批 191 个题，在控制台里折成一颗球，在背景里展开成一张星图。
 * 位置完全由题目 id / 题型决定，确定性生成，刷新不变。
 */
import { interviewGroups } from './data'
import { typeColor } from './dashboard'

export interface PlanetType {
  fileName: string
  type: string
  color: string
  total: number
  index: number
}

export interface PlanetPoint {
  id: string
  fileName: string
  type: string
  typeIndex: number
  color: string
  x: number
  y: number
  z: number
}

function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** 把 [0,count) 的第 i 个点均匀铺在球面上（带 0.5 偏移，避开正极点） */
function fibAt(i: number, count: number): [number, number, number] {
  const t = (i + 0.5) / count
  const y = 1 - 2 * t
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = i * 2.399963229728653
  return [Math.cos(theta) * r, y, Math.sin(theta) * r]
}

export const planetTypes: PlanetType[] = interviewGroups.map((g, i) => ({
  fileName: g.fileName,
  type: g.type,
  color: typeColor(g.fileName),
  total: g.questions.length,
  index: i,
}))

const anchors = planetTypes.map((t) => fibAt(t.index, planetTypes.length))

const flat = interviewGroups.flatMap((g, gi) =>
  g.questions.map((q) => ({
    id: q.id,
    fileName: g.fileName,
    type: g.type,
    typeIndex: gi,
    color: typeColor(g.fileName),
  }))
)

export const planetPoints: PlanetPoint[] = flat.map((e, i) => {
  const [bx, by, bz] = fibAt(i, flat.length)
  const [ax, ay, az] = anchors[e.typeIndex]

  let x = bx + (ax - bx) * 0.5
  let y = by + (ay - by) * 0.5
  let z = bz + (az - bz) * 0.5

  const len = Math.hypot(x, y, z) || 1
  x /= len
  y /= len
  z /= len

  x += (hash01(e.id + ':x') - 0.5) * 0.05
  y += (hash01(e.id + ':y') - 0.5) * 0.05
  z += (hash01(e.id + ':z') - 0.5) * 0.05

  const l2 = Math.hypot(x, y, z) || 1
  const r = 1 + (hash01(e.id + ':r') - 0.5) * 0.03

  return { ...e, x: (x / l2) * r, y: (y / l2) * r, z: (z / l2) * r }
})
