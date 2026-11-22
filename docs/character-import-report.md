# Relatório de importação de personagens/decks

Gerado por `scripts/build-character-import.mjs --names <cardinfo.json>`. Casamento medido contra a lista pública de nomes da API ygoprodeck (db.ygoprodeck.com/api/v7/cardinfo.php), que aproxima `public.cards` (language='en'); a taxa real depende do conteúdo do banco. Cartas exclusivas do jogo (inexistentes na API) entram como **não catalogadas** (card_id NULL + card_name) — nenhum id é inventado.

Séries: First, GX, 5DS, ZEXAL, Arcv · personagens: 100 · decks: 200

## Importadas x não catalogadas por série

Não catalogada = entra em `anime_deck_cards` com `card_id` NULL + `card_name`.

| Série | Decks | Entradas catalogadas | Não catalogadas | % catalogadas | Cópias catalogadas | Cópias não catalogadas | % |
|---|---|---|---|---|---|---|---|
| First | 40 | 943 | 0 | 100.0% | 1695 | 0 | 100.0% |
| GX | 40 | 1015 | 0 | 100.0% | 1810 | 0 | 100.0% |
| 5DS | 40 | 936 | 0 | 100.0% | 1832 | 0 | 100.0% |
| ZEXAL | 40 | 983 | 0 | 100.0% | 1906 | 0 | 100.0% |
| Arcv | 40 | 944 | 0 | 100.0% | 1941 | 0 | 100.0% |
| **Total** | 200 | 4821 | 0 | 100.0% | 9184 | 0 | 100.0% |

## Checagem de totais por deck

Soma de `qtd` por zona vs `total{main,extra,side}` do JSON (o import preserva todas as cópias, catalogadas ou não).

