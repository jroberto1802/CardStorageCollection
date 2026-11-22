-- 017_import_5ds_zexal_arcv_characters.sql: importa personagens e decks (séries: 5DS, ZEXAL, Arcv) de .decks/decks.json.
-- GERADO por scripts/build-character-import.mjs — não edite à mão; rode o script de novo.
-- Pré-requisitos: 011 e 015 aplicadas (014 só no primeiro import). Idempotente (pode reaplicar);
-- só INSERT/upsert e DELETE das cartas dos próprios decks importados — nunca apaga outros dados.
-- Escopo: animes (5 séries com nome de exibição; personagens só das séries importadas),
-- characters, anime_decks, character_decks, anime_deck_cards.
-- Cartas: casadas por NOME em inglês (ignora caixa/acentos/pontuação) com public.cards
-- (language='en'); UMA linha por carta, language='en' (o app resolve o idioma de exibição).
-- Nomes sem correspondência entram com card_id NULL + card_name (cartas não catalogadas;
-- ver docs/character-import-report.md).

begin;

insert into public.animes (name, slug, sort_order)
values
    ('Clássico', 'yu-gi-oh', 1),
    ('GX', 'yu-gi-oh-gx', 2),
    ('5D''s', 'yu-gi-oh-5ds', 3),
    ('ZEXAL', 'yu-gi-oh-zexal', 4),
    ('ARC-V', 'yu-gi-oh-arc-v', 5)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, updated_at = now();

insert into public.characters (anime_id, name, slug, image, image_small, series, sort_order, is_duelist)
select a.id, v.name, v.slug, v.image, v.image_small, v.series, v.sort_order, true
from (values
    ('yu-gi-oh-5ds', 'Akiza Izinski', 'akiza-izinski', '/characters/grande/5DS_AkizaIzinski.webp', '/characters/pequeno/5DS_AkizaIzinski.webp', '5ds', 1),
    ('yu-gi-oh-5ds', 'Aporia', 'aporia', '/characters/grande/5DS_Aporia.webp', '/characters/pequeno/5DS_Aporia.webp', '5ds', 2),
    ('yu-gi-oh-5ds', 'Bolt Tanner', 'bolt-tanner', '/characters/grande/5DS_BoltTanner.webp', '/characters/pequeno/5DS_BoltTanner.webp', '5ds', 3),
    ('yu-gi-oh-5ds', 'Carly Carmine', 'carly-carmine', '/characters/grande/5DS_CarlyCarmine.webp', '/characters/pequeno/5DS_CarlyCarmine.webp', '5ds', 4),
    ('yu-gi-oh-5ds', 'Crow Hogan', 'crow-hogan', '/characters/grande/5DS_Crow.webp', '/characters/pequeno/5DS_Crow.webp', '5ds', 5),
    ('yu-gi-oh-5ds', 'Devack', 'devack', '/characters/grande/5DS_Devack.webp', '/characters/pequeno/5DS_Devack.webp', '5ds', 6),
    ('yu-gi-oh-5ds', 'Greiger', 'greiger', '/characters/grande/5DS_Greiger.webp', '/characters/pequeno/5DS_Greiger.webp', '5ds', 7),
    ('yu-gi-oh-5ds', 'Hunter Pace', 'hunter-pace', '/characters/grande/5DS_HunterPace.webp', '/characters/pequeno/5DS_HunterPace.webp', '5ds', 8),
    ('yu-gi-oh-5ds', 'Jack Atlas', 'jack-atlas', '/characters/grande/5DS_JackAtlas.webp', '/characters/pequeno/5DS_JackAtlas.webp', '5ds', 9),
    ('yu-gi-oh-5ds', 'Kalin Kessler', 'kalin-kessler', '/characters/grande/5DS_KalinKessler.webp', '/characters/pequeno/5DS_KalinKessler.webp', '5ds', 10),
    ('yu-gi-oh-5ds', 'Leo', 'leo', '/characters/grande/5DS_Leo.webp', '/characters/pequeno/5DS_Leo.webp', '5ds', 11),
    ('yu-gi-oh-5ds', 'Luna', 'luna', '/characters/grande/5DS_Luna.webp', '/characters/pequeno/5DS_Luna.webp', '5ds', 12),
    ('yu-gi-oh-5ds', 'Misty Tredwell', 'misty-tredwell', '/characters/grande/5DS_MistyTredwell.webp', '/characters/pequeno/5DS_MistyTredwell.webp', '5ds', 13),
    ('yu-gi-oh-5ds', 'Officer Tetsu Trudge', 'tetsu-trudge', '/characters/grande/5DS_TetsuTrudge.webp', '/characters/pequeno/5DS_TetsuTrudge.webp', '5ds', 14),
    ('yu-gi-oh-5ds', 'Rex Goodwin', 'rex-goodwin', '/characters/grande/5DS_RexGoodwin.webp', '/characters/pequeno/5DS_RexGoodwin.webp', '5ds', 15),
    ('yu-gi-oh-5ds', 'Roman', 'roman', '/characters/grande/5DS_Roman.webp', '/characters/pequeno/5DS_Roman.webp', '5ds', 16),
    ('yu-gi-oh-5ds', 'Sayer', 'sayer', '/characters/grande/5DS_Sayer.webp', '/characters/pequeno/5DS_Sayer.webp', '5ds', 17),
    ('yu-gi-oh-5ds', 'Sherry Leblanc', 'sherry-le-blanc', '/characters/grande/5DS_SherryLeBlanc.webp', '/characters/pequeno/5DS_SherryLeBlanc.webp', '5ds', 18),
    ('yu-gi-oh-5ds', 'Yusei Fudo', 'yusei-fudo', '/characters/grande/5DS_YuseiFudo.webp', '/characters/pequeno/5DS_YuseiFudo.webp', '5ds', 19),
    ('yu-gi-oh-5ds', 'Zone', 'zone', '/characters/grande/5DS_Zone.webp', '/characters/pequeno/5DS_Zone.webp', '5ds', 20),
    ('yu-gi-oh-zexal', 'Anna Kaboom', 'anna-kaboom', '/characters/grande/ZEXAL_AnnaKaboom.webp', '/characters/pequeno/ZEXAL_AnnaKaboom.webp', 'zexal', 1),
    ('yu-gi-oh-zexal', 'Astral', 'astral', '/characters/grande/ZEXAL_Astral.webp', '/characters/pequeno/ZEXAL_Astral.webp', 'zexal', 2),
    ('yu-gi-oh-zexal', 'Bronk Stone', 'bronk-stone', '/characters/grande/ZEXAL_BronkStone.webp', '/characters/pequeno/ZEXAL_BronkStone.webp', 'zexal', 3),
    ('yu-gi-oh-zexal', 'Caswell Francis', 'caswell-francis', '/characters/grande/ZEXAL_CaswellFrancis.webp', '/characters/pequeno/ZEXAL_CaswellFrancis.webp', 'zexal', 4),
    ('yu-gi-oh-zexal', 'Cathy Katherine', 'cathy-katherine', '/characters/grande/ZEXAL_CathyKatherine.webp', '/characters/pequeno/ZEXAL_CathyKatherine.webp', 'zexal', 5),
    ('yu-gi-oh-zexal', 'Dextra', 'dextra', '/characters/grande/ZEXAL_Dextra.webp', '/characters/pequeno/ZEXAL_Dextra.webp', 'zexal', 6),
    ('yu-gi-oh-zexal', 'Dr. Faker', 'dr-faker', '/characters/grande/ZEXAL_DrFaker.webp', '/characters/pequeno/ZEXAL_DrFaker.webp', 'zexal', 7),
    ('yu-gi-oh-zexal', 'Flip Turner', 'flip-turner', '/characters/grande/ZEXAL_FlipTurner.webp', '/characters/pequeno/ZEXAL_FlipTurner.webp', 'zexal', 8),
    ('yu-gi-oh-zexal', 'Kite Tenjo', 'kite-tenjo', '/characters/grande/ZEXAL_KiteTenjo.webp', '/characters/pequeno/ZEXAL_KiteTenjo.webp', 'zexal', 9),
    ('yu-gi-oh-zexal', 'Nelson Andrews', 'nelson-andrews', '/characters/grande/ZEXAL_NelsonAndrews.webp', '/characters/pequeno/ZEXAL_NelsonAndrews.webp', 'zexal', 10),
    ('yu-gi-oh-zexal', 'Nistro', 'nistro', '/characters/grande/ZEXAL_Nistro.webp', '/characters/pequeno/ZEXAL_Nistro.webp', 'zexal', 11),
    ('yu-gi-oh-zexal', 'Quattro', 'quattro', '/characters/grande/ZEXAL_Quattro.webp', '/characters/pequeno/ZEXAL_Quattro.webp', 'zexal', 12),
    ('yu-gi-oh-zexal', 'Quinton', 'quinton', '/characters/grande/ZEXAL_Quinton.webp', '/characters/pequeno/ZEXAL_Quinton.webp', 'zexal', 13),
    ('yu-gi-oh-zexal', 'Reginald Kastle (Shark)', 'reginald-kastle', '/characters/grande/ZEXAL_ReginaldKastle.webp', '/characters/pequeno/ZEXAL_ReginaldKastle.webp', 'zexal', 14),
    ('yu-gi-oh-zexal', 'Rio Kastle', 'rio-kastle', '/characters/grande/ZEXAL_RioKastle.webp', '/characters/pequeno/ZEXAL_RioKastle.webp', 'zexal', 15),
    ('yu-gi-oh-zexal', 'Tori Meadows', 'tori-meadows', '/characters/grande/ZEXAL_ToriMeadows.webp', '/characters/pequeno/ZEXAL_ToriMeadows.webp', 'zexal', 16),
    ('yu-gi-oh-zexal', 'Trey', 'trey', '/characters/grande/ZEXAL_Trey.webp', '/characters/pequeno/ZEXAL_Trey.webp', 'zexal', 17),
    ('yu-gi-oh-zexal', 'Vector', 'vector', '/characters/grande/ZEXAL_Vector.webp', '/characters/pequeno/ZEXAL_Vector.webp', 'zexal', 18),
    ('yu-gi-oh-zexal', 'Vetrix', 'vetrix', '/characters/grande/ZEXAL_Vetrix.webp', '/characters/pequeno/ZEXAL_Vetrix.webp', 'zexal', 19),
    ('yu-gi-oh-zexal', 'Yuma Tsukumo', 'yuma-tsukumo', '/characters/grande/ZEXAL_YumaTsukumo.webp', '/characters/pequeno/ZEXAL_YumaTsukumo.webp', 'zexal', 20),
    ('yu-gi-oh-arc-v', 'Allie', 'allie', '/characters/grande/Arcv_Allie.webp', '/characters/pequeno/Arcv_Allie.webp', 'arcv', 1),
    ('yu-gi-oh-arc-v', 'Aura Sentia', 'aura', '/characters/grande/Arcv_Aura.webp', '/characters/pequeno/Arcv_Aura.webp', 'arcv', 2),
    ('yu-gi-oh-arc-v', 'Celina', 'celina', '/characters/grande/Arcv_Celina.webp', '/characters/pequeno/Arcv_Celina.webp', 'arcv', 3),
    ('yu-gi-oh-arc-v', 'Crow Hogan', 'crow-hogan-arcv', '/characters/grande/Arcv_Crow2.webp', '/characters/pequeno/Arcv_Crow2.webp', 'arcv', 4),
    ('yu-gi-oh-arc-v', 'Declan Akaba', 'declan', '/characters/grande/Arcv_Declan.webp', '/characters/pequeno/Arcv_Declan.webp', 'arcv', 5),
    ('yu-gi-oh-arc-v', 'Dennis McField', 'dennis', '/characters/grande/Arcv_Dennis.webp', '/characters/pequeno/Arcv_Dennis.webp', 'arcv', 6),
    ('yu-gi-oh-arc-v', 'Dipper O''rion', 'dipper', '/characters/grande/Arcv_Dipper.webp', '/characters/pequeno/Arcv_Dipper.webp', 'arcv', 7),
    ('yu-gi-oh-arc-v', 'Gong Strong', 'gong', '/characters/grande/Arcv_Gong.webp', '/characters/pequeno/Arcv_Gong.webp', 'arcv', 8),
    ('yu-gi-oh-arc-v', 'Jack Atlas', 'jack-atlas-arcv', '/characters/grande/Arcv_Jack2.webp', '/characters/pequeno/Arcv_Jack2.webp', 'arcv', 9),
    ('yu-gi-oh-arc-v', 'Julia Krystal', 'julia', '/characters/grande/Arcv_Julia.webp', '/characters/pequeno/Arcv_Julia.webp', 'arcv', 10),
    ('yu-gi-oh-arc-v', 'Kit Blade', 'kit', '/characters/grande/Arcv_Kit.webp', '/characters/pequeno/Arcv_Kit.webp', 'arcv', 11),
    ('yu-gi-oh-arc-v', 'Moon Shadow', 'moon-shadow', '/characters/grande/Arcv_MoonShadow.webp', '/characters/pequeno/Arcv_MoonShadow.webp', 'arcv', 12),
    ('yu-gi-oh-arc-v', 'Officer 227', 'officer227', '/characters/grande/Arcv_Officer227.webp', '/characters/pequeno/Arcv_Officer227.webp', 'arcv', 13),
    ('yu-gi-oh-arc-v', 'Shay Obsidian', 'shay', '/characters/grande/Arcv_Shay.webp', '/characters/pequeno/Arcv_Shay.webp', 'arcv', 14),
    ('yu-gi-oh-arc-v', 'Sora Perse', 'sora', '/characters/grande/Arcv_Sora.webp', '/characters/pequeno/Arcv_Sora.webp', 'arcv', 15),
    ('yu-gi-oh-arc-v', 'Sylvio Sawatari', 'sylvio', '/characters/grande/Arcv_Sylvio.webp', '/characters/pequeno/Arcv_Sylvio.webp', 'arcv', 16),
    ('yu-gi-oh-arc-v', 'Yugo', 'yugo', '/characters/grande/Arcv_Yugo.webp', '/characters/pequeno/Arcv_Yugo.webp', 'arcv', 17),
    ('yu-gi-oh-arc-v', 'Yuto', 'yuto', '/characters/grande/Arcv_Yuto.webp', '/characters/pequeno/Arcv_Yuto.webp', 'arcv', 18),
    ('yu-gi-oh-arc-v', 'Yuya Sakaki', 'yuya', '/characters/grande/Arcv_Yuya.webp', '/characters/pequeno/Arcv_Yuya.webp', 'arcv', 19),
    ('yu-gi-oh-arc-v', 'Zuzu Boyle', 'zuzu', '/characters/grande/Arcv_Zuzu.webp', '/characters/pequeno/Arcv_Zuzu.webp', 'arcv', 20)
) as v(anime_slug, name, slug, image, image_small, series, sort_order)
join public.animes a on a.slug = v.anime_slug
on conflict (slug) do update
  set anime_id = excluded.anime_id, name = excluded.name, image = excluded.image,
      image_small = excluded.image_small, series = excluded.series,
      sort_order = excluded.sort_order, updated_at = now();

insert into public.anime_decks (name, slug)
values
    ('Angel of Roses', 'akiza-izinski-a'),
    ('Naturia', 'akiza-izinski-b'),
    ('Meklord Army', 'aporia-a'),
    ('Genex Allies', 'aporia-b'),
    ('Ushi Oni', 'bolt-tanner-a'),
    ('Machina Gear', 'bolt-tanner-b'),
    ('Fortune Lady', 'carly-carmine-a'),
    ('High Prophecy', 'carly-carmine-b'),
    ('Blackwings', 'crow-hogan-a'),
    ('Armed Wing', 'crow-hogan-b'),
    ('Roaring Ape', 'devack-a'),
    ('Berserk Gorilla', 'devack-b'),
    ('Reactor', 'greiger-a'),
    ('Counter Burn', 'greiger-b'),
    ('The Undead', 'hunter-pace-a'),
    ('Plaguespreader', 'hunter-pace-b'),
    ('Red Dragon', 'jack-atlas-a'),
    ('Red Nova Dragon', 'jack-atlas-b'),
    ('Doom Dragon', 'kalin-kessler-a'),
    ('Infernity', 'kalin-kessler-b'),
    ('Morphtronic', 'leo-a'),
    ('Wind-Up', 'leo-b'),
    ('Ancient Fairy', 'luna-a'),
    ('Life Burn', 'luna-b'),
    ('Tragic Ending', 'misty-tredwell-a'),
    ('Reptilianne', 'misty-tredwell-b'),
    ('Security', 'tetsu-trudge-a'),
    ('Ninjitsu Art', 'tetsu-trudge-b'),
    ('Wiraqocha Rasca', 'rex-goodwin-a'),
    ('Moon and Sun', 'rex-goodwin-b'),
    ('Spider Web', 'roman-a'),
    ('Earthbound', 'roman-b'),
    ('Psychokinesis', 'sayer-a'),
    ('Thought Ruler', 'sayer-b'),
    ('Fleur', 'sherry-le-blanc-a'),
    ('Noble Knight', 'sherry-le-blanc-b'),
    ('Junk Synchron', 'yusei-fudo-a'),
    ('Stardust Dragon', 'yusei-fudo-b'),
    ('Sephylon', 'zone-a'),
    ('Final Countdown', 'zone-b'),
    ('Rocket Express', 'anna-kaboom-a'),
    ('Gustav Max', 'anna-kaboom-b'),
    ('Xyz', 'astral-a'),
    ('Utopia Ray', 'astral-b'),
    ('Iron Gear', 'bronk-stone-a'),
    ('Stone Gear', 'bronk-stone-b'),
    ('Crashbugs', 'caswell-francis-a'),
    ('Steel Pandemic', 'caswell-francis-b'),
    ('Kitty Cat', 'cathy-katherine-a'),
    ('The Sphinx', 'cathy-katherine-b'),
    ('Butterfly Wings', 'dextra-a'),
    ('Traptrix', 'dextra-b'),
    ('Heart-eartH', 'dr-faker-a'),
    ('Dark World', 'dr-faker-b'),
    ('Chewbone', 'flip-turner-a'),
    ('Flip', 'flip-turner-b'),
    ('Photon Galaxy', 'kite-tenjo-a'),
    ('Galaxy-Eyes', 'kite-tenjo-b'),
    ('Star Sparrow', 'nelson-andrews-a'),
    ('Icarus', 'nelson-andrews-b'),
    ('Bounzer Warrior', 'nistro-a'),
    ('Heroic Champion', 'nistro-b'),
    ('Gimmick Puppet', 'quattro-a'),
    ('Karakuri mdl 00', 'quattro-b'),
    ('Dyson Sphere', 'quinton-a'),
    ('Alien Code "A"', 'quinton-b'),
    ('Fish', 'reginald-kastle-a'),
    ('Shark', 'reginald-kastle-b'),
    ('Penguin', 'rio-kastle-a'),
    ('Gishki', 'rio-kastle-b'),
    ('Cheer Girl', 'tori-meadows-a'),
    ('The Agent', 'tori-meadows-b'),
    ('Stonehenge', 'trey-a'),
    ('Chronomaly Tech', 'trey-b'),
    ('Umbral Horror', 'vector-a'),
    ('Evil Infestation', 'vector-b'),
    ('Heraldic Beast', 'vetrix-a'),
    ('Gladiator Beast', 'vetrix-b'),
    ('Gagaga', 'yuma-tsukumo-a'),
    ('Utopia', 'yuma-tsukumo-b'),
    ('Aquaactress', 'allie-a'),
    ('Nekroz', 'allie-b'),
    ('Prediction Princess', 'aura-a'),
    ('Shaddoll', 'aura-b'),
    ('Lunalight', 'celina-a'),
    ('Kozmo', 'celina-b'),
    ('Assault Blackwing', 'crow-hogan-arcv-a'),
    ('Qliphort', 'crow-hogan-arcv-b'),
    ('DD Savant', 'declan-a'),
    ('DDD King', 'declan-b'),
    ('Performage', 'dennis-a'),
    ('Majespecter', 'dennis-b'),
    ('Star Changer', 'dipper-a'),
    ('Tellarknight', 'dipper-b'),
    ('Big Benkei', 'gong-a'),
    ('Superheavy Samurai', 'gong-b'),
    ('Red Wyvern', 'jack-atlas-arcv-a'),
    ('Infernoid', 'jack-atlas-arcv-b'),
    ('Master Diamond', 'julia-a'),
    ('Brilliant Diamond', 'julia-b'),
    ('X-Saber', 'kit-a'),
    ('XX-Saber', 'kit-b'),
    ('Ninja', 'moon-shadow-a'),
    ('Igknight', 'moon-shadow-b'),
    ('Stygian', 'officer227-a'),
    ('Goyo', 'officer227-b'),
    ('Raidraptor', 'shay-a'),
    ('Artifact', 'shay-b'),
    ('Fluffal', 'sora-a'),
    ('Frightfur', 'sora-b'),
    ('Yosenju', 'sylvio-a'),
    ('Monarch', 'sylvio-b'),
    ('Speedroid', 'yugo-a'),
    ('Yang Zing', 'yugo-b'),
    ('Phantom Knights', 'yuto-a'),
    ('Burning Abyss', 'yuto-b'),
    ('Performapal', 'yuya-a'),
    ('Odd-Eyes', 'yuya-b'),
    ('Melodious Diva', 'zuzu-a'),
    ('Melodious Maestra', 'zuzu-b')
on conflict (slug) do update set name = excluded.name, updated_at = now();

insert into public.character_decks (character_id, deck_id, label, is_primary, sort_order)
select c.id, d.id, v.label, v.is_primary, v.sort_order
from (values
    ('akiza-izinski', 'akiza-izinski-a', 'A', true, 0),
    ('akiza-izinski', 'akiza-izinski-b', 'B', false, 1),
    ('aporia', 'aporia-a', 'A', true, 0),
    ('aporia', 'aporia-b', 'B', false, 1),
    ('bolt-tanner', 'bolt-tanner-a', 'A', true, 0),
    ('bolt-tanner', 'bolt-tanner-b', 'B', false, 1),
    ('carly-carmine', 'carly-carmine-a', 'A', true, 0),
    ('carly-carmine', 'carly-carmine-b', 'B', false, 1),
    ('crow-hogan', 'crow-hogan-a', 'A', true, 0),
    ('crow-hogan', 'crow-hogan-b', 'B', false, 1),
    ('devack', 'devack-a', 'A', true, 0),
    ('devack', 'devack-b', 'B', false, 1),
    ('greiger', 'greiger-a', 'A', true, 0),
    ('greiger', 'greiger-b', 'B', false, 1),
    ('hunter-pace', 'hunter-pace-a', 'A', true, 0),
    ('hunter-pace', 'hunter-pace-b', 'B', false, 1),
    ('jack-atlas', 'jack-atlas-a', 'A', true, 0),
    ('jack-atlas', 'jack-atlas-b', 'B', false, 1),
    ('kalin-kessler', 'kalin-kessler-a', 'A', true, 0),
    ('kalin-kessler', 'kalin-kessler-b', 'B', false, 1),
    ('leo', 'leo-a', 'A', true, 0),
    ('leo', 'leo-b', 'B', false, 1),
    ('luna', 'luna-a', 'A', true, 0),
    ('luna', 'luna-b', 'B', false, 1),
    ('misty-tredwell', 'misty-tredwell-a', 'A', true, 0),
    ('misty-tredwell', 'misty-tredwell-b', 'B', false, 1),
    ('tetsu-trudge', 'tetsu-trudge-a', 'A', true, 0),
    ('tetsu-trudge', 'tetsu-trudge-b', 'B', false, 1),
    ('rex-goodwin', 'rex-goodwin-a', 'A', true, 0),
    ('rex-goodwin', 'rex-goodwin-b', 'B', false, 1),
    ('roman', 'roman-a', 'A', true, 0),
    ('roman', 'roman-b', 'B', false, 1),
    ('sayer', 'sayer-a', 'A', true, 0),
    ('sayer', 'sayer-b', 'B', false, 1),
    ('sherry-le-blanc', 'sherry-le-blanc-a', 'A', true, 0),
    ('sherry-le-blanc', 'sherry-le-blanc-b', 'B', false, 1),
    ('yusei-fudo', 'yusei-fudo-a', 'A', true, 0),
    ('yusei-fudo', 'yusei-fudo-b', 'B', false, 1),
    ('zone', 'zone-a', 'A', true, 0),
    ('zone', 'zone-b', 'B', false, 1),
    ('anna-kaboom', 'anna-kaboom-a', 'A', true, 0),
    ('anna-kaboom', 'anna-kaboom-b', 'B', false, 1),
    ('astral', 'astral-a', 'A', true, 0),
    ('astral', 'astral-b', 'B', false, 1),
    ('bronk-stone', 'bronk-stone-a', 'A', true, 0),
    ('bronk-stone', 'bronk-stone-b', 'B', false, 1),
    ('caswell-francis', 'caswell-francis-a', 'A', true, 0),
    ('caswell-francis', 'caswell-francis-b', 'B', false, 1),
    ('cathy-katherine', 'cathy-katherine-a', 'A', true, 0),
    ('cathy-katherine', 'cathy-katherine-b', 'B', false, 1),
    ('dextra', 'dextra-a', 'A', true, 0),
    ('dextra', 'dextra-b', 'B', false, 1),
    ('dr-faker', 'dr-faker-a', 'A', true, 0),
    ('dr-faker', 'dr-faker-b', 'B', false, 1),
    ('flip-turner', 'flip-turner-a', 'A', true, 0),
    ('flip-turner', 'flip-turner-b', 'B', false, 1),
    ('kite-tenjo', 'kite-tenjo-a', 'A', true, 0),
    ('kite-tenjo', 'kite-tenjo-b', 'B', false, 1),
    ('nelson-andrews', 'nelson-andrews-a', 'A', true, 0),
    ('nelson-andrews', 'nelson-andrews-b', 'B', false, 1),
    ('nistro', 'nistro-a', 'A', true, 0),
    ('nistro', 'nistro-b', 'B', false, 1),
    ('quattro', 'quattro-a', 'A', true, 0),
    ('quattro', 'quattro-b', 'B', false, 1),
    ('quinton', 'quinton-a', 'A', true, 0),
    ('quinton', 'quinton-b', 'B', false, 1),
    ('reginald-kastle', 'reginald-kastle-a', 'A', true, 0),
    ('reginald-kastle', 'reginald-kastle-b', 'B', false, 1),
    ('rio-kastle', 'rio-kastle-a', 'A', true, 0),
    ('rio-kastle', 'rio-kastle-b', 'B', false, 1),
    ('tori-meadows', 'tori-meadows-a', 'A', true, 0),
    ('tori-meadows', 'tori-meadows-b', 'B', false, 1),
    ('trey', 'trey-a', 'A', true, 0),
    ('trey', 'trey-b', 'B', false, 1),
    ('vector', 'vector-a', 'A', true, 0),
    ('vector', 'vector-b', 'B', false, 1),
    ('vetrix', 'vetrix-a', 'A', true, 0),
    ('vetrix', 'vetrix-b', 'B', false, 1),
    ('yuma-tsukumo', 'yuma-tsukumo-a', 'A', true, 0),
    ('yuma-tsukumo', 'yuma-tsukumo-b', 'B', false, 1),
    ('allie', 'allie-a', 'A', true, 0),
    ('allie', 'allie-b', 'B', false, 1),
    ('aura', 'aura-a', 'A', true, 0),
    ('aura', 'aura-b', 'B', false, 1),
    ('celina', 'celina-a', 'A', true, 0),
    ('celina', 'celina-b', 'B', false, 1),
    ('crow-hogan-arcv', 'crow-hogan-arcv-a', 'A', true, 0),
    ('crow-hogan-arcv', 'crow-hogan-arcv-b', 'B', false, 1),
    ('declan', 'declan-a', 'A', true, 0),
    ('declan', 'declan-b', 'B', false, 1),
    ('dennis', 'dennis-a', 'A', true, 0),
    ('dennis', 'dennis-b', 'B', false, 1),
    ('dipper', 'dipper-a', 'A', true, 0),
    ('dipper', 'dipper-b', 'B', false, 1),
    ('gong', 'gong-a', 'A', true, 0),
    ('gong', 'gong-b', 'B', false, 1),
    ('jack-atlas-arcv', 'jack-atlas-arcv-a', 'A', true, 0),
    ('jack-atlas-arcv', 'jack-atlas-arcv-b', 'B', false, 1),
    ('julia', 'julia-a', 'A', true, 0),
    ('julia', 'julia-b', 'B', false, 1),
    ('kit', 'kit-a', 'A', true, 0),
    ('kit', 'kit-b', 'B', false, 1),
    ('moon-shadow', 'moon-shadow-a', 'A', true, 0),
    ('moon-shadow', 'moon-shadow-b', 'B', false, 1),
    ('officer227', 'officer227-a', 'A', true, 0),
    ('officer227', 'officer227-b', 'B', false, 1),
    ('shay', 'shay-a', 'A', true, 0),
    ('shay', 'shay-b', 'B', false, 1),
    ('sora', 'sora-a', 'A', true, 0),
    ('sora', 'sora-b', 'B', false, 1),
    ('sylvio', 'sylvio-a', 'A', true, 0),
    ('sylvio', 'sylvio-b', 'B', false, 1),
    ('yugo', 'yugo-a', 'A', true, 0),
    ('yugo', 'yugo-b', 'B', false, 1),
    ('yuto', 'yuto-a', 'A', true, 0),
    ('yuto', 'yuto-b', 'B', false, 1),
    ('yuya', 'yuya-a', 'A', true, 0),
    ('yuya', 'yuya-b', 'B', false, 1),
    ('zuzu', 'zuzu-a', 'A', true, 0),
    ('zuzu', 'zuzu-b', 'B', false, 1)
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
      translate(lower(name), 'áàâäãåāéèêëēíìîïīóòôöõōúùûüūñç', 'aaaaaaaeeeeeiiiiioooooouuuuunc'),
      '[^a-z0-9]', '', 'g') as norm
  from public.cards
  where language = 'en'
) t
order by norm, id;

create index on en_cards (norm);
analyze en_cards;

