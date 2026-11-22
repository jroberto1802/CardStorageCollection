#!/usr/bin/env node
// Gera supabase/migrations/016_import_classic_gx_characters.sql a partir de .decks/decks.json
// e copia os avatares para public/characters/{grande,pequeno}.
//
// Uso: node scripts/build-character-import.mjs [--series First,GX] [--out <sql>]
//        [--names <cardinfo.json da ygoprodeck>] [--report docs/character-import-report.md]
//        [--no-avatars]
// --names é opcional: sem ele, só o SQL é gerado. Com ele, mede o casamento por nome.
// Sem dependências externas.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const flag = (name) => args.includes(`--${name}`)

const seriesList = opt('series', 'First,GX').split(',').map((s) => s.trim()).filter(Boolean)
const outFile = path.resolve(root, opt('out', 'supabase/migrations/016_import_classic_gx_characters.sql'))
const namesFile = opt('names', null)
const reportFile = path.resolve(root, opt('report', 'docs/character-import-report.md'))
const srcDir = path.join(root, '.decks')

// Série da fonte -> anime (slug/nome) e rótulo de série gravado em characters.series
const SERIES = {
  First: { anime: 'yu-gi-oh', animeName: 'Clássico', animeOrder: 1, series: 'classic' },
  GX: { anime: 'yu-gi-oh-gx', animeName: 'GX', animeOrder: 2, series: 'gx' },
  '5DS': { anime: 'yu-gi-oh-5ds', animeName: "5D's", animeOrder: 3, series: '5ds' },
  ZEXAL: { anime: 'yu-gi-oh-zexal', animeName: 'ZEXAL', animeOrder: 4, series: 'zexal' },
  Arcv: { anime: 'yu-gi-oh-arc-v', animeName: 'ARC-V', animeOrder: 5, series: 'arcv' },
}
for (const s of seriesList) if (!SERIES[s]) throw new Error(`Série desconhecida: ${s}`)

// Nomes de exibição corrigidos (a fonte tem grafias divergentes do canônico)
const NAME_FIX = { 'Jesse Andersen': 'Jesse Anderson' }

// Abreviações do jogo que diferem do nome oficial da carta (chave = normName do nome do jogo)
const NAME_ALIAS = {
  redeyesbdragon: 'Red-Eyes Black Dragon',
  bskulldragon: 'Black Skull Dragon',
  falchion: 'Falchion Beta', // 'Falchionβ' (β some na normalização)
}

// Acentos tratados no SQL (translate). Gerado a partir desta tabela para origem/destino
// nunca ficarem desalinhados. Mesma regra do normName: sem acento, minúsculas, só [a-z0-9].
const ACCENTS = {
  a: 'áàâäãåā',
  e: 'éèêëē',
  i: 'íìîïī',
  o: 'óòôöõō',
  u: 'úùûüū',
  n: 'ñ',
  c: 'ç',
}
const TRANSLATE_FROM = Object.values(ACCENTS).join('')
const TRANSLATE_TO = Object.entries(ACCENTS).map(([to, froms]) => to.repeat([...froms].length)).join('')
if ([...TRANSLATE_FROM].length !== [...TRANSLATE_TO].length) throw new Error('translate desalinhado')
const baseNorm = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const normName = (s) => {
  const k = baseNorm(s)
  return NAME_ALIAS[k] ? baseNorm(NAME_ALIAS[k]) : k
}
const kebab = (s) =>
  s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const ZONES = ['main', 'extra', 'side']

const all = JSON.parse(fs.readFileSync(path.join(srcDir, 'decks.json'), 'utf8'))
const chars = all.filter((p) => seriesList.includes(p.serie))
const orderBySeries = {}
const report = { bySeries: {}, missingAvatars: [], deckRows: [] }

const avatarOut = path.join(root, 'public', 'characters')
const safeFile = (f) => /^[A-Za-z0-9_.-]+$/.test(f)

let nameSet = null
if (namesFile) {
  const json = JSON.parse(fs.readFileSync(path.resolve(namesFile), 'utf8'))
  nameSet = new Set(json.data.map((c) => normName(c.name)))
}

