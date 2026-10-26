/**
 * 底部地球
 * ------------------------------------------------------------
 * 用 NASA Blue Marble + 夜景灯光两张贴图，做一个巨大的球体，
 * 只露出顶部一小段弧线当地平线。着色器里做昼夜过渡 + 大气边缘光。
 *
 * 刻意保持「静态」：不转、不呼吸。页面上的动效只留给流星和交互。
 */
import {
  AdditiveBlending,
  BackSide,
  DataTexture,
  Group,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three'
import dayUrl from '@/assets/earth-day.webp'
import nightUrl from '@/assets/earth-night.webp'

export interface EarthApi {
  setTheme(theme: 'light' | 'dark'): void
  resize(): void
  dispose(): void
}

export interface EarthOptions {
  onReady?: () => void
}

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const FRAG = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform vec3 uSun;
uniform float uTheme;

varying vec2 vUv;
varying vec3 vN;
varying vec3 vWorld;

void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float sun = dot(N, normalize(uSun));
  float lit = smoothstep(-0.25, 0.35, sun);
  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 60.0);

  vec3 day = texture2D(uDay, vUv).rgb;
  vec3 night = texture2D(uNight, vUv).rgb;

  // 夜面：只保留城市灯光，压掉夜景贴图自带的深蓝底
  float lights = max(max(night.r, night.g), night.b);
  vec3 city = night * smoothstep(0.1, 0.4, lights) * 2.2;
  vec3 darkSide = city + day * 0.45;
  vec3 litSide = day * (0.22 + 1.0 * max(sun, 0.0));
  vec3 nightGlobe = mix(darkSide, litSide, lit);
  nightGlobe += vec3(0.32, 0.58, 1.0) * rim * 2.6;

  // 浅色：纸感墨色地球（海洋浅、陆地与云更深），不抢正文
  float lum = dot(day, vec3(0.299, 0.587, 0.114));
  vec3 ink = mix(vec3(0.975, 0.98, 0.99), vec3(0.55, 0.59, 0.66), smoothstep(0.06, 0.62, lum));
  ink = mix(ink, vec3(0.5, 0.56, 0.64), rim * 0.45);
  ink += vec3(0.45, 0.55, 0.8) * rim * 0.1;

  vec3 col = mix(ink, nightGlobe, uTheme);

  gl_FragColor = vec4(col, 1.0);
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
uniform float uTheme;
varying vec3 vN;
varying vec3 vV;

void main() {
  float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 45.0);
  vec3 c = mix(vec3(0.45, 0.65, 1.0), vec3(0.2, 0.48, 1.0), uTheme);
  float a = mix(0.1, 0.8, uTheme) * rim;
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}
`

export function createEarth(canvas: HTMLCanvasElement, opts: EarthOptions = {}): EarthApi {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  const scene = new Scene()
  const camera = new PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 3.2)

  const placeholder = new DataTexture(new Uint8Array([6, 8, 14, 255]), 1, 1)
  placeholder.needsUpdate = true

  const uniforms = {
    uDay: { value: placeholder as Texture },
    uNight: { value: placeholder as Texture },
    uSun: { value: new Vector3(-0.35, -0.12, -0.93).normalize() },
    uTheme: { value: 1 },
  }

  const earthMat = new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
  })

  const atmoMat = new ShaderMaterial({
    uniforms: { uTheme: uniforms.uTheme },
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    side: BackSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  /* 巨大球体：只露出顶部 28% 左右当地平线 */
  const R = 8
  const fov = 45
  const horizon = 0.72
  const halfH = Math.tan((fov / 2) * MathUtils.DEG2RAD) * camera.position.z
  const worldTop = (1 - 2 * horizon) * halfH

  const root = new Group()
  root.position.y = worldTop - R
  root.scale.setScalar(R)
  scene.add(root)

  const tilt = new Group()
  // 让可见的那条带落在北美 / 大西洋一带，而不是北极
  tilt.rotation.set(MathUtils.degToRad(64), MathUtils.degToRad(-28), 0)
  root.add(tilt)

  const earth = new Mesh(new SphereGeometry(1, 128, 128), earthMat)
  tilt.add(earth)

  const atmo = new Mesh(new SphereGeometry(1.02, 64, 64), atmoMat)
  root.add(atmo)

  /* 贴图 */
  const loader = new TextureLoader()
  let loaded = 0
  let ready = false

  function onLoad() {
    loaded++
    if (loaded < 2 || ready) return
    ready = true
    render()
    opts.onReady?.()
  }

  function load(url: string, target: { value: Texture }) {
    const tex = loader.load(
      url,
      onLoad,
      undefined,
      (err) => console.warn('[earth] 贴图加载失败', url, err)
    )
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    target.value = tex
  }

  load(dayUrl, uniforms.uDay)
  load(nightUrl, uniforms.uNight)

  /* 渲染 */
  function resize() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    render()
  }

  function render() {
    renderer.render(scene, camera)
  }

  /* 主题过渡：在 0/1 之间缓动，不做硬切 */
  let themeCur = 1
  let themeTgt = 1
  let raf = 0
  let last = 0

  function anim(ts: number) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016
    last = ts
    themeCur += (themeTgt - themeCur) * (1 - Math.exp(-dt * 7))
    uniforms.uTheme.value = themeCur
    render()
    if (Math.abs(themeTgt - themeCur) > 0.002) {
      raf = requestAnimationFrame(anim)
    } else {
      themeCur = themeTgt
      uniforms.uTheme.value = themeCur
      render()
      raf = 0
      last = 0
    }
  }

  function setTheme(theme: 'light' | 'dark') {
    themeTgt = theme === 'dark' ? 1 : 0
    if (!raf) {
      last = 0
      raf = requestAnimationFrame(anim)
    }
  }

  resize()
  window.addEventListener('resize', resize, { passive: true })

  return {
    setTheme,
    resize,
    dispose() {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      earth.geometry.dispose()
      earthMat.dispose()
      atmo.geometry.dispose()
      atmoMat.dispose()
      uniforms.uDay.value?.dispose()
      uniforms.uNight.value?.dispose()
      placeholder.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