-- Akiza Izinski / A — Angel of Roses (30 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'akiza-izinski-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'birdofroses', 1, 8794, 'Bird of Roses'),
    ('main', 2, 'bluerosedragon', 1, 9448, 'Blue Rose Dragon'),
    ('main', 3, 'copyplant', 1, 7873, 'Copy Plant'),
    ('main', 4, 'darkverger', 1, 8157, 'Dark Verger'),
    ('main', 5, 'evilthorn', 3, 8161, 'Evil Thorn'),
    ('main', 6, 'fallenangelofroses', 1, 9420, 'Fallen Angel of Roses'),
    ('main', 7, 'gigaplant', 2, 7427, 'Gigaplant'),
    ('main', 8, 'hedgeguard', 1, 8160, 'Hedge Guard'),
    ('main', 9, 'lonefireblossom', 1, 7568, 'Lonefire Blossom'),
    ('main', 10, 'lordpoison', 2, 5485, 'Lord Poison'),
    ('main', 11, 'phoenixianclusteramaryllis', 2, 8159, 'Phoenixian Cluster Amaryllis'),
    ('main', 12, 'phoenixianseed', 1, 8158, 'Phoenixian Seed'),
    ('main', 13, 'revivalrose', 1, 8792, 'Revival Rose'),
    ('main', 14, 'rosetentacles', 1, 8003, 'Rose Tentacles'),
    ('main', 15, 'spore', 1, 8795, 'Spore'),
    ('main', 16, 'twilightroseknight', 2, 8014, 'Twilight Rose Knight'),
    ('main', 17, 'tytannialprincessofcamellias', 1, 7893, 'Tytannial, Princess of Camellias'),
    ('main', 18, 'blackgarden', 2, 7904, 'Black Garden'),
    ('main', 19, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 20, 'markoftherose', 2, 7903, 'Mark of the Rose'),
    ('main', 21, 'miraclefertilizer', 2, 7671, 'Miracle Fertilizer'),
    ('main', 22, 'supersolarnutrient', 2, 8053, 'Super Solar Nutrient'),
    ('main', 23, 'wonderclover', 1, 8201, 'Wonder Clover'),
    ('main', 24, 'overdoomline', 2, 8218, 'Overdoom Line'),
    ('main', 25, 'starsiphon', 2, 9146, 'Star Siphon'),
    ('main', 26, 'wallofthorns', 2, 8074, 'Wall of Thorns'),
    ('main', 27, 'wickedrebirth', 1, 8219, 'Wicked Rebirth'),
    ('extra', 28, 'blackrosedragon', 1, 7898, 'Black Rose Dragon'),
    ('extra', 29, 'queenofthorns', 1, 7668, 'Queen of Thorns'),
    ('extra', 30, 'splendidrose', 1, 8818, 'Splendid Rose')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'akiza-izinski-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Akiza Izinski / B — Naturia (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'akiza-izinski-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'naturiabambooshoot', 3, 8960, 'Naturia Bamboo Shoot'),
    ('main', 2, 'naturiabutterfly', 3, 8567, 'Naturia Butterfly'),
    ('main', 3, 'naturiacherries', 3, 9107, 'Naturia Cherries'),
    ('main', 4, 'naturiacliff', 3, 8244, 'Naturia Cliff'),
    ('main', 5, 'naturiacosmobeet', 2, 8103, 'Naturia Cosmobeet'),
    ('main', 6, 'naturiadragonfly', 2, 8242, 'Naturia Dragonfly'),
    ('main', 7, 'naturiafruitfly', 2, 8400, 'Naturia Fruitfly'),
    ('main', 8, 'naturiapumpkin', 2, 9108, 'Naturia Pumpkin'),
    ('main', 9, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'mindcontrol', 1, 4817, 'Mind Control'),
    ('main', 12, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 14, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 15, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 16, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 17, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 18, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 19, 'safezone', 1, 9549, 'Safe Zone'),
    ('main', 20, 'scrapironscarecrow', 3, 7694, 'Scrap-Iron Scarecrow'),
    ('main', 21, 'wallofthorns', 2, 8074, 'Wall of Thorns'),
    ('extra', 22, 'naturiabarkion', 1, 8260, 'Naturia Barkion'),
    ('extra', 23, 'naturiabeast', 1, 7969, 'Naturia Beast'),
    ('extra', 24, 'naturialandoise', 1, 8578, 'Naturia Landoise'),
    ('extra', 25, 'naturialeodrake', 1, 8119, 'Naturia Leodrake'),
    ('extra', 26, 'queenofthorns', 1, 7668, 'Queen of Thorns'),
    ('extra', 27, 'splendidrose', 1, 8818, 'Splendid Rose'),
    ('extra', 28, 'thoughtrulerarchfiend', 1, 7738, 'Thought Ruler Archfiend')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'akiza-izinski-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Aporia / A — Meklord Army (17 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'aporia-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'marshmallon', 3, 6000, 'Marshmallon'),
    ('main', 2, 'meklordarmyofgranel', 3, 9485, 'Meklord Army of Granel'),
    ('main', 3, 'meklordarmyofskiel', 3, 9484, 'Meklord Army of Skiel'),
    ('main', 4, 'meklordarmyofwisel', 3, 9483, 'Meklord Army of Wisel'),
    ('main', 5, 'meklordastrodragonasterisk', 3, 9486, 'Meklord Astro Dragon Asterisk'),
    ('main', 6, 'meklordemperorgranel', 3, 9265, 'Meklord Emperor Granel'),
    ('main', 7, 'meklordemperorskiel', 3, 9266, 'Meklord Emperor Skiel'),
    ('main', 8, 'meklordemperorwisel', 3, 9264, 'Meklord Emperor Wisel'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'fortissimothemobilefortress', 3, 9520, 'Fortissimo the Mobile Fortress'),
    ('main', 11, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 12, 'reboot', 1, 9523, 'Reboot'),
    ('main', 13, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 14, 'meklordfactory', 2, 9538, 'Meklord Factory'),
    ('main', 15, 'mektimedblast', 2, 9537, 'Mektimed Blast'),
    ('main', 16, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 17, 'skypalacegangaridai', 1, 10718, 'Skypalace Gangaridai')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'aporia-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Aporia / B — Genex Allies (33 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'aporia-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'genexallybirdman', 1, 8709, 'Genex Ally Birdman'),
    ('main', 2, 'genexallychemistrer', 1, 8708, 'Genex Ally Chemistrer'),
    ('main', 3, 'genexallycrusher', 2, 8711, 'Genex Ally Crusher'),
    ('main', 4, 'genexallyduradark', 3, 8546, 'Genex Ally Duradark'),
    ('main', 5, 'genexallypowercell', 1, 8550, 'Genex Ally Powercell'),
    ('main', 6, 'genexallyremote', 3, 8549, 'Genex Ally Remote'),
    ('main', 7, 'genexneutron', 3, 7839, 'Genex Neutron'),
    ('main', 8, 'genexspare', 2, 7950, 'Genex Spare'),
    ('main', 9, 'genexturbine', 1, 7951, 'Genex Turbine'),
    ('main', 10, 'genexworker', 2, 7811, 'Genex Worker'),
    ('main', 11, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 12, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 13, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 14, 'limiterremoval', 1, 5129, 'Limiter Removal'),
    ('main', 15, 'mindcontrol', 1, 4817, 'Mind Control'),
    ('main', 16, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 17, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 18, 'solidarity', 3, 8344, 'Solidarity'),
    ('main', 19, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 20, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 21, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('main', 22, 'magiccylinder', 1, 5124, 'Magic Cylinder'),
    ('main', 23, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 24, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 25, 'genexallyaxel', 1, 8763, 'Genex Ally Axel'),
    ('extra', 26, 'genexallytriarm', 2, 8574, 'Genex Ally Triarm'),
    ('extra', 27, 'genexallytriforce', 2, 8729, 'Genex Ally Triforce'),
    ('extra', 28, 'geogenex', 2, 7972, 'Geo Genex'),
    ('extra', 29, 'hydrogenex', 1, 7834, 'Hydro Genex'),
    ('extra', 30, 'locomotionrgenex', 1, 8261, 'Locomotion R-Genex'),
    ('extra', 31, 'thermalgenex', 1, 7971, 'Thermal Genex'),
    ('extra', 32, 'vindikitergenex', 1, 8416, 'Vindikite R-Genex'),
    ('extra', 33, 'windmillgenex', 1, 8120, 'Windmill Genex')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'aporia-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bolt Tanner / A — Ushi Oni (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bolt-tanner-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'frostosaurus', 3, 6961, 'Frostosaurus'),
    ('main', 2, 'ushioni', 3, 4407, 'Ushi Oni'),
    ('main', 3, 'abareushioni', 3, 6255, 'Abare Ushioni'),
    ('main', 4, 'beastkingbarbaros', 1, 7346, 'Beast King Barbaros'),
    ('main', 5, 'blowbackdragon', 2, 5964, 'Blowback Dragon'),
    ('main', 6, 'goblinattackforce', 3, 5145, 'Goblin Attack Force'),
    ('main', 7, 'gravicrushdragon', 1, 7121, 'Gravi-Crush Dragon'),
    ('main', 8, 'jiraigumo', 3, 4373, 'Jirai Gumo'),
    ('main', 9, 'zombyrathedark', 3, 5245, 'Zombyra the Dark'),
    ('main', 10, 'costdown', 3, 5575, 'Cost Down'),
    ('main', 11, 'cupoface', 1, 7623, 'Cup of Ace'),
    ('main', 12, 'doublesummon', 3, 7219, 'Double Summon'),
    ('main', 13, 'noblemanofcrossout', 1, 4963, 'Nobleman of Crossout'),
    ('main', 14, 'noblemanofextermination', 1, 4964, 'Nobleman of Extermination'),
    ('main', 15, 'secondcointoss', 3, 5391, 'Second Coin Toss'),
    ('main', 16, 'fairybox', 1, 5113, 'Fairy Box'),
    ('main', 17, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 18, 'skilldrain', 3, 5740, 'Skill Drain'),
    ('extra', 19, 'gagagigotherisen', 2, 10272, 'Gagagigo the Risen'),
    ('extra', 20, 'gauntletlauncher', 2, 10526, 'Gauntlet Launcher')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bolt-tanner-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bolt Tanner / B — Machina Gear (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bolt-tanner-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'redgadget', 2, 6155, 'Red Gadget'),
    ('main', 2, 'yellowgadget', 2, 6156, 'Yellow Gadget'),
    ('main', 3, 'greengadget', 2, 6151, 'Green Gadget'),
    ('main', 4, 'tingoldfish', 3, 9979, 'Tin Goldfish'),
    ('main', 5, 'machinagearframe', 3, 8693, 'Machina Gearframe'),
    ('main', 6, 'machinafortress', 2, 8692, 'Machina Fortress'),
    ('main', 7, 'machinacannon', 2, 9434, 'Machina Cannon'),
    ('main', 8, 'kagetokage', 3, 9723, 'Kagetokage'),
    ('main', 9, 'machinasniper', 3, 6304, 'Machina Sniper'),
    ('main', 10, 'machinasoldier', 3, 6302, 'Machina Soldier'),
    ('main', 11, 'machinaforce', 1, 6308, 'Machina Force'),
    ('main', 12, 'commandercovington', 2, 6307, 'Commander Covington'),
    ('main', 13, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light'),
    ('main', 14, 'machinaarmoredunit', 2, 8696, 'Machina Armored Unit'),
    ('main', 15, 'pinpointguard', 3, 10550, 'Pinpoint Guard'),
    ('main', 16, 'cybersummonblaster', 1, 6737, 'Cyber Summon Blaster'),
    ('main', 17, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 18, 'malevolentcatastrophe', 1, 5493, 'Malevolent Catastrophe'),
    ('extra', 19, 'geargigantx', 3, 10176, 'Gear Gigant X'),
    ('extra', 20, 'gemknightpearl', 3, 9601, 'Gem-Knight Pearl')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bolt-tanner-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Carly Carmine / A — Fortune Lady (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'carly-carmine-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'earthboundimmortalasllapiscu', 3, 8171, 'Earthbound Immortal Aslla piscu'),
    ('main', 2, 'fortuneladydark', 3, 8446, 'Fortune Lady Dark'),
    ('main', 3, 'fortuneladyearth', 3, 8447, 'Fortune Lady Earth'),
    ('main', 4, 'fortuneladyfire', 3, 8302, 'Fortune Lady Fire'),
    ('main', 5, 'fortuneladylight', 3, 8301, 'Fortune Lady Light'),
    ('main', 6, 'fortuneladywater', 3, 8445, 'Fortune Lady Water'),
    ('main', 7, 'fortuneladywind', 1, 8444, 'Fortune Lady Wind'),
    ('main', 8, 'solitairemagician', 2, 8448, 'Solitaire Magician'),
    ('main', 9, 'fortunesfuture', 2, 8486, 'Fortune''s Future'),
    ('main', 10, 'futurevisions', 3, 8341, 'Future Visions'),
    ('main', 11, 'spellbookofwisdom', 2, 10190, 'Spellbook of Wisdom'),
    ('main', 12, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light'),
    ('main', 13, 'terraforming', 3, 5537, 'Terraforming'),
    ('main', 14, 'timepassage', 2, 8487, 'Time Passage'),
    ('main', 15, 'inheritedfortune', 1, 8502, 'Inherited Fortune'),
    ('main', 16, 'slipoffortune', 2, 8359, 'Slip of Fortune'),
    ('main', 17, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 18, 'lavalvalchain', 1, 9821, 'Lavalval Chain'),
    ('extra', 19, 'number104masquerade', 1, 10658, 'Number 104: Masquerade'),
    ('extra', 20, 'shiningelf', 1, 9837, 'Shining Elf'),
    ('extra', 21, 'empressofprophecy', 1, 10269, 'Empress of Prophecy')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'carly-carmine-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Carly Carmine / B — High Prophecy (30 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'carly-carmine-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'effectveiler', 2, 8933, 'Effect Veiler'),
    ('main', 2, 'highpriestessofprophecy', 3, 10150, 'High Priestess of Prophecy'),
    ('main', 3, 'justiceofprophecy', 1, 10245, 'Justice of Prophecy'),
    ('main', 4, 'royalmagicallibrary', 3, 5658, 'Royal Magical Library'),
    ('main', 5, 'temperanceofprophecy', 3, 10147, 'Temperance of Prophecy'),
    ('main', 6, 'worldofprophecy', 1, 10631, 'World of Prophecy'),
    ('main', 7, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 8, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 9, 'spellbooklibraryofthecrescent', 2, 10318, 'Spellbook Library of the Crescent'),
    ('main', 10, 'spellbookstarhall', 2, 10358, 'Spellbook Star Hall'),
    ('main', 11, 'spellbookofeternity', 2, 10280, 'Spellbook of Eternity'),
    ('main', 12, 'spellbookoffate', 2, 10281, 'Spellbook of Fate'),
    ('main', 13, 'spellbookoflife', 1, 10189, 'Spellbook of Life'),
    ('main', 14, 'spellbookofpower', 3, 10188, 'Spellbook of Power'),
    ('main', 15, 'spellbookofsecrets', 3, 10187, 'Spellbook of Secrets'),
    ('main', 16, 'spellbookofwisdom', 2, 10190, 'Spellbook of Wisdom'),
    ('main', 17, 'spellbookofthemaster', 1, 10421, 'Spellbook of the Master'),
    ('main', 18, 'thegrandspellbooktower', 2, 10282, 'The Grand Spellbook Tower'),
    ('main', 19, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 20, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 21, 'fiendishchain', 1, 8675, 'Fiendish Chain'),
    ('main', 22, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 23, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 24, 'arcanitemagician', 1, 8038, 'Arcanite Magician'),
    ('extra', 25, 'crimsonblader', 1, 9801, 'Crimson Blader'),
    ('extra', 26, 'thoughtrulerarchfiend', 1, 7738, 'Thought Ruler Archfiend'),
    ('extra', 27, 'empressofprophecy', 1, 10269, 'Empress of Prophecy'),
    ('extra', 28, 'gachigachigantetsu', 1, 9576, 'Gachi Gachi Gantetsu'),
    ('extra', 29, 'hierophantofprophecy', 1, 10175, 'Hierophant of Prophecy'),
    ('extra', 30, 'shiningelf', 1, 9837, 'Shining Elf')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'carly-carmine-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Crow Hogan / A — Blackwings (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'crow-hogan-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 2, 'armageddonknight', 2, 7423, 'Armageddon Knight'),
    ('main', 3, 'blackreturn', 3, 9246, 'Black Return'),
    ('main', 4, 'blackwingblizzardthefarnorth', 3, 8162, 'Blackwing - Blizzard the Far North'),
    ('main', 5, 'blackwingborathespear', 2, 8012, 'Blackwing - Bora the Spear'),
    ('main', 6, 'blackwingbreezethezephyr', 2, 8779, 'Blackwing - Breeze the Zephyr'),
    ('main', 7, 'blackwingbrisotethetailwind', 1, 9299, 'Blackwing - Brisote the Tailwind'),
    ('main', 8, 'blackwingdamascusthepolarnight', 1, 10303, 'Blackwing - Damascus the Polar Night'),
    ('main', 9, 'blackwingelphintheraven', 1, 8165, 'Blackwing - Elphin the Raven'),
    ('main', 10, 'blackwinggalethewhirlwind', 1, 8011, 'Blackwing - Gale the Whirlwind'),
    ('main', 11, 'blackwingghiblithesearingwind', 3, 8777, 'Blackwing - Ghibli the Searing Wind'),
    ('main', 12, 'blackwinggladiusthemidnightsun', 2, 9461, 'Blackwing - Gladius the Midnight Sun'),
    ('main', 13, 'blackwinggustthebackblast', 3, 8778, 'Blackwing - Gust the Backblast'),
    ('main', 14, 'blackwinghillenthetenguwind', 2, 9479, 'Blackwing - Hillen the Tengu-wind'),
    ('main', 15, 'blackwingkogarashithewanderer', 1, 9480, 'Blackwing - Kogarashi the Wanderer'),
    ('main', 16, 'blackwingzephyrostheelite', 3, 9244, 'Blackwing - Zephyros the Elite'),
    ('main', 17, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 18, 'fiendishchain', 3, 8675, 'Fiendish Chain'),
    ('main', 19, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 20, 'icarusattack', 2, 6709, 'Icarus Attack'),
    ('main', 21, 'kunaiwithchain', 1, 4657, 'Kunai with Chain'),
    ('main', 22, 'blackwingbacklash', 1, 8839, 'Blackwing - Backlash')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'crow-hogan-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Crow Hogan / B — Armed Wing (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'crow-hogan-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blackwingblizzardthefarnorth', 3, 8162, 'Blackwing - Blizzard the Far North'),
    ('main', 2, 'blackwingborathespear', 3, 8012, 'Blackwing - Bora the Spear'),
    ('main', 3, 'blackwingelphintheraven', 2, 8165, 'Blackwing - Elphin the Raven'),
    ('main', 4, 'blackwingfanethesteelchain', 1, 8297, 'Blackwing - Fane the Steel Chain'),
    ('main', 5, 'blackwinggalethewhirlwind', 1, 8011, 'Blackwing - Gale the Whirlwind'),
    ('main', 6, 'blackwingkalutthemoonshadow', 3, 8164, 'Blackwing - Kalut the Moon Shadow'),
    ('main', 7, 'blackwingmistralthesilvershield', 2, 8295, 'Blackwing - Mistral the Silver Shield'),
    ('main', 8, 'blackwingshuratheblueflame', 1, 8163, 'Blackwing - Shura the Blue Flame'),
    ('main', 9, 'blackwingsiroccothedawn', 2, 8013, 'Blackwing - Sirocco the Dawn'),
    ('main', 10, 'blackwingvayutheemblemofhonor', 3, 8296, 'Blackwing - Vayu the Emblem of Honor'),
    ('main', 11, 'blackwhirlwind', 1, 8203, 'Black Whirlwind'),
    ('main', 12, 'chainsummoning', 2, 7456, 'Chain Summoning'),
    ('main', 13, 'mysticplasmazone', 2, 4937, 'Mystic Plasma Zone'),
    ('main', 14, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'blackreturn', 2, 9246, 'Black Return'),
    ('main', 16, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 17, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 18, 'deltacrowantireverse', 2, 8220, 'Delta Crow - Anti Reverse'),
    ('main', 19, 'fiendishchain', 1, 8675, 'Fiendish Chain'),
    ('main', 20, 'icarusattack', 2, 6709, 'Icarus Attack'),
    ('main', 21, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 22, 'solemnjudgment', 1, 4861, 'Solemn Judgment'),
    ('main', 23, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 24, 'blackwingsilverwindtheascendant', 2, 8476, 'Blackwing - Silverwind the Ascendant'),
    ('extra', 25, 'blackwingarmedwing', 3, 8193, 'Blackwing Armed Wing'),
    ('extra', 26, 'blackwingarmormaster', 3, 8036, 'Blackwing Armor Master'),
    ('extra', 27, 'daigustoemeral', 1, 9822, 'Daigusto Emeral'),
    ('extra', 28, 'lavalvalchain', 1, 9821, 'Lavalval Chain')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'crow-hogan-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Devack / A — Roaring Ape (17 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'devack-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'apefighter', 3, 8584, 'Ape Fighter'),
    ('main', 2, 'apemagician', 3, 8587, 'Ape Magician'),
    ('main', 3, 'bazoothesouleater', 3, 5250, 'Bazoo the Soul-Eater'),
    ('main', 4, 'beaststriker', 3, 8376, 'Beast Striker'),
    ('main', 5, 'berserkgorilla', 3, 5823, 'Berserk Gorilla'),
    ('main', 6, 'egotisticalape', 3, 8939, 'Egotistical Ape'),
    ('main', 7, 'greenbaboondefenderoftheforest', 2, 6380, 'Green Baboon, Defender of the Forest'),
    ('main', 8, 'kingofthebeasts', 2, 8377, 'King of the Beasts'),
    ('main', 9, 'moja', 3, 8375, 'Moja'),
    ('main', 10, 'axeofdespair', 3, 4310, 'Axe of Despair'),
    ('main', 11, 'closedforest', 2, 8585, 'Closed Forest'),
    ('main', 12, 'roaringearth', 2, 8586, 'Roaring Earth'),
    ('main', 13, 'thebigmarchofanimals', 2, 6274, 'The Big March of Animals'),
    ('main', 14, 'wildnaturesrelease', 3, 5838, 'Wild Nature''s Release'),
    ('main', 15, 'fissure', 2, 4835, 'Fissure'),
    ('main', 16, 'smashingground', 1, 5905, 'Smashing Ground'),
    ('extra', 17, 'naturialeodrake', 3, 8119, 'Naturia Leodrake')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'devack-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Devack / B — Berserk Gorilla (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'devack-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'apefighter', 3, 8584, 'Ape Fighter'),
    ('main', 2, 'berserkgorilla', 3, 5823, 'Berserk Gorilla'),
    ('main', 3, 'darkresonator', 3, 7708, 'Dark Resonator'),
    ('main', 4, 'earthboundimmortalcusillu', 3, 8307, 'Earthbound Immortal Cusillu'),
    ('main', 5, 'flametiger', 3, 10062, 'Flame Tiger'),
    ('main', 6, 'greenbaboondefenderoftheforest', 3, 6380, 'Green Baboon, Defender of the Forest'),
    ('main', 7, 'manticoreofdarkness', 3, 5881, 'Manticore of Darkness'),
    ('main', 8, 'xsaberairbellum', 3, 7537, 'X-Saber Airbellum'),
    ('main', 9, 'closedforest', 3, 8585, 'Closed Forest'),
    ('main', 10, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 11, 'lightningvortex', 3, 5217, 'Lightning Vortex'),
    ('main', 12, 'terraforming', 3, 5537, 'Terraforming'),
    ('main', 13, 'beastsoulswap', 1, 6281, 'Beast Soul Swap'),
    ('main', 14, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 15, 'roaringearth', 2, 8586, 'Roaring Earth'),
    ('extra', 16, 'tgbladeblaster', 2, 9513, 'T.G. Blade Blaster'),
    ('extra', 17, 'zemantheapeking', 3, 8605, 'Zeman the Ape King'),
    ('extra', 18, 'diamonddirewolf', 3, 10410, 'Diamond Dire Wolf'),
    ('extra', 19, 'volticbicorn', 2, 8972, 'Voltic Bicorn'),
    ('extra', 20, 'naturialeodrake', 2, 8119, 'Naturia Leodrake'),
    ('extra', 21, 'windupzenmaines', 3, 9870, 'Wind-Up Zenmaines')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'devack-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Greiger / A — Reactor (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'greiger-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blacksalvo', 3, 8001, 'Black Salvo'),
    ('main', 2, 'flyingfortressskyfire', 2, 7999, 'Flying Fortress SKY FIRE'),
    ('main', 3, 'machinapeacekeeper', 3, 8694, 'Machina Peacekeeper'),
    ('main', 4, 'mystictomato', 3, 4930, 'Mystic Tomato'),
    ('main', 5, 'spellreactorre', 3, 8002, 'Spell Reactor ・RE'),
    ('main', 6, 'summonreactorsk', 3, 7998, 'Summon Reactor ・SK'),
    ('main', 7, 'trapreactoryfi', 3, 8000, 'Trap Reactor ・Y FI'),
    ('main', 8, 'burdenofthemighty', 3, 7399, 'Burden of the Mighty'),
    ('main', 9, 'darkroomofnightmare', 3, 5531, 'Dark Room of Nightmare'),
    ('main', 10, 'doublesummon', 2, 7219, 'Double Summon'),
    ('main', 11, 'heartofclearwater', 3, 5386, 'Heart of Clear Water'),
    ('main', 12, 'limiterremoval', 1, 5129, 'Limiter Removal'),
    ('main', 13, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light'),
    ('main', 14, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 15, 'fakeexplosion', 3, 8066, 'Fake Explosion'),
    ('extra', 16, 'darkflattop', 3, 9218, 'Dark Flattop')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'greiger-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Greiger / B — Counter Burn (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'greiger-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blacksalvo', 3, 8001, 'Black Salvo'),
    ('main', 2, 'blastsphere', 3, 4742, 'Blast Sphere'),
    ('main', 3, 'earthboundimmortalchacuchallhua', 3, 8308, 'Earthbound Immortal Chacu Challhua'),
    ('main', 4, 'marshmallon', 2, 6000, 'Marshmallon'),
    ('main', 5, 'spellreactorre', 2, 8002, 'Spell Reactor ・RE'),
    ('main', 6, 'trapreactoryfi', 3, 8000, 'Trap Reactor ・Y FI'),
    ('main', 7, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 8, 'darkroomofnightmare', 3, 5531, 'Dark Room of Nightmare'),
    ('main', 9, 'mausoleumoftheemperor', 3, 6759, 'Mausoleum of the Emperor'),
    ('main', 10, 'terraforming', 3, 5537, 'Terraforming'),
    ('main', 11, 'dimensionwall', 2, 6448, 'Dimension Wall'),
    ('main', 12, 'magiccylinder', 3, 5124, 'Magic Cylinder'),
    ('main', 13, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 14, 'noentry', 1, 6746, 'No Entry!!'),
    ('main', 15, 'offeringtotheimmortals', 2, 8679, 'Offering to the Immortals'),
    ('main', 16, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('main', 17, 'zomathespirit', 3, 5935, 'Zoma the Spirit'),
    ('extra', 18, 'ancientfairydragon', 1, 8090, 'Ancient Fairy Dragon'),
    ('extra', 19, 'gaiaknighttheforceofearth', 2, 7697, 'Gaia Knight, the Force of Earth'),
    ('extra', 20, 'scraparchfiend', 3, 9202, 'Scrap Archfiend')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'greiger-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Hunter Pace / A — The Undead (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'hunter-pace-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'burningskullhead', 3, 8270, 'Burning Skull Head'),
    ('main', 2, 'goblinzombie', 3, 5561, 'Goblin Zombie'),
    ('main', 3, 'goblinofgreed', 1, 5770, 'Goblin of Greed'),
    ('main', 4, 'kasha', 2, 7937, 'Kasha'),
    ('main', 5, 'mezuki', 1, 7359, 'Mezuki'),
    ('main', 6, 'plaguespreaderzombie', 1, 7849, 'Plaguespreader Zombie'),
    ('main', 7, 'pyramidturtle', 3, 5423, 'Pyramid Turtle'),
    ('main', 8, 'skullconductor', 3, 8271, 'Skull Conductor'),
    ('main', 9, 'skullflame', 3, 8269, 'Skull Flame'),
    ('main', 10, 'spiritreaper', 2, 5526, 'Spirit Reaper'),
    ('main', 11, 'supersonicskullflame', 2, 8268, 'Supersonic Skull Flame'),
    ('main', 12, 'zombiemaster', 3, 7215, 'Zombie Master'),
    ('main', 13, 'bookoflife', 3, 5430, 'Book of Life'),
    ('main', 14, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 15, 'creatureswap', 2, 5162, 'Creature Swap'),
    ('main', 16, 'darkroomofnightmare', 2, 5531, 'Dark Room of Nightmare'),
    ('main', 17, 'infernorecklesssummon', 1, 6542, 'Inferno Reckless Summon'),
    ('main', 18, 'lightningvortex', 2, 5217, 'Lightning Vortex'),
    ('main', 19, 'returnfromthedifferentdimension', 1, 6078, 'Return from the Different Dimension'),
    ('main', 20, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 21, 'doomkaiserdragon', 3, 7848, 'Doomkaiser Dragon'),
    ('extra', 22, 'revivedkinghades', 3, 7851, 'Revived King Ha Des')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'hunter-pace-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Hunter Pace / B — Plaguespreader (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'hunter-pace-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bluebloodedoni', 3, 9651, 'Blue-Blooded Oni'),
    ('main', 2, 'bonecrusher', 2, 8141, 'Bone Crusher'),
    ('main', 3, 'endlessdecay', 2, 9711, 'Endless Decay'),
    ('main', 4, 'goblinzombie', 3, 5561, 'Goblin Zombie'),
    ('main', 5, 'mezuki', 1, 7359, 'Mezuki'),
    ('main', 6, 'painpainter', 2, 9844, 'Pain Painter'),
    ('main', 7, 'plaguespreaderzombie', 1, 7849, 'Plaguespreader Zombie'),
    ('main', 8, 'pyramidturtle', 3, 5423, 'Pyramid Turtle'),
    ('main', 9, 'redeyeszombiedragon', 3, 7854, 'Red-Eyes Zombie Dragon'),
    ('main', 10, 'zombiemaster', 3, 7215, 'Zombie Master'),
    ('main', 11, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 12, 'bookoflife', 3, 5430, 'Book of Life'),
    ('main', 13, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 14, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 15, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 16, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 17, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 18, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 19, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 20, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 21, 'archfiendzombieskull', 2, 8332, 'Archfiend Zombie-Skull'),
    ('extra', 22, 'doomkaiserdragon', 2, 7848, 'Doomkaiser Dragon'),
    ('extra', 23, 'revivedkinghades', 2, 7851, 'Revived King Ha Des'),
    ('extra', 24, 'gemknightpearl', 3, 9601, 'Gem-Knight Pearl'),
    ('extra', 25, 'mechaphantombeastdracossack', 1, 10534, 'Mecha Phantom Beast Dracossack'),
    ('extra', 26, 'number11bigeye', 1, 9861, 'Number 11: Big Eye'),
    ('extra', 27, 'windupzenmaines', 1, 9870, 'Wind-Up Zenmaines')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'hunter-pace-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jack Atlas / A — Red Dragon (39 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jack-atlas-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'archfiendinterceptor', 1, 8783, 'Archfiend Interceptor'),
    ('main', 2, 'barrierresonator', 1, 9297, 'Barrier Resonator'),
    ('main', 3, 'battlefader', 2, 8617, 'Battle Fader'),
    ('main', 4, 'clockresonator', 1, 9478, 'Clock Resonator'),
    ('main', 5, 'creationresonator', 1, 9090, 'Creation Resonator'),
    ('main', 6, 'darkresonator', 1, 7708, 'Dark Resonator'),
    ('main', 7, 'dreaddragon', 2, 8784, 'Dread Dragon'),
    ('main', 8, 'flareresonator', 1, 8786, 'Flare Resonator'),
    ('main', 9, 'forceresonator', 2, 9477, 'Force Resonator'),
    ('main', 10, 'gashthedustlord', 1, 9012, 'Gash the Dust Lord'),
    ('main', 11, 'influencedragon', 1, 9800, 'Influence Dragon'),
    ('main', 12, 'lancerarchfiend', 1, 9086, 'Lancer Archfiend'),
    ('main', 13, 'madarchfiend', 1, 7871, 'Mad Archfiend'),
    ('main', 14, 'powerbreaker', 1, 9087, 'Power Breaker'),
    ('main', 15, 'powergiant', 1, 9084, 'Power Giant'),
    ('main', 16, 'powerinvader', 1, 8620, 'Power Invader'),
    ('main', 17, 'strongwinddragon', 1, 8156, 'Strong Wind Dragon'),
    ('main', 18, 'vicedragon', 2, 7991, 'Vice Dragon'),
    ('main', 19, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 20, 'reddragonvase', 1, 9517, 'Red Dragon Vase'),
    ('main', 21, 'resonantdestruction', 1, 9519, 'Resonant Destruction'),
    ('main', 22, 'resonatorcall', 2, 9518, 'Resonator Call'),
    ('main', 23, 'resonatorengine', 1, 9347, 'Resonator Engine'),
    ('main', 24, 'scarletsecurity', 1, 9516, 'Scarlet Security'),
    ('main', 25, 'crimsonfire', 1, 8216, 'Crimson Fire'),
    ('main', 26, 'fiendishchain', 2, 8675, 'Fiendish Chain'),
    ('main', 27, 'lineageofdestruction', 1, 7924, 'Lineage of Destruction'),
    ('main', 28, 'pridefulroar', 2, 7922, 'Prideful Roar'),
    ('main', 29, 'redcarpet', 1, 9534, 'Red Carpet'),
    ('main', 30, 'redscreen', 2, 9141, 'Red Screen'),
    ('main', 31, 'revivalgift', 1, 7923, 'Revival Gift'),
    ('main', 32, 'synchrodeflector', 1, 7758, 'Synchro Deflector'),
    ('extra', 33, 'chaoskingarchfiend', 1, 8816, 'Chaos King Archfiend'),
    ('extra', 34, 'crimsonblader', 1, 9801, 'Crimson Blader'),
    ('extra', 35, 'darkhighlander', 1, 9040, 'Dark Highlander'),
    ('extra', 36, 'exploderdragonwing', 1, 8192, 'Exploder Dragonwing'),
    ('extra', 37, 'reddragonarchfiend', 1, 7735, 'Red Dragon Archfiend'),
    ('extra', 38, 'rednovadragon', 1, 9119, 'Red Nova Dragon'),
    ('extra', 39, 'celestialwolflordbluesirius', 1, 9718, 'Celestial Wolf Lord, Blue Sirius')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jack-atlas-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jack Atlas / B — Red Nova Dragon (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jack-atlas-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'barrierresonator', 3, 9297, 'Barrier Resonator'),
    ('main', 2, 'clockresonator', 1, 9478, 'Clock Resonator'),
    ('main', 3, 'creationresonator', 3, 9090, 'Creation Resonator'),
    ('main', 4, 'darkresonator', 3, 7708, 'Dark Resonator'),
    ('main', 5, 'garbagelord', 3, 10378, 'Garbage Lord'),
    ('main', 6, 'garbageogre', 3, 10377, 'Garbage Ogre'),
    ('main', 7, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 8, 'psychiccommander', 3, 7718, 'Psychic Commander'),
    ('main', 9, 'solarwindjammer', 3, 10233, 'Solar Wind Jammer'),
    ('main', 10, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'emergencyteleport', 3, 7747, 'Emergency Teleport'),
    ('main', 13, 'instantfusion', 3, 6901, 'Instant Fusion'),
    ('main', 14, 'lightningvortex', 1, 5217, 'Lightning Vortex'),
    ('main', 15, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'resonatorcall', 3, 9518, 'Resonator Call'),
    ('main', 17, 'darkbribe', 1, 7349, 'Dark Bribe'),
    ('main', 18, 'royaldecree', 3, 4866, 'Royal Decree'),
    ('extra', 19, 'vermillionsparrow', 3, 4479, 'Vermillion Sparrow'),
    ('extra', 20, 'orientdragon', 1, 9845, 'Orient Dragon'),
    ('extra', 21, 'reddragonarchfiend', 3, 7735, 'Red Dragon Archfiend'),
    ('extra', 22, 'rednovadragon', 1, 9119, 'Red Nova Dragon'),
    ('extra', 23, 'adreuskeeperofarmageddon', 1, 9846, 'Adreus, Keeper of Armageddon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jack-atlas-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Kalin Kessler / A — Doom Dragon (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'kalin-kessler-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cardtrooper', 1, 6939, 'Card Trooper'),
    ('main', 2, 'earthboundimmortalccapacapu', 1, 8172, 'Earthbound Immortal Ccapac Apu'),
    ('main', 3, 'infernityarchfiend', 3, 8272, 'Infernity Archfiend'),
    ('main', 4, 'infernitybeast', 2, 8303, 'Infernity Beast'),
    ('main', 5, 'infernitybeetle', 3, 8790, 'Infernity Beetle'),
    ('main', 6, 'infernitydestroyer', 2, 8275, 'Infernity Destroyer'),
    ('main', 7, 'infernityguardian', 1, 8274, 'Infernity Guardian'),
    ('main', 8, 'infernitymirage', 3, 8788, 'Infernity Mirage'),
    ('main', 9, 'carddestruction', 1, 4821, 'Card Destruction'),
    ('main', 10, 'lightningvortex', 3, 5217, 'Lightning Vortex'),
    ('main', 11, 'magicalmallet', 2, 6541, 'Magical Mallet'),
    ('main', 12, 'magicalstoneexcavation', 1, 5688, 'Magical Stone Excavation'),
    ('main', 13, 'mausoleumoftheemperor', 1, 6759, 'Mausoleum of the Emperor'),
    ('main', 14, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 16, 'yami', 2, 4341, 'Yami'),
    ('main', 17, 'zeromax', 1, 8822, 'ZERO-MAX'),
    ('main', 18, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 19, 'infernitybarrier', 1, 9036, 'Infernity Barrier'),
    ('main', 20, 'infernityforce', 2, 8508, 'Infernity Force'),
    ('main', 21, 'infernityinferno', 2, 8846, 'Infernity Inferno'),
    ('main', 22, 'magiccylinder', 1, 5124, 'Magic Cylinder'),
    ('main', 23, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 24, 'infernitydoomdragon', 3, 8817, 'Infernity Doom Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'kalin-kessler-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Kalin Kessler / B — Infernity (30 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'kalin-kessler-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'infernityarchfiend', 3, 8272, 'Infernity Archfiend'),
    ('main', 2, 'infernityavenger', 3, 8791, 'Infernity Avenger'),
    ('main', 3, 'infernitymirage', 3, 8788, 'Infernity Mirage'),
    ('main', 4, 'infernitynecromancer', 3, 8443, 'Infernity Necromancer'),
    ('main', 5, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 6, 'carddestruction', 1, 4821, 'Card Destruction'),
    ('main', 7, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 8, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 9, 'infernitylauncher', 1, 8823, 'Infernity Launcher'),
    ('main', 10, 'lightningvortex', 3, 5217, 'Lightning Vortex'),
    ('main', 11, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 12, 'oneforone', 1, 8197, 'One for One'),
    ('main', 13, 'recurringnightmare', 1, 7151, 'Recurring Nightmare'),
    ('main', 14, 'zeromax', 1, 8822, 'ZERO-MAX'),
    ('main', 15, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 16, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 17, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 18, 'infernitybarrier', 2, 9036, 'Infernity Barrier'),
    ('main', 19, 'infernitybreak', 3, 8844, 'Infernity Break'),
    ('main', 20, 'infernityinferno', 3, 8846, 'Infernity Inferno'),
    ('main', 21, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 22, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('extra', 23, 'chaoskingarchfiend', 1, 8816, 'Chaos King Archfiend'),
    ('extra', 24, 'infernitydoomdragon', 1, 8817, 'Infernity Doom Dragon'),
    ('extra', 25, 'mistwurm', 1, 7549, 'Mist Wurm'),
    ('extra', 26, 'stygiansergeants', 1, 8739, 'Stygian Sergeants'),
    ('extra', 27, 'evilswarmouroboros', 1, 10007, 'Evilswarm Ouroboros'),
    ('extra', 28, 'gagagacowboy', 1, 10263, 'Gagaga Cowboy'),
    ('extra', 29, 'leviairtheseadragon', 2, 9660, 'Leviair the Sea Dragon'),
    ('extra', 30, 'number66masterkeybeetle', 1, 10657, 'Number 66: Master Key Beetle')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'kalin-kessler-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Leo / A — Morphtronic (33 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'leo-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'morphtronicboarden', 2, 8015, 'Morphtronic Boarden'),
    ('main', 2, 'morphtronicboomboxen', 2, 7877, 'Morphtronic Boomboxen'),
    ('main', 3, 'morphtroniccelfon', 2, 7874, 'Morphtronic Celfon'),
    ('main', 4, 'morphtronicclocken', 1, 7880, 'Morphtronic Clocken'),
    ('main', 5, 'morphtroniclantron', 2, 9481, 'Morphtronic Lantron'),
    ('main', 6, 'morphtronicradion', 2, 7879, 'Morphtronic Radion'),
    ('main', 7, 'morphtronicremoten', 2, 8166, 'Morphtronic Remoten'),
    ('main', 8, 'morphtronicscopen', 2, 8168, 'Morphtronic Scopen'),
    ('main', 9, 'morphtronicslingen', 2, 8016, 'Morphtronic Slingen'),
    ('main', 10, 'autonomousactionunit', 1, 5606, 'Autonomous Action Unit'),
    ('main', 11, 'breakdraw', 1, 8663, 'Break! Draw!'),
    ('main', 12, 'doubletoolcd', 2, 8205, 'Double Tool C&D'),
    ('main', 13, 'junkbox', 1, 8204, 'Junk Box'),
    ('main', 14, 'machineduplication', 1, 5498, 'Machine Duplication'),
    ('main', 15, 'magepower', 1, 5213, 'Mage Power'),
    ('main', 16, 'morphtronicaccelerator', 2, 7906, 'Morphtronic Accelerator'),
    ('main', 17, 'morphtronicmap', 2, 8045, 'Morphtronic Map'),
    ('main', 18, 'morphtronicrepairunit', 1, 8206, 'Morphtronic Repair Unit'),
    ('main', 19, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 20, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 21, 'unitedwestand', 1, 5212, 'United We Stand'),
    ('main', 22, 'unstableevolution', 1, 7750, 'Unstable Evolution'),
    ('main', 23, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 24, 'morphtransition', 1, 7926, 'Morphtransition'),
    ('main', 25, 'morphtronicbind', 2, 8224, 'Morphtronic Bind'),
    ('main', 26, 'morphtronicforcefield', 1, 8067, 'Morphtronic Forcefield'),
    ('main', 27, 'morphtronicmixup', 1, 8068, 'Morphtronic Mix-up'),
    ('main', 28, 'morphtronicsscramble', 1, 8850, 'Morphtronics, Scramble!'),
    ('extra', 29, 'allyofjusticecatastor', 1, 7552, 'Ally of Justice Catastor'),
    ('extra', 30, 'allyofjusticefieldmarshal', 1, 7973, 'Ally of Justice Field Marshal'),
    ('extra', 31, 'armoryarm', 1, 7987, 'Armory Arm'),
    ('extra', 32, 'lifestreamdragon', 1, 9509, 'Life Stream Dragon'),
    ('extra', 33, 'powertooldragon', 2, 8137, 'Power Tool Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'leo-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Leo / B — Wind-Up (36 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'leo-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'brotherhoodofthefirefistbear', 1, 10383, 'Brotherhood of the Fire Fist - Bear'),
    ('main', 2, 'neospaciangrandmole', 1, 6770, 'Neo-Spacian Grand Mole'),
    ('main', 3, 'snowmaneater', 2, 8263, 'Snowman Eater'),
    ('main', 4, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 5, 'windupmagician', 1, 9631, 'Wind-Up Magician'),
    ('main', 6, 'winduprabbit', 3, 9866, 'Wind-Up Rabbit'),
    ('main', 7, 'winduprat', 3, 9897, 'Wind-Up Rat'),
    ('main', 8, 'windupshark', 3, 10019, 'Wind-Up Shark'),
    ('main', 9, 'windupsoldier', 1, 9630, 'Wind-Up Soldier'),
    ('main', 10, 'windupwarrior', 2, 9740, 'Wind-Up Warrior'),
    ('main', 11, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'fireformationtenki', 2, 10418, 'Fire Formation - Tenki'),
    ('main', 14, 'mindcontrol', 1, 4817, 'Mind Control'),
    ('main', 15, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'salvage', 1, 5908, 'Salvage'),
    ('main', 17, 'windupfactory', 3, 9671, 'Wind-Up Factory'),
    ('main', 18, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('main', 19, 'fiendishchain', 2, 8675, 'Fiendish Chain'),
    ('main', 20, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 21, 'overwind', 1, 9684, 'Overwind'),
    ('main', 22, 'pinpointguard', 2, 10550, 'Pinpoint Guard'),
    ('main', 23, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 24, 'abyssdweller', 1, 10354, 'Abyss Dweller'),
    ('extra', 25, 'daigustoemeral', 1, 9822, 'Daigusto Emeral'),
    ('extra', 26, 'diamonddirewolf', 1, 10410, 'Diamond Dire Wolf'),
    ('extra', 27, 'gaiadragonthethundercharger', 1, 10069, 'Gaia Dragon, the Thunder Charger'),
    ('extra', 28, 'gemknightpearl', 1, 9601, 'Gem-Knight Pearl'),
    ('extra', 29, 'leviairtheseadragon', 1, 9660, 'Leviair the Sea Dragon'),
    ('extra', 30, 'maestrokethesymphonydjinn', 1, 10128, 'Maestroke the Symphony Djinn'),
    ('extra', 31, 'number30acidgolemofdestruction', 1, 9858, 'Number 30: Acid Golem of Destruction'),
    ('extra', 32, 'photonpapilloperative', 1, 10067, 'Photon Papilloperative'),
    ('extra', 33, 'soulofsilvermountain', 1, 10178, 'Soul of Silvermountain'),
    ('extra', 34, 'winduparsenalzenmaioh', 2, 9873, 'Wind-Up Arsenal Zenmaioh'),
    ('extra', 35, 'windupzenmaines', 1, 9870, 'Wind-Up Zenmaines'),
    ('extra', 36, 'windupzenmaister', 2, 9659, 'Wind-Up Zenmaister')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'leo-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Luna / A — Ancient Fairy (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'luna-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'jerrybeansman', 3, 6413, 'Jerry Beans Man'),
    ('main', 2, 'kuribon', 2, 8292, 'Kuribon'),
    ('main', 3, 'nettles', 3, 7667, 'Nettles'),
    ('main', 4, 'regulus', 3, 8442, 'Regulus'),
    ('main', 5, 'spiritofthebreeze', 2, 5200, 'Spirit of the Breeze'),
    ('main', 6, 'spore', 3, 8795, 'Spore'),
    ('main', 7, 'sunlightunicorn', 2, 8294, 'Sunlight Unicorn'),
    ('main', 8, 'sunnypixie', 3, 8293, 'Sunny Pixie'),
    ('main', 9, 'birdofroses', 3, 8794, 'Bird of Roses'),
    ('main', 10, 'dreamsprite', 1, 5258, 'Dreamsprite'),
    ('main', 11, 'fairyarcher', 2, 8796, 'Fairy Archer'),
    ('main', 12, 'fairykingtruesdale', 3, 5024, 'Fairy King Truesdale'),
    ('main', 13, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 14, 'ancientforest', 3, 8338, 'Ancient Forest'),
    ('main', 15, 'emergencyassistance', 1, 8339, 'Emergency Assistance'),
    ('main', 16, 'hornoftheunicorn', 2, 4320, 'Horn of the Unicorn'),
    ('main', 17, 'pixiering', 1, 8355, 'Pixie Ring'),
    ('main', 18, 'fairywind', 1, 8356, 'Fairy Wind'),
    ('extra', 19, 'ancientfairydragon', 3, 8090, 'Ancient Fairy Dragon'),
    ('extra', 20, 'naturiabeast', 1, 7969, 'Naturia Beast'),
    ('extra', 21, 'splendidrose', 1, 8818, 'Splendid Rose'),
    ('extra', 22, 'battlecruiserdianthus', 1, 10716, 'Battlecruiser Dianthus'),
    ('extra', 23, 'heraldofpurelight', 1, 10661, 'Herald of Pure Light'),
    ('extra', 24, 'number63shamojisoldier', 1, 10705, 'Number 63: Shamoji Soldier')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'luna-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Luna / B — Life Burn (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'luna-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'acatofillomen', 3, 5520, 'A Cat of Ill Omen'),
    ('main', 2, 'battlefader', 2, 8617, 'Battle Fader'),
    ('main', 3, 'kuribon', 3, 8292, 'Kuribon'),
    ('main', 4, 'maskofdarkness', 2, 4108, 'Mask of Darkness'),
    ('main', 5, 'maxxc', 1, 9455, 'Maxx "C"'),
    ('main', 6, 'mystictomato', 3, 4930, 'Mystic Tomato'),
    ('main', 7, 'darklordnursereficule', 3, 7352, 'Darklord Nurse Reficule'),
    ('main', 8, 'shiningangel', 3, 4924, 'Shining Angel'),
    ('main', 9, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 10, 'soultaker', 3, 5743, 'Soul Taker'),
    ('main', 11, 'upstartgoblin', 3, 4895, 'Upstart Goblin'),
    ('main', 12, 'badreactiontosimochi', 3, 4694, 'Bad Reaction to Simochi'),
    ('main', 13, 'giftcard', 3, 7234, 'Gift Card'),
    ('main', 14, 'legacyofyatagarasu', 2, 6006, 'Legacy of Yata-Garasu'),
    ('main', 15, 'magiccylinder', 2, 5124, 'Magic Cylinder'),
    ('main', 16, 'torrentialtribute', 2, 5114, 'Torrential Tribute')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'luna-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Misty Tredwell / A — Tragic Ending (14 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'misty-tredwell-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'apprenticemagician', 3, 5650, 'Apprentice Magician'),
    ('main', 2, 'dragonqueenoftragicendings', 3, 8625, 'Dragon Queen of Tragic Endings'),
    ('main', 3, 'earthboundimmortalccarayhua', 3, 8459, 'Earthbound Immortal Ccarayhua'),
    ('main', 4, 'theunhappygirl', 3, 5955, 'The Unhappy Girl'),
    ('main', 5, 'theunhappymaiden', 3, 4875, 'The Unhappy Maiden'),
    ('main', 6, 'burdenofthemighty', 3, 7399, 'Burden of the Mighty'),
    ('main', 7, 'groundcollapse', 3, 5170, 'Ground Collapse'),
    ('main', 8, 'marchofthemonarchs', 3, 10423, 'March of the Monarchs'),
    ('main', 9, 'messengerofpeace', 3, 4938, 'Messenger of Peace'),
    ('main', 10, 'shardofgreed', 3, 9775, 'Shard of Greed'),
    ('main', 11, 'spellabsorption', 3, 5630, 'Spell Absorption'),
    ('main', 12, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 13, 'wavemotioncannon', 3, 5614, 'Wave-Motion Cannon'),
    ('main', 14, 'spiritbarrier', 2, 6142, 'Spirit Barrier')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'misty-tredwell-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Misty Tredwell / B — Reptilianne (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'misty-tredwell-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'evildragonananta', 1, 7522, 'Evil Dragon Ananta'),
    ('main', 2, 'oshaleon', 2, 8471, 'Oshaleon'),
    ('main', 3, 'reptiliannegardna', 3, 8627, 'Reptilianne Gardna'),
    ('main', 4, 'reptiliannegorgon', 3, 8455, 'Reptilianne Gorgon'),
    ('main', 5, 'reptiliannemedusa', 1, 8456, 'Reptilianne Medusa'),
    ('main', 6, 'reptiliannenaga', 3, 8628, 'Reptilianne Naga'),
    ('main', 7, 'reptiliannevaskii', 3, 8629, 'Reptilianne Vaskii'),
    ('main', 8, 'reptilianneviper', 3, 8458, 'Reptilianne Viper'),
    ('main', 9, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 10, 'moltingescape', 2, 8484, 'Molting Escape'),
    ('main', 11, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 12, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 13, 'reptiliannepoison', 1, 8601, 'Reptilianne Poison'),
    ('main', 14, 'reptiliannespawn', 2, 8485, 'Reptilianne Spawn'),
    ('main', 15, 'vipersrebirth', 2, 8660, 'Viper''s Rebirth'),
    ('main', 16, 'defensedraw', 3, 7755, 'Defense Draw'),
    ('main', 17, 'offeringtothesnakedeity', 3, 7476, 'Offering to the Snake Deity'),
    ('main', 18, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 19, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 20, 'reptiliannehydra', 3, 8477, 'Reptilianne Hydra'),
    ('extra', 21, 'kingoftheferalimps', 1, 10537, 'King of the Feral Imps')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'misty-tredwell-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Officer Tetsu Trudge / A — Security (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tetsu-trudge-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'montagedragon', 2, 7712, 'Montage Dragon'),
    ('main', 2, 'gonogo', 3, 7713, 'Gonogo'),
    ('main', 3, 'pursuitchaser', 3, 7884, 'Pursuit Chaser'),
    ('main', 4, 'searchstriker', 3, 7883, 'Search Striker'),
    ('main', 5, 'juttefighter', 3, 7710, 'Jutte Fighter'),
    ('main', 6, 'torapart', 1, 8170, 'Torapart'),
    ('main', 7, 'samuraiswordbaron', 3, 8737, 'Samurai Sword Baron'),
    ('main', 8, 'stygiansecurity', 3, 8738, 'Stygian Security'),
    ('main', 9, 'stygianstreetpatrol', 3, 8740, 'Stygian Street Patrol'),
    ('main', 10, 'drillroid', 3, 6387, 'Drillroid'),
    ('main', 11, 'noentry', 3, 6746, 'No Entry!!'),
    ('main', 12, 'shieldcrush', 2, 6003, 'Shield Crush'),
    ('main', 13, 'earthquake', 3, 5983, 'Earthquake'),
    ('main', 14, 'heroicchallengernightwatchman', 3, 10231, 'Heroic Challenger - Night Watchman'),
    ('main', 15, 'redscreen', 2, 9141, 'Red Screen'),
    ('extra', 16, 'stygiansergeants', 3, 8739, 'Stygian Sergeants'),
    ('extra', 17, 'allyofjusticecatastor', 1, 7552, 'Ally of Justice Catastor'),
    ('extra', 18, 'gravitywarrior', 2, 9969, 'Gravity Warrior'),
    ('extra', 19, 'gaiaknighttheforceofearth', 1, 7697, 'Gaia Knight, the Force of Earth'),
    ('extra', 20, 'xsaberwayne', 1, 7835, 'X-Saber Wayne'),
    ('extra', 21, 'underworldfighterbalmung', 1, 10647, 'Underworld Fighter Balmung')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tetsu-trudge-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Officer Tetsu Trudge / B — Ninjitsu Art (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tetsu-trudge-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'darkhorus', 1, 7418, 'Dark Horus'),
    ('main', 2, 'darksimorgh', 2, 7770, 'Dark Simorgh'),
    ('main', 3, 'eartharmorninja', 2, 9890, 'Earth Armor Ninja'),
    ('main', 4, 'flamearmorninja', 1, 9887, 'Flame Armor Ninja'),
    ('main', 5, 'goegoethegallantninja', 1, 7115, 'Goe Goe the Gallant Ninja'),
    ('main', 6, 'maskedninjaebisu', 3, 9904, 'Masked Ninja Ebisu'),
    ('main', 7, 'ninjagrandmasterhanzo', 3, 9903, 'Ninja Grandmaster Hanzo'),
    ('main', 8, 'summonermonk', 1, 6400, 'Summoner Monk'),
    ('main', 9, 'tragoedia', 1, 8089, 'Tragoedia'),
    ('main', 10, 'upstartgoldenninja', 3, 9905, 'Upstart Golden Ninja'),
    ('main', 11, 'whitedragonninja', 1, 10015, 'White Dragon Ninja'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 15, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 16, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 17, 'antispellfragrance', 1, 5008, 'Anti-Spell Fragrance'),
    ('main', 18, 'armorninjitsuartoffreezing', 1, 9942, 'Armor Ninjitsu Art of Freezing'),
    ('main', 19, 'armorninjitsuartofrustmist', 1, 9943, 'Armor Ninjitsu Art of Rust Mist'),
    ('main', 20, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 21, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 22, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 23, 'ninjitsuartofdecoy', 1, 6143, 'Ninjitsu Art of Decoy'),
    ('main', 24, 'ninjitsuartofsupertransformation', 3, 9949, 'Ninjitsu Art of Super-Transformation'),
    ('main', 25, 'ninjitsuartoftransformation', 3, 5992, 'Ninjitsu Art of Transformation'),
    ('extra', 26, 'bladearmorninja', 3, 9915, 'Blade Armor Ninja'),
    ('extra', 27, 'number12crimsonshadowarmorninja', 2, 9916, 'Number 12: Crimson Shadow Armor Ninja')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tetsu-trudge-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Rex Goodwin / A — Wiraqocha Rasca (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'rex-goodwin-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'breakerthemagicalwarrior', 3, 5655, 'Breaker the Magical Warrior'),
    ('main', 2, 'cardguard', 3, 8526, 'Card Guard'),
    ('main', 3, 'doublecoston', 3, 6040, 'Double Coston'),
    ('main', 4, 'earthboundimmortalwiraqocharasca', 3, 8461, 'Earthbound Immortal Wiraqocha Rasca'),
    ('main', 5, 'hardenedarmeddragon', 3, 8374, 'Hardened Armed Dragon'),
    ('main', 6, 'mistvalleyexecutor', 2, 7957, 'Mist Valley Executor'),
    ('main', 7, 'mistvalleyfalcon', 3, 8109, 'Mist Valley Falcon'),
    ('main', 8, 'mistvalleyshaman', 1, 7531, 'Mist Valley Shaman'),
    ('main', 9, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 10, 'mausoleumoftheemperor', 1, 6759, 'Mausoleum of the Emperor'),
    ('main', 11, 'mountain', 3, 4338, 'Mountain'),
    ('main', 12, 'swordsofconcealinglight', 2, 6268, 'Swords of Concealing Light'),
    ('main', 13, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light'),
    ('main', 14, 'terraforming', 3, 5537, 'Terraforming'),
    ('main', 15, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 16, 'kunaiwithchain', 3, 4657, 'Kunai with Chain')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'rex-goodwin-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Rex Goodwin / B — Moon and Sun (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'rex-goodwin-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'apocatequil', 3, 8633, 'Apocatequil'),
    ('main', 2, 'cyberdragon', 3, 6390, 'Cyber Dragon'),
    ('main', 3, 'effectveiler', 3, 8933, 'Effect Veiler'),
    ('main', 4, 'fireantascator', 3, 8631, 'Fire Ant Ascator'),
    ('main', 5, 'garbagelord', 3, 10378, 'Garbage Lord'),
    ('main', 6, 'giantrat', 3, 4915, 'Giant Rat'),
    ('main', 7, 'oracleofthesun', 3, 8630, 'Oracle of the Sun'),
    ('main', 8, 'shiningangel', 3, 4924, 'Shining Angel'),
    ('main', 9, 'supay', 3, 8634, 'Supay'),
    ('main', 10, 'thetricky', 3, 6150, 'The Tricky'),
    ('main', 11, 'forbiddenlance', 3, 9352, 'Forbidden Lance'),
    ('main', 12, 'oneforone', 1, 8197, 'One for One'),
    ('main', 13, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 14, 'limitreverse', 3, 7636, 'Limit Reverse'),
    ('extra', 15, 'moondragonquilla', 3, 8654, 'Moon Dragon Quilla'),
    ('extra', 16, 'sundragoninti', 3, 8653, 'Sun Dragon Inti')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'rex-goodwin-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Roman / A — Spider Web (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'roman-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'crossswordbeetle', 2, 8030, 'Cross-Sword Beetle'),
    ('main', 2, 'drillroid', 3, 6387, 'Drillroid'),
    ('main', 3, 'groundspider', 3, 8451, 'Ground Spider'),
    ('main', 4, 'howlinginsect', 3, 6117, 'Howling Insect'),
    ('main', 5, 'infernitybeetle', 3, 8790, 'Infernity Beetle'),
    ('main', 6, 'informerspider', 3, 8635, 'Informer Spider'),
    ('main', 7, 'koakimeirubeetle', 1, 8593, 'Koa''ki Meiru Beetle'),
    ('main', 8, 'motherspider', 3, 8454, 'Mother Spider'),
    ('main', 9, 'relinquishedspider', 3, 8452, 'Relinquished Spider'),
    ('main', 10, 'spyderspider', 3, 8453, 'Spyder Spider'),
    ('main', 11, 'spiderweb', 2, 8480, 'Spider Web'),
    ('main', 12, 'darkmirrorforce', 2, 5858, 'Dark Mirror Force'),
    ('main', 13, 'lairwire', 3, 8682, 'Lair Wire'),
    ('main', 14, 'noentry', 3, 6746, 'No Entry!!'),
    ('main', 15, 'tragedy', 3, 4823, 'Tragedy'),
    ('extra', 16, 'undergroundarachnid', 3, 8603, 'Underground Arachnid')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'roman-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Roman / B — Earthbound (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'roman-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlefader', 2, 8617, 'Battle Fader'),
    ('main', 2, 'dandylion', 1, 6654, 'Dandylion'),
    ('main', 3, 'doublecoston', 1, 6040, 'Double Coston'),
    ('main', 4, 'earthboundimmortalasllapiscu', 2, 8171, 'Earthbound Immortal Aslla piscu'),
    ('main', 5, 'earthboundimmortalccapacapu', 2, 8172, 'Earthbound Immortal Ccapac Apu'),
    ('main', 6, 'earthboundimmortalccarayhua', 1, 8459, 'Earthbound Immortal Ccarayhua'),
    ('main', 7, 'earthboundimmortalchacuchallhua', 3, 8308, 'Earthbound Immortal Chacu Challhua'),
    ('main', 8, 'earthboundimmortaluru', 3, 8460, 'Earthbound Immortal Uru'),
    ('main', 9, 'earthboundlinewalker', 2, 8760, 'Earthbound Linewalker'),
    ('main', 10, 'hardenedarmeddragon', 3, 8374, 'Hardened Armed Dragon'),
    ('main', 11, 'jesterconfit', 2, 8300, 'Jester Confit'),
    ('main', 12, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 13, 'mausoleumoftheemperor', 3, 6759, 'Mausoleum of the Emperor'),
    ('main', 14, 'mysticplasmazone', 3, 4937, 'Mystic Plasma Zone'),
    ('main', 15, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'soulexchange', 1, 5099, 'Soul Exchange'),
    ('main', 17, 'terraforming', 3, 5537, 'Terraforming'),
    ('main', 18, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 19, 'earthboundwave', 1, 8505, 'Earthbound Wave'),
    ('main', 20, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 21, 'negateattack', 1, 4804, 'Negate Attack')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'roman-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sayer / A — Psychokinesis (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sayer-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'doctorcranium', 3, 7715, 'Doctor Cranium'),
    ('main', 2, 'geneticwoman', 2, 8321, 'Genetic Woman'),
    ('main', 3, 'krebons', 3, 7716, 'Krebons'),
    ('main', 4, 'psychiccommander', 3, 7718, 'Psychic Commander'),
    ('main', 5, 'psychicjumper', 3, 7891, 'Psychic Jumper'),
    ('main', 6, 'psychicsnail', 2, 7719, 'Psychic Snail'),
    ('main', 7, 'reinforcedhumanpsychicborg', 3, 8181, 'Reinforced Human Psychic Borg'),
    ('main', 8, 'telekineticshocker', 3, 7720, 'Telekinetic Shocker'),
    ('main', 9, 'mindprotector', 3, 7717, 'Mind Protector'),
    ('main', 10, 'stormcaller', 2, 7890, 'Storm Caller'),
    ('main', 11, 'psychokinesis', 3, 7912, 'Psychokinesis'),
    ('main', 12, 'teleport', 3, 7911, 'Teleport'),
    ('main', 13, 'brainresearchlab', 2, 8347, 'Brain Research Lab'),
    ('main', 14, 'telekineticpowerwell', 2, 8050, 'Telekinetic Power Well'),
    ('main', 15, 'psychicoverload', 3, 7789, 'Psychic Overload'),
    ('extra', 16, 'hyperpsychicblaster', 1, 8037, 'Hyper Psychic Blaster')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sayer-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sayer / B — Thought Ruler (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sayer-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'doctorcranium', 3, 7715, 'Doctor Cranium'),
    ('main', 2, 'geneticwoman', 2, 8321, 'Genetic Woman'),
    ('main', 3, 'krebons', 3, 7716, 'Krebons'),
    ('main', 4, 'psychiccommander', 3, 7718, 'Psychic Commander'),
    ('main', 5, 'psychicjumper', 3, 7891, 'Psychic Jumper'),
    ('main', 6, 'psychicsnail', 3, 7719, 'Psychic Snail'),
    ('main', 7, 'returnfromthedifferentdimension', 1, 6078, 'Return from the Different Dimension'),
    ('main', 8, 'serenepsychicwitch', 3, 9497, 'Serene Psychic Witch'),
    ('main', 9, 'silentpsychicwizard', 3, 9496, 'Silent Psychic Wizard'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'emergencyteleport', 3, 7747, 'Emergency Teleport'),
    ('main', 12, 'mindcontrol', 1, 4817, 'Mind Control'),
    ('main', 13, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'psistation', 1, 7745, 'Psi-Station'),
    ('main', 15, 'psychokinesis', 3, 7912, 'Psychokinesis'),
    ('main', 16, 'solidarity', 3, 8344, 'Solidarity'),
    ('main', 17, 'psychictrigger', 3, 7928, 'Psychic Trigger'),
    ('extra', 18, 'magicalandroid', 3, 7737, 'Magical Android'),
    ('extra', 19, 'psychiclifetrancer', 3, 7900, 'Psychic Lifetrancer'),
    ('extra', 20, 'psychicnightmare', 3, 9207, 'Psychic Nightmare'),
    ('extra', 21, 'thoughtrulerarchfiend', 3, 7738, 'Thought Ruler Archfiend')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sayer-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sherry Leblanc / A — Fleur (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sherry-le-blanc-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'brightstardragon', 3, 9802, 'Bright Star Dragon'),
    ('main', 2, 'dandylion', 1, 6654, 'Dandylion'),
    ('main', 3, 'fleursynchron', 3, 9198, 'Fleur Synchron'),
    ('main', 4, 'limitreverse', 3, 7636, 'Limit Reverse'),
    ('main', 5, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 6, 'necrofleur', 3, 9445, 'Necro Fleur'),
    ('main', 7, 'needleworm', 3, 4568, 'Needle Worm'),
    ('main', 8, 'petenthedarkclown', 3, 6085, 'Peten the Dark Clown'),
    ('main', 9, 'quickdrawsynchron', 3, 8439, 'Quickdraw Synchron'),
    ('main', 10, 'sorcieredefleur', 3, 9446, 'Sorciere de Fleur'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'mindcontrol', 1, 4817, 'Mind Control'),
    ('main', 13, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'nightmaressteelcage', 2, 5120, 'Nightmare''s Steelcage'),
    ('main', 15, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 16, 'sakuretsuarmor', 2, 5799, 'Sakuretsu Armor'),
    ('main', 17, 'threateningroar', 2, 6278, 'Threatening Roar'),
    ('main', 18, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 19, 'chevalierdefleur', 3, 9199, 'Chevalier de Fleur')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sherry-le-blanc-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sherry Leblanc / B — Noble Knight (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sherry-le-blanc-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'nobleknightartorigus', 2, 10115, 'Noble Knight Artorigus'),
    ('main', 2, 'ddwarriorlady', 1, 5719, 'D.D. Warrior Lady'),
    ('main', 3, 'honest', 1, 7574, 'Honest'),
    ('main', 4, 'ignobleknightofblacklaundsallyn', 1, 10350, 'Ignoble Knight of Black Laundsallyn'),
    ('main', 5, 'nobleknightgawayn', 3, 10311, 'Noble Knight Gawayn'),
    ('main', 6, 'nobleknightgwalchavad', 3, 10595, 'Noble Knight Gwalchavad'),
    ('main', 7, 'nobleknightjoan', 3, 9201, 'Noble Knight Joan'),
    ('main', 8, 'nobleknightmedraut', 3, 10469, 'Noble Knight Medraut'),
    ('main', 9, 'summonermonk', 1, 6400, 'Summoner Monk'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'hiddenarmory', 1, 7493, 'Hidden Armory'),
    ('main', 12, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'noblearmsarfeudutyr', 1, 10356, 'Noble Arms - Arfeudutyr'),
    ('main', 14, 'noblearmscaliburn', 3, 10468, 'Noble Arms - Caliburn'),
    ('main', 15, 'noblearmsgallatin', 3, 10317, 'Noble Arms - Gallatin'),
    ('main', 16, 'noblearmsofdestiny', 3, 10601, 'Noble Arms of Destiny'),
    ('main', 17, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 18, 'releaserestraintwave', 1, 8335, 'Release Restraint Wave'),
    ('main', 19, 'thewarriorreturningalive', 2, 5330, 'The Warrior Returning Alive'),
    ('main', 20, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 21, 'pinpointguard', 3, 10550, 'Pinpoint Guard'),
    ('extra', 22, 'artoriguskingofthenobleknights', 3, 10474, 'Artorigus, King of the Noble Knights')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sherry-le-blanc-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yusei Fudo / A — Junk Synchron (36 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yusei-fudo-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'unicycular', 1, 8612, 'Unicycular'),
    ('main', 2, 'bicular', 1, 8613, 'Bicular'),
    ('main', 3, 'brightstardragon', 1, 9802, 'Bright Star Dragon'),
    ('main', 4, 'doppelwarrior', 2, 9293, 'Doppelwarrior'),
    ('main', 5, 'effectveiler', 1, 8933, 'Effect Veiler'),
    ('main', 6, 'hypersynchron', 2, 8006, 'Hyper Synchron'),
    ('main', 7, 'junkservant', 3, 9472, 'Junk Servant'),
    ('main', 8, 'junksynchron', 3, 7687, 'Junk Synchron'),
    ('main', 9, 'nitrosynchron', 2, 7700, 'Nitro Synchron'),
    ('main', 10, 'quickdrawsynchron', 2, 8439, 'Quickdraw Synchron'),
    ('main', 11, 'quillbolthedgehog', 2, 7701, 'Quillbolt Hedgehog'),
    ('main', 12, 'salvagewarrior', 2, 9474, 'Salvage Warrior'),
    ('main', 13, 'shieldwing', 1, 7990, 'Shield Wing'),
    ('main', 14, 'sonicchick', 1, 7686, 'Sonic Chick'),
    ('main', 15, 'speedwarrior', 1, 7688, 'Speed Warrior'),
    ('main', 16, 'synchronexplorer', 2, 8862, 'Synchron Explorer'),
    ('main', 17, 'tricular', 1, 8614, 'Tricular'),
    ('main', 18, 'turbosynchron', 2, 7870, 'Turbo Synchron'),
    ('main', 19, 'unknownsynchron', 1, 9473, 'Unknown Synchron'),
    ('main', 20, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 21, 'mindcontrol', 1, 4817, 'Mind Control'),
    ('main', 22, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 23, 'tuning', 2, 9122, 'Tuning'),
    ('main', 24, 'gracefulrevival', 1, 7754, 'Graceful Revival'),
    ('main', 25, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 26, 'scrapironscarecrow', 1, 7694, 'Scrap-Iron Scarecrow'),
    ('main', 27, 'wildtornado', 1, 8859, 'Wild Tornado'),
    ('extra', 28, 'formulasynchron', 1, 9118, 'Formula Synchron'),
    ('extra', 29, 'junkarcher', 1, 8581, 'Junk Archer'),
    ('extra', 30, 'junkberserker', 1, 9508, 'Junk Berserker'),
    ('extra', 31, 'junkdestroyer', 1, 8860, 'Junk Destroyer'),
    ('extra', 32, 'junkgardna', 1, 9045, 'Junk Gardna'),
    ('extra', 33, 'junkwarrior', 1, 7696, 'Junk Warrior'),
    ('extra', 34, 'nitrowarrior', 1, 7733, 'Nitro Warrior'),
    ('extra', 35, 'stardustdragon', 1, 7734, 'Stardust Dragon'),
    ('extra', 36, 'turbowarrior', 1, 7897, 'Turbo Warrior')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yusei-fudo-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yusei Fudo / B — Stardust Dragon (35 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yusei-fudo-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'debrisdragon', 2, 8005, 'Debris Dragon'),
    ('main', 2, 'doppelwarrior', 2, 9293, 'Doppelwarrior'),
    ('main', 3, 'effectveiler', 2, 8933, 'Effect Veiler'),
    ('main', 4, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 5, 'junksynchron', 3, 7687, 'Junk Synchron'),
    ('main', 6, 'leveleater', 2, 8440, 'Level Eater'),
    ('main', 7, 'quickdrawsynchron', 3, 8439, 'Quickdraw Synchron'),
    ('main', 8, 'quillbolthedgehog', 2, 7701, 'Quillbolt Hedgehog'),
    ('main', 9, 'synchronexplorer', 2, 8862, 'Synchron Explorer'),
    ('main', 10, 'tuningware', 1, 7986, 'Tuningware'),
    ('main', 11, 'unknownsynchron', 3, 9473, 'Unknown Synchron'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 14, 'mindcontrol', 1, 4817, 'Mind Control'),
    ('main', 15, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'oneforone', 1, 8197, 'One for One'),
    ('main', 17, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 18, 'tuning', 3, 9122, 'Tuning'),
    ('main', 19, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 20, 'malevolentcatastrophe', 1, 5493, 'Malevolent Catastrophe'),
    ('main', 21, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 22, 'starlightroad', 3, 8609, 'Starlight Road'),
    ('extra', 23, 'allyofjusticecatastor', 1, 7552, 'Ally of Justice Catastor'),
    ('extra', 24, 'ancientfairydragon', 1, 8090, 'Ancient Fairy Dragon'),
    ('extra', 25, 'armoryarm', 1, 7987, 'Armory Arm'),
    ('extra', 26, 'flamvelluruquizas', 1, 7550, 'Flamvell Uruquizas'),
    ('extra', 27, 'formulasynchron', 1, 9118, 'Formula Synchron'),
    ('extra', 28, 'junkarcher', 1, 8581, 'Junk Archer'),
    ('extra', 29, 'junkberserker', 1, 9508, 'Junk Berserker'),
    ('extra', 30, 'junkdestroyer', 1, 8860, 'Junk Destroyer'),
    ('extra', 31, 'junkgardna', 1, 9045, 'Junk Gardna'),
    ('extra', 32, 'junkwarrior', 1, 7696, 'Junk Warrior'),
    ('extra', 33, 'shootingstardragon', 1, 9117, 'Shooting Star Dragon'),
    ('extra', 34, 'stardustdragon', 2, 7734, 'Stardust Dragon'),
    ('extra', 35, 'tghyperlibrarian', 1, 9554, 'T.G. Hyper Librarian')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yusei-fudo-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Zone / A — Sephylon (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'zone-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlefader', 3, 8617, 'Battle Fader'),
    ('main', 2, 'blacklustersoldierenvoyofthebeginning', 1, 5835, 'Black Luster Soldier - Envoy of the Beginning'),
    ('main', 3, 'chaosnecromancer', 3, 5827, 'Chaos Necromancer'),
    ('main', 4, 'chaossorcerer', 1, 5833, 'Chaos Sorcerer'),
    ('main', 5, 'ddcrow', 3, 6980, 'D.D. Crow'),
    ('main', 6, 'effectveiler', 3, 8933, 'Effect Veiler'),
    ('main', 7, 'honest', 1, 7574, 'Honest'),
    ('main', 8, 'junksynchron', 1, 7687, 'Junk Synchron'),
    ('main', 9, 'lylalightswornsorceress', 2, 7592, 'Lyla, Lightsworn Sorceress'),
    ('main', 10, 'magicalmerchant', 3, 5663, 'Magical Merchant'),
    ('main', 11, 'raimei', 3, 8082, 'Rai-Mei'),
    ('main', 12, 'rykolightswornhunter', 3, 7595, 'Ryko, Lightsworn Hunter'),
    ('main', 13, 'sephylontheultimatetimelord', 3, 9708, 'Sephylon, the Ultimate Timelord'),
    ('main', 14, 'thecalculator', 2, 7436, 'The Calculator'),
    ('main', 15, 'wulflightswornbeast', 2, 7596, 'Wulf, Lightsworn Beast'),
    ('main', 16, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 17, 'monsterreincarnation', 3, 6213, 'Monster Reincarnation'),
    ('main', 18, 'metalreflectslime', 2, 5686, 'Metal Reflect Slime'),
    ('extra', 19, 'armadeskeeperofboundaries', 1, 10648, 'Armades, Keeper of Boundaries'),
    ('extra', 20, 'mistbirdclausolas', 1, 10646, 'Mist Bird Clausolas'),
    ('extra', 21, 'underworldfighterbalmung', 1, 10647, 'Underworld Fighter Balmung'),
    ('extra', 22, 'skypalacegangaridai', 2, 10718, 'Skypalace Gangaridai'),
    ('extra', 23, 'superdreadnoughtrailcannongustavmax', 2, 9963, 'Superdreadnought Rail Cannon Gustav Max')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'zone-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Zone / B — Final Countdown (15 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'zone-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlefader', 3, 8617, 'Battle Fader'),
    ('main', 2, 'cardcard', 3, 10029, 'Cardcar D'),
    ('main', 3, 'cybervalley', 3, 7413, 'Cyber Valley'),
    ('main', 4, 'marshmallon', 2, 6000, 'Marshmallon'),
    ('main', 5, 'metaionthetimelord', 3, 9698, 'Metaion, the Timelord'),
    ('main', 6, 'zerogardna', 3, 8441, 'Zero Gardna'),
    ('main', 7, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 8, 'finalcountdown', 3, 5788, 'Final Countdown'),
    ('main', 9, 'messengerofpeace', 2, 4938, 'Messenger of Peace'),
    ('main', 10, 'nightmaressteelcage', 3, 5120, 'Nightmare''s Steelcage'),
    ('main', 11, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light'),
    ('main', 12, 'upstartgoblin', 3, 4895, 'Upstart Goblin'),
    ('main', 13, 'negateattack', 3, 4804, 'Negate Attack'),
    ('main', 14, 'scrapironscarecrow', 3, 7694, 'Scrap-Iron Scarecrow'),
    ('main', 15, 'torrentialtribute', 2, 5114, 'Torrential Tribute')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'zone-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Anna Kaboom / A — Rocket Express (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'anna-kaboom-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlefader', 3, 8617, 'Battle Fader'),
    ('main', 2, 'ddwarriorlady', 3, 5719, 'D.D. Warrior Lady'),
    ('main', 3, 'greatmajugarzett', 3, 5768, 'Great Maju Garzett'),
    ('main', 4, 'kuriboh', 3, 4064, 'Kuriboh'),
    ('main', 5, 'rocketarrowexpress', 3, 10039, 'Rocket Arrow Express'),
    ('main', 6, 'shreddder', 3, 8641, 'Shreddder'),
    ('main', 7, 'tragoedia', 2, 8089, 'Tragoedia'),
    ('main', 8, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 9, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 10, 'forbiddenchalice', 3, 8213, 'Forbidden Chalice'),
    ('main', 11, 'goldsarcophagus', 3, 6161, 'Gold Sarcophagus'),
    ('main', 12, 'lightningvortex', 3, 5217, 'Lightning Vortex'),
    ('main', 13, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'onedayofpeace', 1, 9778, 'One Day of Peace'),
    ('main', 15, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 16, 'upstartgoblin', 3, 4895, 'Upstart Goblin')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'anna-kaboom-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Anna Kaboom / B — Gustav Max (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'anna-kaboom-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'acatofillomen', 2, 5520, 'A Cat of Ill Omen'),
    ('main', 2, 'androsphinx', 3, 6087, 'Andro Sphinx'),
    ('main', 3, 'exodiustheultimateforbiddenlord', 3, 7392, 'Exodius the Ultimate Forbidden Lord'),
    ('main', 4, 'mirrorladybug', 3, 9079, 'Mirror Ladybug'),
    ('main', 5, 'rocketarrowexpress', 3, 10039, 'Rocket Arrow Express'),
    ('main', 6, 'sphinxteleia', 3, 6088, 'Sphinx Teleia'),
    ('main', 7, 'tragoedia', 2, 8089, 'Tragoedia'),
    ('main', 8, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 9, 'limiterremoval', 1, 5129, 'Limiter Removal'),
    ('main', 10, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 11, 'upstartgoblin', 3, 4895, 'Upstart Goblin'),
    ('main', 12, 'bottomlesstraphole', 2, 5400, 'Bottomless Trap Hole'),
    ('main', 13, 'fieryfervor', 2, 9782, 'Fiery Fervor'),
    ('main', 14, 'metalreflectslime', 3, 5686, 'Metal Reflect Slime'),
    ('main', 15, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 16, 'pyramidoflight', 3, 6079, 'Pyramid of Light'),
    ('main', 17, 'xyzreborn', 3, 9950, 'Xyz Reborn'),
    ('extra', 18, 'superdreadnoughtrailcannongustavmax', 3, 9963, 'Superdreadnought Rail Cannon Gustav Max')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'anna-kaboom-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Astral / A — Xyz (34 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'astral-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gagagachild', 1, 10564, 'Gagaga Child'),
    ('main', 2, 'gagagagirl', 3, 9877, 'Gagaga Girl'),
    ('main', 3, 'gagagamagician', 3, 9618, 'Gagaga Magician'),
    ('main', 4, 'goblindbergh', 3, 9621, 'Goblindbergh'),
    ('main', 5, 'gogogogiant', 3, 9878, 'Gogogo Giant'),
    ('main', 6, 'gogogogolem', 3, 9619, 'Gogogo Golem'),
    ('main', 7, 'kagetokage', 2, 9723, 'Kagetokage'),
    ('main', 8, 'maskedchameleon', 3, 10641, 'Masked Chameleon'),
    ('main', 9, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 10, 'forbiddenlance', 2, 9352, 'Forbidden Lance'),
    ('main', 11, 'gagagabolt', 2, 9922, 'Gagagabolt'),
    ('main', 12, 'gagagarevenge', 2, 10181, 'Gagagarevenge'),
    ('main', 13, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 14, 'xyzreception', 1, 10663, 'Xyz Reception'),
    ('main', 15, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 16, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 17, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 18, 'xyzeffect', 1, 9574, 'Xyz Effect'),
    ('main', 19, 'xyzreborn', 2, 9950, 'Xyz Reborn'),
    ('main', 20, 'xyzreflect', 3, 9940, 'Xyz Reflect'),
    ('extra', 21, 'gagagacowboy', 1, 10263, 'Gagaga Cowboy'),
    ('extra', 22, 'gauntletlauncher', 1, 10526, 'Gauntlet Launcher'),
    ('extra', 23, 'hieraticsundragonoverlordofheliopolis', 1, 10071, 'Hieratic Sun Dragon Overlord of Heliopolis'),
    ('extra', 24, 'kingoftheferalimps', 1, 10537, 'King of the Feral Imps'),
    ('extra', 25, 'maestrokethesymphonydjinn', 1, 10128, 'Maestroke the Symphony Djinn'),
    ('extra', 26, 'melomelodythebrassdjinn', 1, 10127, 'Melomelody the Brass Djinn'),
    ('extra', 27, 'muzurhythmthestringdjinn', 1, 10125, 'Muzurhythm the String Djinn'),
    ('extra', 28, 'number11bigeye', 1, 9861, 'Number 11: Big Eye'),
    ('extra', 29, 'number16shockmaster', 1, 9860, 'Number 16: Shock Master'),
    ('extra', 30, 'number39utopia', 2, 9575, 'Number 39: Utopia'),
    ('extra', 31, 'number50blackshipofcorn', 1, 10129, 'Number 50: Blackship of Corn'),
    ('extra', 32, 'number61volcasaurus', 1, 9853, 'Number 61: Volcasaurus'),
    ('extra', 33, 'numberc39utopiaray', 1, 9914, 'Number C39: Utopia Ray'),
    ('extra', 34, 'temtempothepercussiondjinn', 1, 10126, 'Temtempo the Percussion Djinn')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'astral-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Astral / B — Utopia Ray (31 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'astral-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cranecrane', 1, 10574, 'Crane Crane'),
    ('main', 2, 'gagagachild', 2, 10564, 'Gagaga Child'),
    ('main', 3, 'gagagaclerk', 1, 10367, 'Gagaga Clerk'),
    ('main', 4, 'gagagagardna', 3, 10028, 'Gagaga Gardna'),
    ('main', 5, 'gagagagirl', 3, 9877, 'Gagaga Girl'),
    ('main', 6, 'gagagamagician', 3, 9618, 'Gagaga Magician'),
    ('main', 7, 'goblindbergh', 3, 9621, 'Goblindbergh'),
    ('main', 8, 'kagetokage', 3, 9723, 'Kagetokage'),
    ('main', 9, 'vsalamander', 2, 10605, 'V Salamander'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'gagagabolt', 2, 9922, 'Gagagabolt'),
    ('main', 12, 'gagagarevenge', 3, 10181, 'Gagagarevenge'),
    ('main', 13, 'rankupmagiclimitedbariansforce', 2, 10570, 'Rank-Up-Magic Limited Barian''s Force'),
    ('main', 14, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 15, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 16, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 17, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('main', 18, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 19, 'xyzreborn', 2, 9950, 'Xyz Reborn'),
    ('extra', 20, 'gachigachigantetsu', 1, 9576, 'Gachi Gachi Gantetsu'),
    ('extra', 21, 'gagagacowboy', 1, 10263, 'Gagaga Cowboy'),
    ('extra', 22, 'gauntletlauncher', 1, 10526, 'Gauntlet Launcher'),
    ('extra', 23, 'maestrokethesymphonydjinn', 1, 10128, 'Maestroke the Symphony Djinn'),
    ('extra', 24, 'number107galaxyeyestachyondragon', 1, 10525, 'Number 107: Galaxy-Eyes Tachyon Dragon'),
    ('extra', 25, 'number17leviathandragon', 1, 9656, 'Number 17: Leviathan Dragon'),
    ('extra', 26, 'number39utopia', 2, 9575, 'Number 39: Utopia'),
    ('extra', 27, 'number50blackshipofcorn', 1, 10129, 'Number 50: Blackship of Corn'),
    ('extra', 28, 'number61volcasaurus', 1, 9853, 'Number 61: Volcasaurus'),
    ('extra', 29, 'numberc39utopiaray', 2, 9914, 'Number C39: Utopia Ray'),
    ('extra', 30, 'numberc39utopiarayv', 2, 10569, 'Number C39: Utopia Ray V'),
    ('extra', 31, 'temtempothepercussiondjinn', 1, 10126, 'Temtempo the Percussion Djinn')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'astral-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bronk Stone / A — Iron Gear (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bronk-stone-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ayeiron', 3, 9978, 'Aye-Iron'),
    ('main', 2, 'geargiaccelerator', 2, 10158, 'Geargiaccelerator'),
    ('main', 3, 'geargiano', 3, 9647, 'Geargiano'),
    ('main', 4, 'geargianomkii', 3, 10157, 'Geargiano Mk-II'),
    ('main', 5, 'geargiarmor', 1, 10160, 'Geargiarmor'),
    ('main', 6, 'geargiarsenal', 2, 10159, 'Geargiarsenal'),
    ('main', 7, 'gearspringspirit', 2, 9980, 'Gearspring Spirit'),
    ('main', 8, 'tingoldfish', 3, 9979, 'Tin Goldfish'),
    ('main', 9, 'ufoturtle', 3, 4917, 'UFO Turtle'),
    ('main', 10, 'breakdraw', 1, 8663, 'Break! Draw!'),
    ('main', 11, 'creatureswap', 2, 5162, 'Creature Swap'),
    ('main', 12, 'doublesummon', 3, 7219, 'Double Summon'),
    ('main', 13, 'ironcall', 2, 10008, 'Iron Call'),
    ('main', 14, 'rushrecklessly', 3, 4905, 'Rush Recklessly'),
    ('main', 15, 'shieldcrush', 2, 6003, 'Shield Crush'),
    ('main', 16, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 17, 'geargiagear', 2, 10558, 'Geargiagear'),
    ('main', 18, 'raremetalmorph', 1, 6219, 'Rare Metalmorph'),
    ('main', 19, 'xyzreborn', 1, 9950, 'Xyz Reborn'),
    ('extra', 20, 'tinarchduke', 1, 10002, 'Tin Archduke'),
    ('extra', 21, 'number34terrorbyte', 2, 9658, 'Number 34: Terror-Byte')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bronk-stone-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bronk Stone / B — Stone Gear (31 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bronk-stone-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'geargiaccelerator', 2, 10158, 'Geargiaccelerator'),
    ('main', 2, 'geargiano', 2, 9647, 'Geargiano'),
    ('main', 3, 'geargianomkii', 2, 10157, 'Geargiano Mk-II'),
    ('main', 4, 'geargiarmor', 2, 10160, 'Geargiarmor'),
    ('main', 5, 'geargiarsenal', 2, 10159, 'Geargiarsenal'),
    ('main', 6, 'greengadget', 2, 6151, 'Green Gadget'),
    ('main', 7, 'machinafortress', 2, 8692, 'Machina Fortress'),
    ('main', 8, 'machinagearframe', 2, 8693, 'Machina Gearframe'),
    ('main', 9, 'reactandragonrulerofpebbles', 2, 10576, 'Reactan, Dragon Ruler of Pebbles'),
    ('main', 10, 'redgadget', 2, 6155, 'Red Gadget'),
    ('main', 11, 'redoxdragonrulerofboulders', 2, 10519, 'Redox, Dragon Ruler of Boulders'),
    ('main', 12, 'tingoldfish', 2, 9979, 'Tin Goldfish'),
    ('main', 13, 'yellowgadget', 2, 6156, 'Yellow Gadget'),
    ('main', 14, 'doublesummon', 2, 7219, 'Double Summon'),
    ('main', 15, 'ironcall', 1, 10008, 'Iron Call'),
    ('main', 16, 'limiterremoval', 1, 5129, 'Limiter Removal'),
    ('main', 17, 'machinaarmoredunit', 2, 8696, 'Machina Armored Unit'),
    ('main', 18, 'resonancedevice', 1, 9678, 'Resonance Device'),
    ('main', 19, 'cybersummonblaster', 1, 6737, 'Cyber Summon Blaster'),
    ('main', 20, 'geargiagear', 2, 10558, 'Geargiagear'),
    ('main', 21, 'pinpointguard', 1, 10550, 'Pinpoint Guard'),
    ('main', 22, 'proofofpowerlessness', 1, 8228, 'Proof of Powerlessness'),
    ('main', 23, 'spiritualearthartkurogane', 1, 6439, 'Spiritual Earth Art - Kurogane'),
    ('main', 24, 'ultimateoffering', 1, 4851, 'Ultimate Offering'),
    ('extra', 25, 'daigustoemeral', 1, 9822, 'Daigusto Emeral'),
    ('extra', 26, 'diamonddirewolf', 1, 10410, 'Diamond Dire Wolf'),
    ('extra', 27, 'gagagacowboy', 1, 10263, 'Gagaga Cowboy'),
    ('extra', 28, 'geargigantx', 2, 10176, 'Gear Gigant X'),
    ('extra', 29, 'gemknightpearl', 1, 9601, 'Gem-Knight Pearl'),
    ('extra', 30, 'maestrokethesymphonydjinn', 1, 10128, 'Maestroke the Symphony Djinn'),
    ('extra', 31, 'mechaphantombeastdracossack', 1, 10534, 'Mecha Phantom Beast Dracossack')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bronk-stone-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Caswell Francis / A — Crashbugs (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'caswell-francis-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bitebug', 2, 10573, 'Bite Bug'),
    ('main', 2, 'blacklustersoldierenvoyofthebeginning', 1, 5835, 'Black Luster Soldier - Envoy of the Beginning'),
    ('main', 3, 'cardtrooper', 2, 6939, 'Card Trooper'),
    ('main', 4, 'crashbugx', 3, 9626, 'Crashbug X'),
    ('main', 5, 'crashbugy', 3, 9627, 'Crashbug Y'),
    ('main', 6, 'crashbugz', 3, 9628, 'Crashbug Z'),
    ('main', 7, 'effectveiler', 3, 8933, 'Effect Veiler'),
    ('main', 8, 'mystictomato', 3, 4930, 'Mystic Tomato'),
    ('main', 9, 'supercrashbug', 3, 9629, 'Super Crashbug'),
    ('main', 10, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 13, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'smashingground', 1, 5905, 'Smashing Ground'),
    ('main', 15, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 16, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 17, 'damagecondenser', 1, 6582, 'Damage Condenser'),
    ('main', 18, 'deckdevastationvirus', 1, 6284, 'Deck Devastation Virus'),
    ('main', 19, 'dimensionalprison', 3, 7400, 'Dimensional Prison'),
    ('main', 20, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('extra', 21, 'grenosaurus', 2, 9577, 'Grenosaurus'),
    ('extra', 22, 'leviairtheseadragon', 2, 9660, 'Leviair the Sea Dragon'),
    ('extra', 23, 'number20gigabrilliant', 2, 9760, 'Number 20: Giga-Brilliant')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'caswell-francis-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Caswell Francis / B — Steel Pandemic (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'caswell-francis-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'darkarmeddragon', 1, 7421, 'Dark Armed Dragon'),
    ('main', 2, 'darkgrepher', 2, 7561, 'Dark Grepher'),
    ('main', 3, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 4, 'steelswarmcaller', 3, 9173, 'Steelswarm Caller'),
    ('main', 5, 'steelswarmcell', 3, 9170, 'Steelswarm Cell'),
    ('main', 6, 'steelswarmgirastag', 3, 9176, 'Steelswarm Girastag'),
    ('main', 7, 'steelswarmmantis', 2, 9174, 'Steelswarm Mantis'),
    ('main', 8, 'steelswarmmoth', 3, 9175, 'Steelswarm Moth'),
    ('main', 9, 'steelswarmscout', 2, 9171, 'Steelswarm Scout'),
    ('main', 10, 'stygianstreetpatrol', 2, 8740, 'Stygian Street Patrol'),
    ('main', 11, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'infestationpandemic', 3, 10010, 'Infestation Pandemic'),
    ('main', 14, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'recurringnightmare', 3, 7151, 'Recurring Nightmare'),
    ('main', 16, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 17, 'infestationtool', 2, 9401, 'Infestation Tool'),
    ('main', 18, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 19, 'gemknightpearl', 3, 9601, 'Gem-Knight Pearl'),
    ('extra', 20, 'inzektorexabeetle', 1, 9920, 'Inzektor Exa-Beetle'),
    ('extra', 21, 'number11bigeye', 1, 9861, 'Number 11: Big Eye'),
    ('extra', 22, 'steelswarmroach', 2, 9612, 'Steelswarm Roach')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'caswell-francis-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Cathy Katherine / A — Kitty Cat (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'cathy-katherine-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'acatofillomen', 3, 5520, 'A Cat of Ill Omen'),
    ('main', 2, 'catseartribe', 3, 5665, 'Cat''s Ear Tribe'),
    ('main', 3, 'catnippedkitty', 3, 6243, 'Catnipped Kitty'),
    ('main', 4, 'crystalbeastamethystcat', 2, 7071, 'Crystal Beast Amethyst Cat'),
    ('main', 5, 'darkcatwithwhitetail', 3, 5667, 'Dark Cat with White Tail'),
    ('main', 6, 'keymouse', 3, 8812, 'Key Mouse'),
    ('main', 7, 'kinkabyo', 2, 7728, 'Kinka-byo'),
    ('main', 8, 'lockcat', 3, 8964, 'Lock Cat'),
    ('main', 9, 'magicat', 1, 8322, 'Magicat'),
    ('main', 10, 'thefabledcatsith', 3, 8555, 'The Fabled Catsith'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'levellimitareab', 3, 6054, 'Level Limit - Area B'),
    ('main', 13, 'magepower', 3, 5213, 'Mage Power'),
    ('main', 14, 'spiritualforest', 2, 8494, 'Spiritual Forest'),
    ('main', 15, 'unitedwestand', 2, 5212, 'United We Stand'),
    ('main', 16, 'gravitybind', 1, 5134, 'Gravity Bind'),
    ('main', 17, 'hornofthephantombeast', 2, 9006, 'Horn of the Phantom Beast'),
    ('extra', 18, 'armoryarm', 1, 7987, 'Armory Arm'),
    ('extra', 19, 'mistbirdclausolas', 2, 10646, 'Mist Bird Clausolas'),
    ('extra', 20, 'underworldfighterbalmung', 2, 10647, 'Underworld Fighter Balmung'),
    ('extra', 21, 'slackermagician', 2, 10412, 'Slacker Magician')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'cathy-katherine-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Cathy Katherine / B — The Sphinx (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'cathy-katherine-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'acatofillomen', 3, 5520, 'A Cat of Ill Omen'),
    ('main', 2, 'androsphinx', 3, 6087, 'Andro Sphinx'),
    ('main', 3, 'enragedbattleox', 2, 5884, 'Enraged Battle Ox'),
    ('main', 4, 'honest', 1, 7574, 'Honest'),
    ('main', 5, 'kaiserseahorse', 3, 5409, 'Kaiser Sea Horse'),
    ('main', 6, 'rykolightswornhunter', 3, 7595, 'Ryko, Lightsworn Hunter'),
    ('main', 7, 'sphinxteleia', 3, 6088, 'Sphinx Teleia'),
    ('main', 8, 'thecalculator', 3, 7436, 'The Calculator'),
    ('main', 9, 'theinenthegreatsphinx', 2, 6089, 'Theinen the Great Sphinx'),
    ('main', 10, 'thunderkingraioh', 2, 7397, 'Thunder King Rai-Oh'),
    ('main', 11, 'lightningvortex', 2, 5217, 'Lightning Vortex'),
    ('main', 12, 'photonsanctuary', 3, 9971, 'Photon Sanctuary'),
    ('main', 13, 'beckoninglight', 3, 5993, 'Beckoning Light'),
    ('main', 14, 'pyramidoflight', 3, 6079, 'Pyramid of Light'),
    ('main', 15, 'returnfromthedifferentdimension', 1, 6078, 'Return from the Different Dimension'),
    ('main', 16, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 17, 'trapstun', 2, 8223, 'Trap Stun'),
    ('extra', 18, 'diamonddirewolf', 1, 10410, 'Diamond Dire Wolf')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'cathy-katherine-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dextra / A — Butterfly Wings (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'dextra-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'beetron', 3, 10107, 'Beetron'),
    ('main', 2, 'bluemountainbutterspy', 3, 10698, 'Blue Mountain Butterspy'),
    ('main', 3, 'heroicchallengerextrasword', 3, 10230, 'Heroic Challenger - Extra Sword'),
    ('main', 4, 'moonlitpapillon', 3, 10037, 'Moonlit Papillon'),
    ('main', 5, 'morphobutterspy', 3, 10035, 'Morpho Butterspy'),
    ('main', 6, 'summonermonk', 2, 6400, 'Summoner Monk'),
    ('main', 7, 'swallowtailbutterspy', 3, 10036, 'Swallowtail Butterspy'),
    ('main', 8, 'assaultarmor', 1, 7494, 'Assault Armor'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'doublesummon', 1, 7219, 'Double Summon'),
    ('main', 11, 'infernorecklesssummon', 2, 6542, 'Inferno Reckless Summon'),
    ('main', 12, 'magnumshield', 1, 10539, 'Magnum Shield'),
    ('main', 13, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 15, 'thewarriorreturningalive', 1, 5330, 'The Warrior Returning Alive'),
    ('main', 16, 'bottomlesstraphole', 2, 5400, 'Bottomless Trap Hole'),
    ('main', 17, 'butterflyoke', 1, 10093, 'Butterflyoke'),
    ('main', 18, 'butterspyprotection', 1, 10729, 'Butterspy Protection'),
    ('main', 19, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 20, 'fiendishchain', 3, 8675, 'Fiendish Chain'),
    ('extra', 21, 'nightpapilloperative', 2, 10721, 'Night Papilloperative'),
    ('extra', 22, 'photonalexandraqueen', 2, 10720, 'Photon Alexandra Queen'),
    ('extra', 23, 'photonpapilloperative', 2, 10067, 'Photon Papilloperative')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'dextra-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dextra / B — Traptrix (26 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'dextra-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'beetron', 3, 10107, 'Beetron'),
    ('main', 2, 'gigaplant', 1, 7427, 'Gigaplant'),
    ('main', 3, 'lonefireblossom', 1, 7568, 'Lonefire Blossom'),
    ('main', 4, 'traptrixatrax', 3, 10635, 'Traptrix Atrax'),
    ('main', 5, 'traptrixmyrmeleo', 3, 10636, 'Traptrix Myrmeleo'),
    ('main', 6, 'traptrixnepenthes', 3, 10637, 'Traptrix Nepenthes'),
    ('main', 7, 'fireformationgyokkou', 2, 10543, 'Fire Formation - Gyokkou'),
    ('main', 8, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 9, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 10, 'verdantsanctuary', 3, 8055, 'Verdant Sanctuary'),
    ('main', 11, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 12, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 13, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 14, 'fiendishchain', 3, 8675, 'Fiendish Chain'),
    ('main', 15, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('main', 16, 'traphole', 3, 4836, 'Trap Hole'),
    ('main', 17, 'traptrixtrapholenightmare', 3, 10680, 'Traptrix Trap Hole Nightmare'),
    ('main', 18, 'voidtraphole', 3, 10206, 'Void Trap Hole'),
    ('extra', 19, 'diamonddirewolf', 1, 10410, 'Diamond Dire Wolf'),
    ('extra', 20, 'fairykingalbverdich', 1, 10179, 'Fairy King Albverdich'),
    ('extra', 21, 'gagagacowboy', 1, 10263, 'Gagaga Cowboy'),
    ('extra', 22, 'gemknightpearl', 1, 9601, 'Gem-Knight Pearl'),
    ('extra', 23, 'maestrokethesymphonydjinn', 2, 10128, 'Maestroke the Symphony Djinn'),
    ('extra', 24, 'number39utopia', 1, 9575, 'Number 39: Utopia'),
    ('extra', 25, 'number50blackshipofcorn', 1, 10129, 'Number 50: Blackship of Corn'),
    ('extra', 26, 'photonpapilloperative', 1, 10067, 'Photon Papilloperative')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'dextra-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dr. Faker / A — Heart-eartH (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'dr-faker-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cyberdragon', 2, 6390, 'Cyber Dragon'),
    ('main', 2, 'garbagelord', 3, 10378, 'Garbage Lord'),
    ('main', 3, 'garbageogre', 2, 10377, 'Garbage Ogre'),
    ('main', 4, 'ghostship', 1, 9652, 'Ghost Ship'),
    ('main', 5, 'mistarchfiend', 3, 7149, 'Mist Archfiend'),
    ('main', 6, 'oracleofthesun', 3, 8630, 'Oracle of the Sun'),
    ('main', 7, 'thetricky', 2, 6150, 'The Tricky'),
    ('main', 8, 'vicedragon', 3, 7991, 'Vice Dragon'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'infernorecklesssummon', 3, 6542, 'Inferno Reckless Summon'),
    ('main', 11, 'instantfusion', 3, 6901, 'Instant Fusion'),
    ('main', 12, 'sharethepain', 3, 4889, 'Share the Pain'),
    ('main', 13, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 14, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 15, 'hatebuster', 3, 7465, 'Hate Buster'),
    ('main', 16, 'limitreverse', 3, 7636, 'Limit Reverse'),
    ('main', 17, 'safezone', 1, 9549, 'Safe Zone'),
    ('main', 18, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 19, 'giltiathedknight', 2, 4395, 'Giltia the D. Knight'),
    ('extra', 20, 'maneatingblackshark', 1, 4571, 'Man-eating Black Shark'),
    ('extra', 21, 'number53heartearth', 3, 10405, 'Number 53: Heart-eartH'),
    ('extra', 22, 'number92heartearthdragon', 3, 10404, 'Number 92: Heart-eartH Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'dr-faker-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dr. Faker / B — Dark World (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'dr-faker-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'beiigevanguardofdarkworld', 3, 6501, 'Beiige, Vanguard of Dark World'),
    ('main', 2, 'blacklustersoldierenvoyofthebeginning', 1, 5835, 'Black Luster Soldier - Envoy of the Beginning'),
    ('main', 3, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 4, 'browwhuntsmanofdarkworld', 3, 6502, 'Broww, Huntsman of Dark World'),
    ('main', 5, 'effectveiler', 2, 8933, 'Effect Veiler'),
    ('main', 6, 'graphadragonlordofdarkworld', 3, 9712, 'Grapha, Dragon Lord of Dark World'),
    ('main', 7, 'morphingjar', 1, 4597, 'Morphing Jar'),
    ('main', 8, 'snowwunlightofdarkworld', 3, 9713, 'Snoww, Unlight of Dark World'),
    ('main', 9, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 10, 'trancearchfiend', 2, 9909, 'Trance Archfiend'),
    ('main', 11, 'carddestruction', 1, 4821, 'Card Destruction'),
    ('main', 12, 'darkworlddealings', 3, 7002, 'Dark World Dealings'),
    ('main', 13, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 14, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 15, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 16, 'thegatesofdarkworld', 3, 9715, 'The Gates of Dark World'),
    ('main', 17, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 18, 'darksmog', 3, 9872, 'Dark Smog'),
    ('main', 19, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('extra', 20, 'hieraticsundragonoverlordofheliopolis', 2, 10071, 'Hieratic Sun Dragon Overlord of Heliopolis'),
    ('extra', 21, 'lavalvalchain', 1, 9821, 'Lavalval Chain'),
    ('extra', 22, 'windupzenmaines', 1, 9870, 'Wind-Up Zenmaines'),
    ('extra', 23, 'divinedragonknightfelgrand', 2, 10787, 'Divine Dragon Knight Felgrand')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'dr-faker-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Flip Turner / A — Chewbone (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'flip-turner-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'chewbone', 3, 9834, 'Chewbone'),
    ('main', 2, 'darkdustspirit', 2, 5414, 'Dark Dust Spirit'),
    ('main', 3, 'deslacooda', 3, 5427, 'Des Lacooda'),
    ('main', 4, 'lavagolem', 3, 5496, 'Lava Golem'),
    ('main', 5, 'maskofdarkness', 1, 4108, 'Mask of Darkness'),
    ('main', 6, 'nightassailant', 1, 6042, 'Night Assailant'),
    ('main', 7, 'poisonmummy', 3, 5413, 'Poison Mummy'),
    ('main', 8, 'royalkeeper', 3, 5415, 'Royal Keeper'),
    ('main', 9, 'spiritreaper', 3, 5526, 'Spirit Reaper'),
    ('main', 10, 'bookoflife', 3, 5430, 'Book of Life'),
    ('main', 11, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 12, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 13, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light'),
    ('main', 14, 'afeintplan', 1, 5332, 'A Feint Plan'),
    ('main', 15, 'magiccylinder', 3, 5124, 'Magic Cylinder'),
    ('main', 16, 'magicalhats', 3, 4962, 'Magical Hats'),
    ('main', 17, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 18, 'widespreadruin', 1, 4692, 'Widespread Ruin'),
    ('extra', 19, 'gagagacowboy', 1, 10263, 'Gagaga Cowboy'),
    ('extra', 20, 'number30acidgolemofdestruction', 3, 9858, 'Number 30: Acid Golem of Destruction')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'flip-turner-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Flip Turner / B — Flip (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'flip-turner-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cardcard', 2, 10029, 'Cardcar D'),
    ('main', 2, 'lavagolem', 2, 5496, 'Lava Golem'),
    ('main', 3, 'marshmallon', 3, 6000, 'Marshmallon'),
    ('main', 4, 'maskofdarkness', 1, 4108, 'Mask of Darkness'),
    ('main', 5, 'nightassailant', 1, 6042, 'Night Assailant'),
    ('main', 6, 'penguinsoldier', 3, 4608, 'Penguin Soldier'),
    ('main', 7, 'stealthbird', 3, 5882, 'Stealth Bird'),
    ('main', 8, 'swarmoflocusts', 2, 5419, 'Swarm of Locusts'),
    ('main', 9, 'swarmofscarabs', 3, 5418, 'Swarm of Scarabs'),
    ('main', 10, 'darkworldshackles', 2, 9134, 'Darkworld Shackles'),
    ('main', 11, 'levellimitareab', 1, 6054, 'Level Limit - Area B'),
    ('main', 12, 'messengerofpeace', 3, 4938, 'Messenger of Peace'),
    ('main', 13, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 14, 'wavemotioncannon', 2, 5614, 'Wave-Motion Cannon'),
    ('main', 15, 'begoneknave', 2, 5918, 'Begone, Knave!'),
    ('main', 16, 'fiendishchain', 3, 8675, 'Fiendish Chain'),
    ('main', 17, 'gravitybind', 1, 5134, 'Gravity Bind'),
    ('main', 18, 'nightmarewheel', 3, 5298, 'Nightmare Wheel'),
    ('main', 19, 'starlightroad', 2, 8609, 'Starlight Road'),
    ('extra', 20, 'stardustdragon', 2, 7734, 'Stardust Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'flip-turner-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Kite Tenjo / A — Photon Galaxy (35 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'kite-tenjo-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'daybreaker', 3, 9730, 'Daybreaker'),
    ('main', 2, 'dimensionwanderer', 1, 10337, 'Dimension Wanderer'),
    ('main', 3, 'galaxyknight', 3, 10339, 'Galaxy Knight'),
    ('main', 4, 'galaxywizard', 1, 10338, 'Galaxy Wizard'),
    ('main', 5, 'galaxyeyesphotondragon', 2, 9729, 'Galaxy-Eyes Photon Dragon'),
    ('main', 6, 'kuriphoton', 1, 10336, 'Kuriphoton'),
    ('main', 7, 'photoncerberus', 2, 9733, 'Photon Cerberus'),
    ('main', 8, 'photoncircle', 2, 9885, 'Photon Circle'),
    ('main', 9, 'photoncrusher', 2, 9883, 'Photon Crusher'),
    ('main', 10, 'photonleo', 1, 9884, 'Photon Leo'),
    ('main', 11, 'photonlizard', 2, 9881, 'Photon Lizard'),
    ('main', 12, 'photonpirate', 1, 10333, 'Photon Pirate'),
    ('main', 13, 'photonsatellite', 3, 10334, 'Photon Satellite'),
    ('main', 14, 'photonslasher', 2, 10335, 'Photon Slasher'),
    ('main', 15, 'reversebuster', 1, 9886, 'Reverse Buster'),
    ('main', 16, 'accellight', 1, 10342, 'Accellight'),
    ('main', 17, 'galaxyexpedition', 2, 10343, 'Galaxy Expedition'),
    ('main', 18, 'galaxywave', 1, 9936, 'Galaxy Wave'),
    ('main', 19, 'galaxyzero', 2, 10344, 'Galaxy Zero'),
    ('main', 20, 'messageinabottle', 1, 10341, 'Message in a Bottle'),
    ('main', 21, 'photontrident', 1, 10020, 'Photon Trident'),
    ('main', 22, 'photonveil', 1, 9768, 'Photon Veil'),
    ('main', 23, 'xyzdoubleback', 1, 10415, 'Xyz Double Back'),
    ('main', 24, 'lumenize', 2, 9788, 'Lumenize'),
    ('main', 25, 'photoncurrent', 1, 9972, 'Photon Current'),
    ('extra', 26, 'photonstrikebounzer', 1, 10066, 'Photon Strike Bounzer'),
    ('extra', 27, 'neogalaxyeyesphotondragon', 2, 10064, 'Neo Galaxy-Eyes Photon Dragon'),
    ('extra', 28, 'number9dysonsphere', 1, 10266, 'Number 9: Dyson Sphere'),
    ('extra', 29, 'starliegepaladynamo', 2, 10340, 'Starliege Paladynamo'),
    ('extra', 30, 'number10illumiknight', 1, 9759, 'Number 10: Illumiknight'),
    ('extra', 31, 'number20gigabrilliant', 1, 9760, 'Number 20: Giga-Brilliant'),
    ('extra', 32, 'number30acidgolemofdestruction', 1, 9858, 'Number 30: Acid Golem of Destruction'),
    ('extra', 33, 'number56goldrat', 1, 9857, 'Number 56: Gold Rat'),
    ('extra', 34, 'number33chronomalymachumech', 1, 10173, 'Number 33: Chronomaly Machu Mech'),
    ('extra', 35, 'number7luckystraight', 1, 9964, 'Number 7: Lucky Straight')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'kite-tenjo-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Kite Tenjo / B — Galaxy-Eyes (34 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'kite-tenjo-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'galaxyeyesphotondragon', 2, 9729, 'Galaxy-Eyes Photon Dragon'),
    ('main', 2, 'photonlizard', 2, 9881, 'Photon Lizard'),
    ('main', 3, 'photonwyvern', 1, 9966, 'Photon Wyvern'),
    ('main', 4, 'photonpirate', 1, 10333, 'Photon Pirate'),
    ('main', 5, 'photonsatellite', 2, 10334, 'Photon Satellite'),
    ('main', 6, 'photonleo', 1, 9884, 'Photon Leo'),
    ('main', 7, 'photonsabretiger', 3, 9864, 'Photon Sabre Tiger'),
    ('main', 8, 'galaxyknight', 1, 10339, 'Galaxy Knight'),
    ('main', 9, 'photoncaesar', 2, 10134, 'Photon Caesar'),
    ('main', 10, 'photoncrusher', 3, 9883, 'Photon Crusher'),
    ('main', 11, 'photonthrasher', 3, 9882, 'Photon Thrasher'),
    ('main', 12, 'shiningangel', 2, 4924, 'Shining Angel'),
    ('main', 13, 'galaxywizard', 1, 10338, 'Galaxy Wizard'),
    ('main', 14, 'accellight', 1, 10342, 'Accellight'),
    ('main', 15, 'galaxyexpedition', 2, 10343, 'Galaxy Expedition'),
    ('main', 16, 'galaxyzero', 1, 10344, 'Galaxy Zero'),
    ('main', 17, 'messageinabottle', 1, 10341, 'Message in a Bottle'),
    ('main', 18, 'photonlead', 2, 9769, 'Photon Lead'),
    ('main', 19, 'photonsanctuary', 2, 9971, 'Photon Sanctuary'),
    ('main', 20, 'photontrident', 2, 10020, 'Photon Trident'),
    ('main', 21, 'polymerization', 1, 4837, 'Polymerization'),
    ('main', 22, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 23, 'lumenize', 2, 9788, 'Lumenize'),
    ('main', 24, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('extra', 25, 'twinphotonlizard', 1, 9913, 'Twin Photon Lizard'),
    ('extra', 26, 'neogalaxyeyesphotondragon', 1, 10064, 'Neo Galaxy-Eyes Photon Dragon'),
    ('extra', 27, 'number30acidgolemofdestruction', 1, 9858, 'Number 30: Acid Golem of Destruction'),
    ('extra', 28, 'number20gigabrilliant', 1, 9760, 'Number 20: Giga-Brilliant'),
    ('extra', 29, 'number10illumiknight', 1, 9759, 'Number 10: Illumiknight'),
    ('extra', 30, 'starliegelordgalaxion', 1, 10653, 'Starliege Lord Galaxion'),
    ('extra', 31, 'starliegepaladynamo', 1, 10340, 'Starliege Paladynamo'),
    ('extra', 32, 'constellarpleiades', 3, 9824, 'Constellar Pleiades'),
    ('extra', 33, 'number107galaxyeyestachyondragon', 1, 10525, 'Number 107: Galaxy-Eyes Tachyon Dragon'),
    ('extra', 34, 'number9dysonsphere', 1, 10266, 'Number 9: Dyson Sphere')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'kite-tenjo-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Nelson Andrews / A — Star Sparrow (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'nelson-andrews-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'beastwarriorpuma', 3, 9974, 'Beast-Warrior Puma'),
    ('main', 2, 'dboyz', 3, 9867, 'D-Boyz'),
    ('main', 3, 'ddesperstarsparrow', 3, 9973, 'D.D. Esper Star Sparrow'),
    ('main', 4, 'ddjetiron', 1, 9977, 'D.D. Jet Iron'),
    ('main', 5, 'galaxywizard', 2, 10338, 'Galaxy Wizard'),
    ('main', 6, 'giantrat', 3, 4915, 'Giant Rat'),
    ('main', 7, 'ironhammerthegiant', 2, 9976, 'Ironhammer the Giant'),
    ('main', 8, 'phoenixbeastgairuda', 2, 9975, 'Phoenix Beast Gairuda'),
    ('main', 9, 'summonermonk', 2, 6400, 'Summoner Monk'),
    ('main', 10, 'triplestartrion', 1, 9835, 'Triple Star Trion'),
    ('main', 11, 'carddestruction', 1, 4821, 'Card Destruction'),
    ('main', 12, 'galaxyqueenslight', 3, 10186, 'Galaxy Queen''s Light'),
    ('main', 13, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 14, 'reasoning', 2, 5530, 'Reasoning'),
    ('main', 15, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light'),
    ('main', 16, 'aheroemerges', 1, 5915, 'A Hero Emerges'),
    ('main', 17, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 18, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 19, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('extra', 20, 'lavalvalchain', 2, 9821, 'Lavalval Chain'),
    ('extra', 21, 'number83galaxyqueen', 1, 9757, 'Number 83: Galaxy Queen'),
    ('extra', 22, 'superdimensionalrobotgalaxydestroyer', 2, 10174, 'Superdimensional Robot Galaxy Destroyer')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'nelson-andrews-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Nelson Andrews / B — Icarus (26 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'nelson-andrews-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'darksimorgh', 3, 7770, 'Dark Simorgh'),
    ('main', 2, 'evilswarmolantern', 1, 9816, 'Evilswarm O''lantern'),
    ('main', 3, 'evilswarmketos', 1, 9815, 'Evilswarm Ketos'),
    ('main', 4, 'evilswarmhraesvelg', 2, 9818, 'Evilswarm Hraesvelg'),
    ('main', 5, 'harpiequeen', 2, 7111, 'Harpie Queen'),
    ('main', 6, 'blackwingzephyrostheelite', 2, 9244, 'Blackwing - Zephyros the Elite'),
    ('main', 7, 'battlestorm', 2, 8371, 'Battlestorm'),
    ('main', 8, 'mistvalleysoldier', 2, 7532, 'Mist Valley Soldier'),
    ('main', 9, 'mistvalleyfalcon', 2, 8109, 'Mist Valley Falcon'),
    ('main', 10, 'dragunitydarkspear', 2, 8391, 'Dragunity Darkspear'),
    ('main', 11, 'blackwinggalethewhirlwind', 1, 8011, 'Blackwing - Gale the Whirlwind'),
    ('main', 12, 'ddcrow', 2, 6980, 'D.D. Crow'),
    ('main', 13, 'swallowsnest', 2, 8378, 'Swallow''s Nest'),
    ('main', 14, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 15, 'imperialcustom', 2, 8357, 'Imperial Custom'),
    ('main', 16, 'icarusattack', 2, 6709, 'Icarus Attack'),
    ('main', 17, 'dusttornado', 2, 4988, 'Dust Tornado'),
    ('main', 18, 'fiendishchain', 2, 8675, 'Fiendish Chain'),
    ('main', 19, 'antispellfragrance', 3, 5008, 'Anti-Spell Fragrance'),
    ('main', 20, 'escapefromthedarkdimension', 1, 7471, 'Escape from the Dark Dimension'),
    ('main', 21, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('extra', 22, 'mistvalleythunderlord', 1, 8121, 'Mist Valley Thunder Lord'),
    ('extra', 23, 'allyofjusticecatastor', 1, 7552, 'Ally of Justice Catastor'),
    ('extra', 24, 'vortexthewhirlwind', 1, 9449, 'Vortex the Whirlwind'),
    ('extra', 25, 'evilswarmnightmare', 1, 9825, 'Evilswarm Nightmare'),
    ('extra', 26, 'evilswarmbahamut', 1, 9826, 'Evilswarm Bahamut')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'nelson-andrews-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Nistro / A — Bounzer Warrior (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'nistro-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bladebounzer', 3, 10033, 'Blade Bounzer'),
    ('main', 2, 'dododowarrior', 3, 9852, 'Dododo Warrior'),
    ('main', 3, 'hammerbounzer', 3, 10032, 'Hammer Bounzer'),
    ('main', 4, 'koakimeirubergzak', 3, 8516, 'Koa''ki Meiru Bergzak'),
    ('main', 5, 'phantombounzer', 3, 10034, 'Phantom Bounzer'),
    ('main', 6, 'theimmortalbushi', 3, 7430, 'The Immortal Bushi'),
    ('main', 7, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 8, 'forbiddenlance', 3, 9352, 'Forbidden Lance'),
    ('main', 9, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 10, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 11, 'thewarriorreturningalive', 3, 5330, 'The Warrior Returning Alive'),
    ('main', 12, 'bounzerguard', 3, 10092, 'Bounzer Guard'),
    ('main', 13, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 14, 'copyknight', 3, 9784, 'Copy Knight'),
    ('main', 15, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 16, 'photonstrikebounzer', 3, 10066, 'Photon Strike Bounzer')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'nistro-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Nistro / B — Heroic Champion (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'nistro-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bluemountainbutterspy', 3, 10698, 'Blue Mountain Butterspy'),
    ('main', 2, 'goblindbergh', 3, 9621, 'Goblindbergh'),
    ('main', 3, 'heroicchallengerambushsoldier', 2, 10696, 'Heroic Challenger - Ambush Soldier'),
    ('main', 4, 'heroicchallengerdoublelance', 3, 10138, 'Heroic Challenger - Double Lance'),
    ('main', 5, 'heroicchallengerextrasword', 3, 10230, 'Heroic Challenger - Extra Sword'),
    ('main', 6, 'heroicchallengernightwatchman', 1, 10231, 'Heroic Challenger - Night Watchman'),
    ('main', 7, 'heroicchallengerspartan', 3, 10135, 'Heroic Challenger - Spartan'),
    ('main', 8, 'heroicchallengerswordshield', 3, 10137, 'Heroic Challenger - Swordshield'),
    ('main', 9, 'assaultarmor', 2, 7494, 'Assault Armor'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'doublesummon', 1, 7219, 'Double Summon'),
    ('main', 12, 'heroicchance', 1, 10183, 'Heroic Chance'),
    ('main', 13, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 14, 'thewarriorreturningalive', 1, 5330, 'The Warrior Returning Alive'),
    ('main', 15, 'breakthroughskill', 3, 10437, 'Breakthrough Skill'),
    ('main', 16, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 17, 'copyknight', 1, 9784, 'Copy Knight'),
    ('main', 18, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 19, 'reinforcetruth', 1, 8354, 'Reinforce Truth'),
    ('main', 20, 'sakuretsuarmor', 3, 5799, 'Sakuretsu Armor'),
    ('extra', 21, 'heroicchampionexcalibur', 2, 10171, 'Heroic Champion - Excalibur'),
    ('extra', 22, 'heroicchampiongandiva', 2, 10264, 'Heroic Champion - Gandiva'),
    ('extra', 23, 'heroicchampionkusanagi', 2, 10265, 'Heroic Champion - Kusanagi')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'nistro-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Quattro / A — Gimmick Puppet (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'quattro-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 2, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 3, 'cardcard', 2, 10029, 'Cardcar D'),
    ('main', 4, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 5, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('main', 6, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 7, 'gimmickpuppetegghead', 3, 10691, 'Gimmick Puppet Egg Head'),
    ('main', 8, 'gimmickpuppetgearchanger', 3, 10692, 'Gimmick Puppet Gear Changer'),
    ('main', 9, 'gimmickpuppetnightmare', 3, 10695, 'Gimmick Puppet Nightmare'),
    ('main', 10, 'gimmickpuppetscissorarms', 3, 10694, 'Gimmick Puppet Scissor Arms'),
    ('main', 11, 'gimmickpuppettwilightjoker', 3, 10693, 'Gimmick Puppet Twilight Joker'),
    ('main', 12, 'machinacannon', 2, 9434, 'Machina Cannon'),
    ('main', 13, 'machinagearframe', 2, 8693, 'Machina Gearframe'),
    ('main', 14, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 15, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'puppetritual', 3, 10724, 'Puppet Ritual'),
    ('main', 17, 'scrapironscarecrow', 3, 7694, 'Scrap-Iron Scarecrow'),
    ('main', 18, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 19, 'xyzeffect', 1, 9574, 'Xyz Effect'),
    ('extra', 20, 'number15gimmickpuppetgiantgrinder', 2, 10130, 'Number 15: Gimmick Puppet Giant Grinder'),
    ('extra', 21, 'number39utopia', 3, 9575, 'Number 39: Utopia'),
    ('extra', 22, 'number40gimmickpuppetofstrings', 2, 10216, 'Number 40: Gimmick Puppet of Strings'),
    ('extra', 23, 'number88gimmickpuppetofleo', 2, 10324, 'Number 88: Gimmick Puppet of Leo')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'quattro-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Quattro / B — Karakuri mdl 00 (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'quattro-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'karakurikomachimdl224ninishi', 3, 9501, 'Karakuri Komachi mdl 224 "Ninishi"'),
    ('main', 2, 'karakurimerchantmdl177inashichi', 3, 9097, 'Karakuri Merchant mdl 177 "Inashichi"'),
    ('main', 3, 'karakurimusomdl818haipa', 1, 9452, 'Karakuri Muso mdl 818 "Haipa"'),
    ('main', 4, 'karakurininjamdl919kuick', 2, 9319, 'Karakuri Ninja mdl 919 "Kuick"'),
    ('main', 5, 'karakurisoldiermdl236nisamu', 3, 9096, 'Karakuri Soldier mdl 236 "Nisamu"'),
    ('main', 6, 'karakuristrategistmdl248nishipachi', 3, 9098, 'Karakuri Strategist mdl 248 "Nishipachi"'),
    ('main', 7, 'psychiccommander', 3, 7718, 'Psychic Commander'),
    ('main', 8, 'solarwindjammer', 3, 10233, 'Solar Wind Jammer'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'desynchro', 3, 7743, 'De-Synchro'),
    ('main', 11, 'instantfusion', 3, 6901, 'Instant Fusion'),
    ('main', 12, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 14, 'karakuriklock', 2, 9149, 'Karakuri Klock'),
    ('main', 15, 'karakuritrickhouse', 2, 9148, 'Karakuri Trick House'),
    ('main', 16, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 17, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('extra', 18, 'cybersaurus', 3, 4514, 'Cyber Saurus'),
    ('extra', 19, 'crimsonblader', 1, 9801, 'Crimson Blader'),
    ('extra', 20, 'karakurishogunmdl00burei', 3, 9120, 'Karakuri Shogun mdl 00 "Burei"'),
    ('extra', 21, 'karakuristeelshogunmdl00xbureido', 3, 9333, 'Karakuri Steel Shogun mdl 00X "Bureido"'),
    ('extra', 22, 'mistwurm', 1, 7549, 'Mist Wurm'),
    ('extra', 23, 'naturiabeast', 1, 7969, 'Naturia Beast')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'quattro-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Quinton / A — Dyson Sphere (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'quinton-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'woodborginpachi', 2, 6172, 'Woodborg Inpachi'),
    ('main', 2, 'cyberdragon', 3, 6390, 'Cyber Dragon'),
    ('main', 3, 'geargolemthemovingfortress', 3, 4757, 'Gear Golem the Moving Fortress'),
    ('main', 4, 'planetpathfinder', 2, 10232, 'Planet Pathfinder'),
    ('main', 5, 'quickdrawsynchron', 3, 8439, 'Quickdraw Synchron'),
    ('main', 6, 'roulettebarrel', 3, 5599, 'Roulette Barrel'),
    ('main', 7, 'solarwindjammer', 3, 10233, 'Solar Wind Jammer'),
    ('main', 8, 'ufoturtle', 3, 4917, 'UFO Turtle'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 11, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light'),
    ('main', 12, 'tannhausergate', 3, 10275, 'Tannhauser Gate'),
    ('main', 13, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 14, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 15, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 16, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 17, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 18, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 19, 'number9dysonsphere', 3, 10266, 'Number 9: Dyson Sphere')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'quinton-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Quinton / B — Alien Code "A" (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'quinton-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'alienshocktrooper', 3, 7190, 'Alien Shocktrooper'),
    ('main', 2, 'alienammonite', 3, 8034, 'Alien Ammonite'),
    ('main', 3, 'aliendog', 3, 8185, 'Alien Dog'),
    ('main', 4, 'alienhypno', 3, 7300, 'Alien Hypno'),
    ('main', 5, 'alienkid', 3, 8142, 'Alien Kid'),
    ('main', 6, 'alienoverlord', 2, 8033, 'Alien Overlord'),
    ('main', 7, 'alienwarrior', 3, 6804, 'Alien Warrior'),
    ('main', 8, 'planetpathfinder', 1, 10232, 'Planet Pathfinder'),
    ('main', 9, 'rescuerabbit', 1, 9755, 'Rescue Rabbit'),
    ('main', 10, 'acellbreedingdevice', 2, 7128, '"A" Cell Breeding Device'),
    ('main', 11, 'codeaancientruins', 3, 8146, 'Code A Ancient Ruins'),
    ('main', 12, 'mysterioustriangle', 3, 8057, 'Mysterious Triangle'),
    ('main', 13, 'otherworldtheazone', 2, 7129, 'Otherworld - The "A" Zone'),
    ('main', 14, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 15, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 16, 'alienbrain', 1, 8686, 'Alien Brain'),
    ('main', 17, 'offeringtothesnakedeity', 3, 7476, 'Offering to the Snake Deity'),
    ('extra', 18, 'cosmicfortressgolgar', 3, 8039, 'Cosmic Fortress Gol''gar'),
    ('extra', 19, 'kingoftheferalimps', 3, 10537, 'King of the Feral Imps')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'quinton-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Reginald Kastle (Shark) / A — Fish (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'reginald-kastle-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bigjaws', 3, 9622, 'Big Jaws'),
    ('main', 2, 'doubleshark', 2, 10369, 'Double Shark'),
    ('main', 3, 'drillbarnacle', 1, 9624, 'Drill Barnacle'),
    ('main', 4, 'frillerrabca', 3, 9726, 'Friller Rabca'),
    ('main', 5, 'hammershark', 2, 10031, 'Hammer Shark'),
    ('main', 6, 'hyperancientsharkmegalodon', 1, 10371, 'Hyper-Ancient Shark Megalodon'),
    ('main', 7, 'jawsman', 1, 9625, 'Jawsman'),
    ('main', 8, 'needlesunfish', 3, 9728, 'Needle Sunfish'),
    ('main', 9, 'sharkstickers', 3, 9727, 'Shark Stickers'),
    ('main', 10, 'skullkraken', 1, 9623, 'Skull Kraken'),
    ('main', 11, 'aquajet', 2, 9665, 'Aqua Jet'),
    ('main', 12, 'differentdimensiondeepseatrench', 1, 10274, 'Different Dimension Deepsea Trench'),
    ('main', 13, 'fishandkicks', 1, 9672, 'Fish and Kicks'),
    ('main', 14, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'salvage', 2, 5908, 'Salvage'),
    ('main', 16, 'surface', 2, 9666, 'Surface'),
    ('main', 17, 'bubblebringer', 3, 10289, 'Bubble Bringer'),
    ('main', 18, 'fishdepthcharge', 2, 7768, 'Fish Depth Charge'),
    ('main', 19, 'forgottentempleofthedeep', 1, 8687, 'Forgotten Temple of the Deep'),
    ('main', 20, 'ohfsh', 1, 9686, 'Oh F!sh!'),
    ('main', 21, 'splashcapture', 1, 9941, 'Splash Capture'),
    ('main', 22, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 23, 'blackraylancer', 2, 9758, 'Black Ray Lancer'),
    ('extra', 24, 'submersiblecarrieraeroshark', 2, 9657, 'Submersible Carrier Aero Shark')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'reginald-kastle-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Reginald Kastle (Shark) / B — Shark (29 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'reginald-kastle-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'eagleshark', 3, 10492, 'Eagle Shark'),
    ('main', 2, 'frillerrabca', 3, 9726, 'Friller Rabca'),
    ('main', 3, 'hammershark', 3, 10031, 'Hammer Shark'),
    ('main', 4, 'panthershark', 3, 10491, 'Panther Shark'),
    ('main', 5, 'sharkstickers', 3, 9727, 'Shark Stickers'),
    ('main', 6, 'shocktopus', 2, 9880, 'Shocktopus'),
    ('main', 7, 'spearshark', 2, 10368, 'Spear Shark'),
    ('main', 8, 'xyzremora', 2, 10370, 'Xyz Remora'),
    ('main', 9, 'aquajet', 2, 9665, 'Aqua Jet'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'levellimitareab', 2, 6054, 'Level Limit - Area B'),
    ('main', 12, 'salvage', 1, 5908, 'Salvage'),
    ('main', 13, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 14, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 15, 'darkbribe', 1, 7349, 'Dark Bribe'),
    ('main', 16, 'eisbahn', 2, 9797, 'Eisbahn'),
    ('main', 17, 'fishdepthcharge', 1, 7768, 'Fish Depth Charge'),
    ('main', 18, 'malevolentcatastrophe', 1, 5493, 'Malevolent Catastrophe'),
    ('main', 19, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 20, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 21, 'splashcapture', 1, 9941, 'Splash Capture'),
    ('main', 22, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 23, 'bahamutshark', 3, 10332, 'Bahamut Shark'),
    ('extra', 24, 'number17leviathandragon', 2, 9656, 'Number 17: Leviathan Dragon'),
    ('extra', 25, 'number19freezadon', 1, 9854, 'Number 19: Freezadon'),
    ('extra', 26, 'number32sharkdrake', 1, 10065, 'Number 32: Shark Drake'),
    ('extra', 27, 'numberc32sharkdrakeveiss', 1, 10261, 'Number C32: Shark Drake Veiss'),
    ('extra', 28, 'sharkcaesar', 1, 10652, 'Shark Caesar'),
    ('extra', 29, 'sharkfortress', 1, 10529, 'Shark Fortress')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'reginald-kastle-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Rio Kastle / A — Penguin (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'rio-kastle-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'aurorawing', 3, 10494, 'Aurora Wing'),
    ('main', 2, 'blackwingsiroccothedawn', 1, 8013, 'Blackwing - Sirocco the Dawn'),
    ('main', 3, 'blizzardfalcon', 3, 10493, 'Blizzard Falcon'),
    ('main', 4, 'flyingpenguin', 3, 4367, 'Flying Penguin'),
    ('main', 5, 'mothergrizzly', 3, 4926, 'Mother Grizzly'),
    ('main', 6, 'nightmarepenguin', 2, 5803, 'Nightmare Penguin'),
    ('main', 7, 'penguinknight', 3, 4205, 'Penguin Knight'),
    ('main', 8, 'penguinsoldier', 3, 4608, 'Penguin Soldier'),
    ('main', 9, 'punypenguin', 2, 10259, 'Puny Penguin'),
    ('main', 10, 'ragingeria', 2, 6700, 'Raging Eria'),
    ('main', 11, 'rescuerabbit', 1, 9755, 'Rescue Rabbit'),
    ('main', 12, 'thegreatemperorpenguin', 3, 9654, 'The Great Emperor Penguin'),
    ('main', 13, 'lemuriatheforgottencity', 3, 10279, 'Lemuria, the Forgotten City'),
    ('main', 14, 'salvage', 2, 5908, 'Salvage'),
    ('main', 15, 'terraforming', 3, 5537, 'Terraforming'),
    ('main', 16, 'waterhazard', 2, 8346, 'Water Hazard'),
    ('main', 17, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('extra', 18, 'abyssdweller', 1, 10354, 'Abyss Dweller'),
    ('extra', 19, 'icebeastzerofyne', 2, 10530, 'Ice Beast Zerofyne'),
    ('extra', 20, 'iceprincesszereort', 2, 10655, 'Ice Princess Zereort'),
    ('extra', 21, 'mermailabyssgaios', 1, 10268, 'Mermail Abyssgaios')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'rio-kastle-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Rio Kastle / B — Gishki (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'rio-kastle-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gishkiabyss', 3, 9158, 'Gishki Abyss'),
    ('main', 2, 'gishkiariel', 3, 9162, 'Gishki Ariel'),
    ('main', 3, 'gishkibeast', 3, 9443, 'Gishki Beast'),
    ('main', 4, 'gishkishadow', 3, 9163, 'Gishki Shadow'),
    ('main', 5, 'gishkivision', 3, 9591, 'Gishki Vision'),
    ('main', 6, 'evigishkigustkraken', 1, 9597, 'Evigishki Gustkraken'),
    ('main', 7, 'evigishkilevianima', 1, 9819, 'Evigishki Levianima'),
    ('main', 8, 'evigishkimindaugus', 1, 9178, 'Evigishki Mind Augus'),
    ('main', 9, 'evigishkisoulogre', 1, 9179, 'Evigishki Soul Ogre'),
    ('main', 10, 'gishkizielgigas', 2, 9999, 'Gishki Zielgigas'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'gishkiaquamirror', 3, 9182, 'Gishki Aquamirror'),
    ('main', 13, 'lightningvortex', 1, 5217, 'Lightning Vortex'),
    ('main', 14, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'preparationofrites', 3, 8492, 'Preparation of Rites'),
    ('main', 16, 'salvage', 3, 5908, 'Salvage'),
    ('main', 17, 'surface', 2, 9666, 'Surface'),
    ('main', 18, 'royaldecree', 2, 4866, 'Royal Decree'),
    ('main', 19, 'gishkichain', 2, 9161, 'Gishki Chain'),
    ('extra', 20, 'abyssdweller', 3, 10354, 'Abyss Dweller'),
    ('extra', 21, 'evigishkimerrowgeist', 2, 9604, 'Evigishki Merrowgeist'),
    ('extra', 22, 'gachigachigantetsu', 2, 9576, 'Gachi Gachi Gantetsu')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'rio-kastle-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Tori Meadows / A — Cheer Girl (36 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tori-meadows-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'mysticalshineball', 3, 5949, 'Mystical Shine Ball'),
    ('main', 2, 'archlordkristya', 2, 8283, 'Archlord Kristya'),
    ('main', 3, 'athena', 2, 7571, 'Athena'),
    ('main', 4, 'blackwinggalethewhirlwind', 1, 8011, 'Blackwing - Gale the Whirlwind'),
    ('main', 5, 'freyaspiritofvictory', 3, 7049, 'Freya, Spirit of Victory'),
    ('main', 6, 'heraldoforangelight', 1, 7673, 'Herald of Orange Light'),
    ('main', 7, 'littlefairy', 1, 10487, 'Little Fairy'),
    ('main', 8, 'masterhyperion', 3, 9287, 'Master Hyperion'),
    ('main', 9, 'novasummoner', 3, 7050, 'Nova Summoner'),
    ('main', 10, 'shiningangel', 1, 4924, 'Shining Angel'),
    ('main', 11, 'tethysgoddessoflight', 2, 7560, 'Tethys, Goddess of Light'),
    ('main', 12, 'theagentofcreationvenus', 3, 5953, 'The Agent of Creation - Venus'),
    ('main', 13, 'theagentofmiraclesjupiter', 2, 9289, 'The Agent of Miracles - Jupiter'),
    ('main', 14, 'theagentofmysteryearth', 1, 9288, 'The Agent of Mystery - Earth'),
    ('main', 15, 'courtofjustice', 3, 8276, 'Court of Justice'),
    ('main', 16, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 17, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 18, 'oneforone', 1, 8197, 'One for One'),
    ('main', 19, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 20, 'rankupmagicbariansforce', 1, 10541, 'Rank-Up-Magic Barian''s Force'),
    ('main', 21, 'icarusattack', 2, 6709, 'Icarus Attack'),
    ('extra', 22, 'cxyzdarkfairycheergirl', 1, 10528, 'CXyz Dark Fairy Cheer Girl'),
    ('extra', 23, 'constellarhyades', 1, 9823, 'Constellar Hyades'),
    ('extra', 24, 'constellaromega', 1, 10013, 'Constellar Omega'),
    ('extra', 25, 'constellarpleiades', 1, 9824, 'Constellar Pleiades'),
    ('extra', 26, 'constellarptolemym7', 1, 10004, 'Constellar Ptolemy M7'),
    ('extra', 27, 'daigustophoenix', 1, 9605, 'Daigusto Phoenix'),
    ('extra', 28, 'diamonddirewolf', 1, 10410, 'Diamond Dire Wolf'),
    ('extra', 29, 'fairycheergirl', 1, 10527, 'Fairy Cheer Girl'),
    ('extra', 30, 'gachigachigantetsu', 1, 9576, 'Gachi Gachi Gantetsu'),
    ('extra', 31, 'heraldofpurelight', 1, 10661, 'Herald of Pure Light'),
    ('extra', 32, 'hieraticsundragonoverlordofheliopolis', 1, 10071, 'Hieratic Sun Dragon Overlord of Heliopolis'),
    ('extra', 33, 'number49fortunetune', 1, 10703, 'Number 49: Fortune Tune'),
    ('extra', 34, 'vylondisigma', 1, 9603, 'Vylon Disigma'),
    ('extra', 35, 'armoredkappa', 1, 10466, 'Armored Kappa'),
    ('extra', 36, 'divinedragonknightfelgrand', 1, 10787, 'Divine Dragon Knight Felgrand')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tori-meadows-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Tori Meadows / B — The Agent (36 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tori-meadows-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'archlordkristya', 2, 8283, 'Archlord Kristya'),
    ('main', 2, 'masterhyperion', 3, 9287, 'Master Hyperion'),
    ('main', 3, 'athena', 2, 7571, 'Athena'),
    ('main', 4, 'tethysgoddessoflight', 2, 7560, 'Tethys, Goddess of Light'),
    ('main', 5, 'theagentofmiraclesjupiter', 2, 9289, 'The Agent of Miracles - Jupiter'),
    ('main', 6, 'novasummoner', 3, 7050, 'Nova Summoner'),
    ('main', 7, 'shiningangel', 1, 4924, 'Shining Angel'),
    ('main', 8, 'theagentofcreationvenus', 3, 5953, 'The Agent of Creation - Venus'),
    ('main', 9, 'blackwinggalethewhirlwind', 1, 8011, 'Blackwing - Gale the Whirlwind'),
    ('main', 10, 'littlefairy', 1, 10487, 'Little Fairy'),
    ('main', 11, 'mysticalshineball', 3, 5949, 'Mystical Shine Ball'),
    ('main', 12, 'theagentofmysteryearth', 1, 9288, 'The Agent of Mystery - Earth'),
    ('main', 13, 'heraldoforangelight', 1, 7673, 'Herald of Orange Light'),
    ('main', 14, 'freyaspiritofvictory', 3, 7049, 'Freya, Spirit of Victory'),
    ('main', 15, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 16, 'courtofjustice', 3, 8276, 'Court of Justice'),
    ('main', 17, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 18, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 19, 'rankupmagicbariansforce', 1, 10541, 'Rank-Up-Magic Barian''s Force'),
    ('main', 20, 'icarusattack', 2, 6709, 'Icarus Attack'),
    ('main', 21, 'oneforone', 1, 8197, 'One for One'),
    ('extra', 22, 'divinedragonknightfelgrand', 1, 10787, 'Divine Dragon Knight Felgrand'),
    ('extra', 23, 'hieraticsundragonoverlordofheliopolis', 1, 10071, 'Hieratic Sun Dragon Overlord of Heliopolis'),
    ('extra', 24, 'constellarptolemym7', 1, 10004, 'Constellar Ptolemy M7'),
    ('extra', 25, 'cxyzdarkfairycheergirl', 1, 10528, 'CXyz Dark Fairy Cheer Girl'),
    ('extra', 26, 'constellarpleiades', 1, 9824, 'Constellar Pleiades'),
    ('extra', 27, 'vylondisigma', 1, 9603, 'Vylon Disigma'),
    ('extra', 28, 'diamonddirewolf', 1, 10410, 'Diamond Dire Wolf'),
    ('extra', 29, 'constellaromega', 1, 10013, 'Constellar Omega'),
    ('extra', 30, 'fairycheergirl', 1, 10527, 'Fairy Cheer Girl'),
    ('extra', 31, 'constellarhyades', 1, 9823, 'Constellar Hyades'),
    ('extra', 32, 'number49fortunetune', 1, 10703, 'Number 49: Fortune Tune'),
    ('extra', 33, 'armoredkappa', 1, 10466, 'Armored Kappa'),
    ('extra', 34, 'gachigachigantetsu', 1, 9576, 'Gachi Gachi Gantetsu'),
    ('extra', 35, 'heraldofpurelight', 1, 10661, 'Herald of Pure Light'),
    ('extra', 36, 'daigustophoenix', 1, 9605, 'Daigusto Phoenix')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tori-meadows-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Trey / A — Stonehenge (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'trey-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'chronomalyaztecmaskgolem', 2, 10687, 'Chronomaly Aztec Mask Golem'),
    ('main', 2, 'chronomalycabreratrebuchet', 3, 10688, 'Chronomaly Cabrera Trebuchet'),
    ('main', 3, 'chronomalycolossalhead', 3, 10140, 'Chronomaly Colossal Head'),
    ('main', 4, 'chronomalycrystalbones', 2, 10142, 'Chronomaly Crystal Bones'),
    ('main', 5, 'chronomalycrystalskull', 3, 10143, 'Chronomaly Crystal Skull'),
    ('main', 6, 'chronomalymoai', 2, 10144, 'Chronomaly Moai'),
    ('main', 7, 'chronomalymudgolem', 2, 10689, 'Chronomaly Mud Golem'),
    ('main', 8, 'chronomalysolmonolith', 2, 10690, 'Chronomaly Sol Monolith'),
    ('main', 9, 'chronomalygoldenjet', 2, 10141, 'Chronomaly Golden Jet'),
    ('main', 10, 'chronomalymayanmachine', 1, 10139, 'Chronomaly Mayan Machine'),
    ('main', 11, 'chronomalypyramideyetablet', 1, 10185, 'Chronomaly Pyramid Eye Tablet'),
    ('main', 12, 'chronomalytechnology', 2, 10184, 'Chronomaly Technology'),
    ('main', 13, 'miniguts', 2, 10075, 'Mini-Guts'),
    ('main', 14, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 16, 'numberwall', 2, 10727, 'Number Wall'),
    ('main', 17, 'stonehengemethods', 3, 10199, 'Stonehenge Methods'),
    ('main', 18, 'xyzreborn', 1, 9950, 'Xyz Reborn'),
    ('main', 19, 'shadowspell', 2, 4675, 'Shadow Spell'),
    ('main', 20, 'fiendishchain', 2, 8675, 'Fiendish Chain'),
    ('extra', 21, 'number32sharkdrake', 1, 10065, 'Number 32: Shark Drake'),
    ('extra', 22, 'number33chronomalymachumech', 2, 10173, 'Number 33: Chronomaly Machu Mech'),
    ('extra', 23, 'number6chronomalyatlandis', 2, 10212, 'Number 6: Chronomaly Atlandis'),
    ('extra', 24, 'chronomalycrystalchrononaut', 2, 10172, 'Chronomaly Crystal Chrononaut')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'trey-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Trey / B — Chronomaly Tech (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'trey-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'chronomalyaztecmaskgolem', 3, 10687, 'Chronomaly Aztec Mask Golem'),
    ('main', 2, 'chronomalycabreratrebuchet', 2, 10688, 'Chronomaly Cabrera Trebuchet'),
    ('main', 3, 'chronomalycrystalbones', 3, 10142, 'Chronomaly Crystal Bones'),
    ('main', 4, 'chronomalycrystalskull', 3, 10143, 'Chronomaly Crystal Skull'),
    ('main', 5, 'chronomalygoldenjet', 3, 10141, 'Chronomaly Golden Jet'),
    ('main', 6, 'chronomalymoai', 3, 10144, 'Chronomaly Moai'),
    ('main', 7, 'chronomalysolmonolith', 3, 10690, 'Chronomaly Sol Monolith'),
    ('main', 8, 'cyberdragon', 1, 6390, 'Cyber Dragon'),
    ('main', 9, 'chronomalypyramideyetablet', 3, 10185, 'Chronomaly Pyramid Eye Tablet'),
    ('main', 10, 'chronomalytechnology', 2, 10184, 'Chronomaly Technology'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 14, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 15, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 16, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 17, 'stonehengemethods', 3, 10199, 'Stonehenge Methods'),
    ('main', 18, 'xyzreborn', 1, 9950, 'Xyz Reborn'),
    ('extra', 19, 'adreuskeeperofarmageddon', 1, 9846, 'Adreus, Keeper of Armageddon'),
    ('extra', 20, 'chronomalycrystalchrononaut', 2, 10172, 'Chronomaly Crystal Chrononaut'),
    ('extra', 21, 'constellarptolemym7', 1, 10004, 'Constellar Ptolemy M7'),
    ('extra', 22, 'gaiadragonthethundercharger', 1, 10069, 'Gaia Dragon, the Thunder Charger'),
    ('extra', 23, 'inzektorexabeetle', 1, 9920, 'Inzektor Exa-Beetle'),
    ('extra', 24, 'leviairtheseadragon', 1, 9660, 'Leviair the Sea Dragon'),
    ('extra', 25, 'number33chronomalymachumech', 2, 10173, 'Number 33: Chronomaly Machu Mech'),
    ('extra', 26, 'number6chronomalyatlandis', 2, 10212, 'Number 6: Chronomaly Atlandis'),
    ('extra', 27, 'tiraskeeperofgenesis', 1, 9661, 'Tiras, Keeper of Genesis'),
    ('extra', 28, 'winduparsenalzenmaioh', 1, 9873, 'Wind-Up Arsenal Zenmaioh')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'trey-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Vector / A — Umbral Horror (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'vector-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'umbralhorrorunform', 3, 10616, 'Umbral Horror Unform'),
    ('main', 2, 'umbralhorrorghoul', 3, 10615, 'Umbral Horror Ghoul'),
    ('main', 3, 'maskedchameleon', 2, 10641, 'Masked Chameleon'),
    ('main', 4, 'armageddonknight', 3, 7423, 'Armageddon Knight'),
    ('main', 5, 'summonermonk', 2, 6400, 'Summoner Monk'),
    ('main', 6, 'archfiendcavalry', 3, 10633, 'Archfiend Cavalry'),
    ('main', 7, 'trancearchfiend', 3, 9909, 'Trance Archfiend'),
    ('main', 8, 'blackwingzephyrostheelite', 1, 9244, 'Blackwing - Zephyros the Elite'),
    ('main', 9, 'umbralhorrorwillothewisp', 3, 10617, 'Umbral Horror Will o'' the Wisp'),
    ('main', 10, 'sargassotheddbattlefield', 3, 10664, 'Sargasso the D.D. Battlefield'),
    ('main', 11, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 12, 'sargassolighthouse', 3, 10665, 'Sargasso Lighthouse'),
    ('main', 13, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 14, 'rankupmagicbariansforce', 3, 10541, 'Rank-Up-Magic Barian''s Force'),
    ('main', 15, 'vainbetrayer', 3, 10676, 'Vain Betrayer'),
    ('main', 16, 'corruptedkeys', 3, 10675, 'Corrupted Keys'),
    ('extra', 17, 'numberc104umbralhorrormasquerade', 3, 10659, 'Number C104: Umbral Horror Masquerade'),
    ('extra', 18, 'kingoftheferalimps', 1, 10537, 'King of the Feral Imps'),
    ('extra', 19, 'number66masterkeybeetle', 3, 10657, 'Number 66: Master Key Beetle'),
    ('extra', 20, 'number104masquerade', 3, 10658, 'Number 104: Masquerade')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'vector-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Vector / B — Evil Infestation (26 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'vector-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'evilswarmheliotrope', 3, 9813, 'Evilswarm Heliotrope'),
    ('main', 2, 'darkarmeddragon', 1, 7421, 'Dark Armed Dragon'),
    ('main', 3, 'evilswarmcastor', 3, 9990, 'Evilswarm Castor'),
    ('main', 4, 'evilswarmkerykeion', 3, 10441, 'Evilswarm Kerykeion'),
    ('main', 5, 'evilswarmmandragora', 3, 9817, 'Evilswarm Mandragora'),
    ('main', 6, 'evilswarmolantern', 1, 9816, 'Evilswarm O''lantern'),
    ('main', 7, 'evilswarmsalamandra', 1, 9994, 'Evilswarm Salamandra'),
    ('main', 8, 'evilswarmthunderbird', 3, 9993, 'Evilswarm Thunderbird'),
    ('main', 9, 'rescuerabbit', 1, 9755, 'Rescue Rabbit'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'forbiddendress', 2, 10284, 'Forbidden Dress'),
    ('main', 12, 'infestationpandemic', 3, 10010, 'Infestation Pandemic'),
    ('main', 13, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 15, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 16, 'breakthroughskill', 2, 10437, 'Breakthrough Skill'),
    ('main', 17, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 18, 'fiendishchain', 3, 8675, 'Fiendish Chain'),
    ('main', 19, 'infestationinfection', 1, 9832, 'Infestation Infection'),
    ('main', 20, 'safezone', 2, 9549, 'Safe Zone'),
    ('main', 21, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 22, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 23, 'evilswarmbahamut', 3, 9826, 'Evilswarm Bahamut'),
    ('extra', 24, 'evilswarmophion', 3, 10006, 'Evilswarm Ophion'),
    ('extra', 25, 'evilswarmouroboros', 2, 10007, 'Evilswarm Ouroboros'),
    ('extra', 26, 'number66masterkeybeetle', 2, 10657, 'Number 66: Master Key Beetle')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'vector-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Vetrix / A — Heraldic Beast (26 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'vetrix-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'heraldicbeastaberconway', 3, 10234, 'Heraldic Beast Aberconway'),
    ('main', 2, 'heraldicbeastbasilisk', 3, 10372, 'Heraldic Beast Basilisk'),
    ('main', 3, 'heraldicbeasteale', 3, 10373, 'Heraldic Beast Eale'),
    ('main', 4, 'heraldicbeastleo', 2, 10376, 'Heraldic Beast Leo'),
    ('main', 5, 'heraldicbeasttwinheadedeagle', 3, 10374, 'Heraldic Beast Twin-Headed Eagle'),
    ('main', 6, 'heraldicbeastunicorn', 3, 10375, 'Heraldic Beast Unicorn'),
    ('main', 7, 'summonermonk', 2, 6400, 'Summoner Monk'),
    ('main', 8, 'advancedheraldryart', 3, 10277, 'Advanced Heraldry Art'),
    ('main', 9, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 12, 'heraldryreborn', 3, 10416, 'Heraldry Reborn'),
    ('main', 13, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 15, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 16, 'heraldrychange', 2, 10429, 'Heraldry Change'),
    ('main', 17, 'heraldryrecord', 2, 10728, 'Heraldry Record'),
    ('main', 18, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('main', 19, 'traphole', 1, 4836, 'Trap Hole'),
    ('main', 20, 'voidtraphole', 1, 10206, 'Void Trap Hole'),
    ('main', 21, 'wallofrevealinglight', 1, 5990, 'Wall of Revealing Light'),
    ('extra', 22, 'constellarptolemym7', 1, 10004, 'Constellar Ptolemy M7'),
    ('extra', 23, 'gaiadragonthethundercharger', 1, 10069, 'Gaia Dragon, the Thunder Charger'),
    ('extra', 24, 'number69heraldrycrest', 1, 10323, 'Number 69: Heraldry Crest'),
    ('extra', 25, 'number8heraldickinggenomheritage', 1, 10267, 'Number 8: Heraldic King Genom-Heritage'),
    ('extra', 26, 'number10illumiknight', 1, 9759, 'Number 10: Illumiknight')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'vetrix-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Vetrix / B — Gladiator Beast (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'vetrix-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gladiatorbeastandal', 3, 7365, 'Gladiator Beast Andal'),
    ('main', 2, 'gladiatorbeastbestiari', 1, 7285, 'Gladiator Beast Bestiari'),
    ('main', 3, 'gladiatorbeastdarius', 2, 7432, 'Gladiator Beast Darius'),
    ('main', 4, 'gladiatorbeastequeste', 2, 7722, 'Gladiator Beast Equeste'),
    ('main', 5, 'gladiatorbeasthoplomus', 2, 7287, 'Gladiator Beast Hoplomus'),
    ('main', 6, 'gladiatorbeastlaquari', 2, 7286, 'Gladiator Beast Laquari'),
    ('main', 7, 'gladiatorbeastmurmillo', 1, 7284, 'Gladiator Beast Murmillo'),
    ('main', 8, 'gladiatorbeastretiari', 1, 8083, 'Gladiator Beast Retiari'),
    ('main', 9, 'gladiatorbeastspartacus', 1, 7283, 'Gladiator Beast Spartacus'),
    ('main', 10, 'rescuerabbit', 1, 9755, 'Rescue Rabbit'),
    ('main', 11, 'testtiger', 1, 7482, 'Test Tiger'),
    ('main', 12, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 13, 'forbiddenlance', 3, 9352, 'Forbidden Lance'),
    ('main', 14, 'gladiatorbeastsbattlearchfiendshield', 1, 7459, 'Gladiator Beast''s Battle Archfiend Shield'),
    ('main', 15, 'gladiatorprovingground', 3, 7460, 'Gladiator Proving Ground'),
    ('main', 16, 'shrink', 3, 5355, 'Shrink'),
    ('main', 17, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 18, 'dimensionalprison', 3, 7400, 'Dimensional Prison'),
    ('main', 19, 'hornofthephantombeast', 1, 9006, 'Horn of the Phantom Beast'),
    ('main', 20, 'gladiatorbeastwarchariot', 3, 7763, 'Gladiator Beast War Chariot'),
    ('main', 21, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 22, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('extra', 23, 'gladiatorbeastessedarii', 3, 9704, 'Gladiator Beast Essedarii'),
    ('extra', 24, 'gladiatorbeastgaiodiaz', 3, 7302, 'Gladiator Beast Gaiodiaz'),
    ('extra', 25, 'gladiatorbeastgyzarus', 3, 7617, 'Gladiator Beast Gyzarus'),
    ('extra', 26, 'gladiatorbeastheraklinos', 3, 7303, 'Gladiator Beast Heraklinos'),
    ('extra', 27, 'gemknightpearl', 1, 9601, 'Gem-Knight Pearl'),
    ('extra', 28, 'maestrokethesymphonydjinn', 1, 10128, 'Maestroke the Symphony Djinn')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'vetrix-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yuma Tsukumo / A — Gagaga (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yuma-tsukumo-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'achachaarcher', 1, 9620, 'Achacha Archer'),
    ('main', 2, 'gagagacaesar', 3, 10223, 'Gagaga Caesar'),
    ('main', 3, 'gagagachild', 3, 10564, 'Gagaga Child'),
    ('main', 4, 'gagagagardna', 3, 10028, 'Gagaga Gardna'),
    ('main', 5, 'gagagagirl', 3, 9877, 'Gagaga Girl'),
    ('main', 6, 'gagagamagician', 3, 9618, 'Gagaga Magician'),
    ('main', 7, 'goblindbergh', 2, 9621, 'Goblindbergh'),
    ('main', 8, 'gogogoghost', 2, 10361, 'Gogogo Ghost'),
    ('main', 9, 'gogogogiant', 2, 9878, 'Gogogo Giant'),
    ('main', 10, 'gogogogolem', 3, 9619, 'Gogogo Golem'),
    ('main', 11, 'zubababuster', 2, 9960, 'Zubaba Buster'),
    ('main', 12, 'zubabaknight', 3, 9563, 'Zubaba Knight'),
    ('main', 13, 'gagagaback', 1, 9855, 'Gagagaback'),
    ('main', 14, 'gagagabolt', 1, 9922, 'Gagagabolt'),
    ('main', 15, 'gagagadraw', 1, 10414, 'Gagagadraw'),
    ('main', 16, 'gagagarevenge', 1, 10181, 'Gagagarevenge'),
    ('main', 17, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 18, 'gagagaguard', 1, 9939, 'Gagagaguard'),
    ('main', 19, 'gagagarush', 1, 10197, 'Gagagarush'),
    ('main', 20, 'gagagashield', 1, 9856, 'Gagagashield'),
    ('main', 21, 'pinpointguard', 1, 10550, 'Pinpoint Guard'),
    ('main', 22, 'utopianaura', 1, 9691, 'Utopian Aura'),
    ('extra', 23, 'gagagacowboy', 2, 10263, 'Gagaga Cowboy'),
    ('extra', 24, 'gagagigotherisen', 1, 10272, 'Gagagigo the Risen'),
    ('extra', 25, 'number17leviathandragon', 1, 9656, 'Number 17: Leviathan Dragon'),
    ('extra', 26, 'number34terrorbyte', 1, 9658, 'Number 34: Terror-Byte'),
    ('extra', 27, 'number39utopia', 1, 9575, 'Number 39: Utopia')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yuma-tsukumo-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yuma Tsukumo / B — Utopia (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yuma-tsukumo-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'armageddonknight', 1, 7423, 'Armageddon Knight'),
    ('main', 2, 'cyberdragon', 3, 6390, 'Cyber Dragon'),
    ('main', 3, 'gagagagirl', 3, 9877, 'Gagaga Girl'),
    ('main', 4, 'gagagamagician', 3, 9618, 'Gagaga Magician'),
    ('main', 5, 'goblindbergh', 3, 9621, 'Goblindbergh'),
    ('main', 6, 'gogogogiant', 3, 9878, 'Gogogo Giant'),
    ('main', 7, 'gogogogolem', 3, 9619, 'Gogogo Golem'),
    ('main', 8, 'mystictomato', 1, 4930, 'Mystic Tomato'),
    ('main', 9, 'photonslasher', 1, 10335, 'Photon Slasher'),
    ('main', 10, 'stardrawing', 1, 10402, 'Star Drawing'),
    ('main', 11, 'summonermonk', 2, 6400, 'Summoner Monk'),
    ('main', 12, 'zweagleclaw', 2, 10571, 'ZW - Eagle Claw'),
    ('main', 13, 'zwlightningblade', 2, 10364, 'ZW - Lightning Blade'),
    ('main', 14, 'zwtornadobringer', 1, 10365, 'ZW - Tornado Bringer'),
    ('main', 15, 'assaultarmor', 1, 7494, 'Assault Armor'),
    ('main', 16, 'gagagarevenge', 3, 10181, 'Gagagarevenge'),
    ('main', 17, 'rankupmagicnumeronforce', 2, 10662, 'Rank-Up-Magic Numeron Force'),
    ('main', 18, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 19, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 20, 'xyzeffect', 1, 9574, 'Xyz Effect'),
    ('main', 21, 'xyzreborn', 1, 9950, 'Xyz Reborn'),
    ('extra', 22, 'gauntletlauncher', 1, 10526, 'Gauntlet Launcher'),
    ('extra', 23, 'number11bigeye', 1, 9861, 'Number 11: Big Eye'),
    ('extra', 24, 'number39utopia', 3, 9575, 'Number 39: Utopia'),
    ('extra', 25, 'number50blackshipofcorn', 1, 10129, 'Number 50: Blackship of Corn'),
    ('extra', 26, 'numberc39utopiarayvictory', 2, 10651, 'Number C39: Utopia Ray Victory'),
    ('extra', 27, 'zwleoarms', 2, 10406, 'ZW - Leo Arms')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yuma-tsukumo-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Allie / A — Aquaactress (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'allie-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'enchantingmermaid', 1, 4257, 'Enchanting Mermaid'),
    ('main', 2, 'aquaactressarowana', 1, 11918, 'Aquaactress Arowana'),
    ('main', 3, 'aquaactressguppy', 3, 11917, 'Aquaactress Guppy'),
    ('main', 4, 'aquaactresstetra', 3, 11916, 'Aquaactress Tetra'),
    ('main', 5, 'beautunafulprincess', 3, 11065, 'Beautunaful Princess'),
    ('main', 6, 'deepseamacrotrema', 3, 7564, 'Deepsea Macrotrema'),
    ('main', 7, 'starboy', 3, 4530, 'Star Boy'),
    ('main', 8, 'aquariumlighting', 1, 11921, 'Aquarium Lighting'),
    ('main', 9, 'aquariumset', 1, 11920, 'Aquarium Set'),
    ('main', 10, 'aquariumstage', 1, 11919, 'Aquarium Stage'),
    ('main', 11, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 12, 'guardedtreasure', 2, 11158, 'Guarded Treasure'),
    ('main', 13, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'oneforone', 1, 8197, 'One for One'),
    ('main', 15, 'surface', 3, 9666, 'Surface'),
    ('main', 16, 'umi', 2, 4340, 'Umi'),
    ('main', 17, 'waterhazard', 1, 8346, 'Water Hazard'),
    ('main', 18, 'wetlands', 1, 7627, 'Wetlands'),
    ('main', 19, 'aquastoryurashima', 1, 11922, 'Aqua Story - Urashima'),
    ('main', 20, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 21, 'pinpointguard', 3, 10550, 'Pinpoint Guard'),
    ('main', 22, 'torrentialtribute', 1, 5114, 'Torrential Tribute')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'allie-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Allie / B — Nekroz (34 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'allie-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'danceprincessofthenekroz', 3, 11548, 'Dance Princess of the Nekroz'),
    ('main', 2, 'djinnpresiderofrituals', 1, 8473, 'Djinn Presider of Rituals'),
    ('main', 3, 'exaenforcerofthenekroz', 1, 11482, 'Exa, Enforcer of the Nekroz'),
    ('main', 4, 'greatsorcererofthenekroz', 3, 11481, 'Great Sorcerer of the Nekroz'),
    ('main', 5, 'manjuofthetenthousandhands', 3, 5900, 'Manju of the Ten Thousand Hands'),
    ('main', 6, 'senjuofthethousandhands', 3, 4916, 'Senju of the Thousand Hands'),
    ('main', 7, 'nekrozofbrionac', 1, 11484, 'Nekroz of Brionac'),
    ('main', 8, 'nekrozofcatastor', 1, 11488, 'Nekroz of Catastor'),
    ('main', 9, 'nekrozofclausolas', 3, 11483, 'Nekroz of Clausolas'),
    ('main', 10, 'nekrozofdecisivearmor', 1, 11489, 'Nekroz of Decisive Armor'),
    ('main', 11, 'nekrozofgungnir', 1, 11564, 'Nekroz of Gungnir'),
    ('main', 12, 'nekrozoftrishula', 2, 11485, 'Nekroz of Trishula'),
    ('main', 13, 'nekrozofunicore', 1, 11486, 'Nekroz of Unicore'),
    ('main', 14, 'nekrozofvalkyrus', 3, 11487, 'Nekroz of Valkyrus'),
    ('main', 15, 'nekrozcycle', 1, 11580, 'Nekroz Cycle'),
    ('main', 16, 'nekrozkaleidoscope', 3, 11491, 'Nekroz Kaleidoscope'),
    ('main', 17, 'nekrozmirror', 3, 11490, 'Nekroz Mirror'),
    ('main', 18, 'preparationofrites', 1, 8492, 'Preparation of Rites'),
    ('main', 19, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 20, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 21, 'twintwisters', 1, 12175, 'Twin Twisters'),
    ('main', 22, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 23, 'breakthroughskill', 1, 10437, 'Breakthrough Skill'),
    ('extra', 24, 'allyofjusticecatastor', 1, 7552, 'Ally of Justice Catastor'),
    ('extra', 25, 'allyofjusticedecisivearmor', 2, 8417, 'Ally of Justice Decisive Armor'),
    ('extra', 26, 'dewlorentigerkingoftheicebarrier', 1, 7970, 'Dewloren, Tiger King of the Ice Barrier'),
    ('extra', 27, 'fabledvalkyrus', 1, 8117, 'Fabled Valkyrus'),
    ('extra', 28, 'gungnirdragonoftheicebarrier', 1, 8262, 'Gungnir, Dragon of the Ice Barrier'),
    ('extra', 29, 'heraldofthearclight', 2, 11384, 'Herald of the Arc Light'),
    ('extra', 30, 'shootingquasardragon', 2, 9709, 'Shooting Quasar Dragon'),
    ('extra', 31, 'stareater', 2, 10650, 'Star Eater'),
    ('extra', 32, 'thefabledunicore', 1, 8575, 'The Fabled Unicore'),
    ('extra', 33, 'trishuladragonoftheicebarrier', 1, 8732, 'Trishula, Dragon of the Ice Barrier'),
    ('extra', 34, 'casteltheskyblastermusketeer', 1, 11263, 'Castel, the Skyblaster Musketeer')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'allie-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Aura Sentia / A — Prediction Princess (17 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'aura-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'maneaterbug', 1, 4507, 'Man-Eater Bug'),
    ('main', 2, 'manjuofthetenthousandhands', 1, 5900, 'Manju of the Ten Thousand Hands'),
    ('main', 3, 'needleworm', 2, 4568, 'Needle Worm'),
    ('main', 4, 'potoftheforbidden', 1, 11984, 'Pot of The Forbidden'),
    ('main', 5, 'predictionprincessarrowsylph', 3, 11910, 'Prediction Princess Arrowsylph'),
    ('main', 6, 'predictionprincessastromorrigan', 3, 11909, 'Prediction Princess Astromorrigan'),
    ('main', 7, 'predictionprincesscoinorma', 3, 11907, 'Prediction Princess Coinorma'),
    ('main', 8, 'predictionprincesscrystaldine', 2, 11911, 'Prediction Princess Crystaldine'),
    ('main', 9, 'predictionprincesspetalelf', 3, 11908, 'Prediction Princess Petalelf'),
    ('main', 10, 'senjuofthethousandhands', 3, 4916, 'Senju of the Thousand Hands'),
    ('main', 11, 'spiritofthefallwind', 2, 12311, 'Spirit of the Fall Wind'),
    ('main', 12, 'predictionprincesstarotrei', 3, 11912, 'Prediction Princess Tarotrei'),
    ('main', 13, 'guardpenalty', 1, 6667, 'Guard Penalty'),
    ('main', 14, 'predictionritual', 3, 11913, 'Prediction Ritual'),
    ('main', 15, 'soulreversal', 3, 6050, 'Soul Reversal'),
    ('main', 16, 'blackcatastrophe', 3, 11914, 'Black Cat-astrophe'),
    ('main', 17, 'reversereuse', 3, 11915, 'Reverse Reuse')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'aura-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Aura Sentia / B — Shaddoll (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'aura-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'manjuofthetenthousandhands', 3, 5900, 'Manju of the Ten Thousand Hands'),
    ('main', 2, 'mathematician', 1, 11168, 'Mathematician'),
    ('main', 3, 'potoftheforbidden', 2, 11984, 'Pot of The Forbidden'),
    ('main', 4, 'predictionprincesscoinorma', 3, 11907, 'Prediction Princess Coinorma'),
    ('main', 5, 'shaddollbeast', 2, 11236, 'Shaddoll Beast'),
    ('main', 6, 'shaddolldragon', 2, 11235, 'Shaddoll Dragon'),
    ('main', 7, 'shaddollfalco', 3, 11232, 'Shaddoll Falco'),
    ('main', 8, 'shaddollhedgehog', 1, 11233, 'Shaddoll Hedgehog'),
    ('main', 9, 'shaddollsquamata', 2, 11234, 'Shaddoll Squamata'),
    ('main', 10, 'spiritofthefallwind', 2, 12311, 'Spirit of the Fall Wind'),
    ('main', 11, 'predictionprincesstarotrei', 3, 11912, 'Prediction Princess Tarotrei'),
    ('main', 12, 'elshaddollfusion', 1, 11396, 'El Shaddoll Fusion'),
    ('main', 13, 'prepreparationofrites', 3, 12337, 'Pre-Preparation of Rites'),
    ('main', 14, 'predictionritual', 3, 11913, 'Prediction Ritual'),
    ('main', 15, 'shaddollfusion', 3, 11268, 'Shaddoll Fusion'),
    ('main', 16, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 17, 'magicalhats', 1, 4962, 'Magical Hats'),
    ('main', 18, 'shaddollcore', 2, 11282, 'Shaddoll Core'),
    ('main', 19, 'sinistershadowgames', 1, 11281, 'Sinister Shadow Games'),
    ('main', 20, 'solemnstrike', 1, 12187, 'Solemn Strike'),
    ('extra', 21, 'elshaddollgrysta', 2, 11380, 'El Shaddoll Grysta'),
    ('extra', 22, 'elshaddollshekhinaga', 3, 11381, 'El Shaddoll Shekhinaga'),
    ('extra', 23, 'elshaddollwendigo', 2, 11567, 'El Shaddoll Wendigo'),
    ('extra', 24, 'elshaddollwinda', 3, 11257, 'El Shaddoll Winda'),
    ('extra', 25, 'armadeskeeperofboundaries', 2, 10648, 'Armades, Keeper of Boundaries'),
    ('extra', 26, 'gravitywarrior', 2, 9969, 'Gravity Warrior'),
    ('extra', 27, 'trishuladragonoftheicebarrier', 1, 8732, 'Trishula, Dragon of the Ice Barrier')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'aura-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Celina / A — Lunalight (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'celina-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'lunalightblacksheep', 3, 12283, 'Lunalight Black Sheep'),
    ('main', 2, 'lunalightbluecat', 3, 12280, 'Lunalight Blue Cat'),
    ('main', 3, 'lunalightpurplebutterfly', 3, 12281, 'Lunalight Purple Butterfly'),
    ('main', 4, 'lunalightwhiterabbit', 3, 12282, 'Lunalight White Rabbit'),
    ('main', 5, 'lunalighttiger', 3, 12285, 'Lunalight Tiger'),
    ('main', 6, 'lunalightwolf', 3, 12284, 'Lunalight Wolf'),
    ('main', 7, 'fireformationtenki', 3, 10418, 'Fire Formation - Tenki'),
    ('main', 8, 'fusionrecovery', 2, 6431, 'Fusion Recovery'),
    ('main', 9, 'fusionsage', 2, 4872, 'Fusion Sage'),
    ('main', 10, 'fusionsubstitute', 1, 11504, 'Fusion Substitute'),
    ('main', 11, 'fusiontag', 2, 12338, 'Fusion Tag'),
    ('main', 12, 'polymerization', 2, 4837, 'Polymerization'),
    ('main', 13, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 14, 'finalattackorders', 3, 5627, 'Final Attack Orders'),
    ('main', 15, 'hornofthephantombeast', 1, 9006, 'Horn of the Phantom Beast'),
    ('main', 16, 'lunalightreincarnationdance', 3, 12343, 'Lunalight Reincarnation Dance'),
    ('main', 17, 'ojamatrio', 1, 5738, 'Ojama Trio'),
    ('extra', 18, 'lunalightcatdancer', 3, 12318, 'Lunalight Cat Dancer'),
    ('extra', 19, 'lunalightleodancer', 3, 12320, 'Lunalight Leo Dancer'),
    ('extra', 20, 'lunalightpantherdancer', 3, 12319, 'Lunalight Panther Dancer')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'celina-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Celina / B — Kozmo (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'celina-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'kozmodarkdestroyer', 1, 12103, 'Kozmo Dark Destroyer'),
    ('main', 2, 'kozmodarkeclipser', 1, 12246, 'Kozmo Dark Eclipser'),
    ('main', 3, 'kozmodarkplanet', 1, 12388, 'Kozmo Dark Planet'),
    ('main', 4, 'kozmodogfighter', 1, 12102, 'Kozmo DOG Fighter'),
    ('main', 5, 'kozmofarmgirl', 3, 12033, 'Kozmo Farmgirl'),
    ('main', 6, 'kozmoforerunner', 3, 12036, 'Kozmo Forerunner'),
    ('main', 7, 'kozmogoodwitch', 1, 12034, 'Kozmo Goodwitch'),
    ('main', 8, 'kozmosliprider', 3, 12035, 'Kozmo Sliprider'),
    ('main', 9, 'kozmosoartroopers', 2, 12244, 'Kozmo Soartroopers'),
    ('main', 10, 'kozmostrawman', 1, 12100, 'Kozmo Strawman'),
    ('main', 11, 'kozmotincan', 3, 12243, 'Kozmo Tincan'),
    ('main', 12, 'kozmollwickedwitch', 3, 12101, 'Kozmoll Wickedwitch'),
    ('main', 13, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 14, 'emergencyteleport', 1, 7747, 'Emergency Teleport'),
    ('main', 15, 'kozmotown', 3, 12037, 'Kozmotown'),
    ('main', 16, 'psychicpath', 1, 8210, 'Psychic Path'),
    ('main', 17, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 18, 'soulcharge', 1, 11159, 'Soul Charge'),
    ('main', 19, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 20, 'twintwisters', 1, 12175, 'Twin Twisters'),
    ('main', 21, 'brainhazard', 1, 9543, 'Brain Hazard'),
    ('main', 22, 'kozmojo', 3, 12247, 'Kozmojo'),
    ('main', 23, 'kozmourning', 1, 12389, 'Kozmourning'),
    ('main', 24, 'solemnstrike', 1, 12187, 'Solemn Strike'),
    ('main', 25, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('extra', 26, 'cyberdragoninfinity', 3, 11765, 'Cyber Dragon Infinity'),
    ('extra', 27, 'cyberdragonnova', 3, 10870, 'Cyber Dragon Nova'),
    ('extra', 28, 'number11bigeye', 1, 9861, 'Number 11: Big Eye')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'celina-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Crow Hogan / A — Assault Blackwing (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'crow-hogan-arcv-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'assaultblackwingkunaithedrizzle', 3, 11962, 'Assault Blackwing - Kunai the Drizzle'),
    ('main', 2, 'blackwingborathespear', 3, 8012, 'Blackwing - Bora the Spear'),
    ('main', 3, 'blackwingdecaytheillwind', 3, 12289, 'Blackwing - Decay the Ill Wind'),
    ('main', 4, 'blackwinggalethewhirlwind', 2, 8011, 'Blackwing - Gale the Whirlwind'),
    ('main', 5, 'blackwingharmattanthedust', 3, 12122, 'Blackwing - Harmattan the Dust'),
    ('main', 6, 'blackwinghurricanethetornado', 3, 11174, 'Blackwing - Hurricane the Tornado'),
    ('main', 7, 'blackwingkristhecrackofdawn', 3, 9460, 'Blackwing - Kris the Crack of Dawn'),
    ('main', 8, 'blackwingoroshithesquall', 3, 11172, 'Blackwing - Oroshi the Squall'),
    ('main', 9, 'blackwingpinakithewaxingmoon', 3, 9459, 'Blackwing - Pinaki the Waxing Moon'),
    ('main', 10, 'blackwingsteamthecloak', 2, 11173, 'Blackwing - Steam the Cloak'),
    ('main', 11, 'blackwhirlwind', 2, 8203, 'Black Whirlwind'),
    ('main', 12, 'blackwingedstrafe', 1, 8820, 'Black-Winged Strafe'),
    ('main', 13, 'blackreturn', 1, 9246, 'Black Return'),
    ('main', 14, 'blackwingrevenge', 3, 11176, 'Black Wing Revenge'),
    ('main', 15, 'blackback', 2, 9142, 'Blackback'),
    ('main', 16, 'blackboost', 2, 9356, 'Blackboost'),
    ('main', 17, 'icarusattack', 1, 6709, 'Icarus Attack'),
    ('extra', 18, 'assaultblackwingchidoritherainsprinkling', 1, 12323, 'Assault Blackwing - Chidori the Rain Sprinkling'),
    ('extra', 19, 'assaultblackwingraikiritherainshower', 1, 11991, 'Assault Blackwing - Raikiri the Rain Shower'),
    ('extra', 20, 'blackfeatherdarkragedragon', 2, 11012, 'Blackfeather Darkrage Dragon'),
    ('extra', 21, 'blackwingnothungthestarlight', 3, 11649, 'Blackwing - Nothung the Starlight'),
    ('extra', 22, 'blackwingtamerobsidianhawkjoe', 1, 9463, 'Blackwing Tamer - Obsidian Hawk Joe'),
    ('extra', 23, 'vortexthewhirlwind', 3, 9449, 'Vortex the Whirlwind')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'crow-hogan-arcv-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Crow Hogan / B — Qliphort (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'crow-hogan-arcv-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'apoqliphortskybase', 1, 11543, 'Apoqliphort Skybase'),
    ('main', 2, 'qliphortmonolith', 3, 11540, 'Qliphort Monolith'),
    ('main', 3, 'qliphortscout', 1, 11353, 'Qliphort Scout'),
    ('main', 4, 'qliphortcarrier', 3, 11354, 'Qliphort Carrier'),
    ('main', 5, 'qliphortcephalopod', 3, 11541, 'Qliphort Cephalopod'),
    ('main', 6, 'qliphortdisk', 3, 11356, 'Qliphort Disk'),
    ('main', 7, 'qliphorthelix', 3, 11355, 'Qliphort Helix'),
    ('main', 8, 'qliphortshell', 3, 11357, 'Qliphort Shell'),
    ('main', 9, 'qliphortstealth', 3, 11542, 'Qliphort Stealth'),
    ('main', 10, 'galaxycyclone', 1, 11737, 'Galaxy Cyclone'),
    ('main', 11, 'laserqlip', 2, 11394, 'Laser Qlip'),
    ('main', 12, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'saqlifice', 1, 11393, 'Saqlifice'),
    ('main', 14, 'summonersart', 3, 7220, 'Summoner''s Art'),
    ('main', 15, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 16, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 17, 'qlimatechange', 1, 11405, 'Qlimate Change'),
    ('main', 18, 'qlipperlaunch', 2, 11406, 'Qlipper Launch'),
    ('main', 19, 'reqliate', 1, 11593, 'Re-qliate'),
    ('main', 20, 'skilldrain', 1, 5740, 'Skill Drain'),
    ('main', 21, 'solemnstrike', 1, 12187, 'Solemn Strike'),
    ('main', 22, 'solemnwarning', 1, 9008, 'Solemn Warning')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'crow-hogan-arcv-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Declan Akaba / A — DD Savant (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'declan-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ddberfomet', 3, 11954, 'D/D Berfomet'),
    ('main', 2, 'ddnecroslime', 3, 11956, 'D/D Necro Slime'),
    ('main', 3, 'ddswirlslime', 3, 11955, 'D/D Swirl Slime'),
    ('main', 4, 'evilheroinfernalgainer', 2, 7259, 'Evil HERO Infernal Gainer'),
    ('main', 5, 'juragedo', 2, 5636, 'Juragedo'),
    ('main', 6, 'ogreofthescarletsorrow', 2, 8616, 'Ogre of the Scarlet Sorrow'),
    ('main', 7, 'ddsavantgalilei', 1, 11441, 'D/D Savant Galilei'),
    ('main', 8, 'ddsavantkepler', 1, 11442, 'D/D Savant Kepler'),
    ('main', 9, 'dddoblivionkingabyssragnarok', 2, 11616, 'D/D/D Oblivion King Abyss Ragnarok'),
    ('main', 10, 'dddrebelkingleonidas', 3, 11460, 'D/D/D Rebel King Leonidas'),
    ('main', 11, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 12, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 13, 'darkcontractwiththegate', 2, 11446, 'Dark Contract with the Gate'),
    ('main', 14, 'darkcontractwiththeswampking', 2, 11447, 'Dark Contract with the Swamp King'),
    ('main', 15, 'emergencyprovisions', 2, 5350, 'Emergency Provisions'),
    ('main', 16, 'contractlaundering', 3, 11449, 'Contract Laundering'),
    ('main', 17, 'dddhumanresources', 2, 11450, 'D/D/D Human Resources'),
    ('main', 18, 'darkcontractwitherrors', 1, 12013, 'Dark Contract with Errors'),
    ('main', 19, 'darkcontractwiththewitch', 1, 11448, 'Dark Contract with the Witch'),
    ('main', 20, 'fiendgriefing', 2, 11751, 'Fiend Griefing'),
    ('main', 21, 'sinisteryorishiro', 1, 10880, 'Sinister Yorishiro'),
    ('extra', 22, 'dddoraclekingdarc', 2, 11830, 'D/D/D Oracle King d''Arc'),
    ('extra', 23, 'dddwavekingcaesar', 2, 11457, 'D/D/D Wave King Caesar')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'declan-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Declan Akaba / B — DDD King (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'declan-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ddberfomet', 3, 11954, 'D/D Berfomet'),
    ('main', 2, 'ddnecroslime', 3, 11956, 'D/D Necro Slime'),
    ('main', 3, 'ddpandora', 3, 11795, 'D/D Pandora'),
    ('main', 4, 'ddswirlslime', 3, 11955, 'D/D Swirl Slime'),
    ('main', 5, 'ddddragonkingpendragon', 1, 11769, 'D/D/D Dragon King Pendragon'),
    ('main', 6, 'ddsavantgalilei', 3, 11441, 'D/D Savant Galilei'),
    ('main', 7, 'ddsavantkepler', 3, 11442, 'D/D Savant Kepler'),
    ('main', 8, 'dddoblivionkingabyssragnarok', 3, 11616, 'D/D/D Oblivion King Abyss Ragnarok'),
    ('main', 9, 'dddrebelkingleonidas', 3, 11460, 'D/D/D Rebel King Leonidas'),
    ('main', 10, 'darkcontractwiththegate', 3, 11446, 'Dark Contract with the Gate'),
    ('main', 11, 'darkcontractwiththeswampking', 3, 11447, 'Dark Contract with the Swamp King'),
    ('main', 12, 'twintwisters', 1, 12175, 'Twin Twisters'),
    ('main', 13, 'dddcontractchange', 2, 12012, 'D/D/D Contract Change'),
    ('main', 14, 'darkcontractwitherrors', 1, 12013, 'Dark Contract with Errors'),
    ('main', 15, 'darkcontractwiththewitch', 3, 11448, 'Dark Contract with the Witch'),
    ('main', 16, 'ringofdestruction', 1, 5005, 'Ring of Destruction'),
    ('main', 17, 'rivalryofwarlords', 1, 5622, 'Rivalry of Warlords'),
    ('extra', 18, 'dddoraclekingdarc', 3, 11830, 'D/D/D Oracle King d''Arc'),
    ('extra', 19, 'dddwaveoblivionkingcaesarragnarok', 1, 11988, 'D/D/D Wave Oblivion King Caesar Ragnarok'),
    ('extra', 20, 'dddduodawnkingkaliyuga', 3, 11994, 'D/D/D Duo-Dawn King Kali Yuga'),
    ('extra', 21, 'dddmarksmankingtell', 3, 11836, 'D/D/D Marksman King Tell'),
    ('extra', 22, 'dddwavekingcaesar', 3, 11457, 'D/D/D Wave King Caesar'),
    ('extra', 23, 'mechaphantombeastdracossack', 1, 10534, 'Mecha Phantom Beast Dracossack'),
    ('extra', 24, 'number11bigeye', 1, 9861, 'Number 11: Big Eye')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'declan-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dennis McField / A — Performage (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'dennis-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'magicalexemplar', 3, 7799, 'Magical Exemplar'),
    ('main', 2, 'performageflameeater', 3, 11800, 'Performage Flame Eater'),
    ('main', 3, 'performagehattricker', 3, 11801, 'Performage Hat Tricker'),
    ('main', 4, 'performagestiltslauncher', 3, 11803, 'Performage Stilts Launcher'),
    ('main', 5, 'performagetrickclown', 3, 11802, 'Performage Trick Clown'),
    ('main', 6, 'summonermonk', 2, 6400, 'Summoner Monk'),
    ('main', 7, 'darkdoriado', 3, 12143, 'Dark Doriado'),
    ('main', 8, 'magicalabductor', 3, 11825, 'Magical Abductor'),
    ('main', 9, 'performagemirrorconductor', 3, 11959, 'Performage Mirror Conductor'),
    ('main', 10, 'bubblebarrier', 1, 11842, 'Bubble Barrier'),
    ('main', 11, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 12, 'secretvillageofthespellcasters', 3, 7916, 'Secret Village of the Spellcasters'),
    ('main', 13, 'soulcharge', 1, 11159, 'Soul Charge'),
    ('main', 14, 'spellbookofpower', 2, 10188, 'Spellbook of Power'),
    ('main', 15, 'tremendousfire', 3, 4353, 'Tremendous Fire'),
    ('main', 16, 'upstartgoblin', 1, 4895, 'Upstart Goblin'),
    ('main', 17, 'ringofdestruction', 1, 5005, 'Ring of Destruction'),
    ('extra', 18, 'performagetrapezemagician', 3, 11837, 'Performage Trapeze Magician')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'dennis-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dennis McField / B — Majespecter (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'dennis-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'flashknight', 1, 11210, 'Flash Knight'),
    ('main', 2, 'foucaultscannon', 3, 11211, 'Foucault''s Cannon'),
    ('main', 3, 'archfiendeccentrick', 3, 11826, 'Archfiend Eccentrick'),
    ('main', 4, 'magicalabductor', 1, 11825, 'Magical Abductor'),
    ('main', 5, 'majespectercatnekomata', 3, 11969, 'Majespecter Cat - Nekomata'),
    ('main', 6, 'majespectercrowyata', 3, 11971, 'Majespecter Crow - Yata'),
    ('main', 7, 'majespecterfoxkyubi', 3, 11972, 'Majespecter Fox - Kyubi'),
    ('main', 8, 'majespecterraccoonbunbuku', 3, 11970, 'Majespecter Raccoon - Bunbuku'),
    ('main', 9, 'majespectertoadogama', 3, 12138, 'Majespecter Toad - Ogama'),
    ('main', 10, 'majespecterunicornkirin', 1, 11973, 'Majespecter Unicorn - Kirin'),
    ('main', 11, 'majespectercyclone', 1, 12004, 'Majespecter Cyclone'),
    ('main', 12, 'majespectersonics', 2, 12172, 'Majespecter Sonics'),
    ('main', 13, 'majespecterstorm', 3, 12003, 'Majespecter Storm'),
    ('main', 14, 'majestyspegasus', 3, 12002, 'Majesty''s Pegasus'),
    ('main', 15, 'potofriches', 1, 11583, 'Pot of Riches'),
    ('main', 16, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 17, 'echooscillation', 1, 11599, 'Echo Oscillation'),
    ('main', 18, 'majespectertempest', 2, 12017, 'Majespecter Tempest'),
    ('main', 19, 'majespectertornado', 2, 12016, 'Majespecter Tornado')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'dennis-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dipper O'rion / A — Star Changer (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'dipper-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'constellaralgiedi', 3, 9809, 'Constellar Algiedi'),
    ('main', 2, 'constellarkaus', 3, 9987, 'Constellar Kaus'),
    ('main', 3, 'constellarpollux', 3, 9810, 'Constellar Pollux'),
    ('main', 4, 'constellarsheratan', 1, 9807, 'Constellar Sheratan'),
    ('main', 5, 'constellarsombre', 3, 10440, 'Constellar Sombre'),
    ('main', 6, 'constellarvirgo', 3, 9812, 'Constellar Virgo'),
    ('main', 7, 'constellarzubeneschamali', 3, 9811, 'Constellar Zubeneschamali'),
    ('main', 8, 'constellarbelt', 1, 10087, 'Constellar Belt'),
    ('main', 9, 'constellarstarchart', 1, 9829, 'Constellar Star Chart'),
    ('main', 10, 'constellarstarcradle', 3, 10009, 'Constellar Star Cradle'),
    ('main', 11, 'costdown', 2, 5575, 'Cost Down'),
    ('main', 12, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'starchanger', 2, 9676, 'Star Changer'),
    ('main', 14, 'xyzunit', 2, 10085, 'Xyz Unit'),
    ('main', 15, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 16, 'constellarmeteor', 1, 10011, 'Constellar Meteor'),
    ('main', 17, 'pinpointguard', 3, 10550, 'Pinpoint Guard'),
    ('extra', 18, 'constellarhyades', 3, 9823, 'Constellar Hyades'),
    ('extra', 19, 'constellaromega', 1, 10013, 'Constellar Omega'),
    ('extra', 20, 'constellarpleiades', 3, 9824, 'Constellar Pleiades'),
    ('extra', 21, 'constellarptolemym7', 3, 10004, 'Constellar Ptolemy M7')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'dipper-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dipper O'rion / B — Tellarknight (26 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'dipper-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'satellarknightalsahm', 2, 11230, 'Satellarknight Alsahm'),
    ('main', 2, 'satellarknightaltair', 3, 11228, 'Satellarknight Altair'),
    ('main', 3, 'satellarknightbetelgeuse', 3, 11361, 'Satellarknight Betelgeuse'),
    ('main', 4, 'satellarknightcapella', 1, 11544, 'Satellarknight Capella'),
    ('main', 5, 'satellarknightdeneb', 3, 11227, 'Satellarknight Deneb'),
    ('main', 6, 'satellarknightprocyon', 1, 11360, 'Satellarknight Procyon'),
    ('main', 7, 'satellarknightrigel', 1, 11545, 'Satellarknight Rigel'),
    ('main', 8, 'satellarknightunukalhai', 3, 11231, 'Satellarknight Unukalhai'),
    ('main', 9, 'satellarknightvega', 3, 11229, 'Satellarknight Vega'),
    ('main', 10, 'instantfusion', 1, 6901, 'Instant Fusion'),
    ('main', 11, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 12, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 13, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 14, 'drowningmirrorforce', 1, 12347, 'Drowning Mirror Force'),
    ('main', 15, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 16, 'oasisofdragonsouls', 3, 11409, 'Oasis of Dragon Souls'),
    ('main', 17, 'quakingmirrorforce', 1, 12184, 'Quaking Mirror Force'),
    ('main', 18, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 19, 'stellarnovaalpha', 3, 11280, 'Stellarnova Alpha'),
    ('main', 20, 'stellarnovawave', 2, 11279, 'Stellarnova Wave'),
    ('main', 21, 'stormingmirrorforce', 1, 11860, 'Storming Mirror Force'),
    ('main', 22, 'xyzreborn', 1, 9950, 'Xyz Reborn'),
    ('extra', 23, 'elderentitynorden', 1, 11207, 'Elder Entity Norden'),
    ('extra', 24, 'stellarknightconstellardiamond', 1, 11571, 'Stellarknight Constellar Diamond'),
    ('extra', 25, 'stellarknightdelteros', 3, 11262, 'Stellarknight Delteros'),
    ('extra', 26, 'stellarknighttriverr', 3, 11386, 'Stellarknight Triverr')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'dipper-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Gong Strong / A — Big Benkei (17 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'gong-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'superheavysamuraibigbenkei', 3, 11222, 'Superheavy Samurai Big Benkei'),
    ('main', 2, 'superheavysamuraibluebrawler', 3, 11220, 'Superheavy Samurai Blue Brawler'),
    ('main', 3, 'superheavysamuraidrum', 3, 11950, 'Superheavy Samurai Drum'),
    ('main', 4, 'superheavysamuraiflutist', 3, 11527, 'Superheavy Samurai Flutist'),
    ('main', 5, 'superheavysamuraikabuto', 2, 11340, 'Superheavy Samurai Kabuto'),
    ('main', 6, 'superheavysamuraimagnet', 2, 12116, 'Superheavy Samurai Magnet'),
    ('main', 7, 'superheavysamuraiscales', 3, 11341, 'Superheavy Samurai Scales'),
    ('main', 8, 'superheavysamuraisoulbangcannon', 2, 11345, 'Superheavy Samurai Soulbang Cannon'),
    ('main', 9, 'superheavysamuraisoulshieldwall', 2, 11343, 'Superheavy Samurai Soulshield Wall'),
    ('main', 10, 'superheavysamuraiswordsman', 3, 11221, 'Superheavy Samurai Swordsman'),
    ('main', 11, 'machineconversionfactory', 3, 4331, 'Machine Conversion Factory'),
    ('main', 12, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'twinswordsofflashinglighttryce', 2, 5729, 'Twin Swords of Flashing Light - Tryce'),
    ('main', 14, 'twintwisters', 1, 12175, 'Twin Twisters'),
    ('main', 15, 'd2shield', 2, 9140, 'D2 Shield'),
    ('main', 16, 'noentry', 3, 6746, 'No Entry!!'),
    ('main', 17, 'spikeshieldwithchain', 2, 10435, 'Spikeshield with Chain')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'gong-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Gong Strong / B — Superheavy Samurai (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'gong-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'giantrat', 3, 4915, 'Giant Rat'),
    ('main', 2, 'superheavysamuraibattleball', 3, 11683, 'Superheavy Samurai Battleball'),
    ('main', 3, 'superheavysamuraibigbenkei', 2, 11222, 'Superheavy Samurai Big Benkei'),
    ('main', 4, 'superheavysamuraibigwaraji', 1, 11681, 'Superheavy Samurai Big Waraji'),
    ('main', 5, 'superheavysamuraibluebrawler', 3, 11220, 'Superheavy Samurai Blue Brawler'),
    ('main', 6, 'superheavysamuraidrum', 3, 11950, 'Superheavy Samurai Drum'),
    ('main', 7, 'superheavysamuraiflutist', 3, 11527, 'Superheavy Samurai Flutist'),
    ('main', 8, 'superheavysamuraimagnet', 3, 12116, 'Superheavy Samurai Magnet'),
    ('main', 9, 'superheavysamuraipreppeddefense', 3, 12117, 'Superheavy Samurai Prepped Defense'),
    ('main', 10, 'superheavysamuraiscales', 3, 11341, 'Superheavy Samurai Scales'),
    ('main', 11, 'superheavysamuraisoulfiresuit', 1, 11342, 'Superheavy Samurai Soulfire Suit'),
    ('main', 12, 'superheavysamuraisoulpiercer', 3, 11529, 'Superheavy Samurai Soulpiercer'),
    ('main', 13, 'superheavysamuraitrumpeter', 3, 11528, 'Superheavy Samurai Trumpeter'),
    ('main', 14, 'superheavysamuraigeneralcoral', 3, 12119, 'Superheavy Samurai General Coral'),
    ('main', 15, 'superheavysamuraigeneraljade', 3, 12118, 'Superheavy Samurai General Jade'),
    ('extra', 16, 'superheavysamuraibeastkyubi', 3, 12156, 'Superheavy Samurai Beast Kyubi'),
    ('extra', 17, 'superheavysamuraiogreshutendoji', 3, 11618, 'Superheavy Samurai Ogre Shutendoji'),
    ('extra', 18, 'superheavysamuraiwarlordsusanowo', 3, 11568, 'Superheavy Samurai Warlord Susanowo')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'gong-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jack Atlas / A — Red Wyvern (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jack-atlas-arcv-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'archfiendcavalry', 3, 10633, 'Archfiend Cavalry'),
    ('main', 2, 'chainresonator', 3, 12063, 'Chain Resonator'),
    ('main', 3, 'forceresonator', 3, 9477, 'Force Resonator'),
    ('main', 4, 'juragedo', 3, 5636, 'Juragedo'),
    ('main', 5, 'mirrorresonator', 3, 12064, 'Mirror Resonator'),
    ('main', 6, 'phantomskyblaster', 3, 7384, 'Phantom Skyblaster'),
    ('main', 7, 'redresonator', 3, 12061, 'Red Resonator'),
    ('main', 8, 'redsprinter', 3, 12060, 'Red Sprinter'),
    ('main', 9, 'synkronresonator', 3, 12062, 'Synkron Resonator'),
    ('main', 10, 'resonatorcall', 3, 9518, 'Resonator Call'),
    ('main', 11, 'resonatorengine', 3, 9347, 'Resonator Engine'),
    ('main', 12, 'silverwing', 2, 8336, 'Silver Wing'),
    ('main', 13, 'redcarpet', 3, 9534, 'Red Carpet'),
    ('main', 14, 'rejectreborn', 2, 12179, 'Reject Reborn'),
    ('extra', 15, 'hotreddragonarchfiend', 1, 10842, 'Hot Red Dragon Archfiend'),
    ('extra', 16, 'hotreddragonarchfiendabyss', 2, 12078, 'Hot Red Dragon Archfiend Abyss'),
    ('extra', 17, 'hotreddragonarchfiendbane', 2, 12079, 'Hot Red Dragon Archfiend Bane'),
    ('extra', 18, 'hotreddragonarchfiendkingcalamity', 2, 12080, 'Hot Red Dragon Archfiend King Calamity'),
    ('extra', 19, 'redwyvern', 3, 12065, 'Red Wyvern'),
    ('extra', 20, 'scarlightreddragonarchfiend', 3, 11990, 'Scarlight Red Dragon Archfiend')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jack-atlas-arcv-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jack Atlas / B — Infernoid (30 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jack-atlas-arcv-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'infernoidattondel', 1, 11538, 'Infernoid Attondel'),
    ('main', 2, 'infernoiddecatron', 3, 11823, 'Infernoid Decatron'),
    ('main', 3, 'infernoiddevyaty', 3, 11707, 'Infernoid Devyaty'),
    ('main', 4, 'infernoidharmadik', 3, 11534, 'Infernoid Harmadik'),
    ('main', 5, 'infernoidonuncu', 1, 11539, 'Infernoid Onuncu'),
    ('main', 6, 'infernoidpatrulea', 3, 11535, 'Infernoid Patrulea'),
    ('main', 7, 'infernoidseitsemas', 3, 11537, 'Infernoid Seitsemas'),
    ('main', 8, 'raidenhandofthelightsworn', 3, 10886, 'Raiden, Hand of the Lightsworn'),
    ('main', 9, 'witchoftheblackrose', 3, 8623, 'Witch of the Black Rose'),
    ('main', 10, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 11, 'chargeofthelightbrigade', 2, 7868, 'Charge of the Light Brigade'),
    ('main', 12, 'lightningvortex', 1, 5217, 'Lightning Vortex'),
    ('main', 13, 'monstergate', 1, 5980, 'Monster Gate'),
    ('main', 14, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 15, 'reasoning', 1, 5530, 'Reasoning'),
    ('main', 16, 'rekindling', 1, 8350, 'Rekindling'),
    ('main', 17, 'twintwisters', 2, 12175, 'Twin Twisters'),
    ('main', 18, 'voidexpansion', 3, 11578, 'Void Expansion'),
    ('main', 19, 'voidimagination', 3, 11847, 'Void Imagination'),
    ('main', 20, 'solemnstrike', 1, 12187, 'Solemn Strike'),
    ('extra', 21, 'armadeskeeperofboundaries', 1, 10648, 'Armades, Keeper of Boundaries'),
    ('extra', 22, 'blackrosedragon', 3, 7898, 'Black Rose Dragon'),
    ('extra', 23, 'goyoguardian', 1, 7736, 'Goyo Guardian'),
    ('extra', 24, 'mistwurm', 1, 7549, 'Mist Wurm'),
    ('extra', 25, 'scrapdragon', 1, 8974, 'Scrap Dragon'),
    ('extra', 26, 'stareater', 2, 10650, 'Star Eater'),
    ('extra', 27, 'trishuladragonoftheicebarrier', 1, 8732, 'Trishula, Dragon of the Ice Barrier'),
    ('extra', 28, 'voidogredragon', 1, 9970, 'Void Ogre Dragon'),
    ('extra', 29, 'casteltheskyblastermusketeer', 2, 11263, 'Castel, the Skyblaster Musketeer'),
    ('extra', 30, 'dantetraveleroftheburningabyss', 2, 11320, 'Dante, Traveler of the Burning Abyss')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jack-atlas-arcv-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Julia Krystal / A — Master Diamond (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'julia-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gemknightcrystal', 3, 9372, 'Gem-Knight Crystal'),
    ('main', 2, 'gemknighttourmaline', 3, 8895, 'Gem-Knight Tourmaline'),
    ('main', 3, 'crystalrose', 1, 11796, 'Crystal Rose'),
    ('main', 4, 'gemarmadillo', 3, 8897, 'Gem-Armadillo'),
    ('main', 5, 'gemelephant', 3, 9642, 'Gem-Elephant'),
    ('main', 6, 'gemknightalexandrite', 3, 8896, 'Gem-Knight Alexandrite'),
    ('main', 7, 'gemknightamber', 3, 9584, 'Gem-Knight Amber'),
    ('main', 8, 'gemknightemerald', 3, 9212, 'Gem-Knight Emerald'),
    ('main', 9, 'gemknightiolite', 1, 9583, 'Gem-Knight Iolite'),
    ('main', 10, 'gemknightlazuli', 1, 9981, 'Gem-Knight Lazuli'),
    ('main', 11, 'gemknightobsidian', 2, 9582, 'Gem-Knight Obsidian'),
    ('main', 12, 'gemknightsardonyx', 1, 9803, 'Gem-Knight Sardonyx'),
    ('main', 13, 'gemturtle', 3, 9441, 'Gem-Turtle'),
    ('main', 14, 'gemknightfusion', 3, 8918, 'Gem-Knight Fusion'),
    ('main', 15, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 16, 'fragmentfusion', 1, 9830, 'Fragment Fusion'),
    ('main', 17, 'pyroxenefusion', 3, 9399, 'Pyroxene Fusion'),
    ('extra', 18, 'gemknightmasterdiamond', 3, 10001, 'Gem-Knight Master Diamond'),
    ('extra', 19, 'gemknightprismaura', 3, 9391, 'Gem-Knight Prismaura'),
    ('extra', 20, 'gemknighttopaz', 3, 8913, 'Gem-Knight Topaz')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'julia-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Julia Krystal / B — Brilliant Diamond (31 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'julia-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gemknightcrystal', 2, 9372, 'Gem-Knight Crystal'),
    ('main', 2, 'gemknightgarnet', 1, 8893, 'Gem-Knight Garnet'),
    ('main', 3, 'gemknightlapis', 1, 11532, 'Gem-Knight Lapis'),
    ('main', 4, 'gemknighttourmaline', 1, 8895, 'Gem-Knight Tourmaline'),
    ('main', 5, 'crystalrose', 1, 11796, 'Crystal Rose'),
    ('main', 6, 'gemarmadillo', 3, 8897, 'Gem-Armadillo'),
    ('main', 7, 'gemknightalexandrite', 3, 8896, 'Gem-Knight Alexandrite'),
    ('main', 8, 'gemknightamber', 2, 9584, 'Gem-Knight Amber'),
    ('main', 9, 'gemknightemerald', 3, 9212, 'Gem-Knight Emerald'),
    ('main', 10, 'gemknightiolite', 1, 9583, 'Gem-Knight Iolite'),
    ('main', 11, 'gemknightlazuli', 3, 9981, 'Gem-Knight Lazuli'),
    ('main', 12, 'gemknightobsidian', 3, 9582, 'Gem-Knight Obsidian'),
    ('main', 13, 'gemknightsardonyx', 1, 9803, 'Gem-Knight Sardonyx'),
    ('main', 14, 'gemturtle', 1, 9441, 'Gem-Turtle'),
    ('main', 15, 'absorbfusion', 3, 11453, 'Absorb Fusion'),
    ('main', 16, 'brilliantfusion', 3, 11840, 'Brilliant Fusion'),
    ('main', 17, 'catapultzone', 2, 10194, 'Catapult Zone'),
    ('main', 18, 'gemknightfusion', 3, 8918, 'Gem-Knight Fusion'),
    ('main', 19, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 20, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 21, 'fragmentfusion', 1, 9830, 'Fragment Fusion'),
    ('extra', 22, 'gemknightamethyst', 1, 9598, 'Gem-Knight Amethyst'),
    ('extra', 23, 'gemknightaquamarine', 1, 8912, 'Gem-Knight Aquamarine'),
    ('extra', 24, 'gemknightcitrine', 1, 9390, 'Gem-Knight Citrine'),
    ('extra', 25, 'gemknightladybrilliantdiamond', 3, 11831, 'Gem-Knight Lady Brilliant Diamond'),
    ('extra', 26, 'gemknightladylapislazuli', 1, 11566, 'Gem-Knight Lady Lapis Lazuli'),
    ('extra', 27, 'gemknightprismaura', 3, 9391, 'Gem-Knight Prismaura'),
    ('extra', 28, 'gemknightruby', 1, 8911, 'Gem-Knight Ruby'),
    ('extra', 29, 'gemknightseraphinite', 1, 10000, 'Gem-Knight Seraphinite'),
    ('extra', 30, 'gemknighttopaz', 2, 8913, 'Gem-Knight Topaz'),
    ('extra', 31, 'gemknightzirconia', 1, 9820, 'Gem-Knight Zirconia')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'julia-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Kit Blade / A — X-Saber (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'kit-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'xsaberanupiranha', 3, 7821, 'X-Saber Anu Piranha'),
    ('main', 2, 'commandergottomsswordmaster', 1, 7539, 'Commander Gottoms, Swordmaster'),
    ('main', 3, 'xsaberairbellum', 2, 7537, 'X-Saber Airbellum'),
    ('main', 4, 'xsaberpalomuro', 2, 7823, 'X-Saber Palomuro'),
    ('main', 5, 'xsaberpashuul', 3, 7824, 'X-Saber Pashuul'),
    ('main', 6, 'xsaberuruz', 3, 7538, 'X-Saber Uruz'),
    ('main', 7, 'xxsaberboggartknight', 2, 9030, 'XX-Saber Boggart Knight'),
    ('main', 8, 'xxsaberdarksoul', 1, 9031, 'XX-Saber Darksoul'),
    ('main', 9, 'xxsaberemmersblade', 3, 8753, 'XX-Saber Emmersblade'),
    ('main', 10, 'xxsaberfaultroll', 2, 8326, 'XX-Saber Faultroll'),
    ('main', 11, 'xxsaberfulhelmknight', 2, 8522, 'XX-Saber Fulhelmknight'),
    ('main', 12, 'xxsabergardestrike', 3, 8521, 'XX-Saber Gardestrike'),
    ('main', 13, 'xxsabergarsem', 1, 8637, 'XX-Saber Garsem'),
    ('main', 14, 'xxsaberragigura', 3, 8327, 'XX-Saber Ragigura'),
    ('main', 15, 'sabervault', 1, 9032, 'Saber Vault'),
    ('main', 16, 'swordofsparkles', 1, 8349, 'Sword of Sparkles'),
    ('main', 17, 'atonewiththesword', 1, 8369, 'At One With the Sword'),
    ('main', 18, 'gottomsemergencycall', 3, 8282, 'Gottoms'' Emergency Call'),
    ('main', 19, 'meteorain', 3, 5618, 'Meteorain'),
    ('extra', 20, 'xsabersouza', 1, 9444, 'X-Saber Souza'),
    ('extra', 21, 'xsaberwayne', 1, 7835, 'X-Saber Wayne'),
    ('extra', 22, 'xxsabergottoms', 1, 8334, 'XX-Saber Gottoms'),
    ('extra', 23, 'xxsaberhyunlei', 1, 8655, 'XX-Saber Hyunlei')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'kit-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Kit Blade / B — XX-Saber (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'kit-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'effectveiler', 1, 8933, 'Effect Veiler'),
    ('main', 2, 'xsaberairbellum', 3, 7537, 'X-Saber Airbellum'),
    ('main', 3, 'xsaberpashuul', 3, 7824, 'X-Saber Pashuul'),
    ('main', 4, 'xxsaberboggartknight', 3, 9030, 'XX-Saber Boggart Knight'),
    ('main', 5, 'xxsaberdarksoul', 3, 9031, 'XX-Saber Darksoul'),
    ('main', 6, 'xxsaberemmersblade', 3, 8753, 'XX-Saber Emmersblade'),
    ('main', 7, 'xxsaberfaultroll', 3, 8326, 'XX-Saber Faultroll'),
    ('main', 8, 'xxsaberfulhelmknight', 3, 8522, 'XX-Saber Fulhelmknight'),
    ('main', 9, 'xxsabergardestrike', 1, 8521, 'XX-Saber Gardestrike'),
    ('main', 10, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 11, 'saberslash', 2, 8348, 'Saber Slash'),
    ('main', 12, 'sabervault', 2, 9032, 'Saber Vault'),
    ('main', 13, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 14, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 15, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 16, 'drowningmirrorforce', 1, 12347, 'Drowning Mirror Force'),
    ('main', 17, 'gottomsemergencycall', 3, 8282, 'Gottoms'' Emergency Call'),
    ('main', 18, 'saberhole', 3, 8684, 'Saber Hole'),
    ('extra', 19, 'xsabersouza', 3, 9444, 'X-Saber Souza'),
    ('extra', 20, 'xsaberurbellum', 3, 7551, 'X-Saber Urbellum'),
    ('extra', 21, 'xsaberwayne', 3, 7835, 'X-Saber Wayne'),
    ('extra', 22, 'xxsabergottoms', 3, 8334, 'XX-Saber Gottoms'),
    ('extra', 23, 'xxsaberhyunlei', 3, 8655, 'XX-Saber Hyunlei')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'kit-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Moon Shadow / A — Ninja (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'moon-shadow-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'airarmorninja', 3, 9888, 'Air Armor Ninja'),
    ('main', 2, 'aquaarmorninja', 3, 9889, 'Aqua Armor Ninja'),
    ('main', 3, 'darkstormdragon', 1, 9911, 'Darkstorm Dragon'),
    ('main', 4, 'eartharmorninja', 3, 9890, 'Earth Armor Ninja'),
    ('main', 5, 'flamearmorninja', 3, 9887, 'Flame Armor Ninja'),
    ('main', 6, 'ninjagrandmasterhanzo', 3, 9903, 'Ninja Grandmaster Hanzo'),
    ('main', 7, 'ninjagrandmastersasuke', 1, 6111, 'Ninja Grandmaster Sasuke'),
    ('main', 8, 'seniorsilverninja', 1, 9749, 'Senior Silver Ninja'),
    ('main', 9, 'twilightninjagetsugatheshogun', 2, 12125, 'Twilight Ninja Getsuga, the Shogun'),
    ('main', 10, 'twilightninjanichirinthechunin', 2, 12124, 'Twilight Ninja Nichirin, the Chunin'),
    ('main', 11, 'twilightninjashingetsu', 3, 12123, 'Twilight Ninja Shingetsu'),
    ('main', 12, 'upstartgoldenninja', 1, 9905, 'Upstart Golden Ninja'),
    ('main', 13, 'armorninjitsuartofalchemy', 1, 9925, 'Armor Ninjitsu Art of Alchemy'),
    ('main', 14, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 15, 'armorninjitsuartoffreezing', 3, 9942, 'Armor Ninjitsu Art of Freezing'),
    ('main', 16, 'armorninjitsuartofrustmist', 1, 9943, 'Armor Ninjitsu Art of Rust Mist'),
    ('main', 17, 'ninjitsuartofdecoy', 2, 6143, 'Ninjitsu Art of Decoy'),
    ('main', 18, 'ninjitsuartofduplication', 2, 10023, 'Ninjitsu Art of Duplication'),
    ('main', 19, 'ninjitsuartofshadowsealing', 3, 10320, 'Ninjitsu Art of Shadow Sealing'),
    ('main', 20, 'ninjitsuartofsupertransformation', 1, 9949, 'Ninjitsu Art of Super-Transformation'),
    ('extra', 21, 'bladearmorninja', 1, 9915, 'Blade Armor Ninja'),
    ('extra', 22, 'number12crimsonshadowarmorninja', 1, 9916, 'Number 12: Crimson Shadow Armor Ninja')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'moon-shadow-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Moon Shadow / B — Igknight (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'moon-shadow-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'royalmagicallibrary', 3, 5658, 'Royal Magical Library'),
    ('main', 2, 'igknightcrusader', 3, 11811, 'Igknight Crusader'),
    ('main', 3, 'igknightgallant', 3, 11815, 'Igknight Gallant'),
    ('main', 4, 'igknightmargrave', 3, 11814, 'Igknight Margrave'),
    ('main', 5, 'igknightpaladin', 3, 11813, 'Igknight Paladin'),
    ('main', 6, 'igknightsquire', 3, 11810, 'Igknight Squire'),
    ('main', 7, 'igknighttemplar', 3, 11812, 'Igknight Templar'),
    ('main', 8, 'igknightveteran', 3, 11975, 'Igknight Veteran'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'igknightreload', 2, 12005, 'Igknight Reload'),
    ('main', 11, 'ignitionphoenix', 2, 11845, 'Ignition Phoenix'),
    ('main', 12, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'painfuldecision', 2, 12009, 'Painful Decision'),
    ('main', 14, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 15, 'rankupmagicastralforce', 2, 10945, 'Rank-Up-Magic Astral Force'),
    ('main', 16, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 17, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 18, 'thewarriorreturningalive', 1, 5330, 'The Warrior Returning Alive'),
    ('main', 19, 'igknightburst', 1, 11857, 'Igknight Burst'),
    ('extra', 20, 'casteltheskyblastermusketeer', 1, 11263, 'Castel, the Skyblaster Musketeer'),
    ('extra', 21, 'gaiadragonthethundercharger', 1, 10069, 'Gaia Dragon, the Thunder Charger'),
    ('extra', 22, 'number101silenthonorark', 1, 10933, 'Number 101: Silent Honor ARK'),
    ('extra', 23, 'number20gigabrilliant', 2, 9760, 'Number 20: Giga-Brilliant'),
    ('extra', 24, 'number39utopia', 3, 9575, 'Number 39: Utopia'),
    ('extra', 25, 'number39utopiabeyond', 3, 11132, 'Number 39: Utopia Beyond'),
    ('extra', 26, 'numberc39utopiaray', 2, 9914, 'Number C39: Utopia Ray'),
    ('extra', 27, 'sharkfortress', 2, 10529, 'Shark Fortress')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'moon-shadow-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Officer 227 / A — Stygian (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'officer227-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gateblocker', 3, 11179, 'Gate Blocker'),
    ('main', 2, 'gonogo', 3, 7713, 'Gonogo'),
    ('main', 3, 'juttefighter', 3, 7710, 'Jutte Fighter'),
    ('main', 4, 'littletrooper', 2, 10162, 'Little Trooper'),
    ('main', 5, 'maraudingcaptain', 3, 5318, 'Marauding Captain'),
    ('main', 6, 'needlesunfish', 1, 9728, 'Needle Sunfish'),
    ('main', 7, 'shibawarriortaro', 3, 8267, 'Shiba-Warrior Taro'),
    ('main', 8, 'stygiansecurity', 2, 8738, 'Stygian Security'),
    ('main', 9, 'stygianstreetpatrol', 3, 8740, 'Stygian Street Patrol'),
    ('main', 10, 'torapart', 3, 8170, 'Torapart'),
    ('main', 11, 'egoboost', 1, 9764, 'Ego Boost'),
    ('main', 12, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 13, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 14, 'synchroblastwave', 1, 7692, 'Synchro Blast Wave'),
    ('main', 15, 'brokenblocker', 1, 7759, 'Broken Blocker'),
    ('main', 16, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 17, 'descendingloststar', 3, 8060, 'Descending Lost Star'),
    ('main', 18, 'synchrodeflector', 1, 7758, 'Synchro Deflector'),
    ('main', 19, 'synchromaterial', 1, 9241, 'Synchro Material'),
    ('extra', 20, 'goyochaser', 3, 12077, 'Goyo Chaser'),
    ('extra', 21, 'goyopredator', 3, 12081, 'Goyo Predator')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'officer227-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Officer 227 / B — Goyo (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'officer227-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'attackgainer', 3, 9091, 'Attack Gainer'),
    ('main', 2, 'bigonewarrior', 3, 9237, 'Big One Warrior'),
    ('main', 3, 'boostwarrior', 3, 9234, 'Boost Warrior'),
    ('main', 4, 'goblindbergh', 2, 9621, 'Goblindbergh'),
    ('main', 5, 'juttefighter', 3, 7710, 'Jutte Fighter'),
    ('main', 6, 'littletrooper', 3, 10162, 'Little Trooper'),
    ('main', 7, 'maraudingcaptain', 3, 5318, 'Marauding Captain'),
    ('main', 8, 'tgstriker', 3, 9488, 'T.G. Striker'),
    ('main', 9, 'torapart', 3, 8170, 'Torapart'),
    ('main', 10, 'burdenofthemighty', 1, 7399, 'Burden of the Mighty'),
    ('main', 11, 'miraclesynchrofusion', 2, 8988, 'Miracle Synchro Fusion'),
    ('main', 12, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 13, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 14, 'solidarity', 1, 8344, 'Solidarity'),
    ('main', 15, 'soulcharge', 1, 11159, 'Soul Charge'),
    ('main', 16, 'twintwisters', 1, 12175, 'Twin Twisters'),
    ('main', 17, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 18, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 19, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 20, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 21, 'stormingmirrorforce', 2, 11860, 'Storming Mirror Force'),
    ('extra', 22, 'goyoemperor', 2, 12152, 'Goyo Emperor'),
    ('extra', 23, 'drivendaredevil', 2, 9219, 'Driven Daredevil'),
    ('extra', 24, 'goyochaser', 3, 12077, 'Goyo Chaser'),
    ('extra', 25, 'goyodefender', 3, 12158, 'Goyo Defender'),
    ('extra', 26, 'goyoguardian', 1, 7736, 'Goyo Guardian'),
    ('extra', 27, 'goyoking', 3, 12159, 'Goyo King'),
    ('extra', 28, 'goyopredator', 1, 12081, 'Goyo Predator')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'officer227-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Shay Obsidian / A — Raidraptor (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'shay-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlestorm', 2, 8371, 'Battlestorm'),
    ('main', 2, 'raidraptoravengevulture', 3, 12286, 'Raidraptor - Avenge Vulture'),
    ('main', 3, 'raidraptorfuzzylanius', 3, 11797, 'Raidraptor - Fuzzy Lanius'),
    ('main', 4, 'raidraptorlaststrix', 3, 12210, 'Raidraptor - Last Strix'),
    ('main', 5, 'raidraptorpainlanius', 3, 12287, 'Raidraptor - Pain Lanius'),
    ('main', 6, 'raidraptorsinginglanius', 3, 11798, 'Raidraptor - Singing Lanius'),
    ('main', 7, 'raidraptortributelanius', 3, 11767, 'Raidraptor - Tribute Lanius'),
    ('main', 8, 'raidraptorvanishinglanius', 3, 11531, 'Raidraptor - Vanishing Lanius'),
    ('main', 9, 'creepingdarkness', 2, 9933, 'Creeping Darkness'),
    ('main', 10, 'raidraptorcall', 3, 12212, 'Raidraptor - Call'),
    ('main', 11, 'raidraptornest', 3, 11574, 'Raidraptor - Nest'),
    ('main', 12, 'rankupmagicastralforce', 2, 10945, 'Rank-Up-Magic Astral Force'),
    ('main', 13, 'rankupmagicdoomdoubleforce', 2, 12213, 'Rank-Up-Magic Doom Double Force'),
    ('main', 14, 'rankupmagicsoulshaveforce', 3, 12214, 'Rank-Up-Magic Soul Shave Force'),
    ('main', 15, 'raptorsultimatemace', 1, 11999, 'Raptor''s Ultimate Mace'),
    ('main', 16, 'xyzreborn', 1, 9950, 'Xyz Reborn'),
    ('extra', 17, 'raidraptorblazefalcon', 2, 11723, 'Raidraptor - Blaze Falcon'),
    ('extra', 18, 'raidraptorfiendeagle', 3, 11995, 'Raidraptor - Fiend Eagle'),
    ('extra', 19, 'raidraptorrevolutionfalcon', 3, 11724, 'Raidraptor - Revolution Falcon'),
    ('extra', 20, 'raidraptorrisefalcon', 3, 11570, 'Raidraptor - Rise Falcon'),
    ('extra', 21, 'raidraptorsatellitecannonfalcon', 3, 12211, 'Raidraptor - Satellite Cannon Falcon'),
    ('extra', 22, 'raidraptorultimatefalcon', 1, 12325, 'Raidraptor - Ultimate Falcon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'shay-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Shay Obsidian / B — Artifact (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'shay-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'artifactachilleshield', 2, 11044, 'Artifact Achilleshield'),
    ('main', 2, 'artifactaegis', 1, 11043, 'Artifact Aegis'),
    ('main', 3, 'artifactbeagalltach', 3, 11041, 'Artifact Beagalltach'),
    ('main', 4, 'artifactcaduceus', 3, 11046, 'Artifact Caduceus'),
    ('main', 5, 'artifactchakram', 2, 11242, 'Artifact Chakram'),
    ('main', 6, 'artifactfailnaught', 3, 11042, 'Artifact Failnaught'),
    ('main', 7, 'artifactlabrys', 3, 11045, 'Artifact Labrys'),
    ('main', 8, 'artifactmoralltach', 1, 11040, 'Artifact Moralltach'),
    ('main', 9, 'artifactscythe', 2, 11195, 'Artifact Scythe'),
    ('main', 10, 'artifactignition', 3, 11089, 'Artifact Ignition'),
    ('main', 11, 'cardofdemise', 3, 5576, 'Card of Demise'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'doublecyclone', 2, 8977, 'Double Cyclone'),
    ('main', 14, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 16, 'soulcharge', 1, 11159, 'Soul Charge'),
    ('main', 17, 'artifactsanctum', 3, 11101, 'Artifact Sanctum'),
    ('main', 18, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 19, 'malevolentcatastrophe', 3, 5493, 'Malevolent Catastrophe'),
    ('extra', 20, 'adreuskeeperofarmageddon', 3, 9846, 'Adreus, Keeper of Armageddon'),
    ('extra', 21, 'artifactdurendal', 3, 11078, 'Artifact Durendal')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'shay-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sora Perse / A — Fluffal (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sora-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'edgeimpsabres', 3, 11346, 'Edge Imp Sabres'),
    ('main', 2, 'fluffalbear', 3, 11348, 'Fluffal Bear'),
    ('main', 3, 'fluffalcat', 2, 11351, 'Fluffal Cat'),
    ('main', 4, 'fluffaldog', 3, 11349, 'Fluffal Dog'),
    ('main', 5, 'fluffalleo', 2, 11347, 'Fluffal Leo'),
    ('main', 6, 'fluffalowl', 3, 11350, 'Fluffal Owl'),
    ('main', 7, 'fluffalrabbit', 2, 11352, 'Fluffal Rabbit'),
    ('main', 8, 'mysticalsheep1', 2, 4648, 'Mystical Sheep #1'),
    ('main', 9, 'thedarkhexsealedfusion', 3, 6257, 'The Dark - Hex-Sealed Fusion'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'defusion', 1, 5118, 'De-Fusion'),
    ('main', 12, 'fusionrecovery', 1, 6431, 'Fusion Recovery'),
    ('main', 13, 'fusionsage', 1, 4872, 'Fusion Sage'),
    ('main', 14, 'fusionweapon', 3, 6138, 'Fusion Weapon'),
    ('main', 15, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 17, 'toyvendor', 3, 11392, 'Toy Vendor'),
    ('main', 18, 'fusionreserve', 3, 11410, 'Fusion Reserve'),
    ('extra', 19, 'frightfurbear', 2, 11378, 'Frightfur Bear'),
    ('extra', 20, 'frightfurwolf', 3, 11379, 'Frightfur Wolf')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sora-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sora Perse / B — Frightfur (26 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sora-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'edgeimpchain', 3, 11688, 'Edge Imp Chain'),
    ('main', 2, 'edgeimpsabres', 2, 11346, 'Edge Imp Sabres'),
    ('main', 3, 'edgeimptomahawk', 1, 11689, 'Edge Imp Tomahawk'),
    ('main', 4, 'fluffalbear', 3, 11348, 'Fluffal Bear'),
    ('main', 5, 'fluffalcat', 1, 11351, 'Fluffal Cat'),
    ('main', 6, 'fluffaldog', 3, 11349, 'Fluffal Dog'),
    ('main', 7, 'fluffalowl', 3, 11350, 'Fluffal Owl'),
    ('main', 8, 'fluffalrabbit', 2, 11352, 'Fluffal Rabbit'),
    ('main', 9, 'fluffalsheep', 3, 11686, 'Fluffal Sheep'),
    ('main', 10, 'kingoftheswamp', 2, 6044, 'King of the Swamp'),
    ('main', 11, 'frightfurfusion', 3, 11731, 'Frightfur Fusion'),
    ('main', 12, 'instantfusion', 1, 6901, 'Instant Fusion'),
    ('main', 13, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 14, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 15, 'suturerebirth', 1, 11730, 'Suture Rebirth'),
    ('main', 16, 'toyvendor', 3, 11392, 'Toy Vendor'),
    ('main', 17, 'twintwisters', 1, 12175, 'Twin Twisters'),
    ('main', 18, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 19, 'fiendishchain', 1, 8675, 'Fiendish Chain'),
    ('main', 20, 'fusionreserve', 2, 11410, 'Fusion Reserve'),
    ('extra', 21, 'frightfurbear', 1, 11378, 'Frightfur Bear'),
    ('extra', 22, 'frightfurchimera', 2, 11718, 'Frightfur Chimera'),
    ('extra', 23, 'frightfursabretooth', 3, 11987, 'Frightfur Sabre-Tooth'),
    ('extra', 24, 'frightfursheep', 3, 11717, 'Frightfur Sheep'),
    ('extra', 25, 'frightfurtiger', 3, 11617, 'Frightfur Tiger'),
    ('extra', 26, 'frightfurwolf', 3, 11379, 'Frightfur Wolf')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sora-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sylvio Sawatari / A — Yosenju (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sylvio-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlefader', 2, 8617, 'Battle Fader'),
    ('main', 2, 'mayosenjudaibak', 1, 11471, 'Mayosenju Daibak'),
    ('main', 3, 'yosenjukama1', 2, 11473, 'Yosenju Kama 1'),
    ('main', 4, 'yosenjukama2', 3, 11474, 'Yosenju Kama 2'),
    ('main', 5, 'yosenjukama3', 3, 11475, 'Yosenju Kama 3'),
    ('main', 6, 'yosenjukodam', 3, 11693, 'Yosenju Kodam'),
    ('main', 7, 'yosenjumagat', 1, 11546, 'Yosenju Magat'),
    ('main', 8, 'yosenjuoyam', 2, 11694, 'Yosenju Oyam'),
    ('main', 9, 'yosenjutsujik', 3, 11547, 'Yosenju Tsujik'),
    ('main', 10, 'yosenjushinchul', 3, 11476, 'Yosenju Shinchu L'),
    ('main', 11, 'yosenjushinchur', 3, 11477, 'Yosenju Shinchu R'),
    ('main', 12, 'cardofdemise', 3, 5576, 'Card of Demise'),
    ('main', 13, 'divinewindofmistvalley', 1, 9350, 'Divine Wind of Mist Valley'),
    ('main', 14, 'fireformationgyokkou', 1, 10543, 'Fire Formation - Gyokkou'),
    ('main', 15, 'fireformationtenki', 1, 10418, 'Fire Formation - Tenki'),
    ('main', 16, 'guardedtreasure', 1, 11158, 'Guarded Treasure'),
    ('main', 17, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 18, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 19, 'yosentraininggrounds', 1, 11478, 'Yosen Training Grounds'),
    ('main', 20, 'yosenwhirlwind', 1, 11733, 'Yosen Whirlwind'),
    ('main', 21, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('main', 22, 'waboku', 1, 4886, 'Waboku'),
    ('main', 23, 'yosenjussecretmove', 1, 11479, 'Yosenjus'' Secret Move')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sylvio-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sylvio Sawatari / B — Monarch (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sylvio-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'caiusthemegamonarch', 1, 11555, 'Caius the Mega Monarch'),
    ('main', 2, 'caiustheshadowmonarch', 2, 7516, 'Caius the Shadow Monarch'),
    ('main', 3, 'edeatheheavenlysquire', 3, 12093, 'Edea the Heavenly Squire'),
    ('main', 4, 'ehthertheheavenlymonarch', 1, 12090, 'Ehther the Heavenly Monarch'),
    ('main', 5, 'eidostheunderworldsquire', 3, 12092, 'Eidos the Underworld Squire'),
    ('main', 6, 'erebustheunderworldmonarch', 3, 12091, 'Erebus the Underworld Monarch'),
    ('main', 7, 'escherthefrostvassal', 1, 11307, 'Escher the Frost Vassal'),
    ('main', 8, 'majestysfiend', 1, 11063, 'Majesty''s Fiend'),
    ('main', 9, 'mithrathethundervassal', 2, 11756, 'Mithra the Thunder Vassal'),
    ('main', 10, 'mobiusthefrostmonarch', 2, 6114, 'Mobius the Frost Monarch'),
    ('main', 11, 'mobiusthemegamonarch', 1, 10926, 'Mobius the Mega Monarch'),
    ('main', 12, 'domainofthetruemonarchs', 3, 11761, 'Domain of the True Monarchs'),
    ('main', 13, 'frostblastofthemonarchs', 1, 12264, 'Frost Blast of the Monarchs'),
    ('main', 14, 'marchofthemonarchs', 1, 10423, 'March of the Monarchs'),
    ('main', 15, 'oneforone', 1, 8197, 'One for One'),
    ('main', 16, 'pantheismofthemonarchs', 1, 12094, 'Pantheism of the Monarchs'),
    ('main', 17, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 18, 'returnofthemonarchs', 3, 10798, 'Return of the Monarchs'),
    ('main', 19, 'soulexchange', 2, 5099, 'Soul Exchange'),
    ('main', 20, 'tenacityofthemonarchs', 3, 11581, 'Tenacity of the Monarchs'),
    ('main', 21, 'themonarchsstormforth', 1, 11275, 'The Monarchs Stormforth'),
    ('main', 22, 'twintwisters', 1, 12175, 'Twin Twisters'),
    ('main', 23, 'theprimemonarch', 2, 12095, 'The Prime Monarch')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sylvio-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yugo / A — Speedroid (25 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yugo-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'speedroiddendendaikoduke', 3, 12278, 'Speedroid Den-Den Daiko Duke'),
    ('main', 2, 'speedroiddoubleyoyo', 3, 12049, 'Speedroid Double Yoyo'),
    ('main', 3, 'speedroidmenko', 1, 12051, 'Speedroid Menko'),
    ('main', 4, 'speedroidohajikid', 3, 12053, 'Speedroid Ohajikid'),
    ('main', 5, 'speedroidpachingokart', 3, 12279, 'Speedroid Pachingo-Kart'),
    ('main', 6, 'speedroidrazorang', 2, 12050, 'Speedroid Razorang'),
    ('main', 7, 'speedroidredeyeddice', 3, 12054, 'Speedroid Red-Eyed Dice'),
    ('main', 8, 'speedroidtaketomborg', 3, 12052, 'Speedroid Taketomborg'),
    ('main', 9, 'speedroidterrortop', 3, 12047, 'Speedroid Terrortop'),
    ('main', 10, 'speedroidtrieyeddice', 3, 12048, 'Speedroid Tri-Eyed Dice'),
    ('main', 11, 'ironcall', 2, 10008, 'Iron Call'),
    ('main', 12, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 13, 'shocksurprise', 1, 12057, 'Shock Surprise'),
    ('main', 14, 'speedrecovery', 3, 12056, 'Speed Recovery'),
    ('main', 15, 'synchroblastwave', 1, 7692, 'Synchro Blast Wave'),
    ('main', 16, 'synchrocracker', 1, 12058, 'Synchro Cracker'),
    ('main', 17, 'upstartgoblin', 1, 4895, 'Upstart Goblin'),
    ('main', 18, 'dicerollbattle', 2, 12059, 'Dice Roll Battle'),
    ('main', 19, 'urgenttuning', 1, 7920, 'Urgent Tuning'),
    ('extra', 20, 'clearwingsynchrodragon', 3, 11721, 'Clear Wing Synchro Dragon'),
    ('extra', 21, 'crystalwingsynchrodragon', 3, 12321, 'Crystal Wing Synchro Dragon'),
    ('extra', 22, 'hispeedroidchanbara', 2, 12055, 'Hi-Speedroid Chanbara'),
    ('extra', 23, 'hispeedroidhagoita', 3, 12157, 'Hi-Speedroid Hagoita'),
    ('extra', 24, 'hispeedroidkendama', 2, 11640, 'Hi-Speedroid Kendama'),
    ('extra', 25, 'hispeedroidpuzzle', 2, 12322, 'Hi-Speedroid Puzzle')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yugo-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yugo / B — Yang Zing (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yugo-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bianearthoftheyangzing', 3, 11238, 'Bi''an, Earth of the Yang Zing'),
    ('main', 2, 'bixiwateroftheyangzing', 3, 11239, 'Bixi, Water of the Yang Zing'),
    ('main', 3, 'chiwenlightoftheyangzing', 3, 11241, 'Chiwen, Light of the Yang Zing'),
    ('main', 4, 'jiaotudarknessoftheyangzing', 3, 11364, 'Jiaotu, Darkness of the Yang Zing'),
    ('main', 5, 'pulaowindoftheyangzing', 1, 11240, 'Pulao, Wind of the Yang Zing'),
    ('main', 6, 'suannifireoftheyangzing', 3, 11237, 'Suanni, Fire of the Yang Zing'),
    ('main', 7, 'taotieshadowoftheyangzing', 1, 11363, 'Taotie, Shadow of the Yang Zing'),
    ('main', 8, 'zefraniusecretoftheyangzing', 3, 11700, 'Zefraniu, Secret of the Yang Zing'),
    ('main', 9, 'zefraxitreasureoftheyangzing', 3, 11699, 'Zefraxi, Treasure of the Yang Zing'),
    ('main', 10, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 14, 'soulcharge', 1, 11159, 'Soul Charge'),
    ('main', 15, 'supplysquad', 2, 11147, 'Supply Squad'),
    ('main', 16, 'yangzingpath', 3, 11270, 'Yang Zing Path'),
    ('main', 17, 'yangzingprana', 1, 11271, 'Yang Zing Prana'),
    ('main', 18, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('main', 19, 'yangzingbrutality', 1, 11407, 'Yang Zing Brutality'),
    ('main', 20, 'yangzingcreation', 3, 11283, 'Yang Zing Creation'),
    ('extra', 21, 'armadeskeeperofboundaries', 1, 10648, 'Armades, Keeper of Boundaries'),
    ('extra', 22, 'baxiabrightnessoftheyangzing', 3, 11260, 'Baxia, Brightness of the Yang Zing'),
    ('extra', 23, 'chaofengphantomoftheyangzing', 3, 11722, 'Chaofeng, Phantom of the Yang Zing'),
    ('extra', 24, 'hotreddragonarchfiend', 1, 10842, 'Hot Red Dragon Archfiend'),
    ('extra', 25, 'ignisterprominencetheblastingdracoslayer', 1, 11834, 'Ignister Prominence, the Blasting Dracoslayer'),
    ('extra', 26, 'metaphyshorus', 2, 11569, 'Metaphys Horus'),
    ('extra', 27, 'trishuladragonoftheicebarrier', 1, 8732, 'Trishula, Dragon of the Ice Barrier'),
    ('extra', 28, 'yazieviloftheyangzing', 3, 11383, 'Yazi, Evil of the Yang Zing')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yugo-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yuto / A — Phantom Knights (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yuto-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'kagemuchaknight', 3, 9965, 'Kagemucha Knight'),
    ('main', 2, 'thephantomknightsofancientcloak', 3, 12198, 'The Phantom Knights of Ancient Cloak'),
    ('main', 3, 'thephantomknightsofclovenhelm', 2, 12201, 'The Phantom Knights of Cloven Helm'),
    ('main', 4, 'thephantomknightsoffragilearmor', 2, 12202, 'The Phantom Knights of Fragile Armor'),
    ('main', 5, 'thephantomknightsofraggedgloves', 3, 12200, 'The Phantom Knights of Ragged Gloves'),
    ('main', 6, 'thephantomknightsofsilentboots', 3, 12199, 'The Phantom Knights of Silent Boots'),
    ('main', 7, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 8, 'onigamicombo', 1, 9677, 'Oni-Gami Combo'),
    ('main', 9, 'phantomknightsspear', 2, 12204, 'Phantom Knights'' Spear'),
    ('main', 10, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 11, 'boobytrape', 2, 12208, 'Booby Trap E'),
    ('main', 12, 'needlebugnest', 1, 7769, 'Needlebug Nest'),
    ('main', 13, 'phantomknightsfogblade', 3, 12205, 'Phantom Knights'' Fog Blade'),
    ('main', 14, 'phantomknightssword', 3, 12206, 'Phantom Knights'' Sword'),
    ('main', 15, 'phantomknightswing', 3, 12207, 'Phantom Knights'' Wing'),
    ('main', 16, 'thephantomknightsofdarkgauntlets', 1, 12268, 'The Phantom Knights of Dark Gauntlets'),
    ('main', 17, 'thephantomknightsofshadebrigandine', 2, 12267, 'The Phantom Knights of Shade Brigandine'),
    ('main', 18, 'thephantomknightsofshadowveil', 3, 11404, 'The Phantom Knights of Shadow Veil'),
    ('main', 19, 'thephantomknightsoftombshield', 1, 12269, 'The Phantom Knights of Tomb Shield'),
    ('extra', 20, 'darkrebellionxyzdragon', 1, 11385, 'Dark Rebellion Xyz Dragon'),
    ('extra', 21, 'thephantomknightsofbreaksword', 3, 12203, 'The Phantom Knights of Break Sword')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yuto-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yuto / B — Burning Abyss (29 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yuto-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'alichmalebrancheoftheburningabyss', 1, 11506, 'Alich, Malebranche of the Burning Abyss'),
    ('main', 2, 'barbarmalebrancheoftheburningabyss', 1, 11773, 'Barbar, Malebranche of the Burning Abyss'),
    ('main', 3, 'calcabmalebrancheoftheburningabyss', 1, 11507, 'Calcab, Malebranche of the Burning Abyss'),
    ('main', 4, 'cirmalebrancheoftheburningabyss', 1, 11319, 'Cir, Malebranche of the Burning Abyss'),
    ('main', 5, 'cranecrane', 1, 10574, 'Crane Crane'),
    ('main', 6, 'farfamalebrancheoftheburningabyss', 3, 11632, 'Farfa, Malebranche of the Burning Abyss'),
    ('main', 7, 'graffmalebrancheoftheburningabyss', 1, 11318, 'Graff, Malebranche of the Burning Abyss'),
    ('main', 8, 'libicmalebrancheoftheburningabyss', 2, 11633, 'Libic, Malebranche of the Burning Abyss'),
    ('main', 9, 'rubicmalebrancheoftheburningabyss', 3, 11505, 'Rubic, Malebranche of the Burning Abyss'),
    ('main', 10, 'scarmmalebrancheoftheburningabyss', 3, 11317, 'Scarm, Malebranche of the Burning Abyss'),
    ('main', 11, 'thephantomknightsofancientcloak', 3, 12198, 'The Phantom Knights of Ancient Cloak'),
    ('main', 12, 'thephantomknightsofraggedgloves', 3, 12200, 'The Phantom Knights of Ragged Gloves'),
    ('main', 13, 'thephantomknightsofsilentboots', 3, 12199, 'The Phantom Knights of Silent Boots'),
    ('main', 14, 'tourguidefromtheunderworld', 1, 9702, 'Tour Guide From the Underworld'),
    ('main', 15, 'allureofdarkness', 2, 7570, 'Allure of Darkness'),
    ('main', 16, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 17, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 18, 'twintwisters', 2, 12175, 'Twin Twisters'),
    ('main', 19, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 20, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 21, 'karmacut', 1, 6619, 'Karma Cut'),
    ('main', 22, 'phantomknightsfogblade', 3, 12205, 'Phantom Knights'' Fog Blade'),
    ('main', 23, 'solemnstrike', 1, 12187, 'Solemn Strike'),
    ('extra', 24, 'dantepilgrimoftheburningabyss', 2, 11774, 'Dante, Pilgrim of the Burning Abyss'),
    ('extra', 25, 'virgilrockstaroftheburningabyss', 3, 11508, 'Virgil, Rock Star of the Burning Abyss'),
    ('extra', 26, 'beatriceladyoftheeternal', 1, 12108, 'Beatrice, Lady of the Eternal'),
    ('extra', 27, 'dantetraveleroftheburningabyss', 3, 11320, 'Dante, Traveler of the Burning Abyss'),
    ('extra', 28, 'darkrebellionxyzdragon', 3, 11385, 'Dark Rebellion Xyz Dragon'),
    ('extra', 29, 'thephantomknightsofbreaksword', 3, 12203, 'The Phantom Knights of Break Sword')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yuto-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yuya Sakaki / A — Performapal (32 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yuya-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'oddeyespendulumdragon', 3, 11213, 'Odd-Eyes Pendulum Dragon'),
    ('main', 2, 'performapalswordfish', 1, 11216, 'Performapal Sword Fish'),
    ('main', 3, 'performapalbowhopper', 1, 11678, 'Performapal Bowhopper'),
    ('main', 4, 'performapalskeeterskimmer', 1, 11214, 'Performapal Skeeter Skimmer'),
    ('main', 5, 'performapalelephammer', 1, 11677, 'Performapal Elephammer'),
    ('main', 6, 'performapalfriendonkey', 1, 11523, 'Performapal Friendonkey'),
    ('main', 7, 'performapalhiphippo', 1, 11217, 'Performapal Hip Hippo'),
    ('main', 8, 'performapalraingoat', 1, 12114, 'Performapal Rain Goat'),
    ('main', 9, 'performapaldrummerilla', 1, 11790, 'Performapal Drummerilla'),
    ('main', 10, 'performapaloddeyesunicorn', 3, 12276, 'Performapal Odd-Eyes Unicorn'),
    ('main', 11, 'performapalsilverclaw', 1, 11301, 'Performapal Silver Claw'),
    ('main', 12, 'performapaltrampolynx', 1, 11334, 'Performapal Trampolynx'),
    ('main', 13, 'performapalsalutiger', 1, 11331, 'Performapal Salutiger'),
    ('main', 14, 'performapalturntoad', 1, 11219, 'Performapal Turn Toad'),
    ('main', 15, 'performapalhelpprincess', 1, 11947, 'Performapal Helpprincess'),
    ('main', 16, 'performapalspringoose', 1, 11680, 'Performapal Springoose'),
    ('main', 17, 'performapalparrotrio', 1, 12375, 'Performapal Parrotrio'),
    ('main', 18, 'performapalpendulumsorcerer', 1, 11615, 'Performapal Pendulum Sorcerer'),
    ('main', 19, 'performapalskullcrobatjoker', 1, 11938, 'Performapal Skullcrobat Joker'),
    ('main', 20, 'performapaltrumpgirl', 1, 12115, 'Performapal Trump Girl'),
    ('main', 21, 'stargazermagician', 3, 11134, 'Stargazer Magician'),
    ('main', 22, 'timegazermagician', 3, 11135, 'Timegazer Magician'),
    ('main', 23, 'performapalwhipsnake', 1, 11215, 'Performapal Whip Snake'),
    ('main', 24, 'hippocarnival', 1, 11264, 'Hippo Carnival'),
    ('main', 25, 'pendulumcall', 1, 11940, 'Pendulum Call'),
    ('main', 26, 'performapaldramatictheater', 1, 12378, 'Performapal Dramatic Theater'),
    ('main', 27, 'skyiris', 3, 11939, 'Sky Iris'),
    ('main', 28, 'performapalcall', 1, 11587, 'Performapal Call'),
    ('main', 29, 'performapalpinchhelper', 1, 11741, 'Performapal Pinch Helper'),
    ('main', 30, 'performapalrevival', 1, 11402, 'Performapal Revival'),
    ('extra', 31, 'beasteyespendulumdragon', 3, 11513, 'Beast-Eyes Pendulum Dragon'),
    ('extra', 32, 'runeeyespendulumdragon', 3, 11565, 'Rune-Eyes Pendulum Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yuya-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yuya Sakaki / B — Odd-Eyes (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yuya-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'dragonpitmagician', 3, 11935, 'Dragonpit Magician'),
    ('main', 2, 'dragonpulsemagician', 3, 11934, 'Dragonpulse Magician'),
    ('main', 3, 'nobledragonmagician', 3, 11936, 'Nobledragon Magician'),
    ('main', 4, 'oafdragonmagician', 3, 11937, 'Oafdragon Magician'),
    ('main', 5, 'oddeyespendulumdragon', 3, 11213, 'Odd-Eyes Pendulum Dragon'),
    ('main', 6, 'performapalskullcrobatjoker', 1, 11938, 'Performapal Skullcrobat Joker'),
    ('main', 7, 'performapaltrumpgirl', 3, 12115, 'Performapal Trump Girl'),
    ('main', 8, 'wisdomeyemagician', 1, 11784, 'Wisdom-Eye Magician'),
    ('main', 9, 'xiangkemagician', 2, 11787, 'Xiangke Magician'),
    ('main', 10, 'xiangshengmagician', 3, 11788, 'Xiangsheng Magician'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'oddeyesfusion', 2, 12007, 'Odd-Eyes Fusion'),
    ('main', 14, 'pendulumcall', 1, 11940, 'Pendulum Call'),
    ('main', 15, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 16, 'skyiris', 3, 11939, 'Sky Iris'),
    ('main', 17, 'summonersart', 3, 7220, 'Summoner''s Art'),
    ('main', 18, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 19, 'royaldecree', 2, 4866, 'Royal Decree'),
    ('extra', 20, 'oddeyesvortexdragon', 3, 11989, 'Odd-Eyes Vortex Dragon'),
    ('extra', 21, 'runeeyespendulumdragon', 3, 11565, 'Rune-Eyes Pendulum Dragon'),
    ('extra', 22, 'oddeyesmeteorburstdragon', 3, 11941, 'Odd-Eyes Meteorburst Dragon'),
    ('extra', 23, 'oddeyesabsolutedragon', 3, 11942, 'Odd-Eyes Absolute Dragon'),
    ('extra', 24, 'oddeyesrebelliondragon', 3, 11835, 'Odd-Eyes Rebellion Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yuya-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Zuzu Boyle / A — Melodious Diva (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'zuzu-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ariathemelodiousdiva', 3, 11223, 'Aria the Melodious Diva'),
    ('main', 2, 'canonthemelodiousdiva', 3, 11336, 'Canon the Melodious Diva'),
    ('main', 3, 'crystalrose', 3, 11796, 'Crystal Rose'),
    ('main', 4, 'elegythemelodiousdiva', 3, 11338, 'Elegy the Melodious Diva'),
    ('main', 5, 'mozartathemelodiousmaestra', 2, 11225, 'Mozarta the Melodious Maestra'),
    ('main', 6, 'operathemelodiousdiva', 3, 11792, 'Opera the Melodious Diva'),
    ('main', 7, 'serenadethemelodiousdiva', 3, 11337, 'Serenade the Melodious Diva'),
    ('main', 8, 'shiningangel', 1, 4924, 'Shining Angel'),
    ('main', 9, 'shopinathemelodiousmaestra', 2, 11339, 'Shopina the Melodious Maestra'),
    ('main', 10, 'sonatathemelodiousdiva', 1, 11224, 'Sonata the Melodious Diva'),
    ('main', 11, 'sopranothemelodioussongstress', 1, 11685, 'Soprano the Melodious Songstress'),
    ('main', 12, 'tamtamthemelodiousdiva', 3, 11793, 'Tamtam the Melodious Diva'),
    ('main', 13, '1stmovementsolo', 3, 11391, '1st Movement Solo'),
    ('main', 14, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 16, 'soulcharge', 1, 11159, 'Soul Charge'),
    ('main', 17, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 18, 'pinpointguard', 1, 10550, 'Pinpoint Guard'),
    ('extra', 19, 'bloomdivathemelodiouschoir', 3, 11715, 'Bloom Diva the Melodious Choir')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'zuzu-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Zuzu Boyle / B — Melodious Maestra (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'zuzu-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ariathemelodiousdiva', 3, 11223, 'Aria the Melodious Diva'),
    ('main', 2, 'athena', 1, 7571, 'Athena'),
    ('main', 3, 'elegythemelodiousdiva', 1, 11338, 'Elegy the Melodious Diva'),
    ('main', 4, 'honest', 2, 7574, 'Honest'),
    ('main', 5, 'mozartathemelodiousmaestra', 2, 11225, 'Mozarta the Melodious Maestra'),
    ('main', 6, 'scorethemelodiousdiva', 2, 12121, 'Score the Melodious Diva'),
    ('main', 7, 'shopinathemelodiousmaestra', 2, 11339, 'Shopina the Melodious Maestra'),
    ('main', 8, 'solothemelodioussongstress', 3, 12120, 'Solo the Melodious Songstress'),
    ('main', 9, 'sonatathemelodiousdiva', 3, 11224, 'Sonata the Melodious Diva'),
    ('main', 10, 'sopranothemelodioussongstress', 3, 11685, 'Soprano the Melodious Songstress'),
    ('main', 11, '1stmovementsolo', 3, 11391, '1st Movement Solo'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'polymerization', 2, 4837, 'Polymerization'),
    ('main', 15, 'raigeki', 1, 4343, 'Raigeki'),
    ('main', 16, 'soulcharge', 1, 11159, 'Soul Charge'),
    ('main', 17, 'twintwisters', 1, 12175, 'Twin Twisters'),
    ('main', 18, 'valhallahallofthefallen', 2, 7573, 'Valhalla, Hall of the Fallen'),
    ('main', 19, 'breakthroughskill', 1, 10437, 'Breakthrough Skill'),
    ('main', 20, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 21, 'damagecondenser', 1, 6582, 'Damage Condenser'),
    ('main', 22, 'damagegate', 1, 8845, 'Damage Gate'),
    ('main', 23, 'drowningmirrorforce', 1, 12347, 'Drowning Mirror Force'),
    ('extra', 24, 'bloomdivathemelodiouschoir', 3, 11715, 'Bloom Diva the Melodious Choir'),
    ('extra', 25, 'bloomprimathemelodiouschoir', 3, 12317, 'Bloom Prima the Melodious Choir'),
    ('extra', 26, 'schubertathemelodiousmaestra', 3, 11714, 'Schuberta the Melodious Maestra'),
    ('extra', 27, 'fairycheergirl', 3, 10527, 'Fairy Cheer Girl')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'zuzu-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

commit;