const charRows = []
const deckRows = []
const linkRows = []
const cardBlocks = []

for (const p of chars) {
  const meta = SERIES[p.serie]
  const order = (orderBySeries[p.serie] = (orderBySeries[p.serie] ?? 0) + 1)
  const slug = kebab(p.chave)
  const name = NAME_FIX[p.personagem] ?? p.personagem
  if (!safeFile(p.arquivo)) throw new Error(`Nome de arquivo inseguro: ${p.arquivo}`)
  const hasBig = fs.existsSync(path.join(srcDir, 'avatares', 'grande', p.arquivo))
  const hasSmall = fs.existsSync(path.join(srcDir, 'avatares', 'pequeno', p.arquivo))
  if (!hasBig || !hasSmall) {
    report.missingAvatars.push(`${p.personagem} (${p.arquivo}): ${!hasBig ? 'grande ' : ''}${!hasSmall ? 'pequeno' : ''}`.trim())
  }
  if (!flag('no-avatars')) {
    for (const [size, ok] of [['grande', hasBig], ['pequeno', hasSmall]]) {
      if (!ok) continue
      fs.mkdirSync(path.join(avatarOut, size), { recursive: true })
      fs.copyFileSync(path.join(srcDir, 'avatares', size, p.arquivo), path.join(avatarOut, size, p.arquivo))
    }
  }
  charRows.push(
    `    (${q(meta.anime)}, ${q(name)}, ${q(slug)}, ${hasBig ? q(`/characters/grande/${p.arquivo}`) : 'null'}, ${hasSmall ? q(`/characters/pequeno/${p.arquivo}`) : 'null'}, ${q(meta.series)}, ${order})`,
  )

  p.decks.forEach((d, di) => {
    const letter = String(d.deck).toUpperCase()
    const deckSlug = `${slug}-${letter.toLowerCase()}`
    deckRows.push(`    (${q(d.nome)}, ${q(deckSlug)})`)
    linkRows.push(`    (${q(slug)}, ${q(deckSlug)}, ${q(letter)}, ${letter === 'A'}, ${di})`)

    const rows = []
    const unmatched = []
    let n = 0
    let matched = 0
    const st = (report.bySeries[p.serie] ??= { entries: 0, matched: 0, copies: 0, copiesMatched: 0 })
    for (const zone of ZONES) {
      for (const c of d[zone] ?? []) {
        n += 1
        const ok = nameSet ? nameSet.has(normName(c.nome)) : null
        st.entries += 1
        st.copies += c.qtd
        if (ok) {
          matched += 1
          st.matched += 1
          st.copiesMatched += c.qtd
        } else if (ok === false) {
          unmatched.push(`${c.nome} (${zone} x${c.qtd})`)
        }
        rows.push(`    (${q(zone)}, ${n}, ${q(normName(c.nome))}, ${c.qtd}, ${c.id_arte ?? 'null'}, ${q(c.nome)})`)
      }
    }
    const sums = Object.fromEntries(ZONES.map((z) => [z, (d[z] ?? []).reduce((a, c) => a + c.qtd, 0)]))
    const totalsOk = ZONES.every((z) => sums[z] === (d.total?.[z] ?? 0))
    st.decks = (st.decks ?? 0) + 1
    report.deckRows.push({
      serie: p.serie, personagem: name, deck: `${letter} — ${d.nome}`, n, matched, unmatched,
      sums, declared: d.total ?? {}, totalsOk,
    })
    cardBlocks.push(
      `-- ${name} / ${letter} — ${d.nome} (${n} entradas)\n` +
        `delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = ${q(deckSlug)});\n` +
        `insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)\n` +
        `select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false\n` +
        `from (values\n${rows.join(',\n')}\n) as v(zone, sort_order, norm, qty, art_id, original_name)\n` +
        `join public.anime_decks dk on dk.slug = ${q(deckSlug)}\n` +
        `left join en_cards ec on ec.norm = v.norm\n` +
        `group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;\n`,
    )
  })
}

