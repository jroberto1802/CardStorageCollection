#!/usr/bin/env node
// Converte os avatares de .decks/avatares/{grande,pequeno}/*.png em WebP redimensionado
// em public/characters/{grande,pequeno}/*.webp (o arquivo SemDeck_* é ignorado).
//
// Uso: node scripts/optimize-avatars.mjs [--quality 80] [--large 512] [--small 128]
//  - pequeno: lado maior 128px (card de 64px em densidade 2x)
//  - grande:  lado maior 512px
// Requer sharp (devDependency). Reproduzível: sobrescreve os .webp existentes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : def
}
const quality = opt('quality', 80)
const sizes = { pequeno: opt('small', 128), grande: opt('large', 512) }

let inBytes = 0
let outBytes = 0
let count = 0

for (const [folder, maxSide] of Object.entries(sizes)) {
  const srcDir = path.join(root, '.decks', 'avatares', folder)
  const outDir = path.join(root, 'public', 'characters', folder)
  fs.mkdirSync(outDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir).sort()) {
    if (!/\.png$/i.test(file) || file.startsWith('SemDeck')) continue
    if (!/^[A-Za-z0-9_.-]+$/.test(file)) throw new Error(`Nome de arquivo inseguro: ${file}`)
    const src = path.join(srcDir, file)
    const out = path.join(outDir, file.replace(/\.png$/i, '.webp'))
    await sharp(src)
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality, alphaQuality: 90, effort: 5 })
      .toFile(out)
    inBytes += fs.statSync(src).size
    outBytes += fs.statSync(out).size
    count += 1
  }
}

const mb = (n) => (n / 1024 / 1024).toFixed(2)
console.log(`${count} arquivos: PNG de origem ${mb(inBytes)} MB -> WebP ${mb(outBytes)} MB`)
