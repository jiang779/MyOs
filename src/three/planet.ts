/**
 * 面试星球
 * ------------------------------------------------------------
 * 一颗粒子 = 一道面试题。8 个题型 = 8 块「大陆」（球面锚点聚类），
 * 完成的题会被点亮；外圈一条 36 格轨道 = Agent 路线的 36 周。
 *
 * 技术要点（参考 Three.js 数据球常用做法）：
 * · Fibonacci 球面分布，避免极区堆积
 * · 单次 Points 绘制 + 逐顶点颜色/状态，191 个点也只要 1 个 draw call
 * · 粒子大小/透明度按视角与景深衰减，做出体积感
 * · 不做任何「随机漂浮」，每一颗粒子都能追溯到具体题目
 */
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { currentWeekNo } from '@/lib/data'
import { planetPoints, planetTypes } from '@/lib/planetPoints'

export interface HoverInfo {
  type: string
  fileName: string
  done: number
  total: number
}

export interface PlanetOptions {
  compact?: boolean
  onHover?: (info: HoverInfo | null, x: number, y: number) => void
  onPick?: (fileName: string) => void
}

export interface PlanetApi {
  setProgress(done: Set<string>): void
  setTheme(theme: 'light' | 'dark'): void
  flash(id: string): void
  dispose(): void
}

const POINT_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aState;
attribute float aSize;
attribute float aType;

uniform float uTime;
uniform float uPixel;
uniform float uHover;
uniform float uTheme;

varying vec3 vColor;
varying float vAlpha;
varying float vState;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;

  vec3 n = normalize(normalMatrix * normalize(position));
  float facing = smoothstep(-0.25, 0.85, n.z);

  float lit = aState;
  float hover = abs(aType - uHover) < 0.5 ? 1.0 : 0.0;
  float size = aSize * (1.0 + lit * 0.8 + hover * 0.3);
  gl_PointSize = size * uPixel * (2.5 / max(0.6, -mv.z));

  float floorA = uTheme > 0.5 ? 0.26 : 0.42;
  vAlpha = mix(floorA, 1.0, facing) * (0.58 + lit * 0.42) * (0.92 + hover * 0.08);
  vColor = aColor;
  vState = lit;
}
`

const POINT_FRAG = /* glsl */ `
uniform float uTheme;
varying vec3 vColor;
varying float vAlpha;
varying float vState;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.12, d);
  float halo = smoothstep(0.5, 0.0, d);
  float a = core * 0.92 + halo * 0.26;

  vec3 col = vColor;
  if (uTheme > 0.5) {
    // 深色：点亮的题加一点白热核心
    col += vec3(0.34) * vState * smoothstep(0.28, 0.0, d);
  } else {
    // 浅色：整体压深，点亮的题更深，靠明度而不是发光来区分
    col *= mix(0.74, 0.5, vState);
  }

  gl_FragColor = vec4(col, a * vAlpha);
  #include <colorspace_fragment>
}
`

const ATMO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;

void main() {
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

const ATMO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
varying vec3 vN;
varying vec3 vV;

void main() {
  float rim = pow(1.0 - abs(dot(vN, vV)), 4.0);
  gl_FragColor = vec4(uColor, rim * uAlpha);
  #include <colorspace_fragment>
}
`

interface Entry {
  id: string
  fileName: string
  type: string
  typeIndex: number
  color: Color
}

interface TypeMeta {
  fileName: string
  type: string
  total: number
  done: number
}

