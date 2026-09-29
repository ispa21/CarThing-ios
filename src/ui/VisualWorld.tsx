import { useEffect, useRef, useState } from 'react'
import { BAYER8, field, fbm, glyph, rgb } from '../visual/field'
import type { World } from '../visual/worlds'
import { spotifyClock, useClockPainter } from './clock'


interface Palette {
  ground: string
  line: string
  accent: string
}

/** Draw at most this often: the worlds drift slowly, and phones have batteries. */
const FRAME_MS = 1000 / 30

const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// ── Orb: a WebGL fragment shader ────────────────────────────────────────────

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_t;
uniform float u_p;
uniform vec3 u_ground;
uniform vec3 u_line;
uniform vec3 u_accent;
float h(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 q) {
  vec2 i = floor(q), f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 q) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += n(q) * a; q *= 2.03; a *= 0.5; } return s; }
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float breathe = 0.012 * sin(u_t * 0.9);
  float warp = fbm(vec2(ang * 1.6, u_t * 0.18)) * 0.07 + fbm(uv * 3.0 + u_t * 0.05) * 0.04;
  float edge = 0.33 + breathe + warp;
  float inside = smoothstep(edge + 0.006, edge - 0.006, r);
  float swirl = fbm(uv * 3.2 + vec2(u_t * 0.07, -u_t * 0.05) + fbm(uv * 2.0 - u_t * 0.03));
  vec3 core = mix(u_accent, u_line, smoothstep(0.35, 0.75, swirl));
  core = mix(core, u_ground, smoothstep(0.1, edge, r) * 0.25);
  float glow = exp(-max(r - edge, 0.0) * 9.0) * (1.0 - inside) * 0.35;
  // The song's progress: a thin ring, lit up to the playhead, starting at twelve o'clock.
  float a = mod(1.5707963 - ang, 6.2831853) / 6.2831853;
  float ring = smoothstep(0.004, 0.0, abs(r - (edge + 0.07))) * step(a, u_p);
  float grain = (h(gl_FragCoord.xy + floor(u_t * 12.0)) - 0.5) * 0.045;
  vec3 col = mix(u_ground, core, inside) + u_accent * glow + u_line * ring * 0.9 + grain;
  gl_FragColor = vec4(col, 1.0);
}`

function makeOrb(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false })
  if (!gl) return null
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u = (name: string) => gl.getUniformLocation(prog, name)
  const U = { res: u('u_res'), t: u('u_t'), p: u('u_p'), ground: u('u_ground'), line: u('u_line'), accent: u('u_accent') }
  return (seconds: number, progress: number, pal: Palette) => {
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(U.res, canvas.width, canvas.height)
    gl.uniform1f(U.t, seconds)
    gl.uniform1f(U.p, progress)
    for (const [k, hex] of [
      ['ground', pal.ground],
      ['line', pal.line],
      ['accent', pal.accent],
    ] as const) {
      const [r, g, b] = rgb(hex)
      gl.uniform3f(U[k], r / 255, g / 255, b / 255)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}

// ── ASCII and dither: 2D canvases ───────────────────────────────────────────

function drawAscii(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, seconds: number, progress: number, pal: Palette) {
  const cell = Math.round(Math.max(10, Math.min(18, w / dpr / 90))) * dpr
  const cw = cell * 0.62
  const cols = Math.ceil(w / cw)
  const rows = Math.ceil(h / cell)
  ctx.fillStyle = pal.ground
  ctx.fillRect(0, 0, w, h)
  ctx.font = `${cell}px "Departure Mono", ui-monospace, monospace`
  ctx.textBaseline = 'top'
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = field(x / cols, y / rows, seconds, progress, 2)
      if (v < 0.12) continue
      ctx.fillStyle = v > 0.82 ? pal.accent : pal.line
      ctx.fillText(glyph(v), x * cw, y * cell)
    }
  }
}

let ditherBuf: { w: number; h: number; img: ImageData; off: HTMLCanvasElement } | null = null

function drawDither(ctx: CanvasRenderingContext2D, w: number, h: number, seconds: number, progress: number, pal: Palette) {
  const scale = 4 // chunky pixels are the point
  const bw = Math.max(1, Math.ceil(w / scale))
  const bh = Math.max(1, Math.ceil(h / scale))
  if (!ditherBuf || ditherBuf.w !== bw || ditherBuf.h !== bh) {
    const off = document.createElement('canvas')
    off.width = bw
    off.height = bh
    ditherBuf = { w: bw, h: bh, img: new ImageData(bw, bh), off }
  }
  const { img, off } = ditherBuf
  const g = rgb(pal.ground)
  const l = rgb(pal.line)
  const a = rgb(pal.accent)
  const d = img.data
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      // A slow radial swell under the weather, so the dither has shape, not just grain.
      const dx = x / bw - 0.5
      const dy = (y / bh - 0.5) * (bh / bw)
      const swell = 0.5 + 0.5 * Math.cos(Math.sqrt(dx * dx + dy * dy) * 14 - seconds * 0.35)
      const v = field(x / bw, y / bh, seconds, progress, 2) * 0.7 + swell * 0.3
      const t = BAYER8[(y & 7) * 8 + (x & 7)]
      const c = v > t ? (v > 0.86 && fbm(x * 0.05, y * 0.05) > 0.5 ? a : l) : g
      const i = (y * bw + x) * 4
      d[i] = c[0]
      d[i + 1] = c[1]
      d[i + 2] = c[2]
      d[i + 3] = 255
    }
  }
  off.getContext('2d')!.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(off, 0, 0, w, h)
}

/**
 * A generative world behind the record. It moves with the song's own time (pause
 * freezes it, scrubbing moves it) and marks the playhead; it never reads the cover's
 * pixels. Reduced motion: it redraws only every few seconds of song.
 */
export function VisualWorld({ world, palette }: { world: Exclude<World, 'rings'>; palette: Palette }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const orbRef = useRef<ReturnType<typeof makeOrb>>(null)
  const last = useRef({ at: 0, key: '' })
  const [failed, setFailed] = useState(false)
  const paletteRef = useRef(palette)
  useEffect(() => {
    paletteRef.current = palette
    last.current.key = '' // repaint with the new colours
  }, [palette])

  // Size the canvas to its box (device pixels, capped at 2×).
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const scale = world === 'orb' ? 0.75 : dpr // the orb is soft: render it small, let the GPU upscale
      c.width = Math.max(1, Math.round(c.clientWidth * scale))
      c.height = Math.max(1, Math.round(c.clientHeight * scale))
      last.current.key = ''
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(c)
    return () => ro.disconnect()
  }, [world])

  useEffect(() => {
    orbRef.current = null
    if (world === 'orb' && ref.current) {
      orbRef.current = makeOrb(ref.current)
      if (!orbRef.current) setFailed(true)
    }
  }, [world])

  useClockPainter(spotifyClock, (ms, snap) => {
    const c = ref.current
    if (!c) return
    const now = performance.now()
    const reduced = prefersReduced()
    const seconds = ms / 1000
    const progress = snap.durationMs ? Math.min(1, ms / snap.durationMs) : 0
    // Reduced motion: a still image that changes every 5 s of song. Otherwise ≤30 fps.
    const key = reduced ? `${Math.floor(seconds / 5)}` : `${Math.floor(now / FRAME_MS)}`
    if (key === last.current.key) return
    last.current = { at: now, key }
    const t = reduced ? Math.floor(seconds / 5) * 5 : seconds
    const pal = paletteRef.current
    if (world === 'orb') {
      orbRef.current?.(t, progress, pal)
      return
    }
    const ctx = c.getContext('2d')
    if (!ctx) return
    if (world === 'ascii') drawAscii(ctx, c.width, c.height, Math.min(2, window.devicePixelRatio || 1), t, progress, pal)
    else drawDither(ctx, c.width, c.height, t, progress, pal)
  })

  // The orb needs WebGL; without it, say so rather than show a blank.
  if (failed) return <p className="readout visual-world-note">this device can’t draw the orb (no WebGL)</p>
  // One canvas per world: a canvas can't switch between 2D and WebGL contexts.
  return <canvas key={world} ref={ref} className="visual-canvas" data-world={world} aria-hidden="true" />
}