OK: 200/200 decks batem com o total declarado em main/extra/side.

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
| [5DS] Akiza Izinski A — Angel of Roses | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [5DS] Akiza Izinski B — Naturia | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [5DS] Aporia A — Meklord Army | 40/40 | 1/1 | 0/0 | 41 | 0 | ok |
| [5DS] Aporia B — Genex Allies | 40/40 | 12/12 | 0/0 | 52 | 0 | ok |
| [5DS] Bolt Tanner A — Ushi Oni | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [5DS] Bolt Tanner B — Machina Gear | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [5DS] Carly Carmine A — Fortune Lady | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [5DS] Carly Carmine B — High Prophecy | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [5DS] Crow Hogan A — Blackwings | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [5DS] Crow Hogan B — Armed Wing | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [5DS] Devack A — Roaring Ape | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [5DS] Devack B — Berserk Gorilla | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [5DS] Greiger A — Reactor | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [5DS] Greiger B — Counter Burn | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [5DS] Hunter Pace A — The Undead | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [5DS] Hunter Pace B — Plaguespreader | 40/40 | 12/12 | 0/0 | 52 | 0 | ok |
| [5DS] Jack Atlas A — Red Dragon | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [5DS] Jack Atlas B — Red Nova Dragon | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [5DS] Kalin Kessler A — Doom Dragon | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [5DS] Kalin Kessler B — Infernity | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [5DS] Leo A — Morphtronic | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [5DS] Leo B — Wind-Up | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [5DS] Luna A — Ancient Fairy | 40/40 | 8/8 | 0/0 | 48 | 0 | ok |
| [5DS] Luna B — Life Burn | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [5DS] Misty Tredwell A — Tragic Ending | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [5DS] Misty Tredwell B — Reptilianne | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [5DS] Officer Tetsu Trudge A — Security | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [5DS] Officer Tetsu Trudge B — Ninjitsu Art | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [5DS] Rex Goodwin A — Wiraqocha Rasca | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [5DS] Rex Goodwin B — Moon and Sun | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [5DS] Roman A — Spider Web | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [5DS] Roman B — Earthbound | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [5DS] Sayer A — Psychokinesis | 40/40 | 1/1 | 0/0 | 41 | 0 | ok |
| [5DS] Sayer B — Thought Ruler | 40/40 | 12/12 | 0/0 | 52 | 0 | ok |
| [5DS] Sherry Leblanc A — Fleur | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [5DS] Sherry Leblanc B — Noble Knight | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [5DS] Yusei Fudo A — Junk Synchron | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [5DS] Yusei Fudo B — Stardust Dragon | 40/40 | 14/14 | 0/0 | 54 | 0 | ok |
| [5DS] Zone A — Sephylon | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [5DS] Zone B — Final Countdown | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [ZEXAL] Anna Kaboom A — Rocket Express | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [ZEXAL] Anna Kaboom B — Gustav Max | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [ZEXAL] Astral A — Xyz | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [ZEXAL] Astral B — Utopia Ray | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [ZEXAL] Bronk Stone A — Iron Gear | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [ZEXAL] Bronk Stone B — Stone Gear | 40/40 | 8/8 | 0/0 | 48 | 0 | ok |
| [ZEXAL] Caswell Francis A — Crashbugs | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [ZEXAL] Caswell Francis B — Steel Pandemic | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [ZEXAL] Cathy Katherine A — Kitty Cat | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [ZEXAL] Cathy Katherine B — The Sphinx | 40/40 | 1/1 | 0/0 | 41 | 0 | ok |
| [ZEXAL] Dextra A — Butterfly Wings | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [ZEXAL] Dextra B — Traptrix | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [ZEXAL] Dr. Faker A — Heart-eartH | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [ZEXAL] Dr. Faker B — Dark World | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [ZEXAL] Flip Turner A — Chewbone | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [ZEXAL] Flip Turner B — Flip | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [ZEXAL] Kite Tenjo A — Photon Galaxy | 40/40 | 12/12 | 0/0 | 52 | 0 | ok |
| [ZEXAL] Kite Tenjo B — Galaxy-Eyes | 40/40 | 12/12 | 0/0 | 52 | 0 | ok |
| [ZEXAL] Nelson Andrews A — Star Sparrow | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [ZEXAL] Nelson Andrews B — Icarus | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [ZEXAL] Nistro A — Bounzer Warrior | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [ZEXAL] Nistro B — Heroic Champion | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [ZEXAL] Quattro A — Gimmick Puppet | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [ZEXAL] Quattro B — Karakuri mdl 00 | 40/40 | 12/12 | 0/0 | 52 | 0 | ok |
| [ZEXAL] Quinton A — Dyson Sphere | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [ZEXAL] Quinton B — Alien Code "A" | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [ZEXAL] Reginald Kastle (Shark) A — Fish | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [ZEXAL] Reginald Kastle (Shark) B — Shark | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [ZEXAL] Rio Kastle A — Penguin | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [ZEXAL] Rio Kastle B — Gishki | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [ZEXAL] Tori Meadows A — Cheer Girl | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [ZEXAL] Tori Meadows B — The Agent | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [ZEXAL] Trey A — Stonehenge | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [ZEXAL] Trey B — Chronomaly Tech | 40/40 | 13/13 | 0/0 | 53 | 0 | ok |
| [ZEXAL] Vector A — Umbral Horror | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [ZEXAL] Vector B — Evil Infestation | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [ZEXAL] Vetrix A — Heraldic Beast | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [ZEXAL] Vetrix B — Gladiator Beast | 40/40 | 14/14 | 0/0 | 54 | 0 | ok |
| [ZEXAL] Yuma Tsukumo A — Gagaga | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [ZEXAL] Yuma Tsukumo B — Utopia | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [Arcv] Allie A — Aquaactress | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [Arcv] Allie B — Nekroz | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Aura Sentia A — Prediction Princess | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [Arcv] Aura Sentia B — Shaddoll | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Celina A — Lunalight | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [Arcv] Celina B — Kozmo | 40/40 | 7/7 | 0/0 | 47 | 0 | ok |
| [Arcv] Crow Hogan A — Assault Blackwing | 40/40 | 11/11 | 0/0 | 51 | 0 | ok |
| [Arcv] Crow Hogan B — Qliphort | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [Arcv] Declan Akaba A — DD Savant | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [Arcv] Declan Akaba B — DDD King | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Dennis McField A — Performage | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [Arcv] Dennis McField B — Majespecter | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [Arcv] Dipper O'rion A — Star Changer | 40/40 | 10/10 | 0/0 | 50 | 0 | ok |
| [Arcv] Dipper O'rion B — Tellarknight | 40/40 | 8/8 | 0/0 | 48 | 0 | ok |
| [Arcv] Gong Strong A — Big Benkei | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [Arcv] Gong Strong B — Superheavy Samurai | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [Arcv] Jack Atlas A — Red Wyvern | 40/40 | 13/13 | 0/0 | 53 | 0 | ok |
| [Arcv] Jack Atlas B — Infernoid | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Julia Krystal A — Master Diamond | 40/40 | 9/9 | 0/0 | 49 | 0 | ok |
| [Arcv] Julia Krystal B — Brilliant Diamond | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Kit Blade A — X-Saber | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [Arcv] Kit Blade B — XX-Saber | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Moon Shadow A — Ninja | 40/40 | 2/2 | 0/0 | 42 | 0 | ok |
| [Arcv] Moon Shadow B — Igknight | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Officer 227 A — Stygian | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [Arcv] Officer 227 B — Goyo | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Shay Obsidian A — Raidraptor | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Shay Obsidian B — Artifact | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [Arcv] Sora Perse A — Fluffal | 40/40 | 5/5 | 0/0 | 45 | 0 | ok |
| [Arcv] Sora Perse B — Frightfur | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Sylvio Sawatari A — Yosenju | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [Arcv] Sylvio Sawatari B — Monarch | 40/40 | 0/0 | 0/0 | 40 | 0 | ok |
| [Arcv] Yugo A — Speedroid | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Yugo B — Yang Zing | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Yuto A — Phantom Knights | 40/40 | 4/4 | 0/0 | 44 | 0 | ok |
| [Arcv] Yuto B — Burning Abyss | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Yuya Sakaki A — Performapal | 40/40 | 6/6 | 0/0 | 46 | 0 | ok |
| [Arcv] Yuya Sakaki B — Odd-Eyes | 40/40 | 15/15 | 0/0 | 55 | 0 | ok |
| [Arcv] Zuzu Boyle A — Melodious Diva | 40/40 | 3/3 | 0/0 | 43 | 0 | ok |
| [Arcv] Zuzu Boyle B — Melodious Maestra | 40/40 | 12/12 | 0/0 | 52 | 0 | ok |

