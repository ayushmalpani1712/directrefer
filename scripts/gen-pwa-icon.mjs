import { writeFileSync } from 'fs'
import { join } from 'path'
import { deflateRawSync } from 'zlib'

const W = 512, H = 512
const BG = [59, 95, 229] // #3B5FE5
const WHITE = [255, 255, 255]
const pixels = new Uint8Array(W * H * 4)

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const i = (y * W + x) * 4
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a
}

function fillCircle(cx, cy, radius, r, g, b) {
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      if (dx*dx + dy*dy <= radius*radius)
        setPixel(cx + dx, cy + dy, r, g, b)
}

function fillRect(x, y, w, h, r, g, b) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b)
}

// Blue background
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    setPixel(x, y, ...BG)

// White 'd' shape (circle with notch)
fillCircle(256, 256, 160, ...WHITE)
// Cut out the inner part of 'd' to form letter shape
fillCircle(256, 256, 100, ...BG)
// Vertical stem of 'd'
fillRect(290, 130, 50, 280, ...WHITE)
// Horizontal bar connecting circle to stem
fillRect(220, 200, 120, 60, ...WHITE)

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
  ihdr[8] = 8; ihdr[9] = 6

  const raw = []
  for (let y = 0; y < h; y++) {
    raw.push(0)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      raw.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
    }
  }

  const compressed = deflateRawSync(Buffer.from(raw))
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

const png = createPNG(W, H, pixels)
const out = join(import.meta.dirname, '..', 'public', 'pwa-icon.png')
writeFileSync(out, png)
console.log(`Wrote ${out} (${(png.length / 1024).toFixed(1)} KB)`)
