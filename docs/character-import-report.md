# Relatório de importação de personagens/decks

Gerado por `scripts/build-character-import.mjs --names <cardinfo.json>`. Casamento medido contra a lista pública de nomes da API ygoprodeck (db.ygoprodeck.com/api/v7/cardinfo.php), que aproxima `public.cards` (language='en'); a taxa real depende do conteúdo do banco. Cartas exclusivas do jogo (inexistentes na API) entram como **não catalogadas** (card_id NULL + card_name) — nenhum id é inventado.

Séries: First, GX · personagens: 40 · decks: 80

## Importadas x não catalogadas por série

Não catalogada = entra em `anime_deck_cards` com `card_id` NULL + `card_name`.

| Série | Decks | Entradas catalogadas | Não catalogadas | % catalogadas | Cópias catalogadas | Cópias não catalogadas | % |
|---|---|---|---|---|---|---|---|
| First | 40 | 943 | 0 | 100.0% | 1695 | 0 | 100.0% |
| GX | 40 | 1015 | 0 | 100.0% | 1810 | 0 | 100.0% |
| **Total** | 80 | 1958 | 0 | 100.0% | 3505 | 0 | 100.0% |

## Checagem de totais por deck

Soma de `qtd` por zona vs `total{main,extra,side}` do JSON (o import preserva todas as cópias, catalogadas ou não).

OK: 80/80 decks batem com o total declarado em main/extra/side.