const animeAllRows = Object.values(SERIES).map((m) => `    (${q(m.animeName)}, ${q(m.anime)}, ${m.animeOrder})`)

const sql = `-- 016: importa personagens e decks (séries: ${seriesList.join(', ')}) de .decks/decks.json.
-- GERADO por scripts/build-character-import.mjs — não edite à mão; rode o script de novo.
-- Pré-requisitos: 011, 014 e 015 aplicadas. Idempotente (pode reaplicar).
-- Escopo: animes (5 séries com nome de exibição; personagens só das séries importadas),
-- characters, anime_decks, character_decks, anime_deck_cards.
-- Cartas: casadas por NOME em inglês (ignora caixa/acentos/pontuação) com public.cards
-- (language='en'); UMA linha por carta, language='en' (o app resolve o idioma de exibição).
-- Nomes sem correspondência entram com card_id NULL + card_name (cartas não catalogadas;
-- ver docs/character-import-report.md).

begin;

insert into public.animes (name, slug, sort_order)
values
${animeAllRows.join(',\n')}
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, updated_at = now();

insert into public.characters (anime_id, name, slug, image, image_small, series, sort_order, is_duelist)
select a.id, v.name, v.slug, v.image, v.image_small, v.series, v.sort_order, true
from (values
${charRows.join(',\n')}
) as v(anime_slug, name, slug, image, image_small, series, sort_order)
join public.animes a on a.slug = v.anime_slug
on conflict (slug) do update
  set anime_id = excluded.anime_id, name = excluded.name, image = excluded.image,
      image_small = excluded.image_small, series = excluded.series,
      sort_order = excluded.sort_order, updated_at = now();

insert into public.anime_decks (name, slug)
values
${deckRows.join(',\n')}
on conflict (slug) do update set name = excluded.name, updated_at = now();

insert into public.character_decks (character_id, deck_id, label, is_primary, sort_order)
select c.id, d.id, v.label, v.is_primary, v.sort_order
from (values
${linkRows.join(',\n')}
) as v(character_slug, deck_slug, label, is_primary, sort_order)
join public.characters c on c.slug = v.character_slug
join public.anime_decks d on d.slug = v.deck_slug
on conflict (character_id, deck_id) do update
  set label = excluded.label, is_primary = excluded.is_primary,
      sort_order = excluded.sort_order, updated_at = now();

-- Nomes de cartas em inglês normalizados (minúsculas, sem acento, só [a-z0-9]);
-- mesma regra do script (normName). Em caso de nomes duplicados fica o menor id.
create temporary table en_cards on commit drop as
select distinct on (norm) id, norm
from (
  select id,
    regexp_replace(
      translate(lower(name), '${TRANSLATE_FROM}', '${TRANSLATE_TO}'),
      '[^a-z0-9]', '', 'g') as norm
  from public.cards
  where language = 'en'
) t
order by norm, id;

create index on en_cards (norm);
analyze en_cards;

${cardBlocks.join('\n')}
commit;
`
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, sql)