## Personagens repetidos entre séries

Crow Hogan e Jack Atlas aparecem em 5D's e ARC-V. Slugs: 5D's `crow-hogan` / `jack-atlas`; ARC-V `crow-hogan-arcv` / `jack-atlas-arcv` (decks `<slug>-a/-b`, únicos). O script aborta se algum slug de personagem ou de deck se repetir. Slugs já importados (Clássico/GX, migration 016) nunca mudam.

## Migrations geradas

- 016: Clássico + GX (`--series First,GX`); 017: 5D's + ZEXAL + ARC-V (`--series 5DS,ZEXAL,Arcv`). Ambas só inserem/atualizam (o DELETE é apenas das cartas dos próprios decks importados, para reaplicar sem duplicar).
- Avatares: `scripts/optimize-avatars.mjs` gera WebP (pequeno 128px, grande 512px). 016 grava `.png`; a 018 converte para `.webp`.

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
- [5DS] Akiza Izinski — A — Angel of Roses
- [5DS] Akiza Izinski — B — Naturia
- [5DS] Aporia — A — Meklord Army
- [5DS] Aporia — B — Genex Allies
- [5DS] Bolt Tanner — A — Ushi Oni
- [5DS] Bolt Tanner — B — Machina Gear
- [5DS] Carly Carmine — A — Fortune Lady
- [5DS] Carly Carmine — B — High Prophecy
- [5DS] Crow Hogan — A — Blackwings
- [5DS] Crow Hogan — B — Armed Wing
- [5DS] Devack — A — Roaring Ape
- [5DS] Devack — B — Berserk Gorilla
- [5DS] Greiger — A — Reactor
- [5DS] Greiger — B — Counter Burn
- [5DS] Hunter Pace — A — The Undead
- [5DS] Hunter Pace — B — Plaguespreader
- [5DS] Jack Atlas — A — Red Dragon
- [5DS] Jack Atlas — B — Red Nova Dragon
- [5DS] Kalin Kessler — A — Doom Dragon
- [5DS] Kalin Kessler — B — Infernity
- [5DS] Leo — A — Morphtronic
- [5DS] Leo — B — Wind-Up
- [5DS] Luna — A — Ancient Fairy
- [5DS] Luna — B — Life Burn
- [5DS] Misty Tredwell — A — Tragic Ending
- [5DS] Misty Tredwell — B — Reptilianne
- [5DS] Officer Tetsu Trudge — A — Security
- [5DS] Officer Tetsu Trudge — B — Ninjitsu Art
- [5DS] Rex Goodwin — A — Wiraqocha Rasca
- [5DS] Rex Goodwin — B — Moon and Sun
- [5DS] Roman — A — Spider Web
- [5DS] Roman — B — Earthbound
- [5DS] Sayer — A — Psychokinesis
- [5DS] Sayer — B — Thought Ruler
- [5DS] Sherry Leblanc — A — Fleur
- [5DS] Sherry Leblanc — B — Noble Knight
- [5DS] Yusei Fudo — A — Junk Synchron
- [5DS] Yusei Fudo — B — Stardust Dragon
- [5DS] Zone — A — Sephylon
- [5DS] Zone — B — Final Countdown
- [ZEXAL] Anna Kaboom — A — Rocket Express
- [ZEXAL] Anna Kaboom — B — Gustav Max
- [ZEXAL] Astral — A — Xyz
- [ZEXAL] Astral — B — Utopia Ray
- [ZEXAL] Bronk Stone — A — Iron Gear
- [ZEXAL] Bronk Stone — B — Stone Gear
- [ZEXAL] Caswell Francis — A — Crashbugs
- [ZEXAL] Caswell Francis — B — Steel Pandemic
- [ZEXAL] Cathy Katherine — A — Kitty Cat
- [ZEXAL] Cathy Katherine — B — The Sphinx
- [ZEXAL] Dextra — A — Butterfly Wings
- [ZEXAL] Dextra — B — Traptrix
- [ZEXAL] Dr. Faker — A — Heart-eartH
- [ZEXAL] Dr. Faker — B — Dark World
- [ZEXAL] Flip Turner — A — Chewbone
- [ZEXAL] Flip Turner — B — Flip
- [ZEXAL] Kite Tenjo — A — Photon Galaxy
- [ZEXAL] Kite Tenjo — B — Galaxy-Eyes
- [ZEXAL] Nelson Andrews — A — Star Sparrow
- [ZEXAL] Nelson Andrews — B — Icarus
- [ZEXAL] Nistro — A — Bounzer Warrior
- [ZEXAL] Nistro — B — Heroic Champion
- [ZEXAL] Quattro — A — Gimmick Puppet
- [ZEXAL] Quattro — B — Karakuri mdl 00
- [ZEXAL] Quinton — A — Dyson Sphere
- [ZEXAL] Quinton — B — Alien Code "A"
- [ZEXAL] Reginald Kastle (Shark) — A — Fish
- [ZEXAL] Reginald Kastle (Shark) — B — Shark
- [ZEXAL] Rio Kastle — A — Penguin
- [ZEXAL] Rio Kastle — B — Gishki
- [ZEXAL] Tori Meadows — A — Cheer Girl
- [ZEXAL] Tori Meadows — B — The Agent
- [ZEXAL] Trey — A — Stonehenge
- [ZEXAL] Trey — B — Chronomaly Tech
- [ZEXAL] Vector — A — Umbral Horror
- [ZEXAL] Vector — B — Evil Infestation
- [ZEXAL] Vetrix — A — Heraldic Beast
- [ZEXAL] Vetrix — B — Gladiator Beast
- [ZEXAL] Yuma Tsukumo — A — Gagaga
- [ZEXAL] Yuma Tsukumo — B — Utopia
- [Arcv] Allie — A — Aquaactress
- [Arcv] Allie — B — Nekroz
- [Arcv] Aura Sentia — A — Prediction Princess
- [Arcv] Aura Sentia — B — Shaddoll
- [Arcv] Celina — A — Lunalight
- [Arcv] Celina — B — Kozmo
- [Arcv] Crow Hogan — A — Assault Blackwing
- [Arcv] Crow Hogan — B — Qliphort
- [Arcv] Declan Akaba — A — DD Savant
- [Arcv] Declan Akaba — B — DDD King
- [Arcv] Dennis McField — A — Performage
- [Arcv] Dennis McField — B — Majespecter
- [Arcv] Dipper O'rion — A — Star Changer
- [Arcv] Dipper O'rion — B — Tellarknight
- [Arcv] Gong Strong — A — Big Benkei
- [Arcv] Gong Strong — B — Superheavy Samurai
- [Arcv] Jack Atlas — A — Red Wyvern
- [Arcv] Jack Atlas — B — Infernoid
- [Arcv] Julia Krystal — A — Master Diamond
- [Arcv] Julia Krystal — B — Brilliant Diamond
- [Arcv] Kit Blade — A — X-Saber
- [Arcv] Kit Blade — B — XX-Saber
- [Arcv] Moon Shadow — A — Ninja
- [Arcv] Moon Shadow — B — Igknight
- [Arcv] Officer 227 — A — Stygian
- [Arcv] Officer 227 — B — Goyo
- [Arcv] Shay Obsidian — A — Raidraptor
- [Arcv] Shay Obsidian — B — Artifact
- [Arcv] Sora Perse — A — Fluffal
- [Arcv] Sora Perse — B — Frightfur
- [Arcv] Sylvio Sawatari — A — Yosenju
- [Arcv] Sylvio Sawatari — B — Monarch
- [Arcv] Yugo — A — Speedroid
- [Arcv] Yugo — B — Yang Zing
- [Arcv] Yuto — A — Phantom Knights
- [Arcv] Yuto — B — Burning Abyss
- [Arcv] Yuya Sakaki — A — Performapal
- [Arcv] Yuya Sakaki — B — Odd-Eyes
- [Arcv] Zuzu Boyle — A — Melodious Diva
- [Arcv] Zuzu Boyle — B — Melodious Maestra
