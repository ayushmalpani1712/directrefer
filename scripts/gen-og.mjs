import { writeFileSync } from 'fs'
import { join } from 'path'
import { deflateRawSync } from 'zlib'

const W = 1200, H = 630
const BG = [11, 15, 20]     // #0B0F14
const PRIMARY = [59, 95, 229] // #3B5FE5
const WHITE = [255, 255, 255]
const GRAY = [160, 170, 190]

const pixels = new Uint8Array(W * H * 4)

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const i = (y * W + x) * 4
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a
}

function fillRect(x, y, w, h, color) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, ...color)
}

function fillCircle(cx, cy, radius, color) {
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      if (dx*dx + dy*dy <= radius*radius)
        setPixel(cx + dx, cy + dy, ...color)
}

// Background gradient (top to bottom: dark to slightly lighter)
for (let y = 0; y < H; y++) {
  const t = y / H
  const r = Math.round(BG[0] + t * 8)
  const g = Math.round(BG[1] + t * 10)
  const b = Math.round(BG[2] + t * 14)
  for (let x = 0; x < W; x++) setPixel(x, y, r, g, b)
}

// Subtle grid pattern
for (let x = 0; x < W; x += 40)
  for (let y = 0; y < H; y++)
    setPixel(x, y, 255, 255, 255, 3)
for (let y = 0; y < H; y += 40)
  for (let x = 0; x < W; x++)
    setPixel(x, y, 255, 255, 255, 3)

// Glow orb (center-left)
for (let dy = -150; dy <= 150; dy++)
  for (let dx = -150; dx <= 150; dx++) {
    const dist = Math.sqrt(dx*dx + dy*dy)
    if (dist < 150) {
      const alpha = Math.round(25 * (1 - dist / 150))
      setPixel(300 + dx, 315 + dy, PRIMARY[0], PRIMARY[1], PRIMARY[2], alpha)
    }
  }

// Top bar accent
fillRect(0, 0, W, 4, PRIMARY)

// Logo mark (simple Z-like icon)
const lx = 120, ly = 180
fillRect(lx, ly, 80, 8, PRIMARY)
fillRect(lx + 60, ly + 8, 8, 30, PRIMARY)
fillRect(lx, ly + 38, 80, 8, PRIMARY)
fillRect(lx + 12, ly + 46, 8, 30, PRIMARY)
fillRect(lx, ly + 76, 80, 8, PRIMARY)

// "Direct Refer" text — block letters using rectangles
function drawChar(ch, ox, oy, scale, color) {
  const chars = {
    'D': [[0,0,1,8],[1,0,1,1],[1,7,1,1],[2,1,1,1],[2,6,1,1],[3,2,1,4]],
    'i': [[0,0,1,1],[0,2,1,6]],
    'r': [[0,1,1,1],[1,0,1,2],[1,3,1,5]],
    'e': [[0,2,1,1],[1,1,1,1],[1,2,1,1],[1,3,1,1],[2,1,1,1],[2,3,1,1]],
    'c': [[0,1,1,3],[1,0,1,1],[1,4,1,1]],
    't': [[0,1,1,1],[1,0,1,5],[2,0,1,1]],
    'R': [[0,0,1,8],[1,1,1,1],[1,3,1,1],[2,0,1,1],[3,2,1,1],[3,4,1,1],[3,6,1,2]],
    'f': [[0,1,1,1],[1,0,1,1],[1,2,1,5]],
    'n': [[0,1,1,5],[1,0,1,1],[2,0,1,1]],
    'a': [[0,1,1,3],[1,1,1,4],[2,1,1,4]],
    'l': [[0,0,1,8]],
    'S': [[0,1,1,1],[1,0,1,1],[1,2,1,1],[1,4,1,1],[2,3,1,1],[2,5,1,1]],
    'p': [[0,1,1,7],[1,2,1,3],[2,1,1,1],[2,4,1,1]],
    'o': [[0,1,1,3],[1,0,1,1],[1,4,1,1],[2,1,1,3]],
    'B': [[0,0,1,8],[1,1,1,1],[1,3,1,1],[2,0,1,1],[2,2,1,1],[2,4,1,2]],
    'b': [[0,0,1,8],[1,2,1,3],[2,1,1,1],[2,5,1,1]],
    'g': [[0,1,1,3],[1,0,1,4],[1,5,1,3],[2,3,1,1],[2,7,1,1]],
    'm': [[0,1,1,5],[1,0,1,1],[2,0,1,1],[3,1,1,5],[4,0,1,1],[5,0,1,1]],
    'h': [[0,0,1,8],[1,2,1,3],[2,0,1,1]],
    'u': [[0,1,1,4],[1,5,1,3],[2,1,1,3]],
    's': [[0,1,1,1],[1,0,1,1],[1,2,1,1],[2,3,1,1],[2,5,1,1]],
  }
  const c = chars[ch]
  if (!c) return
  for (const [dx, dy, w, h] of c)
    fillRect(ox + dx * scale, oy + dy * scale, w * scale, h * scale, color)
}