| Deck | main | extra | side | total | Não catalogadas | Totais |
|---|---|---|---|---|---|---|
| [First] Bakura Ryou A — Final Destiny | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Bakura Ryou B — Dark Necrofear | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [First] Bandit Keith A — Zera Machine | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Bandit Keith B — Machine Burn | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [First] Duke Devlin A — Lucky Dice | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Duke Devlin B — Gradius | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [First] Ishizu Ishtar A — Grave Fairy | 41/41 | 0/0 | 0/0 | 41 | 0 | ok |
| [First] Ishizu Ishtar B — Lightsworn | 40/40 | 1/1 | 0/0 | 41 | 0 | ok |
| [First] Joey Wheeler A — Red-Eyes | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Joey Wheeler B — Jinzo | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [First] Mai Valentine A — Amazoness | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Mai Valentine B — Harpie | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [First] Mako Tsunami A — Great Ocean | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Mako Tsunami B — Mermail Abyss | 40/40 | 11/11 | 0/0 | 51 | 0 | ok |
| [First] Marik Ishtar A — Legendary Fiend | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Marik Ishtar B — Slime Token | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Maximillion Pegasus A — Toons | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Maximillion Pegasus B — Relinquished | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [First] Mokuba Kaiba A — Reptile Plant | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Mokuba Kaiba B — Worm Royalty | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [First] Odion A — Skill Drain | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Odion B — Hieratic Dragon | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [First] Rebecca Hawkins A — Life Shadow | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Rebecca Hawkins B — Ghostrick Night | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [First] Seto Kaiba A — XYZ-Dragon | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [First] Seto Kaiba B — Blue-Eyes | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [First] Shadi A — End of the World | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Shadi B — Armageddon | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [First] Solomon Muto A — Warrior Dragon | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Solomon Muto B — Forbidden One | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Tristan Taylor A — Commander | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [First] Tristan Taylor B — Legendary Six | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [First] Téa Gardner A — Angel Fairy | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Téa Gardner B — Madolche | 40/40 | 8/8 | 0/0 | 48 | 0 | ok |
| [First] Weevil Underwood A — Insect Evolution | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [First] Weevil Underwood B — Ultimate Insect | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [First] Yami Yugi A — Black Chaos | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [First] Yami Yugi B — Dark Magician | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [First] Yugi Muto A — Fusion | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [First] Yugi Muto B — Skull Servant | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Adrian Gecko A — Turbulence | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Adrian Gecko B — Cloudians | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Alexis Rhodes A — Cyber Blader | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [GX] Alexis Rhodes B — Ice Barrier | 40/40 | 11/11 | 0/0 | 51 | 0 | ok |
| [GX] Aster Phoenix A — Destiny HERO | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [GX] Aster Phoenix B — Destiny End | 40/40 | 8/8 | 0/0 | 48 | 0 | ok |
| [GX] Atticus Rhodes A — Metal Dragon | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Atticus Rhodes B — Darkness Dragon | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [GX] Axel Brodie A — Volcanic | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Axel Brodie B — Fire Fist | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [GX] Bastion Misawa A — Dinosaur H2O | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Bastion Misawa B — Dragon Ruler | 40/40 | 11/11 | 0/0 | 51 | 0 | ok |
| [GX] Blair Flannigan A — Twin Princesses | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Blair Flannigan B — Mystic Sword | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [GX] Chazz Princeton A — Ojama Trio | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Chazz Princeton B — Dragon LV | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [GX] Chumley Huffington A — Des Koalas | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [GX] Chumley Huffington B — The Fabled | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [GX] Dr. Vellian Crowler A — Ancient Gear | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [GX] Dr. Vellian Crowler B — Gadjiltron | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [GX] Jaden Yuki A — Neo-Spacian | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [GX] Jaden Yuki B — Elemental HERO | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [GX] Jesse Anderson A — Crystal Beast | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Jesse Anderson B — Crystal Rainbow | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [GX] Jim Crocodile Cook A — Rock Golem | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [GX] Jim Crocodile Cook B — Gem-Knight | 40/40 | 13/13 | 0/0 | 53 | 0 | ok |
| [GX] Kagemaru A — The Creator | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Kagemaru B — Trap Monster | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Nightshroud A — Darkness | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Nightshroud B — Archfiend | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [GX] Sartorius Kumar A — Arcana Force | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Sartorius Kumar B — Constellar | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [GX] Syrus Truesdale A — Vehicroid | 40/40 | 11/11 | 0/0 | 51 | 0 | ok |
| [GX] Syrus Truesdale B — Scrap Machine | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [GX] Tyranno Hassleberry A — Tyranno-saurus | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [GX] Tyranno Hassleberry B — Jurrac | 40/40 | 12/12 | 6/6 | 58 | 0 | ok |
| [GX] Yubel A — Terror Incarnate | 40/40 | 1/1 | 0/0 | 41 | 0 | ok |
| [GX] Yubel B — Doomsday | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [GX] Zane Truesdale A — Cyber Dragons | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [GX] Zane Truesdale B — Mecha Phantom | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |

## Futuro: personagens repetidos entre séries