if (nameSet) {
  const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : '0.0')
  let md = '# Relatório de importação de personagens/decks\n\n'
  md +=
    'Gerado por `scripts/build-character-import.mjs --names <cardinfo.json>`. Casamento medido contra a lista pública de nomes da API ygoprodeck ' +
    '(db.ygoprodeck.com/api/v7/cardinfo.php), que aproxima `public.cards` (language=\'en\'); a taxa real depende do conteúdo do banco. ' +
    'Cartas exclusivas do jogo (inexistentes na API) entram como **não catalogadas** (card_id NULL + card_name) — nenhum id é inventado.\n\n'
  md += `Séries: ${seriesList.join(', ')} · personagens: ${chars.length} · decks: ${report.deckRows.length}\n\n`
  md += '## Importadas x não catalogadas por série\n\nNão catalogada = entra em `anime_deck_cards` com `card_id` NULL + `card_name`.\n\n'
  md += '| Série | Decks | Entradas catalogadas | Não catalogadas | % catalogadas | Cópias catalogadas | Cópias não catalogadas | % |\n|---|---|---|---|---|---|---|---|\n'
  const T = { d: 0, e: 0, m: 0, c: 0, cm: 0 }
  for (const [s, v] of Object.entries(report.bySeries)) {
    md += `| ${s} | ${v.decks} | ${v.matched} | ${v.entries - v.matched} | ${pct(v.matched, v.entries)}% | ${v.copiesMatched} | ${v.copies - v.copiesMatched} | ${pct(v.copiesMatched, v.copies)}% |\n`
    T.d += v.decks; T.e += v.entries; T.m += v.matched; T.c += v.copies; T.cm += v.copiesMatched
  }
  md += `| **Total** | ${T.d} | ${T.m} | ${T.e - T.m} | ${pct(T.m, T.e)}% | ${T.cm} | ${T.c - T.cm} | ${pct(T.cm, T.c)}% |\n\n`
  const badTotals = report.deckRows.filter((d) => !d.totalsOk)
  md += '## Checagem de totais por deck\n\nSoma de `qtd` por zona vs `total{main,extra,side}` do JSON (o import preserva todas as cópias, catalogadas ou não).\n\n'
  md += badTotals.length
    ? `**${badTotals.length} deck(s) divergentes:**\n\n${badTotals.map((d) => `- [${d.serie}] ${d.personagem} — ${d.deck}: soma ${JSON.stringify(d.sums)} vs declarado ${JSON.stringify(d.declared)}`).join('\n')}\n\n`
    : `OK: ${report.deckRows.length}/${report.deckRows.length} decks batem com o total declarado em main/extra/side.\n\n`
  md += '| Deck | main | extra | side | total | Não catalogadas | Totais |\n|---|---|---|---|---|---|---|\n'
  for (const d of report.deckRows) {
    md += `| [${d.serie}] ${d.personagem} ${d.deck} | ${d.sums.main}/${d.declared.main ?? 0} | ${d.sums.extra}/${d.declared.extra ?? 0} | ${d.sums.side}/${d.declared.side ?? 0} | ${d.sums.main + d.sums.extra + d.sums.side} | ${d.unmatched.length} | ${d.totalsOk ? 'ok' : 'DIVERGE'} |\n`
  }
  md += '\n'
  md += "## Futuro: personagens repetidos entre séries\n\nAlguns personagens aparecem em mais de uma série (ex.: Crow Hogan e Jack Atlas em 5D's e ARC-V). Ao importar essas séries, o slug do personagem (e dos decks <personagem>-a/-b) precisará ser prefixado pela série (ex.: 5ds-crow, arcv-crow2) para não colidir com a unique de characters.slug. Hoje (Clássico e GX) não há colisões. Não implementado.\n\n"
  md += `## Avatares faltantes\n\n${report.missingAvatars.length ? report.missingAvatars.map((x) => `- ${x}`).join('\n') : 'Nenhum: todos os personagens têm avatar grande e pequeno.'}\n\n`
  md += '## Cartas não casadas por deck\n\n'
  for (const d of report.deckRows) {
    if (!d.unmatched.length) continue
    md += `### [${d.serie}] ${d.personagem} — ${d.deck} (${d.matched}/${d.n})\n\n${d.unmatched.map((x) => `- ${x}`).join('\n')}\n\n`
  }
  md += `## Decks 100% casados\n\n${report.deckRows.filter((d) => !d.unmatched.length).map((d) => `- [${d.serie}] ${d.personagem} — ${d.deck}`).join('\n') || '—'}\n`
  fs.mkdirSync(path.dirname(reportFile), { recursive: true })
  fs.writeFileSync(reportFile, md)
}

console.log(`SQL: ${path.relative(root, outFile)} (${chars.length} personagens, ${report.deckRows.length} decks)`)
if (report.missingAvatars.length) console.log('Avatares faltantes:', report.missingAvatars)
for (const [s, v] of Object.entries(report.bySeries)) console.log(s, nameSet ? `${v.matched}/${v.entries}` : `${v.entries} entradas`)