function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** 创建一个球体实例（数据与背景星图共用同一批球面点） */
export function createPlanet(canvas: HTMLCanvasElement, opts: PlanetOptions = {}): PlanetApi {
  const compact = !!opts.compact

  /* ---------------- 数据（与背景星图共用同一批点） ---------------- */
  const entries: Entry[] = planetPoints.map((p) => ({
    id: p.id,
    fileName: p.fileName,
    type: p.type,
    typeIndex: p.typeIndex,
    color: new Color(p.color),
  }))
  const meta: TypeMeta[] = planetTypes.map((t) => ({
    fileName: t.fileName,
    type: t.type,
    total: t.total,
    done: 0,
  }))

  const n = entries.length
  const positions: Vector3[] = planetPoints.map((p) => new Vector3(p.x, p.y, p.z))

  const indexById = new Map<string, number>()
  entries.forEach((e, i) => indexById.set(e.id, i))

  /* ---------------- 几何 ---------------- */
  const posArr = new Float32Array(n * 3)
  const colArr = new Float32Array(n * 3)
  const sizeArr = new Float32Array(n)
  const typeArr = new Float32Array(n)
  const stateArr = new Float32Array(n)

  entries.forEach((e, i) => {
    const p = positions[i]
    posArr[i * 3] = p.x
    posArr[i * 3 + 1] = p.y
    posArr[i * 3 + 2] = p.z
    colArr[i * 3] = e.color.r
    colArr[i * 3 + 1] = e.color.g
    colArr[i * 3 + 2] = e.color.b
    sizeArr[i] = 0.86 + hash01(e.id + ':s') * 0.66
    typeArr[i] = e.typeIndex
  })

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(posArr, 3))
  geo.setAttribute('aColor', new BufferAttribute(colArr, 3))
  const sizeAttr = new BufferAttribute(sizeArr, 1)
  const typeAttr = new BufferAttribute(typeArr, 1)
  const stateAttr = new BufferAttribute(stateArr, 1)
  geo.setAttribute('aSize', sizeAttr)
  geo.setAttribute('aType', typeAttr)
  geo.setAttribute('aState', stateAttr)

  /* ---------------- 渲染器 ---------------- */
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(42, 1, 0.1, 20)
  camera.position.set(0, 0, 3.15)

  const root = new Group()
  root.rotation.x = 0.3
  scene.add(root)

  const globe = new Group()
  root.add(globe)

  const uniforms = {
    uTime: { value: 0 },
    uPixel: { value: 4 },
    uHover: { value: -1 },
    uTheme: { value: 1 },
  }

  const pointsMat = new ShaderMaterial({
    uniforms,
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  })
  const points = new Points(geo, pointsMat)
  points.frustumCulled = false
  globe.add(points)

  /* ---------------- 大气层 ---------------- */
  const atmoMat = new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#7c6cff') },
      uAlpha: { value: 0.46 },
    },
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    side: BackSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  })
  const atmo = new Mesh(new SphereGeometry(1.12, 40, 40), atmoMat)
  root.add(atmo)

  /* ---------------- 36 周轨道 ---------------- */
  const R = 1.3
  const ringPos: number[] = []
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2
    ringPos.push(Math.cos(a) * R, 0, Math.sin(a) * R)
  }
  const ringGeo = new BufferGeometry()
  ringGeo.setAttribute('position', new BufferAttribute(new Float32Array(ringPos), 3))
  const ringMat = new LineBasicMaterial({
    color: 0x9aa3c7,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  })
  const ring = new LineLoop(ringGeo, ringMat)
  root.add(ring)

  const week = Math.min(36, Math.max(1, currentWeekNo()))
  const weekAngle = ((week - 1) / 36) * Math.PI * 2
  const markerGeo = new BufferGeometry()
  markerGeo.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([Math.cos(weekAngle) * R, 0, Math.sin(weekAngle) * R]), 3)
  )
  const markerMat = new PointsMaterial({
    color: 0x22d3ee,
    size: 4,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  })
  const marker = new Points(markerGeo, markerMat)
  root.add(marker)
  if (compact) {
    ring.visible = false
    marker.visible = false
  }

  /* ---------------- 点亮时的冲击环 ---------------- */
  const flashGeo = new RingGeometry(0.9, 1, 40)
  const flashes = Array.from({ length: 4 }, () => {
    const mat = new MeshBasicMaterial({
      color: new Color('#7c6cff'),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
    })
    const mesh = new Mesh(flashGeo, mat)
    mesh.visible = false
    globe.add(mesh)
    return { mesh, mat, life: 0, active: false }
  })

  /* ---------------- 尺寸 ---------------- */
  function resize() {
    const w = canvas.clientWidth || 220
    const h = canvas.clientHeight || 220
    const pr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(pr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    uniforms.uPixel.value = Math.max(2.2, 4.2 * pr * (h / 220))
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  /* ---------------- 交互 ---------------- */
  const world = new Vector3()
  const screen = new Vector3()

  let hovered: Entry | null = null
  let dragging = false
  let moved = 0
  let lastX = 0
  let lastY = 0
  let spinPause = 0
  let dragVel = 0

  function emitHover(e: PointerEvent | null) {
    if (!opts.onHover) return
    if (!hovered || !e) {
      opts.onHover(null, 0, 0)
      return
    }
    const rect = canvas.getBoundingClientRect()
    const m = meta[hovered.typeIndex]
    opts.onHover(
      { type: hovered.type, fileName: hovered.fileName, done: m.done, total: m.total },
      e.clientX - rect.left,
      e.clientY - rect.top
    )
  }

  function pick(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const limit = 13 * 13

    // 2px 的点用 3D 射线很容易擦空，直接投影到屏幕找最近的可见点
    let best = -1
    let bestD = limit
    for (let i = 0; i < n; i++) {
      world.copy(positions[i]).applyMatrix4(globe.matrixWorld)
      if (world.z < 0.02) continue // 背面的点不参与拾取
      screen.copy(world).project(camera)
      const sx = (screen.x * 0.5 + 0.5) * rect.width
      const sy = (-screen.y * 0.5 + 0.5) * rect.height
      const dx = sx - mx
      const dy = sy - my
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = i
      }
    }

    const next = best >= 0 ? entries[best] : null
    if (next !== hovered) {
      hovered = next
      uniforms.uHover.value = next ? next.typeIndex : -1
      canvas.style.cursor = next ? 'pointer' : dragging ? 'grabbing' : 'grab'
      emitHover(e)
    } else if (next) {
      emitHover(e)
    }
  }

  function onDown(e: PointerEvent) {
    if (e.button !== 0) return
    dragging = true
    moved = 0
    lastX = e.clientX
    lastY = e.clientY
    spinPause = 2.5
    canvas.style.cursor = 'grabbing'
    canvas.setPointerCapture(e.pointerId)
  }

  function onMove(e: PointerEvent) {
    if (dragging) {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      globe.rotation.y += dx * 0.006
      root.rotation.x = Math.max(-0.7, Math.min(0.7, root.rotation.x + dy * 0.004))
      dragVel = dx * 0.006
      return
    }
    pick(e)
  }

  function onUp(e: PointerEvent) {
    if (!dragging) return
    dragging = false
    canvas.style.cursor = hovered ? 'pointer' : 'grab'
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {
      /* 指针已释放 */
    }
    if (moved < 6 && hovered) {
      opts.onPick?.(hovered.fileName)
    }
  }

  function onLeave() {
    dragging = false
    hovered = null
    uniforms.uHover.value = -1
    opts.onHover?.(null, 0, 0)
  }

  if (!compact) {
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.style.cursor = 'grab'
  }

  /* ---------------- 动画 ---------------- */
  let last = 0
  let time = 0
  let running = false

  function tick(ms: number) {
    const t = ms / 1000
    const dt = last ? Math.min(0.05, t - last) : 0.016
    last = t
    time += dt
    uniforms.uTime.value = time

    if (!dragging) {
      if (spinPause > 0) spinPause -= dt
      else globe.rotation.y += dt * 0.11
      if (Math.abs(dragVel) > 0.0001) {
        globe.rotation.y += dragVel * dt * 12
        dragVel *= Math.pow(0.02, dt)
      }
    }

    for (const f of flashes) {
      if (!f.active) continue
      f.life += dt
      const k = f.life / 0.85
      if (k >= 1) {
        f.active = false
        f.mesh.visible = false
        f.mat.opacity = 0
        continue
      }
      f.mesh.scale.setScalar(0.03 + k * 0.3)
      f.mat.opacity = (1 - k) * 0.85
    }

    renderer.render(scene, camera)
  }

  function start() {
    if (running) return
    running = true
    last = 0
    renderer.setAnimationLoop(tick)
  }

  function stop() {
    if (!running) return
    running = false
    renderer.setAnimationLoop(null)
  }

  function onVisibility() {
    if (document.hidden) stop()
    else start()
  }
  document.addEventListener('visibilitychange', onVisibility)
  start()

  /* ---------------- API ---------------- */
  const api: PlanetApi = {
    setProgress(done) {
      let changed = false
      for (let i = 0; i < n; i++) {
        const v = done.has(entries[i].id) ? 1 : 0
        if (stateArr[i] !== v) {
          stateArr[i] = v
          changed = true
        }
      }
      if (changed) stateAttr.needsUpdate = true
      for (const m of meta) m.done = 0
      for (const e of entries) if (done.has(e.id)) meta[e.typeIndex].done++
    },

    setTheme(theme) {
      const dark = theme === 'dark'
      uniforms.uTheme.value = dark ? 1 : 0
      pointsMat.blending = dark ? AdditiveBlending : NormalBlending
      pointsMat.needsUpdate = true
      atmoMat.blending = dark ? AdditiveBlending : NormalBlending
      atmoMat.needsUpdate = true
      atmoMat.uniforms.uAlpha.value = dark ? 0.62 : 0.4
      atmoMat.uniforms.uColor.value.set(dark ? '#7c6cff' : '#aeb6d6')
      ringMat.color.set(dark ? '#9aa3c7' : '#5b5f7a')
      ringMat.opacity = dark ? 0.3 : 0.26
      markerMat.color.set(dark ? '#22d3ee' : '#0b93ac')
      markerMat.size = dark ? 5 : 4
      for (const f of flashes) {
        f.mat.blending = dark ? AdditiveBlending : NormalBlending
        f.mat.color.set(dark ? '#7c6cff' : '#5b4be8')
        f.mat.needsUpdate = true
      }
    },

    flash(id) {
      const idx = indexById.get(id)
      if (idx === undefined) return
      const slot = flashes.find((f) => !f.active) ?? flashes[0]
      slot.active = true
      slot.life = 0
      slot.mesh.visible = true
      slot.mesh.position.copy(positions[idx]).multiplyScalar(1.01)
      slot.mesh.lookAt(0, 0, 0)
      slot.mesh.scale.setScalar(0.03)
      slot.mat.opacity = 0.85
    },

    dispose() {
      stop()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      geo.dispose()
      pointsMat.dispose()
      atmo.geometry.dispose()
      atmoMat.dispose()
      ringGeo.dispose()
      ringMat.dispose()
      markerGeo.dispose()
      markerMat.dispose()
      flashGeo.dispose()
      for (const f of flashes) f.mat.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }

  api.setTheme('dark')
  return api
}