Alguns personagens aparecem em mais de uma série (ex.: Crow Hogan e Jack Atlas em 5D's e ARC-V). Ao importar essas séries, o slug do personagem (e dos decks <personagem>-a/-b) precisará ser prefixado pela série (ex.: 5ds-crow, arcv-crow2) para não colidir com a unique de characters.slug. Hoje (Clássico e GX) não há colisões. Não implementado.

## Avatares faltantes

Nenhum: todos os personagens têm avatar grande e pequeno.

## Cartas não casadas por deck

## Decks 100% casados

- [First] Bakura Ryou — A — Final Destiny
- [First] Bakura Ryou — B — Dark Necrofear
- [First] Bandit Keith — A — Zera Machine
- [First] Bandit Keith — B — Machine Burn
- [First] Duke Devlin — A — Lucky Dice
- [First] Duke Devlin — B — Gradius
- [First] Ishizu Ishtar — A — Grave Fairy
- [First] Ishizu Ishtar — B — Lightsworn
- [First] Joey Wheeler — A — Red-Eyes
- [First] Joey Wheeler — B — Jinzo
- [First] Mai Valentine — A — Amazoness
- [First] Mai Valentine — B — Harpie
- [First] Mako Tsunami — A — Great Ocean
- [First] Mako Tsunami — B — Mermail Abyss
- [First] Marik Ishtar — A — Legendary Fiend
- [First] Marik Ishtar — B — Slime Token
- [First] Maximillion Pegasus — A — Toons
- [First] Maximillion Pegasus — B — Relinquished
- [First] Mokuba Kaiba — A — Reptile Plant
- [First] Mokuba Kaiba — B — Worm Royalty
- [First] Odion — A — Skill Drain
- [First] Odion — B — Hieratic Dragon
- [First] Rebecca Hawkins — A — Life Shadow
- [First] Rebecca Hawkins — B — Ghostrick Night
- [First] Seto Kaiba — A — XYZ-Dragon
- [First] Seto Kaiba — B — Blue-Eyes
- [First] Shadi — A — End of the World
- [First] Shadi — B — Armageddon
- [First] Solomon Muto — A — Warrior Dragon
- [First] Solomon Muto — B — Forbidden One
- [First] Tristan Taylor — A — Commander
- [First] Tristan Taylor — B — Legendary Six
- [First] Téa Gardner — A — Angel Fairy
- [First] Téa Gardner — B — Madolche
- [First] Weevil Underwood — A — Insect Evolution
- [First] Weevil Underwood — B — Ultimate Insect
- [First] Yami Yugi — A — Black Chaos
- [First] Yami Yugi — B — Dark Magician
- [First] Yugi Muto — A — Fusion
- [First] Yugi Muto — B — Skull Servant
- [GX] Adrian Gecko — A — Turbulence
- [GX] Adrian Gecko — B — Cloudians
- [GX] Alexis Rhodes — A — Cyber Blader
- [GX] Alexis Rhodes — B — Ice Barrier
- [GX] Aster Phoenix — A — Destiny HERO
- [GX] Aster Phoenix — B — Destiny End
- [GX] Atticus Rhodes — A — Metal Dragon
- [GX] Atticus Rhodes — B — Darkness Dragon
- [GX] Axel Brodie — A — Volcanic
- [GX] Axel Brodie — B — Fire Fist
- [GX] Bastion Misawa — A — Dinosaur H2O
- [GX] Bastion Misawa — B — Dragon Ruler
- [GX] Blair Flannigan — A — Twin Princesses
- [GX] Blair Flannigan — B — Mystic Sword
- [GX] Chazz Princeton — A — Ojama Trio
- [GX] Chazz Princeton — B — Dragon LV
- [GX] Chumley Huffington — A — Des Koalas
- [GX] Chumley Huffington — B — The Fabled
- [GX] Dr. Vellian Crowler — A — Ancient Gear
- [GX] Dr. Vellian Crowler — B — Gadjiltron
- [GX] Jaden Yuki — A — Neo-Spacian
- [GX] Jaden Yuki — B — Elemental HERO
- [GX] Jesse Anderson — A — Crystal Beast
- [GX] Jesse Anderson — B — Crystal Rainbow
- [GX] Jim Crocodile Cook — A — Rock Golem
- [GX] Jim Crocodile Cook — B — Gem-Knight
- [GX] Kagemaru — A — The Creator
- [GX] Kagemaru — B — Trap Monster
- [GX] Nightshroud — A — Darkness
- [GX] Nightshroud — B — Archfiend
- [GX] Sartorius Kumar — A — Arcana Force
- [GX] Sartorius Kumar — B — Constellar
- [GX] Syrus Truesdale — A — Vehicroid
- [GX] Syrus Truesdale — B — Scrap Machine
- [GX] Tyranno Hassleberry — A — Tyranno-saurus
- [GX] Tyranno Hassleberry — B — Jurrac
- [GX] Yubel — A — Terror Incarnate
- [GX] Yubel — B — Doomsday
- [GX] Zane Truesdale — A — Cyber Dragons
- [GX] Zane Truesdale — B — Mecha Phantom