const sx = 120, sy = 120
const sc = 3
const spacing = sc * 3
let cx = sx
const word1 = 'Direct'
const word2 = 'Refer'
for (const ch of word1) { drawChar(ch, cx, sy, sc, WHITE); cx += (ch === 'i' || ch === 'r' || ch === 't' || ch === 'l' ? 2 : 4) * sc + spacing }
cx += sc * 4
for (const ch of word2) { drawChar(ch, cx, sy, sc, PRIMARY); cx += (ch === 'i' || ch === 'r' || ch === 't' || ch === 'l' ? 2 : 4) * sc + spacing }

// Tagline — rendered as horizontal bars (since we can't do real text without a font rasterizer)
// "Get referred. Get hired."
const tagY = 300
const barH = 6
const barGap = 14
const tagColor = GRAY

// Row of small bars to represent tagline text
const tagLines = [
  { w: 180, y: tagY },
  { w: 120, y: tagY + barGap },
  { w: 160, y: tagY + barGap * 2 },
]
for (const line of tagLines)
  fillRect(sx, line.y, line.w, barH, tagColor)

// Three role cards at bottom
const cardY = 400
const cardW = 200
const cardH = 130
const cardGap = 30
const cards = [
  { icon: '🎓', label: 'Students', desc: 'Request referrals', x: sx },
  { icon: '💼', label: 'Professionals', desc: 'Refer & track', x: sx + cardW + cardGap },
  { icon: '🔍', label: 'Recruiters', desc: 'Find talent', x: sx + (cardW + cardGap) * 2 },
]

for (const card of cards) {
  // Card background
  fillRect(card.x, cardY, cardW, cardH, [20, 25, 35])
  // Top accent line
  fillRect(card.x, cardY, cardW, 3, PRIMARY)
  // Icon placeholder (small circle)
  fillCircle(card.x + 30, cardY + 40, 12, PRIMARY)
  // Label bar
  fillRect(card.x + 55, card.y + 33, 120, 8, WHITE)
  // Desc bar
  fillRect(card.x + 55, card.y + 50, 90, 5, GRAY)
}

// Bottom bar
fillRect(0, H - 4, W, 4, PRIMARY)

// URL at bottom
fillRect(sx, H - 50, 200, 6, GRAY)

// Convert to PNG
function createPNG(w, h, pixels) {
  function crc32(buf) {
    let c = 0xFFFFFFFF
    const table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let v = n
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xEDB88320 ^ (v >>> 1) : v >>> 1
      table[n] = v
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
    return (c ^ 0xFFFFFFFF) >>> 0
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeData = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(typeData))
    return Buffer.concat([len, typeData, crc])
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA

  const raw = []
  for (let y = 0; y < h; y++) {
    raw.push(0) // filter: none
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
    }
  }

  const compressed = deflateRawSync(Buffer.from(raw))

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const png = createPNG(W, H, pixels)
const out = join(import.meta.dirname, '..', 'public', 'og-image.png')
writeFileSync(out, png)
console.log(`Wrote ${out} (${(png.length / 1024).toFixed(1)} KB)`)
