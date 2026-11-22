-- 016: importa personagens e decks (séries: First, GX) de .decks/decks.json.
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
    ('Clássico', 'yu-gi-oh', 1),
    ('GX', 'yu-gi-oh-gx', 2),
    ('5D''s', 'yu-gi-oh-5ds', 3),
    ('ZEXAL', 'yu-gi-oh-zexal', 4),
    ('ARC-V', 'yu-gi-oh-arc-v', 5)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order, updated_at = now();

insert into public.characters (anime_id, name, slug, image, image_small, series, sort_order, is_duelist)
select a.id, v.name, v.slug, v.image, v.image_small, v.series, v.sort_order, true
from (values
    ('yu-gi-oh', 'Bakura Ryou', 'bakura-ryou', '/characters/grande/First_BakuraRyou.png', '/characters/pequeno/First_BakuraRyou.png', 'classic', 1),
    ('yu-gi-oh', 'Bandit Keith', 'bandit-keith', '/characters/grande/First_BanditKeith.png', '/characters/pequeno/First_BanditKeith.png', 'classic', 2),
    ('yu-gi-oh', 'Duke Devlin', 'duke-devlin', '/characters/grande/First_DukeDevlin.png', '/characters/pequeno/First_DukeDevlin.png', 'classic', 3),
    ('yu-gi-oh', 'Ishizu Ishtar', 'ishizu-ishtar', '/characters/grande/First_IshizuIshtar.png', '/characters/pequeno/First_IshizuIshtar.png', 'classic', 4),
    ('yu-gi-oh', 'Joey Wheeler', 'joey-wheeler', '/characters/grande/First_JoeyWheeler.png', '/characters/pequeno/First_JoeyWheeler.png', 'classic', 5),
    ('yu-gi-oh', 'Mai Valentine', 'mai-valentine', '/characters/grande/First_MaiValentine.png', '/characters/pequeno/First_MaiValentine.png', 'classic', 6),
    ('yu-gi-oh', 'Mako Tsunami', 'mako-tsunami', '/characters/grande/First_MakoTsunami.png', '/characters/pequeno/First_MakoTsunami.png', 'classic', 7),
    ('yu-gi-oh', 'Marik Ishtar', 'marik-ishtar', '/characters/grande/First_MarikIshtar.png', '/characters/pequeno/First_MarikIshtar.png', 'classic', 8),
    ('yu-gi-oh', 'Maximillion Pegasus', 'maximillion-pegasus', '/characters/grande/First_MaximillionPegasus.png', '/characters/pequeno/First_MaximillionPegasus.png', 'classic', 9),
    ('yu-gi-oh', 'Mokuba Kaiba', 'mokuba-kaiba', '/characters/grande/First_MokubaKaiba.png', '/characters/pequeno/First_MokubaKaiba.png', 'classic', 10),
    ('yu-gi-oh', 'Odion', 'odion', '/characters/grande/First_Odion.png', '/characters/pequeno/First_Odion.png', 'classic', 11),
    ('yu-gi-oh', 'Rebecca Hawkins', 'rebecca-hawkins', '/characters/grande/First_RebeccaHawkins.png', '/characters/pequeno/First_RebeccaHawkins.png', 'classic', 12),
    ('yu-gi-oh', 'Seto Kaiba', 'seto-kaiba', '/characters/grande/First_SetoKaiba.png', '/characters/pequeno/First_SetoKaiba.png', 'classic', 13),
    ('yu-gi-oh', 'Shadi', 'shadi', '/characters/grande/First_Shadi.png', '/characters/pequeno/First_Shadi.png', 'classic', 14),
    ('yu-gi-oh', 'Solomon Muto', 'solomon-muto', '/characters/grande/First_SolomonMuto.png', '/characters/pequeno/First_SolomonMuto.png', 'classic', 15),
    ('yu-gi-oh', 'Tristan Taylor', 'tristan-taylor', '/characters/grande/First_TristanTaylor.png', '/characters/pequeno/First_TristanTaylor.png', 'classic', 16),
    ('yu-gi-oh', 'Téa Gardner', 'tea-gardner', '/characters/grande/First_TeaGardner.png', '/characters/pequeno/First_TeaGardner.png', 'classic', 17),
    ('yu-gi-oh', 'Weevil Underwood', 'weevil-underwood', '/characters/grande/First_WeevilUnderwood.png', '/characters/pequeno/First_WeevilUnderwood.png', 'classic', 18),
    ('yu-gi-oh', 'Yami Yugi', 'yami-yugi', '/characters/grande/First_YamiYugi.png', '/characters/pequeno/First_YamiYugi.png', 'classic', 19),
    ('yu-gi-oh', 'Yugi Muto', 'yugi-muto', '/characters/grande/First_YugiMuto.png', '/characters/pequeno/First_YugiMuto.png', 'classic', 20),
    ('yu-gi-oh-gx', 'Adrian Gecko', 'adrian-gecko', '/characters/grande/GX_AdrianGecko.png', '/characters/pequeno/GX_AdrianGecko.png', 'gx', 1),
    ('yu-gi-oh-gx', 'Alexis Rhodes', 'alexis-rhodes', '/characters/grande/GX_AlexisRhodes.png', '/characters/pequeno/GX_AlexisRhodes.png', 'gx', 2),
    ('yu-gi-oh-gx', 'Aster Phoenix', 'aster-phoenix', '/characters/grande/GX_AsterPhoenix.png', '/characters/pequeno/GX_AsterPhoenix.png', 'gx', 3),
    ('yu-gi-oh-gx', 'Atticus Rhodes', 'atticus-rhodes', '/characters/grande/GX_AtticusRhodes.png', '/characters/pequeno/GX_AtticusRhodes.png', 'gx', 4),
    ('yu-gi-oh-gx', 'Axel Brodie', 'axel-brodie', '/characters/grande/GX_AxelBrodie.png', '/characters/pequeno/GX_AxelBrodie.png', 'gx', 5),
    ('yu-gi-oh-gx', 'Bastion Misawa', 'bastion-misawa', '/characters/grande/GX_BastionMisawa.png', '/characters/pequeno/GX_BastionMisawa.png', 'gx', 6),
    ('yu-gi-oh-gx', 'Blair Flannigan', 'blair-flannigan', '/characters/grande/GX_BlairFlannigan.png', '/characters/pequeno/GX_BlairFlannigan.png', 'gx', 7),
    ('yu-gi-oh-gx', 'Chazz Princeton', 'chazz-princeton', '/characters/grande/GX_ChazzPrinceton.png', '/characters/pequeno/GX_ChazzPrinceton.png', 'gx', 8),
    ('yu-gi-oh-gx', 'Chumley Huffington', 'chumley-huffington', '/characters/grande/GX_ChumleyHuffington.png', '/characters/pequeno/GX_ChumleyHuffington.png', 'gx', 9),
    ('yu-gi-oh-gx', 'Dr. Vellian Crowler', 'vellian-crowler', '/characters/grande/GX_VellianCrowler.png', '/characters/pequeno/GX_VellianCrowler.png', 'gx', 10),
    ('yu-gi-oh-gx', 'Jaden Yuki', 'jaden-yuki', '/characters/grande/GX_JadenYuki.png', '/characters/pequeno/GX_JadenYuki.png', 'gx', 11),
    ('yu-gi-oh-gx', 'Jesse Anderson', 'jesse-anderson', '/characters/grande/GX_JesseAnderson.png', '/characters/pequeno/GX_JesseAnderson.png', 'gx', 12),
    ('yu-gi-oh-gx', 'Jim Crocodile Cook', 'jim-cook', '/characters/grande/GX_JimCook.png', '/characters/pequeno/GX_JimCook.png', 'gx', 13),
    ('yu-gi-oh-gx', 'Kagemaru', 'kagemaru', '/characters/grande/GX_Kagemaru.png', '/characters/pequeno/GX_Kagemaru.png', 'gx', 14),
    ('yu-gi-oh-gx', 'Nightshroud', 'nightshroud', '/characters/grande/GX_Nightshroud.png', '/characters/pequeno/GX_Nightshroud.png', 'gx', 15),
    ('yu-gi-oh-gx', 'Sartorius Kumar', 'sartorius-kumar', '/characters/grande/GX_SartoriusKumar.png', '/characters/pequeno/GX_SartoriusKumar.png', 'gx', 16),
    ('yu-gi-oh-gx', 'Syrus Truesdale', 'syrus-truesdale', '/characters/grande/GX_SyrusTruesdale.png', '/characters/pequeno/GX_SyrusTruesdale.png', 'gx', 17),
    ('yu-gi-oh-gx', 'Tyranno Hassleberry', 'tyranno-hassleberry', '/characters/grande/GX_TyrannoHassleberry.png', '/characters/pequeno/GX_TyrannoHassleberry.png', 'gx', 18),
    ('yu-gi-oh-gx', 'Yubel', 'yubel', '/characters/grande/GX_Yubel.png', '/characters/pequeno/GX_Yubel.png', 'gx', 19),
    ('yu-gi-oh-gx', 'Zane Truesdale', 'zane-truesdale', '/characters/grande/GX_ZaneTruesdale.png', '/characters/pequeno/GX_ZaneTruesdale.png', 'gx', 20)
) as v(anime_slug, name, slug, image, image_small, series, sort_order)
join public.animes a on a.slug = v.anime_slug
on conflict (slug) do update
  set anime_id = excluded.anime_id, name = excluded.name, image = excluded.image,
      image_small = excluded.image_small, series = excluded.series,
      sort_order = excluded.sort_order, updated_at = now();

insert into public.anime_decks (name, slug)
values
    ('Final Destiny', 'bakura-ryou-a'),
    ('Dark Necrofear', 'bakura-ryou-b'),
    ('Zera Machine', 'bandit-keith-a'),
    ('Machine Burn', 'bandit-keith-b'),
    ('Lucky Dice', 'duke-devlin-a'),
    ('Gradius', 'duke-devlin-b'),
    ('Grave Fairy', 'ishizu-ishtar-a'),
    ('Lightsworn', 'ishizu-ishtar-b'),
    ('Red-Eyes', 'joey-wheeler-a'),
    ('Jinzo', 'joey-wheeler-b'),
    ('Amazoness', 'mai-valentine-a'),
    ('Harpie', 'mai-valentine-b'),
    ('Great Ocean', 'mako-tsunami-a'),
    ('Mermail Abyss', 'mako-tsunami-b'),
    ('Legendary Fiend', 'marik-ishtar-a'),
    ('Slime Token', 'marik-ishtar-b'),
    ('Toons', 'maximillion-pegasus-a'),
    ('Relinquished', 'maximillion-pegasus-b'),
    ('Reptile Plant', 'mokuba-kaiba-a'),
    ('Worm Royalty', 'mokuba-kaiba-b'),
    ('Skill Drain', 'odion-a'),
    ('Hieratic Dragon', 'odion-b'),
    ('Life Shadow', 'rebecca-hawkins-a'),
    ('Ghostrick Night', 'rebecca-hawkins-b'),
    ('XYZ-Dragon', 'seto-kaiba-a'),
    ('Blue-Eyes', 'seto-kaiba-b'),
    ('End of the World', 'shadi-a'),
    ('Armageddon', 'shadi-b'),
    ('Warrior Dragon', 'solomon-muto-a'),
    ('Forbidden One', 'solomon-muto-b'),
    ('Commander', 'tristan-taylor-a'),
    ('Legendary Six', 'tristan-taylor-b'),
    ('Angel Fairy', 'tea-gardner-a'),
    ('Madolche', 'tea-gardner-b'),
    ('Insect Evolution', 'weevil-underwood-a'),
    ('Ultimate Insect', 'weevil-underwood-b'),
    ('Black Chaos', 'yami-yugi-a'),
    ('Dark Magician', 'yami-yugi-b'),
    ('Fusion', 'yugi-muto-a'),
    ('Skull Servant', 'yugi-muto-b'),
    ('Turbulence', 'adrian-gecko-a'),
    ('Cloudians', 'adrian-gecko-b'),
    ('Cyber Blader', 'alexis-rhodes-a'),
    ('Ice Barrier', 'alexis-rhodes-b'),
    ('Destiny HERO', 'aster-phoenix-a'),
    ('Destiny End', 'aster-phoenix-b'),
    ('Metal Dragon', 'atticus-rhodes-a'),
    ('Darkness Dragon', 'atticus-rhodes-b'),
    ('Volcanic', 'axel-brodie-a'),
    ('Fire Fist', 'axel-brodie-b'),
    ('Dinosaur H2O', 'bastion-misawa-a'),
    ('Dragon Ruler', 'bastion-misawa-b'),
    ('Twin Princesses', 'blair-flannigan-a'),
    ('Mystic Sword', 'blair-flannigan-b'),
    ('Ojama Trio', 'chazz-princeton-a'),
    ('Dragon LV', 'chazz-princeton-b'),
    ('Des Koalas', 'chumley-huffington-a'),
    ('The Fabled', 'chumley-huffington-b'),
    ('Ancient Gear', 'vellian-crowler-a'),
    ('Gadjiltron', 'vellian-crowler-b'),
    ('Neo-Spacian', 'jaden-yuki-a'),
    ('Elemental HERO', 'jaden-yuki-b'),
    ('Crystal Beast', 'jesse-anderson-a'),
    ('Crystal Rainbow', 'jesse-anderson-b'),
    ('Rock Golem', 'jim-cook-a'),
    ('Gem-Knight', 'jim-cook-b'),
    ('The Creator', 'kagemaru-a'),
    ('Trap Monster', 'kagemaru-b'),
    ('Darkness', 'nightshroud-a'),
    ('Archfiend', 'nightshroud-b'),
    ('Arcana Force', 'sartorius-kumar-a'),
    ('Constellar', 'sartorius-kumar-b'),
    ('Vehicroid', 'syrus-truesdale-a'),
    ('Scrap Machine', 'syrus-truesdale-b'),
    ('Tyranno-saurus', 'tyranno-hassleberry-a'),
    ('Jurrac', 'tyranno-hassleberry-b'),
    ('Terror Incarnate', 'yubel-a'),
    ('Doomsday', 'yubel-b'),
    ('Cyber Dragons', 'zane-truesdale-a'),
    ('Mecha Phantom', 'zane-truesdale-b')
on conflict (slug) do update set name = excluded.name, updated_at = now();

insert into public.character_decks (character_id, deck_id, label, is_primary, sort_order)
select c.id, d.id, v.label, v.is_primary, v.sort_order
from (values
    ('bakura-ryou', 'bakura-ryou-a', 'A', true, 0),
    ('bakura-ryou', 'bakura-ryou-b', 'B', false, 1),
    ('bandit-keith', 'bandit-keith-a', 'A', true, 0),
    ('bandit-keith', 'bandit-keith-b', 'B', false, 1),
    ('duke-devlin', 'duke-devlin-a', 'A', true, 0),
    ('duke-devlin', 'duke-devlin-b', 'B', false, 1),
    ('ishizu-ishtar', 'ishizu-ishtar-a', 'A', true, 0),
    ('ishizu-ishtar', 'ishizu-ishtar-b', 'B', false, 1),
    ('joey-wheeler', 'joey-wheeler-a', 'A', true, 0),
    ('joey-wheeler', 'joey-wheeler-b', 'B', false, 1),
    ('mai-valentine', 'mai-valentine-a', 'A', true, 0),
    ('mai-valentine', 'mai-valentine-b', 'B', false, 1),
    ('mako-tsunami', 'mako-tsunami-a', 'A', true, 0),
    ('mako-tsunami', 'mako-tsunami-b', 'B', false, 1),
    ('marik-ishtar', 'marik-ishtar-a', 'A', true, 0),
    ('marik-ishtar', 'marik-ishtar-b', 'B', false, 1),
    ('maximillion-pegasus', 'maximillion-pegasus-a', 'A', true, 0),
    ('maximillion-pegasus', 'maximillion-pegasus-b', 'B', false, 1),
    ('mokuba-kaiba', 'mokuba-kaiba-a', 'A', true, 0),
    ('mokuba-kaiba', 'mokuba-kaiba-b', 'B', false, 1),
    ('odion', 'odion-a', 'A', true, 0),
    ('odion', 'odion-b', 'B', false, 1),
    ('rebecca-hawkins', 'rebecca-hawkins-a', 'A', true, 0),
    ('rebecca-hawkins', 'rebecca-hawkins-b', 'B', false, 1),
    ('seto-kaiba', 'seto-kaiba-a', 'A', true, 0),
    ('seto-kaiba', 'seto-kaiba-b', 'B', false, 1),
    ('shadi', 'shadi-a', 'A', true, 0),
    ('shadi', 'shadi-b', 'B', false, 1),
    ('solomon-muto', 'solomon-muto-a', 'A', true, 0),
    ('solomon-muto', 'solomon-muto-b', 'B', false, 1),
    ('tristan-taylor', 'tristan-taylor-a', 'A', true, 0),
    ('tristan-taylor', 'tristan-taylor-b', 'B', false, 1),
    ('tea-gardner', 'tea-gardner-a', 'A', true, 0),
    ('tea-gardner', 'tea-gardner-b', 'B', false, 1),
    ('weevil-underwood', 'weevil-underwood-a', 'A', true, 0),
    ('weevil-underwood', 'weevil-underwood-b', 'B', false, 1),
    ('yami-yugi', 'yami-yugi-a', 'A', true, 0),
    ('yami-yugi', 'yami-yugi-b', 'B', false, 1),
    ('yugi-muto', 'yugi-muto-a', 'A', true, 0),
    ('yugi-muto', 'yugi-muto-b', 'B', false, 1),
    ('adrian-gecko', 'adrian-gecko-a', 'A', true, 0),
    ('adrian-gecko', 'adrian-gecko-b', 'B', false, 1),
    ('alexis-rhodes', 'alexis-rhodes-a', 'A', true, 0),
    ('alexis-rhodes', 'alexis-rhodes-b', 'B', false, 1),
    ('aster-phoenix', 'aster-phoenix-a', 'A', true, 0),
    ('aster-phoenix', 'aster-phoenix-b', 'B', false, 1),
    ('atticus-rhodes', 'atticus-rhodes-a', 'A', true, 0),
    ('atticus-rhodes', 'atticus-rhodes-b', 'B', false, 1),
    ('axel-brodie', 'axel-brodie-a', 'A', true, 0),
    ('axel-brodie', 'axel-brodie-b', 'B', false, 1),
    ('bastion-misawa', 'bastion-misawa-a', 'A', true, 0),
    ('bastion-misawa', 'bastion-misawa-b', 'B', false, 1),
    ('blair-flannigan', 'blair-flannigan-a', 'A', true, 0),
    ('blair-flannigan', 'blair-flannigan-b', 'B', false, 1),
    ('chazz-princeton', 'chazz-princeton-a', 'A', true, 0),
    ('chazz-princeton', 'chazz-princeton-b', 'B', false, 1),
    ('chumley-huffington', 'chumley-huffington-a', 'A', true, 0),
    ('chumley-huffington', 'chumley-huffington-b', 'B', false, 1),
    ('vellian-crowler', 'vellian-crowler-a', 'A', true, 0),
    ('vellian-crowler', 'vellian-crowler-b', 'B', false, 1),
    ('jaden-yuki', 'jaden-yuki-a', 'A', true, 0),
    ('jaden-yuki', 'jaden-yuki-b', 'B', false, 1),
    ('jesse-anderson', 'jesse-anderson-a', 'A', true, 0),
    ('jesse-anderson', 'jesse-anderson-b', 'B', false, 1),
    ('jim-cook', 'jim-cook-a', 'A', true, 0),
    ('jim-cook', 'jim-cook-b', 'B', false, 1),
    ('kagemaru', 'kagemaru-a', 'A', true, 0),
    ('kagemaru', 'kagemaru-b', 'B', false, 1),
    ('nightshroud', 'nightshroud-a', 'A', true, 0),
    ('nightshroud', 'nightshroud-b', 'B', false, 1),
    ('sartorius-kumar', 'sartorius-kumar-a', 'A', true, 0),
    ('sartorius-kumar', 'sartorius-kumar-b', 'B', false, 1),
    ('syrus-truesdale', 'syrus-truesdale-a', 'A', true, 0),
    ('syrus-truesdale', 'syrus-truesdale-b', 'B', false, 1),
    ('tyranno-hassleberry', 'tyranno-hassleberry-a', 'A', true, 0),
    ('tyranno-hassleberry', 'tyranno-hassleberry-b', 'B', false, 1),
    ('yubel', 'yubel-a', 'A', true, 0),
    ('yubel', 'yubel-b', 'B', false, 1),
    ('zane-truesdale', 'zane-truesdale-a', 'A', true, 0),
    ('zane-truesdale', 'zane-truesdale-b', 'B', false, 1)
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

-- Bakura Ryou / A — Final Destiny (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bakura-ryou-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'headlessknight', 2, 5221, 'Headless Knight'),
    ('main', 2, 'acatofillomen', 3, 5520, 'A Cat of Ill Omen'),
    ('main', 3, 'battlefader', 2, 8617, 'Battle Fader'),
    ('main', 4, 'darkrulerhades', 1, 5301, 'Dark Ruler Ha Des'),
    ('main', 5, 'doomcaliberknight', 2, 6001, 'Doomcaliber Knight'),
    ('main', 6, 'maneaterbug', 2, 4507, 'Man-Eater Bug'),
    ('main', 7, 'maskofdarkness', 1, 4108, 'Mask of Darkness'),
    ('main', 8, 'spiritreaper', 2, 5526, 'Spirit Reaper'),
    ('main', 9, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 10, 'magicalmallet', 3, 6541, 'Magical Mallet'),
    ('main', 11, 'nightmaressteelcage', 2, 5120, 'Nightmare''s Steelcage'),
    ('main', 12, 'onedayofpeace', 1, 9778, 'One Day of Peace'),
    ('main', 13, 'spiritmessagea', 2, 5273, 'Spirit Message "A"'),
    ('main', 14, 'spiritmessagei', 2, 5271, 'Spirit Message "I"'),
    ('main', 15, 'spiritmessagel', 2, 5274, 'Spirit Message "L"'),
    ('main', 16, 'spiritmessagen', 2, 5272, 'Spirit Message "N"'),
    ('main', 17, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 18, 'upstartgoblin', 3, 4895, 'Upstart Goblin'),
    ('main', 19, 'goodgoblinhousekeeping', 3, 6280, 'Good Goblin Housekeeping'),
    ('main', 20, 'destinyboard', 3, 5224, 'Destiny Board')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bakura-ryou-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bakura Ryou / B — Dark Necrofear (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bakura-ryou-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'beiigevanguardofdarkworld', 3, 6501, 'Beiige, Vanguard of Dark World'),
    ('main', 2, 'browwhuntsmanofdarkworld', 3, 6502, 'Broww, Huntsman of Dark World'),
    ('main', 3, 'caiustheshadowmonarch', 3, 7516, 'Caius the Shadow Monarch'),
    ('main', 4, 'chaoshunter', 3, 9454, 'Chaos Hunter'),
    ('main', 5, 'darknecrofear', 3, 5222, 'Dark Necrofear'),
    ('main', 6, 'darkarmeddragon', 1, 7421, 'Dark Armed Dragon'),
    ('main', 7, 'doomcaliberknight', 3, 6001, 'Doomcaliber Knight'),
    ('main', 8, 'giantgerm', 3, 4921, 'Giant Germ'),
    ('main', 9, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 10, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 11, 'tragoedia', 2, 8089, 'Tragoedia'),
    ('main', 12, 'trancearchfiend', 3, 9909, 'Trance Archfiend'),
    ('main', 13, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 14, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 15, 'thebeginningoftheend', 2, 7452, 'The Beginning of the End'),
    ('main', 16, 'thegatesofdarkworld', 2, 9715, 'The Gates of Dark World'),
    ('main', 17, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 18, 'escapefromthedarkdimension', 3, 7471, 'Escape from the Dark Dimension'),
    ('extra', 19, 'number11bigeye', 1, 9861, 'Number 11: Big Eye'),
    ('extra', 20, 'number40gimmickpuppetofstrings', 1, 10216, 'Number 40: Gimmick Puppet of Strings')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bakura-ryou-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bandit Keith / A — Zera Machine (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bandit-keith-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bat', 1, 4417, 'Bat'),
    ('main', 2, 'gatekeeper', 1, 4292, 'Gatekeeper'),
    ('main', 3, 'giganto', 1, 4425, 'Giganto'),
    ('main', 4, 'pendulummachine', 1, 4394, 'Pendulum Machine'),
    ('main', 5, 'swordslasher', 1, 4411, 'Sword Slasher'),
    ('main', 6, 'slotmachine', 1, 4729, 'Slot Machine'),
    ('main', 7, 'unicycular', 3, 8612, 'Unicycular'),
    ('main', 8, 'adhesiveexplosive', 2, 6589, 'Adhesive Explosive'),
    ('main', 9, 'barreldragon', 1, 4749, 'Barrel Dragon'),
    ('main', 10, 'bicular', 3, 8613, 'Bicular'),
    ('main', 11, 'blastsphere', 1, 4742, 'Blast Sphere'),
    ('main', 12, 'manjuofthetenthousandhands', 3, 5900, 'Manju of the Ten Thousand Hands'),
    ('main', 13, 'tingoldfish', 2, 9979, 'Tin Goldfish'),
    ('main', 14, 'tricular', 3, 8614, 'Tricular'),
    ('main', 15, 'zerathemant', 1, 4366, 'Zera the Mant'),
    ('main', 16, '7completed', 2, 4806, '7 Completed'),
    ('main', 17, 'stopdefense', 2, 4326, 'Stop Defense'),
    ('main', 18, 'zeraritual', 3, 4677, 'Zera Ritual'),
    ('main', 19, 'timemachine', 2, 4794, 'Time Machine'),
    ('main', 20, 'biofalcon', 1, 8797, 'Biofalcon'),
    ('main', 21, 'physicaldouble', 1, 5621, 'Physical Double'),
    ('main', 22, 'puzzlereborn', 1, 10568, 'Puzzle Reborn'),
    ('main', 23, 'ritualbuster', 1, 8512, 'Ritual Buster'),
    ('main', 24, 'groundattackerbugroth', 2, 4281, 'Ground Attacker Bugroth')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bandit-keith-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bandit Keith / B — Machine Burn (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bandit-keith-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blacksalvo', 3, 8001, 'Black Salvo'),
    ('main', 2, 'blastsphere', 3, 4742, 'Blast Sphere'),
    ('main', 3, 'bowganian', 2, 5687, 'Bowganian'),
    ('main', 4, 'cannonsoldier', 2, 4518, 'Cannon Soldier'),
    ('main', 5, 'cardcard', 2, 10029, 'Cardcar D'),
    ('main', 6, 'marshmallon', 1, 6000, 'Marshmallon'),
    ('main', 7, 'chainstrike', 2, 6904, 'Chain Strike'),
    ('main', 8, 'darkroomofnightmare', 3, 5531, 'Dark Room of Nightmare'),
    ('main', 9, 'messengerofpeace', 3, 4938, 'Messenger of Peace'),
    ('main', 10, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 11, 'poisonoftheoldman', 3, 5607, 'Poison of the Old Man'),
    ('main', 12, 'chaindetonation', 2, 6915, 'Chain Detonation'),
    ('main', 13, 'dimensionwall', 3, 6448, 'Dimension Wall'),
    ('main', 14, 'jarofgreed', 2, 5210, 'Jar of Greed'),
    ('main', 15, 'magiccylinder', 3, 5124, 'Magic Cylinder'),
    ('main', 16, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 17, 'secretbarrel', 1, 5620, 'Secret Barrel'),
    ('main', 18, 'zomathespirit', 3, 5935, 'Zoma the Spirit'),
    ('extra', 19, 'lightningwarrior', 2, 8736, 'Lightning Warrior')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bandit-keith-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Duke Devlin / A — Lucky Dice (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'duke-devlin-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlefader', 2, 8617, 'Battle Fader'),
    ('main', 2, 'dicejar', 2, 5424, 'Dice Jar'),
    ('main', 3, 'maximumsix', 1, 5943, 'Maximum Six'),
    ('main', 4, 'morphingjar', 1, 4597, 'Morphing Jar'),
    ('main', 5, 'morphingjar2', 2, 4969, 'Morphing Jar #2'),
    ('main', 6, 'roulettebarrel', 2, 5599, 'Roulette Barrel'),
    ('main', 7, 'snipehunter', 2, 6879, 'Snipe Hunter'),
    ('main', 8, 'dangerousmachinetype6', 2, 5944, 'Dangerous Machine Type-6'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'dicephoon', 3, 9937, 'Dicephoon'),
    ('main', 11, 'gracefuldice', 3, 4815, 'Graceful Dice'),
    ('main', 12, 'dicereroll', 3, 5797, 'Dice Re-Roll'),
    ('main', 13, 'needlewall', 2, 5445, 'Needle Wall'),
    ('main', 14, 'skulldice', 3, 4816, 'Skull Dice'),
    ('main', 15, 'onitankt34', 3, 4981, 'Oni Tank T-34'),
    ('main', 16, 'gamble', 1, 4950, 'Gamble'),
    ('main', 17, 'michizure', 1, 4939, 'Michizure'),
    ('main', 18, 'spikebot', 2, 4778, 'Spikebot'),
    ('main', 19, 'fairymeteorcrush', 2, 5128, 'Fairy Meteor Crush'),
    ('main', 20, 'strikeninja', 2, 5817, 'Strike Ninja')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'duke-devlin-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Duke Devlin / B — Gradius (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'duke-devlin-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gradius', 1, 5140, 'Gradius'),
    ('main', 2, 'bluethundert45', 3, 7438, 'Blue Thunder T-45'),
    ('main', 3, 'cybereltanin', 2, 8430, 'Cyber Eltanin'),
    ('main', 4, 'falchionbeta', 3, 8330, 'Falchionβ'),
    ('main', 5, 'honest', 1, 7574, 'Honest'),
    ('main', 6, 'jadeknight', 3, 7843, 'Jade Knight'),
    ('main', 7, 'lordbritishspacefighter', 3, 8470, 'Lord British Space Fighter'),
    ('main', 8, 'shiningangel', 2, 4924, 'Shining Angel'),
    ('main', 9, 'victoryviperxx03', 3, 6684, 'Victory Viper XX03'),
    ('main', 10, 'axeofdespair', 3, 4310, 'Axe of Despair'),
    ('main', 11, 'creatureswap', 1, 5162, 'Creature Swap'),
    ('main', 12, 'enemycontroller', 2, 5505, 'Enemy Controller'),
    ('main', 13, 'limiterremoval', 1, 5129, 'Limiter Removal'),
    ('main', 14, 'magepower', 1, 5213, 'Mage Power'),
    ('main', 15, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'unitedwestand', 3, 5212, 'United We Stand'),
    ('main', 17, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 18, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('main', 19, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('extra', 20, 'geargigantx', 3, 10176, 'Gear Gigant X'),
    ('extra', 21, 'starliegepaladynamo', 3, 10340, 'Starliege Paladynamo')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'duke-devlin-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Ishizu Ishtar / A — Grave Fairy (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'ishizu-ishtar-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'graveprotector', 1, 6039, 'Grave Protector'),
    ('main', 2, 'gravekeepersassailant', 2, 5517, 'Gravekeeper''s Assailant'),
    ('main', 3, 'gravekeeperscannonholder', 1, 5516, 'Gravekeeper''s Cannonholder'),
    ('main', 4, 'gravekeeperschief', 2, 5515, 'Gravekeeper''s Chief'),
    ('main', 5, 'gravekeeperscurse', 2, 5510, 'Gravekeeper''s Curse'),
    ('main', 6, 'gravekeepersdescendant', 3, 8639, 'Gravekeeper''s Descendant'),
    ('main', 7, 'gravekeeperscommandant', 2, 7106, 'Gravekeeper''s Commandant'),
    ('main', 8, 'gravekeeperspriestess', 2, 8761, 'Gravekeeper''s Priestess'),
    ('main', 9, 'gravekeepersrecruiter', 2, 9282, 'Gravekeeper''s Recruiter'),
    ('main', 10, 'gravekeepersspearsoldier', 3, 5512, 'Gravekeeper''s Spear Soldier'),
    ('main', 11, 'gravekeepersspy', 2, 5509, 'Gravekeeper''s Spy'),
    ('main', 12, 'gravekeepersvisionary', 1, 8638, 'Gravekeeper''s Visionary'),
    ('main', 13, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'necrovalley', 2, 5533, 'Necrovalley'),
    ('main', 15, 'nightbeam', 2, 10078, 'Night Beam'),
    ('main', 16, 'spellreproduction', 1, 5354, 'Spell Reproduction'),
    ('main', 17, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 18, 'compulsoryevacuationdevice', 2, 5914, 'Compulsory Evacuation Device'),
    ('main', 19, 'fiendishchain', 2, 8675, 'Fiendish Chain'),
    ('main', 20, 'gravelure', 2, 6363, 'Grave Lure'),
    ('main', 21, 'sakuretsuarmor', 1, 5799, 'Sakuretsu Armor'),
    ('main', 22, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 23, 'ultimateoffering', 1, 4851, 'Ultimate Offering'),
    ('main', 24, 'widespreadruin', 1, 4692, 'Widespread Ruin')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'ishizu-ishtar-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Ishizu Ishtar / B — Lightsworn (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'ishizu-ishtar-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'aurkuslightsworndruid', 1, 7796, 'Aurkus, Lightsworn Druid'),
    ('main', 2, 'celestialightswornangel', 2, 7597, 'Celestia, Lightsworn Angel'),
    ('main', 3, 'ehrenlightswornmonk', 2, 7797, 'Ehren, Lightsworn Monk'),
    ('main', 4, 'garothlightswornwarrior', 2, 7593, 'Garoth, Lightsworn Warrior'),
    ('main', 5, 'gragonithlightsworndragon', 2, 7598, 'Gragonith, Lightsworn Dragon'),
    ('main', 6, 'honest', 1, 7574, 'Honest'),
    ('main', 7, 'jainlightswornpaladin', 2, 7591, 'Jain, Lightsworn Paladin'),
    ('main', 8, 'jenislightswornmender', 1, 7723, 'Jenis, Lightsworn Mender'),
    ('main', 9, 'judgmentdragon', 3, 7599, 'Judgment Dragon'),
    ('main', 10, 'luminalightswornsummoner', 2, 7594, 'Lumina, Lightsworn Summoner'),
    ('main', 11, 'lylalightswornsorceress', 2, 7592, 'Lyla, Lightsworn Sorceress'),
    ('main', 12, 'rinyanlightswornrogue', 1, 8596, 'Rinyan, Lightsworn Rogue'),
    ('main', 13, 'rykolightswornhunter', 2, 7595, 'Ryko, Lightsworn Hunter'),
    ('main', 14, 'shirelightswornspirit', 1, 8595, 'Shire, Lightsworn Spirit'),
    ('main', 15, 'wulflightswornbeast', 2, 7596, 'Wulf, Lightsworn Beast'),
    ('main', 16, 'chargeofthelightbrigade', 1, 7868, 'Charge of the Light Brigade'),
    ('main', 17, 'lightswornsabre', 2, 7749, 'Lightsworn Sabre'),
    ('main', 18, 'realmoflight', 2, 7626, 'Realm of Light'),
    ('main', 19, 'solarrecharge', 3, 7625, 'Solar Recharge'),
    ('main', 20, 'gloriousillusion', 2, 7644, 'Glorious Illusion'),
    ('main', 21, 'lightspiral', 1, 7643, 'Light Spiral'),
    ('main', 22, 'lightswornbarrier', 2, 7764, 'Lightsworn Barrier'),
    ('main', 23, 'vanquishinglight', 1, 7803, 'Vanquishing Light'),
    ('extra', 24, 'number39utopia', 1, 9575, 'Number 39: Utopia')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'ishizu-ishtar-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Joey Wheeler / A — Red-Eyes (33 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'joey-wheeler-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'axeraider', 1, 4084, 'Axe Raider'),
    ('main', 2, 'babydragon', 1, 4010, 'Baby Dragon'),
    ('main', 3, 'redeyesblackdragon', 1, 4088, 'Red-Eyes B. Dragon'),
    ('main', 4, 'copycat', 2, 4795, 'Copycat'),
    ('main', 5, 'gearfriedtheironknight', 2, 5059, 'Gearfried the Iron Knight'),
    ('main', 6, 'gilfordthelightning', 1, 5451, 'Gilford the Lightning'),
    ('main', 7, 'hayabusaknight', 1, 5137, 'Hayabusa Knight'),
    ('main', 8, 'jinzo', 1, 4758, 'Jinzo'),
    ('main', 9, 'littlewinguard', 1, 4771, 'Little-Winguard'),
    ('main', 10, 'maraudingcaptain', 2, 5318, 'Marauding Captain'),
    ('main', 11, 'pantherwarrior', 1, 4751, 'Panther Warrior'),
    ('main', 12, 'redeyesblackmetaldragon', 1, 4748, 'Red-Eyes Black Metal Dragon'),
    ('main', 13, 'rocketwarrior', 1, 5067, 'Rocket Warrior'),
    ('main', 14, 'sasukesamurai4', 2, 6185, 'Sasuke Samurai #4'),
    ('main', 15, 'thefiendmegacyber', 1, 4761, 'The Fiend Megacyber'),
    ('main', 16, 'timewizard', 1, 4022, 'Time Wizard'),
    ('main', 17, 'dangerousmachinetype6', 1, 5944, 'Dangerous Machine Type-6'),
    ('main', 18, 'divineswordphoenixblade', 1, 6458, 'Divine Sword - Phoenix Blade'),
    ('main', 19, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 20, 'gracefuldice', 2, 4815, 'Graceful Dice'),
    ('main', 21, 'lightningblade', 1, 5110, 'Lightning Blade'),
    ('main', 22, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 23, 'scapegoat', 1, 4818, 'Scapegoat'),
    ('main', 24, 'straylambs', 1, 5904, 'Stray Lambs'),
    ('main', 25, 'thewarriorreturningalive', 2, 5330, 'The Warrior Returning Alive'),
    ('main', 26, 'blastwithchain', 1, 5396, 'Blast with Chain'),
    ('main', 27, 'graverobber', 1, 4985, 'Graverobber'),
    ('main', 28, 'kunaiwithchain', 1, 4657, 'Kunai with Chain'),
    ('main', 29, 'magicalarmshield', 1, 4834, 'Magical Arm Shield'),
    ('main', 30, 'metalmorph', 1, 4664, 'Metalmorph'),
    ('main', 31, 'skulldice', 2, 4816, 'Skull Dice'),
    ('main', 32, 'timemachine', 1, 4794, 'Time Machine'),
    ('main', 33, 'traphole', 1, 4836, 'Trap Hole')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'joey-wheeler-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Joey Wheeler / B — Jinzo (25 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'joey-wheeler-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'armageddonknight', 3, 7423, 'Armageddon Knight'),
    ('main', 2, 'blacklustersoldierenvoyofthebeginning', 1, 5835, 'Black Luster Soldier - Envoy of the Beginning'),
    ('main', 3, 'cardtrooper', 2, 6939, 'Card Trooper'),
    ('main', 4, 'cranecrane', 2, 10574, 'Crane Crane'),
    ('main', 5, 'cyberdragon', 2, 6390, 'Cyber Dragon'),
    ('main', 6, 'darkarmeddragon', 1, 7421, 'Dark Armed Dragon'),
    ('main', 7, 'darkgrepher', 2, 7561, 'Dark Grepher'),
    ('main', 8, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 9, 'jinzo', 3, 4758, 'Jinzo'),
    ('main', 10, 'jinzoreturner', 3, 7579, 'Jinzo - Returner'),
    ('main', 11, 'jinzolord', 1, 7580, 'Jinzo - Lord'),
    ('main', 12, 'meklordemperorwisel', 3, 9264, 'Meklord Emperor Wisel'),
    ('main', 13, 'summonermonk', 1, 6400, 'Summoner Monk'),
    ('main', 14, 'thunderkingraioh', 1, 7397, 'Thunder King Rai-Oh'),
    ('main', 15, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 16, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 17, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 18, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 19, 'forbiddenlance', 2, 9352, 'Forbidden Lance'),
    ('main', 20, 'limiterremoval', 1, 5129, 'Limiter Removal'),
    ('main', 21, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 22, 'smashingground', 2, 5905, 'Smashing Ground'),
    ('main', 23, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('extra', 24, 'lavalvalchain', 1, 9821, 'Lavalval Chain'),
    ('extra', 25, 'windupzenmaines', 1, 9870, 'Wind-Up Zenmaines')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'joey-wheeler-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Mai Valentine / A — Amazoness (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'mai-valentine-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'harpiegirl', 2, 6175, 'Harpie Girl'),
    ('main', 2, 'harpielady', 3, 4068, 'Harpie Lady'),
    ('main', 3, 'amazonessarcher', 3, 5195, 'Amazoness Archer'),
    ('main', 4, 'amazonessblowpiper', 2, 5646, 'Amazoness Blowpiper'),
    ('main', 5, 'amazonesschainmaster', 2, 5291, 'Amazoness Chain Master'),
    ('main', 6, 'amazonessfighter', 3, 5295, 'Amazoness Fighter'),
    ('main', 7, 'amazonesspaladin', 1, 5645, 'Amazoness Paladin'),
    ('main', 8, 'amazonessqueen', 2, 8963, 'Amazoness Queen'),
    ('main', 9, 'amazonesssage', 3, 8961, 'Amazoness Sage'),
    ('main', 10, 'amazonessscouts', 1, 9203, 'Amazoness Scouts'),
    ('main', 11, 'amazonessswordswoman', 2, 5284, 'Amazoness Swords Woman'),
    ('main', 12, 'amazonesstrainee', 2, 8962, 'Amazoness Trainee'),
    ('main', 13, 'amazonessfightingspirit', 1, 8985, 'Amazoness Fighting Spirit'),
    ('main', 14, 'amazonessheirloom', 1, 9209, 'Amazoness Heirloom'),
    ('main', 15, 'amazonessspellcaster', 2, 5296, 'Amazoness Spellcaster'),
    ('main', 16, 'amazonessvillage', 1, 8984, 'Amazoness Village'),
    ('main', 17, 'blackpendant', 1, 4317, 'Black Pendant'),
    ('main', 18, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 19, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 20, 'amazonessarchers', 3, 5286, 'Amazoness Archers'),
    ('main', 21, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 22, 'kunaiwithchain', 1, 4657, 'Kunai with Chain')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'mai-valentine-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Mai Valentine / B — Harpie (25 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'mai-valentine-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cyberharpielady', 1, 5239, 'Cyber Harpie Lady'),
    ('main', 2, 'harpiechanneler', 3, 10516, 'Harpie Channeler'),
    ('main', 3, 'harpielady1', 2, 6186, 'Harpie Lady 1'),
    ('main', 4, 'harpieladysisters', 1, 4069, 'Harpie Lady Sisters'),
    ('main', 5, 'harpiequeen', 3, 7111, 'Harpie Queen'),
    ('main', 6, 'harpiespetbabydragon', 2, 6686, 'Harpie''s Pet Baby Dragon'),
    ('main', 7, 'harpiespetdragon', 2, 4392, 'Harpie''s Pet Dragon'),
    ('main', 8, 'summonermonk', 2, 6400, 'Summoner Monk'),
    ('main', 9, 'tempestdragonrulerofstorms', 2, 10522, 'Tempest, Dragon Ruler of Storms'),
    ('main', 10, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'elegantegotist', 2, 4324, 'Elegant Egotist'),
    ('main', 13, 'harpieshuntingground', 3, 6207, 'Harpies'' Hunting Ground'),
    ('main', 14, 'hystericsign', 3, 10546, 'Hysteric Sign'),
    ('main', 15, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'smashingground', 1, 5905, 'Smashing Ground'),
    ('main', 17, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 18, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 19, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 20, 'hystericparty', 2, 6722, 'Hysteric Party'),
    ('main', 21, 'icarusattack', 3, 6709, 'Icarus Attack'),
    ('main', 22, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('extra', 23, 'harpiespetphantasmaldragon', 2, 10536, 'Harpie''s Pet Phantasmal Dragon'),
    ('extra', 24, 'lightningchidori', 1, 10411, 'Lightning Chidori'),
    ('extra', 25, 'mechaphantombeastdracossack', 1, 10534, 'Mecha Phantom Beast Dracossack')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'mai-valentine-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Mako Tsunami / A — Great Ocean (26 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'mako-tsunami-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'amphibianbeast', 1, 5066, 'Amphibian Beast'),
    ('main', 2, 'fiendkraken', 2, 4076, 'Fiend Kraken'),
    ('main', 3, 'greatwhite', 2, 4066, 'Great White'),
    ('main', 4, 'jellyfish', 3, 4077, 'Jellyfish'),
    ('main', 5, 'rootwater', 2, 4253, 'Root Water'),
    ('main', 6, 'catapultturtle', 1, 4095, 'Catapult Turtle'),
    ('main', 7, 'deepseawarrior', 1, 4776, 'Deepsea Warrior'),
    ('main', 8, 'divinedragonaquabizarre', 1, 8317, 'Divine Dragon Aquabizarre'),
    ('main', 9, 'leviadragondaedalus', 1, 5895, 'Levia-Dragon - Daedalus'),
    ('main', 10, 'thelegendaryfisherman', 2, 5069, 'The Legendary Fisherman'),
    ('main', 11, 'fortresswhale', 2, 4724, 'Fortress Whale'),
    ('main', 12, 'fissure', 1, 4835, 'Fissure'),
    ('main', 13, 'fortresswhalesoath', 2, 4706, 'Fortress Whale''s Oath'),
    ('main', 14, 'goldsarcophagus', 2, 6161, 'Gold Sarcophagus'),
    ('main', 15, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 17, 'tornadowall', 1, 5111, 'Tornado Wall'),
    ('main', 18, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('main', 19, 'abysswarrior', 2, 10250, 'Abyss Warrior'),
    ('main', 20, 'umi', 2, 4340, 'Umi'),
    ('main', 21, 'mermaidarcher', 2, 8188, 'Mermaid Archer'),
    ('main', 22, 'hammershark', 1, 10031, 'Hammer Shark'),
    ('main', 23, 'fishdepthcharge', 1, 7768, 'Fish Depth Charge'),
    ('main', 24, 'soulofthepure', 1, 4347, 'Soul of the Pure'),
    ('main', 25, 'stopdefense', 1, 4326, 'Stop Defense'),
    ('main', 26, 'surface', 1, 9666, 'Surface')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'mako-tsunami-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Mako Tsunami / B — Mermail Abyss (37 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'mako-tsunami-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'atlanteandragoons', 1, 10219, 'Atlantean Dragoons'),
    ('main', 2, 'atlanteanheavyinfantry', 2, 10221, 'Atlantean Heavy Infantry'),
    ('main', 3, 'atlanteanmarksman', 2, 10220, 'Atlantean Marksman'),
    ('main', 4, 'deepseadiva', 1, 8187, 'Deep Sea Diva'),
    ('main', 5, 'fishborgarcher', 1, 10460, 'Fishborg Archer'),
    ('main', 6, 'legendaryatlanteantridon', 1, 10514, 'Legendary Atlantean Tridon'),
    ('main', 7, 'mermailabyssdine', 1, 10391, 'Mermail Abyssdine'),
    ('main', 8, 'mermailabyssgunde', 1, 10237, 'Mermail Abyssgunde'),
    ('main', 9, 'mermailabysshilde', 2, 10238, 'Mermail Abysshilde'),
    ('main', 10, 'mermailabyssleed', 1, 10393, 'Mermail Abyssleed'),
    ('main', 11, 'mermailabysslinde', 3, 10236, 'Mermail Abysslinde'),
    ('main', 12, 'mermailabyssmegalo', 1, 10242, 'Mermail Abyssmegalo'),
    ('main', 13, 'mermailabysspike', 2, 10240, 'Mermail Abysspike'),
    ('main', 14, 'mermailabyssteus', 1, 10471, 'Mermail Abyssteus'),
    ('main', 15, 'mermailabyssturge', 1, 10239, 'Mermail Abyssturge'),
    ('main', 16, 'moulinglaciatheelementallord', 1, 10257, 'Moulinglacia the Elemental Lord'),
    ('main', 17, 'poseidratheatlanteandragon', 1, 10218, 'Poseidra, the Atlantean Dragon'),
    ('main', 18, 'tidaldragonrulerofwaterfalls', 2, 10520, 'Tidal, Dragon Ruler of Waterfalls'),
    ('main', 19, 'abyssscaleofcetus', 1, 10420, 'Abyss-scale of Cetus'),
    ('main', 20, 'abyssscaleofthekraken', 1, 10278, 'Abyss-scale of the Kraken'),
    ('main', 21, 'abyssscaleofthemizuchi', 1, 10545, 'Abyss-scale of the Mizuchi'),
    ('main', 22, 'lemuriatheforgottencity', 1, 10279, 'Lemuria, the Forgotten City'),
    ('main', 23, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 24, 'salvage', 1, 5908, 'Salvage'),
    ('main', 25, 'surface', 2, 9666, 'Surface'),
    ('main', 26, 'abyssscorn', 1, 10434, 'Abyss-scorn'),
    ('main', 27, 'abysssphere', 1, 10294, 'Abyss-sphere'),
    ('main', 28, 'abysssquall', 1, 10293, 'Abyss-squall'),
    ('main', 29, 'aegisoftheoceandragonlord', 1, 8366, 'Aegis of the Ocean Dragon Lord'),
    ('main', 30, 'torrentialreborn', 2, 10552, 'Torrential Reborn'),
    ('extra', 31, 'allyofjusticecatastor', 1, 7552, 'Ally of Justice Catastor'),
    ('extra', 32, 'armoryarm', 1, 7987, 'Armory Arm'),
    ('extra', 33, 'gungnirdragonoftheicebarrier', 1, 8262, 'Gungnir, Dragon of the Ice Barrier'),
    ('extra', 34, 'bahamutshark', 3, 10332, 'Bahamut Shark'),
    ('extra', 35, 'mermailabyssgaios', 1, 10268, 'Mermail Abyssgaios'),
    ('extra', 36, 'mermailabysstrite', 1, 10409, 'Mermail Abysstrite'),
    ('extra', 37, 'number17leviathandragon', 3, 9656, 'Number 17: Leviathan Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'mako-tsunami-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Marik Ishtar / A — Legendary Fiend (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'marik-ishtar-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gilgarth', 2, 5491, 'Gil Garth'),
    ('main', 2, 'bowganian', 2, 5687, 'Bowganian'),
    ('main', 3, 'darkjeroid', 1, 5499, 'Dark Jeroid'),
    ('main', 4, 'helpoemer', 2, 5489, 'Helpoemer'),
    ('main', 5, 'legendaryfiend', 3, 5453, 'Legendary Fiend'),
    ('main', 6, 'lekunga', 2, 5564, 'Lekunga'),
    ('main', 7, 'lordpoison', 1, 5485, 'Lord Poison'),
    ('main', 8, 'maneaterbug', 1, 4507, 'Man-Eater Bug'),
    ('main', 9, 'newdoria', 2, 5484, 'Newdoria'),
    ('main', 10, 'obeliskthetormentor', 1, 4998, 'Obelisk the Tormentor'),
    ('main', 11, 'rafflesiaseduction', 3, 6112, 'Rafflesia Seduction'),
    ('main', 12, 'revivaljam', 2, 5063, 'Revival Jam'),
    ('main', 13, 'slifertheskydragon', 1, 4999, 'Slifer the Sky Dragon'),
    ('main', 14, 'spiritreaper', 1, 5526, 'Spirit Reaper'),
    ('main', 15, 'thewingeddragonofra', 1, 5000, 'The Winged Dragon of Ra'),
    ('main', 16, 'messengerofpeace', 1, 4938, 'Messenger of Peace'),
    ('main', 17, 'baitdoll', 1, 5275, 'Bait Doll'),
    ('main', 18, 'nightmaressteelcage', 1, 5120, 'Nightmare''s Steelcage'),
    ('main', 19, 'removetrap', 1, 4838, 'Remove Trap'),
    ('main', 20, 'vengefulbogspirit', 1, 5281, 'Vengeful Bog Spirit'),
    ('main', 21, 'coffinseller', 2, 5492, 'Coffin Seller'),
    ('main', 22, 'hiddensoldiers', 1, 5490, 'Hidden Soldiers'),
    ('main', 23, 'jamdefender', 1, 5122, 'Jam Defender'),
    ('main', 24, 'metalreflectslime', 2, 5686, 'Metal Reflect Slime'),
    ('main', 25, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 26, 'nightmarewheel', 2, 5298, 'Nightmare Wheel'),
    ('main', 27, 'solemnwarning', 1, 9008, 'Solemn Warning')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'marik-ishtar-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Marik Ishtar / B — Slime Token (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'marik-ishtar-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'morphingjar', 1, 4597, 'Morphing Jar'),
    ('main', 2, 'chthonianalliance', 1, 6489, 'Chthonian Alliance'),
    ('main', 3, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 4, 'jambreedingmachine', 3, 5119, 'Jam Breeding Machine'),
    ('main', 5, 'levellimitareab', 1, 6054, 'Level Limit - Area B'),
    ('main', 6, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 7, 'onedayofpeace', 1, 9778, 'One Day of Peace'),
    ('main', 8, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 9, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 10, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 11, 'unitedwestand', 2, 5212, 'United We Stand'),
    ('main', 12, 'wetlands', 3, 7627, 'Wetlands'),
    ('main', 13, 'aquachorus', 3, 5006, 'Aqua Chorus'),
    ('main', 14, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 15, 'darkbribe', 2, 7349, 'Dark Bribe'),
    ('main', 16, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('main', 17, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 18, 'tokenstampede', 3, 9367, 'Token Stampede'),
    ('main', 19, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('main', 20, 'traphole', 3, 4836, 'Trap Hole'),
    ('main', 21, 'widespreadruin', 3, 4692, 'Widespread Ruin')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'marik-ishtar-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Maximillion Pegasus / A — Toons (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'maximillion-pegasus-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blueeyestoondragon', 1, 4773, 'Blue-Eyes Toon Dragon'),
    ('main', 2, 'mangaryuran', 1, 4733, 'Manga Ryu-Ran'),
    ('main', 3, 'manjuofthetenthousandhands', 1, 5900, 'Manju of the Ten Thousand Hands'),
    ('main', 4, 'tooncannonsoldier', 3, 5477, 'Toon Cannon Soldier'),
    ('main', 5, 'toongeminielf', 2, 5476, 'Toon Gemini Elf'),
    ('main', 6, 'toongoblinattackforce', 2, 5478, 'Toon Goblin Attack Force'),
    ('main', 7, 'toonmaskedsorcerer', 3, 5475, 'Toon Masked Sorcerer'),
    ('main', 8, 'toonmermaid', 3, 4734, 'Toon Mermaid'),
    ('main', 9, 'toonsummonedskull', 1, 4735, 'Toon Summoned Skull'),
    ('main', 10, 'relinquished', 2, 4737, 'Relinquished'),
    ('main', 11, 'blackillusionritual', 2, 4802, 'Black Illusion Ritual'),
    ('main', 12, 'toontableofcontents', 2, 5474, 'Toon Table of Contents'),
    ('main', 13, 'toonworld', 3, 4798, 'Toon World'),
    ('main', 14, 'destructionjammer', 1, 7645, 'Destruction Jammer'),
    ('main', 15, 'darkbribe', 1, 7349, 'Dark Bribe'),
    ('main', 16, 'judgmentofanubis', 1, 5232, 'Judgment of Anubis'),
    ('main', 17, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 18, 'robbingoblin', 1, 4876, 'Robbin'' Goblin'),
    ('main', 19, 'toondarkmagiciangirl', 2, 5450, 'Toon Dark Magician Girl'),
    ('main', 20, 'toonalligator', 3, 4387, 'Toon Alligator'),
    ('main', 21, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 22, 'vengefulbogspirit', 1, 5281, 'Vengeful Bog Spirit'),
    ('main', 23, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 24, 'costdown', 1, 5575, 'Cost Down')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'maximillion-pegasus-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Maximillion Pegasus / B — Relinquished (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'maximillion-pegasus-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlefader', 3, 8617, 'Battle Fader'),
    ('main', 2, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 3, 'manjuofthetenthousandhands', 3, 5900, 'Manju of the Ten Thousand Hands'),
    ('main', 4, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 5, 'blacklustersoldierenvoyofthebeginning', 1, 5835, 'Black Luster Soldier - Envoy of the Beginning'),
    ('main', 6, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 7, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 8, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 9, 'blackillusionritual', 3, 4802, 'Black Illusion Ritual'),
    ('main', 10, 'safezone', 2, 9549, 'Safe Zone'),
    ('main', 11, 'djinnreleaserofrituals', 3, 8472, 'Djinn Releaser of Rituals'),
    ('main', 12, 'sonicbird', 3, 4929, 'Sonic Bird'),
    ('main', 13, 'preparationofrites', 3, 8492, 'Preparation of Rites'),
    ('main', 14, 'relinquished', 3, 4737, 'Relinquished'),
    ('main', 15, 'senjuofthethousandhands', 3, 4916, 'Senju of the Thousand Hands'),
    ('main', 16, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 17, 'ddwarriorlady', 1, 5719, 'D.D. Warrior Lady'),
    ('main', 18, 'ddassailant', 2, 5932, 'D.D. Assailant'),
    ('extra', 19, 'daigustoemeral', 1, 9822, 'Daigusto Emeral'),
    ('extra', 20, 'leviairtheseadragon', 3, 9660, 'Leviair the Sea Dragon'),
    ('extra', 21, 'number85crazybox', 1, 10707, 'Number 85: Crazy Box')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'maximillion-pegasus-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Mokuba Kaiba / A — Reptile Plant (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'mokuba-kaiba-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'krokodilus', 3, 4082, 'Krokodilus'),
    ('main', 2, 'toonalligator', 3, 4387, 'Toon Alligator'),
    ('main', 3, 'maneatingplant', 3, 4081, 'Man-Eating Plant'),
    ('main', 4, 'maneater', 3, 4164, 'Man Eater'),
    ('main', 5, 'darkworldthorns', 3, 4573, 'Darkworld Thorns'),
    ('main', 6, 'theworldtree', 2, 7914, 'The World Tree'),
    ('main', 7, 'markoftherose', 2, 7903, 'Mark of the Rose'),
    ('main', 8, 'moltingescape', 1, 8484, 'Molting Escape'),
    ('main', 9, 'attackpheromones', 2, 8483, 'Attack Pheromones'),
    ('main', 10, 'giantrat', 3, 4915, 'Giant Rat'),
    ('main', 11, 'mothergrizzly', 3, 4926, 'Mother Grizzly'),
    ('main', 12, 'gigobyte', 2, 6019, 'Gigobyte'),
    ('main', 13, 'rainbowflower', 2, 4494, 'Rainbow Flower'),
    ('main', 14, 'kagetokage', 1, 9723, 'Kagetokage'),
    ('main', 15, 'botanicalgirl', 1, 7892, 'Botanical Girl'),
    ('main', 16, 'pollinosis', 2, 7929, 'Pollinosis'),
    ('main', 17, 'damagereptile', 2, 7167, 'Damage = Reptile'),
    ('main', 18, 'emperorofthelandandsea', 2, 4406, 'Emperor of the Land and Sea')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'mokuba-kaiba-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Mokuba Kaiba / B — Worm Royalty (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'mokuba-kaiba-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'kagetokage', 3, 9723, 'Kagetokage'),
    ('main', 2, 'wormcartaros', 3, 7545, 'Worm Cartaros'),
    ('main', 3, 'wormking', 2, 7833, 'Worm King'),
    ('main', 4, 'wormqueen', 2, 8115, 'Worm Queen'),
    ('main', 5, 'wormtentacles', 1, 8255, 'Worm Tentacles'),
    ('main', 6, 'wormxex', 3, 8411, 'Worm Xex'),
    ('main', 7, 'wormyagan', 3, 8412, 'Worm Yagan'),
    ('main', 8, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 9, 'nightbeam', 2, 10078, 'Night Beam'),
    ('main', 10, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 11, 'solidarity', 3, 8344, 'Solidarity'),
    ('main', 12, 'vipersrebirth', 3, 8660, 'Viper''s Rebirth'),
    ('main', 13, 'wormcall', 2, 8831, 'Worm Call'),
    ('main', 14, 'bottomlesstraphole', 2, 5400, 'Bottomless Trap Hole'),
    ('main', 15, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 16, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 17, 'offeringtothesnakedeity', 3, 7476, 'Offering to the Snake Deity'),
    ('main', 18, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 19, 'wnebulameteorite', 3, 9551, 'W Nebula Meteorite'),
    ('extra', 20, 'kingoftheferalimps', 3, 10537, 'King of the Feral Imps')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'mokuba-kaiba-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Odion / A — Skill Drain (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'odion-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'acatofillomen', 3, 5520, 'A Cat of Ill Omen'),
    ('main', 2, 'chainsawinsect', 1, 6599, 'Chainsaw Insect'),
    ('main', 3, 'darkelf', 3, 4557, 'Dark Elf'),
    ('main', 4, 'flashassailant', 3, 4918, 'Flash Assailant'),
    ('main', 5, 'giantorc', 3, 5586, 'Giant Orc'),
    ('main', 6, 'goblinattackforce', 3, 5145, 'Goblin Attack Force'),
    ('main', 7, 'goblineliteattackforce', 3, 6418, 'Goblin Elite Attack Force'),
    ('main', 8, 'mysticalbeastofserket', 2, 5242, 'Mystical Beast of Serket'),
    ('main', 9, 'pantherwarrior', 3, 4751, 'Panther Warrior'),
    ('main', 10, 'scrapkong', 3, 9503, 'Scrap Kong'),
    ('main', 11, 'scrapshark', 1, 9321, 'Scrap Shark'),
    ('main', 12, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 13, 'bookoftaiyou', 1, 5431, 'Book of Taiyou'),
    ('main', 14, 'despell', 2, 4843, 'De-Spell'),
    ('main', 15, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 16, 'embodimentofapophis', 3, 5234, 'Embodiment of Apophis'),
    ('main', 17, 'magicjammer', 2, 4862, 'Magic Jammer'),
    ('main', 18, 'skilldrain', 2, 5740, 'Skill Drain')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'odion-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Odion / B — Hieratic Dragon (30 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'odion-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blueeyeswhitedragon', 1, 4007, 'Blue-Eyes White Dragon'),
    ('main', 2, 'hieraticsealofthesundragonoverlord', 2, 10025, 'Hieratic Seal of the Sun Dragon Overlord'),
    ('main', 3, 'wattaildragon', 1, 10024, 'Wattaildragon'),
    ('main', 4, 'dragard', 2, 10114, 'Dragard'),
    ('main', 5, 'decoydragon', 1, 7247, 'Decoy Dragon'),
    ('main', 6, 'hieraticdragonofeset', 2, 10043, 'Hieratic Dragon of Eset'),
    ('main', 7, 'hieraticdragonofgebeb', 2, 10042, 'Hieratic Dragon of Gebeb'),
    ('main', 8, 'hieraticdragonofnebthet', 2, 10044, 'Hieratic Dragon of Nebthet'),
    ('main', 9, 'hieraticdragonofnuit', 1, 10041, 'Hieratic Dragon of Nuit'),
    ('main', 10, 'hieraticdragonofsu', 2, 10046, 'Hieratic Dragon of Su'),
    ('main', 11, 'hieraticdragonoftefnuit', 2, 10045, 'Hieratic Dragon of Tefnuit'),
    ('main', 12, 'redeyesdarknessmetaldragon', 1, 7557, 'Red-Eyes Darkness Metal Dragon'),
    ('main', 13, 'awingbeatofgiantdragon', 1, 5343, 'A Wingbeat of Giant Dragon'),
    ('main', 14, 'advancedraw', 2, 8337, 'Advance Draw'),
    ('main', 15, 'dragonictactics', 1, 8422, 'Dragonic Tactics'),
    ('main', 16, 'enemycontroller', 1, 5505, 'Enemy Controller'),
    ('main', 17, 'hieraticsealofconvocation', 2, 10079, 'Hieratic Seal of Convocation'),
    ('main', 18, 'hieraticsealofsupremacy', 2, 10080, 'Hieratic Seal of Supremacy'),
    ('main', 19, 'miniguts', 1, 10075, 'Mini-Guts'),
    ('main', 20, 'superrejuvenation', 2, 5346, 'Super Rejuvenation'),
    ('main', 21, 'tradein', 2, 7248, 'Trade-In'),
    ('main', 22, 'burstbreath', 1, 5348, 'Burst Breath'),
    ('main', 23, 'dragonsrage', 1, 5347, 'Dragon''s Rage'),
    ('main', 24, 'hieraticsealofbanishment', 2, 10094, 'Hieratic Seal of Banishment'),
    ('main', 25, 'hieraticsealofreflection', 2, 10095, 'Hieratic Seal of Reflection'),
    ('main', 26, 'photoncurrent', 1, 9972, 'Photon Current'),
    ('extra', 27, 'hieraticdragonkingofatum', 1, 10070, 'Hieratic Dragon King of Atum'),
    ('extra', 28, 'hieraticsundragonoverlordofheliopolis', 2, 10071, 'Hieratic Sun Dragon Overlord of Heliopolis'),
    ('extra', 29, 'queendragundjinn', 1, 10072, 'Queen Dragun Djinn'),
    ('extra', 30, 'thunderenddragon', 1, 9762, 'Thunder End Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'odion-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Rebecca Hawkins / A — Life Shadow (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'rebecca-hawkins-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'giantsoldierofstone', 3, 4080, 'Giant Soldier of Stone'),
    ('main', 2, 'millenniumshield', 1, 4368, 'Millennium Shield'),
    ('main', 3, 'acatofillomen', 3, 5520, 'A Cat of Ill Omen'),
    ('main', 4, 'cannonsoldier', 2, 4518, 'Cannon Soldier'),
    ('main', 5, 'chaosnecromancer', 3, 5827, 'Chaos Necromancer'),
    ('main', 6, 'chaosendmaster', 3, 7837, 'Chaos-End Master'),
    ('main', 7, 'curemermaid', 2, 5204, 'Cure Mermaid'),
    ('main', 8, 'electricsnake', 1, 4469, 'Electric Snake'),
    ('main', 9, 'fireprincess', 2, 5197, 'Fire Princess'),
    ('main', 10, 'guardianangeljoan', 1, 5899, 'Guardian Angel Joan'),
    ('main', 11, 'injectionfairylily', 2, 5031, 'Injection Fairy Lily'),
    ('main', 12, 'darklordmarie', 3, 5209, 'Darklord Marie'),
    ('main', 13, 'pyramidturtle', 1, 5423, 'Pyramid Turtle'),
    ('main', 14, 'shadowghoul', 3, 4374, 'Shadow Ghoul'),
    ('main', 15, 'skelengel', 3, 4546, 'Skelengel'),
    ('main', 16, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 17, 'tributetothedoomed', 2, 4856, 'Tribute to The Doomed'),
    ('main', 18, 'blastingtheruins', 1, 5852, 'Blasting the Ruins'),
    ('main', 19, 'needlebugnest', 3, 7769, 'Needlebug Nest')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'rebecca-hawkins-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Rebecca Hawkins / B — Ghostrick Night (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'rebecca-hawkins-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cranecrane', 3, 10574, 'Crane Crane'),
    ('main', 2, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 3, 'ghostricklantern', 3, 10747, 'Ghostrick Lantern'),
    ('main', 4, 'ghostrickspecter', 3, 10748, 'Ghostrick Specter'),
    ('main', 5, 'ghostrickwitch', 1, 10749, 'Ghostrick Witch'),
    ('main', 6, 'ghostrickjiangshi', 3, 10751, 'Ghostrick Jiangshi'),
    ('main', 7, 'ghostrickstein', 3, 10752, 'Ghostrick Stein'),
    ('main', 8, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 9, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 10, 'nightbeam', 2, 10078, 'Night Beam'),
    ('main', 11, 'recurringnightmare', 1, 7151, 'Recurring Nightmare'),
    ('main', 12, 'swordsofconcealinglight', 2, 6268, 'Swords of Concealing Light'),
    ('main', 13, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 14, 'ghostrickmansion', 3, 10793, 'Ghostrick Mansion'),
    ('main', 15, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 16, 'needleceiling', 2, 5442, 'Needle Ceiling'),
    ('main', 17, 'threateningroar', 3, 6278, 'Threatening Roar'),
    ('main', 18, 'ghostrickvanish', 2, 10804, 'Ghostrick Vanish'),
    ('extra', 19, 'windupzenmaines', 2, 9870, 'Wind-Up Zenmaines'),
    ('extra', 20, 'ghostrickalucard', 3, 10783, 'Ghostrick Alucard')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'rebecca-hawkins-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Seto Kaiba / A — XYZ-Dragon (36 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'seto-kaiba-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battleox', 1, 4032, 'Battle Ox'),
    ('main', 2, 'blueeyeswhitedragon', 2, 4007, 'Blue-Eyes White Dragon'),
    ('main', 3, 'hitotsumegiant', 1, 4009, 'Hitotsu-Me Giant'),
    ('main', 4, 'mystichorseman', 1, 4097, 'Mystic Horseman'),
    ('main', 5, 'ryukishinpowered', 1, 4383, 'Ryu-Kishin Powered'),
    ('main', 6, 'vorseraider', 1, 5004, 'Vorse Raider'),
    ('main', 7, 'xheadcannon', 3, 5504, 'X-Head Cannon'),
    ('main', 8, 'bladeknight', 1, 5488, 'Blade Knight'),
    ('main', 9, 'ddwarrior', 1, 4262, 'D.D. Warrior'),
    ('main', 10, 'kaiserglider', 1, 5353, 'Kaiser Glider'),
    ('main', 11, 'obeliskthetormentor', 1, 4998, 'Obelisk the Tormentor'),
    ('main', 12, 'twinheadedbehemoth', 1, 5030, 'Twin-Headed Behemoth'),
    ('main', 13, 'ydragonhead', 3, 5552, 'Y-Dragon Head'),
    ('main', 14, 'zmetaltank', 3, 5555, 'Z-Metal Tank'),
    ('main', 15, 'awingbeatofgiantdragon', 1, 5343, 'A Wingbeat of Giant Dragon'),
    ('main', 16, 'burststreamofdestruction', 1, 5979, 'Burst Stream of Destruction'),
    ('main', 17, 'despell', 1, 4843, 'De-Spell'),
    ('main', 18, 'enemycontroller', 1, 5505, 'Enemy Controller'),
    ('main', 19, 'megamorph', 1, 4663, 'Megamorph'),
    ('main', 20, 'mesmericcontrol', 1, 4814, 'Mesmeric Control'),
    ('main', 21, 'soulexchange', 1, 5099, 'Soul Exchange'),
    ('main', 22, 'shrink', 1, 5355, 'Shrink'),
    ('main', 23, 'silentdoom', 1, 5367, 'Silent Doom'),
    ('main', 24, 'cloning', 1, 5574, 'Cloning'),
    ('main', 25, 'darkmirrorforce', 1, 5858, 'Dark Mirror Force'),
    ('main', 26, 'dragonsrage', 1, 5347, 'Dragon''s Rage'),
    ('main', 27, 'finalattackorders', 1, 5627, 'Final Attack Orders'),
    ('main', 28, 'interdimensionalmattertransporter', 1, 5560, 'Interdimensional Matter Transporter'),
    ('main', 29, 'negateattack', 1, 4804, 'Negate Attack'),
    ('main', 30, 'rollout', 2, 6521, 'Roll Out!'),
    ('main', 31, 'shadowspell', 1, 4675, 'Shadow Spell'),
    ('main', 32, 'unitedfront', 1, 9692, 'United Front'),
    ('extra', 33, 'xyzdragoncannon', 1, 5556, 'XYZ-Dragon Cannon'),
    ('extra', 34, 'xydragoncannon', 1, 5553, 'XY-Dragon Cannon'),
    ('extra', 35, 'xztankcannon', 1, 5625, 'XZ-Tank Cannon'),
    ('extra', 36, 'yztankdragon', 1, 5626, 'YZ-Tank Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'seto-kaiba-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Seto Kaiba / B — Blue-Eyes (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'seto-kaiba-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blueeyeswhitedragon', 3, 4007, 'Blue-Eyes White Dragon'),
    ('main', 2, 'flamvellguard', 2, 7535, 'Flamvell Guard'),
    ('main', 3, 'rabidragon', 2, 9720, 'Rabidragon'),
    ('main', 4, 'decoydragon', 2, 7247, 'Decoy Dragon'),
    ('main', 5, 'kaibaman', 1, 6298, 'Kaibaman'),
    ('main', 6, 'maidenwitheyesofblue', 3, 10588, 'Maiden with Eyes of Blue'),
    ('main', 7, 'parsectheinterstellardragon', 2, 10496, 'Parsec, the Interstellar Dragon'),
    ('main', 8, 'radiusthehalfmoondragon', 2, 10495, 'Radius, the Half-Moon Dragon'),
    ('main', 9, 'riderofthestormwinds', 2, 10589, 'Rider of the Storm Winds'),
    ('main', 10, 'thewhitestoneoflegend', 3, 7850, 'The White Stone of Legend'),
    ('main', 11, 'totemdragon', 2, 8143, 'Totem Dragon'),
    ('main', 12, 'vanguardofthedragon', 2, 8190, 'Vanguard of the Dragon'),
    ('main', 13, 'burststreamofdestruction', 2, 5979, 'Burst Stream of Destruction'),
    ('main', 14, 'cardsofconsonance', 1, 8656, 'Cards of Consonance'),
    ('main', 15, 'dragonshrine', 3, 10590, 'Dragon Shrine'),
    ('main', 16, 'silverscry', 3, 10591, 'Silver''s Cry'),
    ('main', 17, 'stampingdestruction', 2, 5345, 'Stamping Destruction'),
    ('main', 18, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 19, 'dragonsrebirth', 1, 9959, 'Dragon''s Rebirth'),
    ('extra', 20, 'azureeyessilverdragon', 3, 10593, 'Azure-Eyes Silver Dragon'),
    ('extra', 21, 'hieraticsundragonoverlordofheliopolis', 1, 10071, 'Hieratic Sun Dragon Overlord of Heliopolis'),
    ('extra', 22, 'thunderenddragon', 1, 9762, 'Thunder End Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'seto-kaiba-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Shadi / A — End of the World (20 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'shadi-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'barrelrock', 2, 4461, 'Barrel Rock'),
    ('main', 2, 'destroyergolem', 3, 4460, 'Destroyer Golem'),
    ('main', 3, 'giantsoldierofstone', 3, 4080, 'Giant Soldier of Stone'),
    ('main', 4, 'millenniumgolem', 2, 4459, 'Millennium Golem'),
    ('main', 5, 'sengenjin', 2, 4709, 'Sengenjin'),
    ('main', 6, 'manjuofthetenthousandhands', 3, 5900, 'Manju of the Ten Thousand Hands'),
    ('main', 7, 'senjuofthethousandhands', 3, 4916, 'Senju of the Thousand Hands'),
    ('main', 8, 'serpentineprincess', 2, 5025, 'Serpentine Princess'),
    ('main', 9, 'sonicbird', 3, 4929, 'Sonic Bird'),
    ('main', 10, 'ruinqueenofoblivion', 3, 6612, 'Ruin, Queen of Oblivion'),
    ('main', 11, 'darkpiercinglight', 1, 4356, 'Dark-Piercing Light'),
    ('main', 12, 'advancedritualart', 1, 6996, 'Advanced Ritual Art'),
    ('main', 13, 'doublesummon', 2, 7219, 'Double Summon'),
    ('main', 14, 'endoftheworld', 3, 6617, 'End of the World'),
    ('main', 15, 'invigoration', 2, 4330, 'Invigoration'),
    ('main', 16, 'whiteelephantsgift', 1, 9138, 'White Elephant''s Gift'),
    ('main', 17, 'deepdarktraphole', 1, 9796, 'Deep Dark Trap Hole'),
    ('main', 18, 'destructionjammer', 1, 7645, 'Destruction Jammer'),
    ('main', 19, 'dusttornado', 1, 4988, 'Dust Tornado'),
    ('main', 20, 'pharaohstreasure', 1, 5449, 'Pharaoh''s Treasure')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'shadi-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Shadi / B — Armageddon (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'shadi-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'alexandritedragon', 3, 9863, 'Alexandrite Dragon'),
    ('main', 2, 'lusterdragon', 3, 5644, 'Luster Dragon'),
    ('main', 3, 'blasterdragonrulerofinfernos', 3, 10521, 'Blaster, Dragon Ruler of Infernos'),
    ('main', 4, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 5, 'manjuofthetenthousandhands', 3, 5900, 'Manju of the Ten Thousand Hands'),
    ('main', 6, 'rescuerabbit', 2, 9755, 'Rescue Rabbit'),
    ('main', 7, 'sonicbird', 3, 4929, 'Sonic Bird'),
    ('main', 8, 'tempestdragonrulerofstorms', 3, 10522, 'Tempest, Dragon Ruler of Storms'),
    ('main', 9, 'demisekingofarmageddon', 3, 6613, 'Demise, King of Armageddon'),
    ('main', 10, 'advancedritualart', 2, 6996, 'Advanced Ritual Art'),
    ('main', 11, 'contractwiththeabyss', 3, 5784, 'Contract with the Abyss'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'endoftheworld', 3, 6617, 'End of the World'),
    ('main', 14, 'megamorph', 1, 4663, 'Megamorph'),
    ('main', 15, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'nightbeam', 1, 10078, 'Night Beam'),
    ('main', 17, 'royaldecree', 2, 4866, 'Royal Decree'),
    ('extra', 18, 'lightningchidori', 2, 10411, 'Lightning Chidori'),
    ('extra', 19, 'mechaphantombeastdracossack', 1, 10534, 'Mecha Phantom Beast Dracossack'),
    ('extra', 20, 'number11bigeye', 1, 9861, 'Number 11: Big Eye'),
    ('extra', 21, 'starliegepaladynamo', 2, 10340, 'Starliege Paladynamo')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'shadi-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Solomon Muto / A — Warrior Dragon (26 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'solomon-muto-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'leftarmoftheforbiddenone', 1, 4026, 'Left Arm of the Forbidden One'),
    ('main', 2, 'leftlegoftheforbiddenone', 1, 4024, 'Left Leg of the Forbidden One'),
    ('main', 3, 'rightarmoftheforbiddenone', 1, 4025, 'Right Arm of the Forbidden One'),
    ('main', 4, 'rightlegoftheforbiddenone', 1, 4023, 'Right Leg of the Forbidden One'),
    ('main', 5, 'exodiatheforbiddenone', 1, 4027, 'Exodia the Forbidden One'),
    ('main', 6, 'wingeddragonguardianofthefortress1', 3, 4013, 'Winged Dragon, Guardian of the Fortress #1'),
    ('main', 7, 'fairydragon', 2, 4609, 'Fairy Dragon'),
    ('main', 8, 'nonaggressionarea', 1, 5549, 'Non Aggression Area'),
    ('main', 9, 'draconnection', 2, 10121, 'Draconnection'),
    ('main', 10, 'dragontreasure', 1, 4321, 'Dragon Treasure'),
    ('main', 11, 'noentry', 3, 6746, 'No Entry!!'),
    ('main', 12, 'spellbindingcircle', 2, 4355, 'Spellbinding Circle'),
    ('main', 13, 'twoprongedattack', 1, 4839, 'Two-Pronged Attack'),
    ('main', 14, 'thundershort', 3, 9664, 'Thunder Short'),
    ('main', 15, 'penguinsoldier', 1, 4608, 'Penguin Soldier'),
    ('main', 16, 'exploderdragon', 2, 7094, 'Exploder Dragon'),
    ('main', 17, 'beaverwarrior', 2, 4033, 'Beaver Warrior'),
    ('main', 18, 'hornimp', 1, 4031, 'Horn Imp'),
    ('main', 19, 'mammothgraveyard', 1, 4065, 'Mammoth Graveyard'),
    ('main', 20, 'koumoridragon', 1, 4037, 'Koumori Dragon'),
    ('main', 21, 'torike', 1, 4053, 'Torike'),
    ('main', 22, 'silverfang', 1, 4071, 'Silver Fang'),
    ('main', 23, 'giantturtlewhofeedsonflames', 2, 4599, 'Giant Turtle Who Feeds on Flames'),
    ('main', 24, 'crawlingdragon', 2, 4100, 'Crawling Dragon'),
    ('main', 25, 'dreaddragon', 2, 8784, 'Dread Dragon'),
    ('main', 26, 'dragonsgunfire', 1, 5344, 'Dragon''s Gunfire')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'solomon-muto-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Solomon Muto / B — Forbidden One (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'solomon-muto-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'metaionthetimelord', 2, 9698, 'Metaion, the Timelord'),
    ('main', 2, 'zerogardna', 2, 8441, 'Zero Gardna'),
    ('main', 3, 'emissaryoftheafterlife', 1, 6038, 'Emissary of the Afterlife'),
    ('main', 4, 'exodiatheforbiddenone', 1, 4027, 'Exodia the Forbidden One'),
    ('main', 5, 'cardcard', 2, 10029, 'Cardcar D'),
    ('main', 6, 'leftlegoftheforbiddenone', 1, 4024, 'Left Leg of the Forbidden One'),
    ('main', 7, 'leftarmoftheforbiddenone', 1, 4026, 'Left Arm of the Forbidden One'),
    ('main', 8, 'rightlegoftheforbiddenone', 1, 4023, 'Right Leg of the Forbidden One'),
    ('main', 9, 'rightarmoftheforbiddenone', 1, 4025, 'Right Arm of the Forbidden One'),
    ('main', 10, 'swiftscarecrow', 2, 9078, 'Swift Scarecrow'),
    ('main', 11, 'battlefader', 2, 8617, 'Battle Fader'),
    ('main', 12, 'onedayofpeace', 1, 9778, 'One Day of Peace'),
    ('main', 13, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 14, 'upstartgoblin', 3, 4895, 'Upstart Goblin'),
    ('main', 15, 'threateningroar', 2, 6278, 'Threatening Roar'),
    ('main', 16, 'hopeforescape', 3, 9354, 'Hope for Escape'),
    ('main', 17, 'giftcard', 3, 7234, 'Gift Card'),
    ('main', 18, 'jarofgreed', 2, 5210, 'Jar of Greed'),
    ('main', 19, 'accumulatedfortune', 2, 6916, 'Accumulated Fortune'),
    ('main', 20, 'recklessgreed', 2, 5448, 'Reckless Greed'),
    ('main', 21, 'legacyofyatagarasu', 2, 6006, 'Legacy of Yata-Garasu'),
    ('main', 22, 'waboku', 2, 4886, 'Waboku')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'solomon-muto-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Tristan Taylor / A — Commander (17 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tristan-taylor-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bokoichithefreighteningcar', 3, 6174, 'Bokoichi the Freightening Car'),
    ('main', 2, 'curtainofthedarkones', 3, 4110, 'Curtain of the Dark Ones'),
    ('main', 3, 'cybercommander', 3, 4427, 'Cyber Commander'),
    ('main', 4, 'dharmacannon', 3, 4550, 'Dharma Cannon'),
    ('main', 5, 'fiendshand', 3, 4141, 'Fiend''s Hand'),
    ('main', 6, 'kageningen', 3, 4113, 'Kageningen'),
    ('main', 7, 'maskedclown', 3, 4188, 'Masked Clown'),
    ('main', 8, 'mechmolezombie', 3, 4203, 'Mech Mole Zombie'),
    ('main', 9, 'medabat', 3, 4251, 'Meda Bat'),
    ('main', 10, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 11, 'enchantingfittingroom', 2, 6055, 'Enchanting Fitting Room'),
    ('main', 12, 'smashingground', 2, 5905, 'Smashing Ground'),
    ('main', 13, 'thelawofthenormal', 2, 6056, 'The Law of the Normal'),
    ('main', 14, 'humanwavetactics', 3, 6066, 'Human-Wave Tactics'),
    ('main', 15, 'overlimit', 3, 7254, 'Over Limit'),
    ('extra', 16, 'gachigachigantetsu', 1, 9576, 'Gachi Gachi Gantetsu'),
    ('extra', 17, 'number96darkmist', 1, 9917, 'Number 96: Dark Mist')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tristan-taylor-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Tristan Taylor / B — Legendary Six (31 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tristan-taylor-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'elderofthesixsamurai', 2, 9499, 'Elder of the Six Samurai'),
    ('main', 2, 'grandmasterofthesixsamurai', 2, 7145, 'Grandmaster of the Six Samurai'),
    ('main', 3, 'kagemushaofthesixsamurai', 2, 9316, 'Kagemusha of the Six Samurai'),
    ('main', 4, 'legendarysixsamuraienishi', 1, 9312, 'Legendary Six Samurai - Enishi'),
    ('main', 5, 'legendarysixsamuraikageki', 2, 9313, 'Legendary Six Samurai - Kageki'),
    ('main', 6, 'legendarysixsamuraikizan', 2, 9311, 'Legendary Six Samurai - Kizan'),
    ('main', 7, 'shiensfootsoldier', 1, 6970, 'Shien''s Footsoldier'),
    ('main', 8, 'shienssquire', 1, 9317, 'Shien''s Squire'),
    ('main', 9, 'spiritofthesixsamurai', 2, 7298, 'Spirit of the Six Samurai'),
    ('main', 10, 'thesixsamuraiirou', 2, 6968, 'The Six Samurai - Irou'),
    ('main', 11, 'thesixsamuraikamon', 1, 6967, 'The Six Samurai - Kamon'),
    ('main', 12, 'thesixsamuraiyaichi', 1, 6966, 'The Six Samurai - Yaichi'),
    ('main', 13, 'thesixsamuraizanji', 2, 6964, 'The Six Samurai - Zanji'),
    ('main', 14, 'asceticismofthesixsamurai', 2, 9341, 'Asceticism of the Six Samurai'),
    ('main', 15, 'shiensdojo', 2, 9528, 'Shien''s Dojo'),
    ('main', 16, 'shienssmokesignal', 2, 9339, 'Shien''s Smoke Signal'),
    ('main', 17, 'sixsamuraiunited', 2, 7458, 'Six Samurai United'),
    ('main', 18, 'sixstriketripleimpact', 1, 9340, 'Six Strike - Triple Impact'),
    ('main', 19, 'templeofthesix', 2, 9342, 'Temple of the Six'),
    ('main', 20, 'doubleedgedswordtechnique', 2, 7323, 'Double-Edged Sword Technique'),
    ('main', 21, 'musakanimagatama', 2, 9365, 'Musakani Magatama'),
    ('main', 22, 'returnofthesixsamurai', 2, 7007, 'Return of the Six Samurai'),
    ('main', 23, 'sixstrikethunderblast', 1, 9458, 'Six Strike - Thunder Blast'),
    ('main', 24, 'sixstyledualwield', 1, 9544, 'Six Style - Dual Wield'),
    ('extra', 25, 'legendarysixsamuraishien', 1, 9332, 'Legendary Six Samurai - Shi En'),
    ('extra', 26, 'naturiabarkion', 1, 8260, 'Naturia Barkion'),
    ('extra', 27, 'naturiabeast', 1, 7969, 'Naturia Beast'),
    ('extra', 28, 'bladearmorninja', 1, 9915, 'Blade Armor Ninja'),
    ('extra', 29, 'heroicchampionexcalibur', 1, 10171, 'Heroic Champion - Excalibur'),
    ('extra', 30, 'heroicchampiongandiva', 1, 10264, 'Heroic Champion - Gandiva'),
    ('extra', 31, 'heroicchampionkusanagi', 1, 10265, 'Heroic Champion - Kusanagi')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tristan-taylor-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Téa Gardner / A — Angel Fairy (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tea-gardner-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gyakutennomegami', 1, 4096, 'Gyakutenno Megami'),
    ('main', 2, 'happylover', 3, 4204, 'Happy Lover'),
    ('main', 3, 'keymace', 3, 4198, 'Key Mace'),
    ('main', 4, 'lunarqueenelzaim', 1, 4266, 'Lunar Queen Elzaim'),
    ('main', 5, 'orionthebattleking', 1, 4132, 'Orion the Battle King'),
    ('main', 6, 'petitangel', 3, 4214, 'Petit Angel'),
    ('main', 7, 'shiningfriendship', 3, 4614, 'Shining Friendship'),
    ('main', 8, 'wingedeggofnewlife', 2, 4639, 'Winged Egg of New Life'),
    ('main', 9, 'absorbingkidfromthesky', 1, 6034, 'Absorbing Kid from the Sky'),
    ('main', 10, 'fairyarcher', 2, 8796, 'Fairy Archer'),
    ('main', 11, 'hoshiningen', 1, 4498, 'Hoshiningen'),
    ('main', 12, 'neospacianairhummingbird', 3, 6769, 'Neo-Spacian Air Hummingbird'),
    ('main', 13, 'royalknight', 2, 6691, 'Royal Knight'),
    ('main', 14, 'skelengel', 2, 4546, 'Skelengel'),
    ('main', 15, 'mooyancurry', 3, 4344, 'Mooyan Curry'),
    ('main', 16, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 17, 'scapegoat', 1, 4818, 'Scapegoat'),
    ('main', 18, 'rushrecklessly', 1, 4905, 'Rush Recklessly'),
    ('main', 19, 'chainhealing', 1, 6914, 'Chain Healing'),
    ('main', 20, 'commoncharity', 1, 7228, 'Common Charity'),
    ('main', 21, 'pixiering', 1, 8355, 'Pixie Ring'),
    ('main', 22, 'solemnwishes', 1, 5125, 'Solemn Wishes'),
    ('main', 23, 'thefountaininthesky', 1, 8827, 'The Fountain in the Sky')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tea-gardner-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Téa Gardner / B — Madolche (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tea-gardner-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'madolchepuddingcess', 3, 10156, 'Madolche Puddingcess'),
    ('main', 2, 'madolchechouxvalier', 3, 10153, 'Madolche Chouxvalier'),
    ('main', 3, 'madolchebutlerusk', 3, 10155, 'Madolche Butlerusk'),
    ('main', 4, 'madolchemagileine', 3, 10154, 'Madolche Magileine'),
    ('main', 5, 'madolchemessengelato', 3, 10249, 'Madolche Messengelato'),
    ('main', 6, 'madolchehootcake', 2, 10513, 'Madolche Hootcake'),
    ('main', 7, 'madolchemewfeuille', 3, 10151, 'Madolche Mewfeuille'),
    ('main', 8, 'madolchechateau', 3, 10191, 'Madolche Chateau'),
    ('main', 9, 'madolcheticket', 3, 10283, 'Madolche Ticket'),
    ('main', 10, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 11, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 12, 'madolchelesson', 3, 10200, 'Madolche Lesson'),
    ('main', 13, 'madolchenights', 2, 10557, 'Madolche Nights'),
    ('main', 14, 'madolcheteabreak', 2, 10202, 'Madolche Tea Break'),
    ('main', 15, 'madolchepalooza', 1, 10296, 'Madolchepalooza'),
    ('main', 16, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 17, 'ultimateoffering', 1, 4851, 'Ultimate Offering'),
    ('extra', 18, 'madolchequeentiaramisu', 2, 10270, 'Madolche Queen Tiaramisu'),
    ('extra', 19, 'leviairtheseadragon', 2, 9660, 'Leviair the Sea Dragon'),
    ('extra', 20, 'windupzenmaines', 2, 9870, 'Wind-Up Zenmaines'),
    ('extra', 21, 'mxsaberinvoker', 2, 9874, 'M-X-Saber Invoker')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tea-gardner-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Weevil Underwood / A — Insect Evolution (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'weevil-underwood-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'dungeonworm', 1, 4381, 'Dungeon Worm'),
    ('main', 2, 'petitmoth', 3, 4284, 'Petit Moth'),
    ('main', 3, 'cocoonofevolution', 2, 4078, 'Cocoon of Evolution'),
    ('main', 4, 'greatmoth', 2, 4063, 'Great Moth'),
    ('main', 5, 'insectprincess', 1, 5892, 'Insect Princess'),
    ('main', 6, 'maneaterbug', 2, 4507, 'Man-Eater Bug'),
    ('main', 7, 'insectqueen', 1, 4768, 'Insect Queen'),
    ('main', 8, 'parasiteparacide', 3, 4769, 'Parasite Paracide'),
    ('main', 9, 'perfectlyultimategreatmoth', 2, 4073, 'Perfectly Ultimate Great Moth'),
    ('main', 10, 'pinchhopper', 3, 4772, 'Pinch Hopper'),
    ('main', 11, 'scarymoth', 1, 8314, 'Scary Moth'),
    ('main', 12, 'swarmoflocusts', 1, 5419, 'Swarm of Locusts'),
    ('main', 13, 'swarmofscarabs', 2, 5418, 'Swarm of Scarabs'),
    ('main', 14, 'insectbarrier', 1, 4832, 'Insect Barrier'),
    ('main', 15, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 16, 'dnasurgery', 1, 4951, 'DNA Surgery'),
    ('main', 17, 'negateattack', 2, 4804, 'Negate Attack'),
    ('main', 18, 'safezone', 2, 9549, 'Safe Zone'),
    ('main', 19, 'forest', 2, 4336, 'Forest'),
    ('main', 20, 'lasercannonarmor', 1, 4311, 'Laser Cannon Armor'),
    ('main', 21, 'multiplicationofants', 1, 5116, 'Multiplication of Ants'),
    ('main', 22, 'basicinsect', 2, 4056, 'Basic Insect'),
    ('main', 23, 'shieldworm', 1, 8520, 'Shield Worm'),
    ('main', 24, 'gokipon', 2, 6597, 'Gokipon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'weevil-underwood-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Weevil Underwood / B — Ultimate Insect (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'weevil-underwood-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'anteatereatingant', 2, 6600, 'Anteatereatingant'),
    ('main', 2, 'armoredbee', 2, 8742, 'Armored Bee'),
    ('main', 3, 'crossswordbeetle', 2, 8030, 'Cross-Sword Beetle'),
    ('main', 4, 'flyingkamakiri1', 2, 4927, 'Flying Kamakiri #1'),
    ('main', 5, 'howlinginsect', 2, 6117, 'Howling Insect'),
    ('main', 6, 'infernitybeetle', 3, 8790, 'Infernity Beetle'),
    ('main', 7, 'pinchhopper', 2, 4772, 'Pinch Hopper'),
    ('main', 8, 'ultimateinsectlv1', 1, 6097, 'Ultimate Insect LV1'),
    ('main', 9, 'ultimateinsectlv3', 3, 6178, 'Ultimate Insect LV3'),
    ('main', 10, 'ultimateinsectlv5', 3, 6238, 'Ultimate Insect LV5'),
    ('main', 11, 'ultimateinsectlv7', 2, 6319, 'Ultimate Insect LV7'),
    ('main', 12, 'creatureswap', 2, 5162, 'Creature Swap'),
    ('main', 13, 'insectneglect', 2, 8496, 'Insect Neglect'),
    ('main', 14, 'solidarity', 2, 8344, 'Solidarity'),
    ('main', 15, 'thegraveyardinthefourthdimension', 2, 6135, 'The Graveyard in the Fourth Dimension'),
    ('main', 16, 'verdantsanctuary', 2, 8055, 'Verdant Sanctuary'),
    ('main', 17, 'damagecondenser', 2, 6582, 'Damage Condenser'),
    ('main', 18, 'damagegate', 2, 8845, 'Damage Gate'),
    ('main', 19, 'lairwire', 2, 8682, 'Lair Wire'),
    ('extra', 20, 'undergroundarachnid', 2, 8603, 'Underground Arachnid'),
    ('extra', 21, 'inzektorexastag', 1, 10073, 'Inzektor Exa-Stag'),
    ('extra', 22, 'number20gigabrilliant', 1, 9760, 'Number 20: Giga-Brilliant')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'weevil-underwood-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yami Yugi / A — Black Chaos (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yami-yugi-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'alphathemagnetwarrior', 3, 4744, 'Alpha The Magnet Warrior'),
    ('main', 2, 'betathemagnetwarrior', 3, 4763, 'Beta The Magnet Warrior'),
    ('main', 3, 'darkmagician', 3, 4041, 'Dark Magician'),
    ('main', 4, 'gammathemagnetwarrior', 3, 4792, 'Gamma The Magnet Warrior'),
    ('main', 5, 'giantsoldierofstone', 1, 4080, 'Giant Soldier of Stone'),
    ('main', 6, 'summonedskull', 2, 4028, 'Summoned Skull'),
    ('main', 7, 'bigshieldgardna', 1, 4764, 'Big Shield Gardna'),
    ('main', 8, 'darkmagiciangirl', 3, 4766, 'Dark Magician Girl'),
    ('main', 9, 'kuriboh', 1, 4064, 'Kuriboh'),
    ('main', 10, 'obnoxiouscelticguard', 2, 5244, 'Obnoxious Celtic Guard'),
    ('main', 11, 'valkyrionthemagnawarrior', 2, 5002, 'Valkyrion the Magna Warrior'),
    ('main', 12, 'magicianofblackchaos', 3, 4728, 'Magician of Black Chaos'),
    ('main', 13, 'advancedritualart', 2, 6996, 'Advanced Ritual Art'),
    ('main', 14, 'blackmagicritual', 3, 4727, 'Black Magic Ritual'),
    ('main', 15, 'darkfactoryofmassproduction', 2, 6129, 'Dark Factory of Mass Production'),
    ('main', 16, 'heartoftheunderdog', 2, 5837, 'Heart of the Underdog'),
    ('main', 17, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 18, 'justibreak', 2, 6912, 'Justi-Break'),
    ('extra', 19, 'daigustoemeral', 2, 9822, 'Daigusto Emeral')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yami-yugi-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yami Yugi / B — Dark Magician (36 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yami-yugi-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'darkmagician', 1, 4041, 'Dark Magician'),
    ('main', 2, 'jacksknight', 1, 5559, 'Jack''s Knight'),
    ('main', 3, 'queensknight', 2, 5503, 'Queen''s Knight'),
    ('main', 4, 'summonedskull', 1, 4028, 'Summoned Skull'),
    ('main', 5, 'bigshieldgardna', 1, 4764, 'Big Shield Gardna'),
    ('main', 6, 'blacklustersoldierenvoyofthebeginning', 1, 5835, 'Black Luster Soldier - Envoy of the Beginning'),
    ('main', 7, 'breakerthemagicalwarrior', 1, 5655, 'Breaker the Magical Warrior'),
    ('main', 8, 'busterblader', 1, 4983, 'Buster Blader'),
    ('main', 9, 'darkmagiciangirl', 1, 4766, 'Dark Magician Girl'),
    ('main', 10, 'kingoftheswamp', 2, 6044, 'King of the Swamp'),
    ('main', 11, 'kingsknight', 2, 5558, 'King''s Knight'),
    ('main', 12, 'kuriboh', 1, 4064, 'Kuriboh'),
    ('main', 13, 'skilleddarkmagician', 2, 5649, 'Skilled Dark Magician'),
    ('main', 14, 'skilledwhitemagician', 2, 5648, 'Skilled White Magician'),
    ('main', 15, 'slifertheskydragon', 1, 4999, 'Slifer the Sky Dragon'),
    ('main', 16, 'ancientrules', 1, 6995, 'Ancient Rules'),
    ('main', 17, 'carddestruction', 1, 4821, 'Card Destruction'),
    ('main', 18, 'darkmagicattack', 1, 6057, 'Dark Magic Attack'),
    ('main', 19, 'darkmagiccurtain', 1, 4830, 'Dark Magic Curtain'),
    ('main', 20, 'defusion', 1, 5118, 'De-Fusion'),
    ('main', 21, 'fiendssanctuary', 2, 5632, 'Fiend''s Sanctuary'),
    ('main', 22, 'mysticbox', 1, 5168, 'Mystic Box'),
    ('main', 23, 'polymerization', 2, 4837, 'Polymerization'),
    ('main', 24, 'soultaker', 1, 5743, 'Soul Taker'),
    ('main', 25, 'spellshatteringarrow', 1, 5290, 'Spell Shattering Arrow'),
    ('main', 26, 'summonersart', 1, 7220, 'Summoner''s Art'),
    ('main', 27, 'swordsofrevealinglight', 1, 4354, 'Swords of Revealing Light'),
    ('main', 28, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 29, 'magiccylinder', 1, 5124, 'Magic Cylinder'),
    ('main', 30, 'miraclerestoring', 1, 5681, 'Miracle Restoring'),
    ('main', 31, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 32, 'soulrope', 1, 5557, 'Soul Rope'),
    ('main', 33, 'spellbindingcircle', 1, 4355, 'Spellbinding Circle'),
    ('extra', 34, 'arcanaknightjoker', 1, 6454, 'Arcana Knight Joker'),
    ('extra', 35, 'blackskulldragon', 1, 4223, 'B. Skull Dragon'),
    ('extra', 36, 'darkpaladin', 1, 5628, 'Dark Paladin')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yami-yugi-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yugi Muto / A — Fusion (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yugi-muto-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlewarrior', 3, 4106, 'Battle Warrior'),
    ('main', 2, 'blacklandfiredragon', 1, 4016, 'Blackland Fire Dragon'),
    ('main', 3, 'dissolverock', 3, 4250, 'Dissolverock'),
    ('main', 4, 'koumoridragon', 1, 4037, 'Koumori Dragon'),
    ('main', 5, 'mushroomman', 2, 4014, 'Mushroom Man'),
    ('main', 6, 'mysticalelf', 2, 4008, 'Mystical Elf'),
    ('main', 7, 'redeyesblackdragon', 2, 4088, 'Red-Eyes B. Dragon'),
    ('main', 8, 'skullservant', 3, 4030, 'Skull Servant'),
    ('main', 9, 'summonedskull', 2, 4028, 'Summoned Skull'),
    ('main', 10, 'beastkingoftheswamps', 2, 4264, 'Beastking of the Swamps'),
    ('main', 11, 'mysticalsheep1', 3, 4648, 'Mystical Sheep #1'),
    ('main', 12, 'thedarkhexsealedfusion', 1, 6257, 'The Dark - Hex-Sealed Fusion'),
    ('main', 13, 'fusiongate', 2, 5276, 'Fusion Gate'),
    ('main', 14, 'fusionsage', 3, 4872, 'Fusion Sage'),
    ('main', 15, 'fusionweapon', 3, 6138, 'Fusion Weapon'),
    ('main', 16, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 17, 'refusion', 1, 6273, 'Re-Fusion'),
    ('main', 18, 'magicalhats', 1, 4962, 'Magical Hats'),
    ('main', 19, 'kuriboh', 2, 4064, 'Kuriboh'),
    ('extra', 20, 'blackskulldragon', 1, 4223, 'B. Skull Dragon'),
    ('extra', 21, 'flameghost', 3, 4221, 'Flame Ghost'),
    ('extra', 22, 'zombiewarrior', 3, 4036, 'Zombie Warrior')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yugi-muto-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yugi Muto / B — Skull Servant (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yugi-muto-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'skullservant', 3, 4030, 'Skull Servant'),
    ('main', 2, 'blacklustersoldierenvoyofthebeginning', 1, 5835, 'Black Luster Soldier - Envoy of the Beginning'),
    ('main', 3, 'chaossorcerer', 1, 5833, 'Chaos Sorcerer'),
    ('main', 4, 'effectveiler', 2, 8933, 'Effect Veiler'),
    ('main', 5, 'goblinzombie', 2, 5561, 'Goblin Zombie'),
    ('main', 6, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 7, 'kingoftheskullservants', 3, 6341, 'King of the Skull Servants'),
    ('main', 8, 'lylalightswornsorceress', 3, 7592, 'Lyla, Lightsworn Sorceress'),
    ('main', 9, 'magicalmerchant', 3, 5663, 'Magical Merchant'),
    ('main', 10, 'mezuki', 1, 7359, 'Mezuki'),
    ('main', 11, 'necrogardna', 1, 7178, 'Necro Gardna'),
    ('main', 12, 'rykolightswornhunter', 3, 7595, 'Ryko, Lightsworn Hunter'),
    ('main', 13, 'theladyinwight', 3, 7611, 'The Lady in Wight'),
    ('main', 14, 'wightmare', 3, 9112, 'Wightmare'),
    ('main', 15, 'zombiemaster', 2, 7215, 'Zombie Master'),
    ('main', 16, 'bookoflife', 1, 5430, 'Book of Life'),
    ('main', 17, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 18, 'carddestruction', 1, 4821, 'Card Destruction'),
    ('main', 19, 'chargeofthelightbrigade', 1, 7868, 'Charge of the Light Brigade'),
    ('main', 20, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 21, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 22, 'oneforone', 1, 8197, 'One for One'),
    ('main', 23, 'needlebugnest', 1, 7769, 'Needlebug Nest')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yugi-muto-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Adrian Gecko / A — Turbulence (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'adrian-gecko-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cloudianacidcloud', 1, 7278, 'Cloudian - Acid Cloud'),
    ('main', 2, 'cloudiancirrostratus', 3, 7279, 'Cloudian - Cirrostratus'),
    ('main', 3, 'cloudianghostfog', 3, 7265, 'Cloudian - Ghost Fog'),
    ('main', 4, 'cloudiannimbusman', 1, 7266, 'Cloudian - Nimbusman'),
    ('main', 5, 'cloudianpoisoncloud', 3, 7268, 'Cloudian - Poison Cloud'),
    ('main', 6, 'cloudiansheepcloud', 3, 7267, 'Cloudian - Sheep Cloud'),
    ('main', 7, 'cloudiansmokeball', 3, 7277, 'Cloudian - Smoke Ball'),
    ('main', 8, 'cloudianturbulence', 2, 7281, 'Cloudian - Turbulence'),
    ('main', 9, 'cloudiansquall', 3, 7305, 'Cloudian Squall'),
    ('main', 10, 'diamonddustcyclone', 3, 7269, 'Diamond-Dust Cyclone'),
    ('main', 11, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 12, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 13, 'salvage', 2, 5908, 'Salvage'),
    ('main', 14, 'summoncloud', 2, 7270, 'Summon Cloud'),
    ('main', 15, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 16, 'naturaldisaster', 3, 7272, 'Natural Disaster'),
    ('main', 17, 'safezone', 2, 9549, 'Safe Zone'),
    ('main', 18, 'solemnwarning', 1, 9008, 'Solemn Warning')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'adrian-gecko-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Adrian Gecko / B — Cloudians (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'adrian-gecko-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cloudianacidcloud', 3, 7278, 'Cloudian - Acid Cloud'),
    ('main', 2, 'cloudianaltus', 3, 7280, 'Cloudian - Altus'),
    ('main', 3, 'cloudiancirrostratus', 3, 7279, 'Cloudian - Cirrostratus'),
    ('main', 4, 'cloudianeyeofthetyphoon', 1, 7264, 'Cloudian - Eye of the Typhoon'),
    ('main', 5, 'cloudiannimbusman', 3, 7266, 'Cloudian - Nimbusman'),
    ('main', 6, 'cloudiansheepcloud', 1, 7267, 'Cloudian - Sheep Cloud'),
    ('main', 7, 'cloudianstormdragon', 3, 7613, 'Cloudian - Storm Dragon'),
    ('main', 8, 'cloudiansquall', 3, 7305, 'Cloudian Squall'),
    ('main', 9, 'messengerofpeace', 2, 4938, 'Messenger of Peace'),
    ('main', 10, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 11, 'salvage', 2, 5908, 'Salvage'),
    ('main', 12, 'summoncloud', 2, 7270, 'Summon Cloud'),
    ('main', 13, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 14, 'thesanctuaryinthesky', 3, 5982, 'The Sanctuary in the Sky'),
    ('main', 15, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 16, 'fiendishchain', 1, 8675, 'Fiendish Chain'),
    ('main', 17, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 18, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 19, 'spiritbarrier', 3, 6142, 'Spirit Barrier')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'adrian-gecko-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Alexis Rhodes / A — Cyber Blader (32 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'alexis-rhodes-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'icemaster', 1, 7025, 'Ice Master'),
    ('main', 2, 'icequeen', 1, 7498, 'Ice Queen'),
    ('main', 3, 'blizzardprincess', 1, 8891, 'Blizzard Princess'),
    ('main', 4, 'cyberprima', 1, 6666, 'Cyber Prima'),
    ('main', 5, 'mindonair', 1, 6119, 'Mind on Air'),
    ('main', 6, 'bladeskater', 2, 6472, 'Blade Skater'),
    ('main', 7, 'etoilecyber', 2, 6482, 'Etoile Cyber'),
    ('main', 8, 'giantrat', 2, 4915, 'Giant Rat'),
    ('main', 9, 'warriorladyofthewasteland', 2, 6457, 'Warrior Lady of the Wasteland'),
    ('main', 10, 'coldenchanter', 2, 6928, 'Cold Enchanter'),
    ('main', 11, 'cybergymnast', 2, 6665, 'Cyber Gymnast'),
    ('main', 12, 'cybertutu', 1, 6664, 'Cyber Tutu'),
    ('main', 13, 'theearthhexsealedfusion', 2, 6258, 'The Earth - Hex-Sealed Fusion'),
    ('main', 14, 'creatureswap', 2, 5162, 'Creature Swap'),
    ('main', 15, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'groundcollapse', 2, 5170, 'Ground Collapse'),
    ('main', 17, 'scapegoat', 1, 4818, 'Scapegoat'),
    ('main', 18, 'thewarriorreturningalive', 1, 5330, 'The Warrior Returning Alive'),
    ('main', 19, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 20, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 21, 'fusiongate', 1, 5276, 'Fusion Gate'),
    ('main', 22, 'fusionrecovery', 1, 6431, 'Fusion Recovery'),
    ('main', 23, 'straylambs', 1, 5904, 'Stray Lambs'),
    ('main', 24, 'polymerization', 1, 4837, 'Polymerization'),
    ('main', 25, 'fusionsage', 1, 4872, 'Fusion Sage'),
    ('main', 26, 'raregoldarmor', 1, 5610, 'Raregold Armor'),
    ('main', 27, 'hallowedlifebarrier', 1, 6149, 'Hallowed Life Barrier'),
    ('main', 28, 'meteorain', 1, 5618, 'Meteorain'),
    ('main', 29, 'arivalappears', 1, 6443, 'A Rival Appears!'),
    ('main', 30, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 31, 'limitreverse', 1, 7636, 'Limit Reverse'),
    ('extra', 32, 'cyberblader', 2, 6485, 'Cyber Blader')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'alexis-rhodes-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Alexis Rhodes / B — Ice Barrier (36 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'alexis-rhodes-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blizzeddefenderoftheicebarrier', 1, 7527, 'Blizzed, Defender of the Ice Barrier'),
    ('main', 2, 'daisojooftheicebarrier', 1, 7954, 'Dai-sojo of the Ice Barrier'),
    ('main', 3, 'danceprincessoftheicebarrier', 2, 9110, 'Dance Princess of the Ice Barrier'),
    ('main', 4, 'defenderoftheicebarrier', 2, 8570, 'Defender of the Ice Barrier'),
    ('main', 5, 'generalgantalaoftheicebarrier', 2, 8726, 'General Gantala of the Ice Barrier'),
    ('main', 6, 'generalraihooftheicebarrier', 1, 8573, 'General Raiho of the Ice Barrier'),
    ('main', 7, 'prioroftheicebarrier', 3, 9748, 'Prior of the Ice Barrier'),
    ('main', 8, 'secretguardsoftheicebarrier', 2, 8725, 'Secret Guards of the Ice Barrier'),
    ('main', 9, 'strategistoftheicebarrier', 3, 8724, 'Strategist of the Ice Barrier'),
    ('main', 10, 'tidaldragonrulerofwaterfalls', 3, 10520, 'Tidal, Dragon Ruler of Waterfalls'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 13, 'magictriangleoftheicebarrier', 1, 8832, 'Magic Triangle of the Ice Barrier'),
    ('main', 14, 'medallionoftheicebarrier', 3, 9131, 'Medallion of the Ice Barrier'),
    ('main', 15, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 16, 'surface', 2, 9666, 'Surface'),
    ('main', 17, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 18, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 19, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 20, 'darkbribe', 1, 7349, 'Dark Bribe'),
    ('main', 21, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('main', 22, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 23, 'pinpointguard', 1, 10550, 'Pinpoint Guard'),
    ('main', 24, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 25, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 26, 'allyofjusticecatastor', 1, 7552, 'Ally of Justice Catastor'),
    ('extra', 27, 'armoryarm', 1, 7987, 'Armory Arm'),
    ('extra', 28, 'dewlorentigerkingoftheicebarrier', 1, 7970, 'Dewloren, Tiger King of the Ice Barrier'),
    ('extra', 29, 'gungnirdragonoftheicebarrier', 1, 8262, 'Gungnir, Dragon of the Ice Barrier'),
    ('extra', 30, 'abyssdweller', 1, 10354, 'Abyss Dweller'),
    ('extra', 31, 'bahamutshark', 1, 10332, 'Bahamut Shark'),
    ('extra', 32, 'daigustophoenix', 1, 9605, 'Daigusto Phoenix'),
    ('extra', 33, 'gachigachigantetsu', 1, 9576, 'Gachi Gachi Gantetsu'),
    ('extra', 34, 'mermailabyssgaios', 1, 10268, 'Mermail Abyssgaios'),
    ('extra', 35, 'number17leviathandragon', 1, 9656, 'Number 17: Leviathan Dragon'),
    ('extra', 36, 'number74masterofblades', 1, 10706, 'Number 74: Master of Blades')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'alexis-rhodes-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Aster Phoenix / A — Destiny HERO (24 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'aster-phoenix-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'destinyheroblademaster', 1, 6752, 'Destiny HERO - Blade Master'),
    ('main', 2, 'destinyherocaptaintenacious', 3, 6659, 'Destiny HERO - Captain Tenacious'),
    ('main', 3, 'destinyherodefender', 3, 6755, 'Destiny HERO - Defender'),
    ('main', 4, 'destinyherodogma', 2, 6757, 'Destiny HERO - Dogma'),
    ('main', 5, 'destinyherodoomlord', 1, 6658, 'Destiny HERO - Doom Lord'),
    ('main', 6, 'destinyherodreadservant', 3, 7577, 'Destiny HERO - Dread Servant'),
    ('main', 7, 'destinyherodreadmaster', 2, 6661, 'Destiny HERO - Dreadmaster'),
    ('main', 8, 'destinyherofearmonger', 1, 6756, 'Destiny HERO - Fear Monger'),
    ('main', 9, 'destinyheromalicious', 2, 6949, 'Destiny HERO - Malicious'),
    ('main', 10, 'destinyheroplasma', 1, 7096, 'Destiny HERO - Plasma'),
    ('main', 11, 'clocktowerprison', 3, 6668, 'Clock Tower Prison'),
    ('main', 12, 'dformation', 2, 7621, 'D - Formation'),
    ('main', 13, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 14, 'finalcountdown', 1, 5788, 'Final Countdown'),
    ('main', 15, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 16, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 17, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 18, 'terraforming', 3, 5537, 'Terraforming'),
    ('main', 19, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 20, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 21, 'dcounter', 1, 6952, 'D - Counter'),
    ('main', 22, 'eternaldread', 3, 6953, 'Eternal Dread'),
    ('extra', 23, 'heroicchampionexcalibur', 1, 10171, 'Heroic Champion - Excalibur'),
    ('extra', 24, 'heroicchampionkusanagi', 1, 10265, 'Heroic Champion - Kusanagi')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'aster-phoenix-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Aster Phoenix / B — Destiny End (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'aster-phoenix-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'destinyherodefender', 3, 6755, 'Destiny HERO - Defender'),
    ('main', 2, 'destinyherodiamonddude', 3, 6660, 'Destiny HERO - Diamond Dude'),
    ('main', 3, 'destinyherodogma', 3, 6757, 'Destiny HERO - Dogma'),
    ('main', 4, 'destinyherodunker', 3, 7416, 'Destiny HERO - Dunker'),
    ('main', 5, 'destinyheroplasma', 3, 7096, 'Destiny HERO - Plasma'),
    ('main', 6, 'elementalheroprisma', 3, 7491, 'Elemental HERO Prisma'),
    ('main', 7, 'kingoftheswamp', 3, 6044, 'King of the Swamp'),
    ('main', 8, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 9, 'burialfromadifferentdimension', 1, 6941, 'Burial from a Different Dimension'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'destinydraw', 3, 6950, 'Destiny Draw'),
    ('main', 12, 'eemergencycall', 2, 6672, 'E - Emergency Call'),
    ('main', 13, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 14, 'miraclefusion', 2, 6432, 'Miracle Fusion'),
    ('main', 15, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 17, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 18, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('extra', 19, 'destinyenddragoon', 3, 7615, 'Destiny End Dragoon'),
    ('extra', 20, 'elementalheroabsolutezero', 3, 8129, 'Elemental HERO Absolute Zero'),
    ('extra', 21, 'elementalheroescuridao', 2, 9838, 'Elemental HERO Escuridao')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'aster-phoenix-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Atticus Rhodes / A — Metal Dragon (15 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'atticus-rhodes-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'hunterdragon', 3, 7193, 'Hunter Dragon'),
    ('main', 2, 'redeyesblackdragon', 3, 4088, 'Red-Eyes B. Dragon'),
    ('main', 3, 'miragedragon', 3, 6196, 'Mirage Dragon'),
    ('main', 4, 'blackdragonschick', 3, 6109, 'Black Dragon''s Chick'),
    ('main', 5, 'redeyesblackmetaldragon', 3, 4748, 'Red-Eyes Black Metal Dragon'),
    ('main', 6, 'redeyesdarknessdragon', 3, 6292, 'Red-Eyes Darkness Dragon'),
    ('main', 7, 'speardragon', 3, 5334, 'Spear Dragon'),
    ('main', 8, 'troopdragon', 3, 5341, 'Troop Dragon'),
    ('main', 9, 'awingbeatofgiantdragon', 1, 5343, 'A Wingbeat of Giant Dragon'),
    ('main', 10, 'dragonsgunfire', 2, 5344, 'Dragon''s Gunfire'),
    ('main', 11, 'infernofireblast', 2, 6134, 'Inferno Fire Blast'),
    ('main', 12, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('main', 14, 'metalmorph', 3, 4664, 'Metalmorph'),
    ('main', 15, 'negateattack', 3, 4804, 'Negate Attack')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'atticus-rhodes-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Atticus Rhodes / B — Darkness Dragon (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'atticus-rhodes-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'redeyesblackdragon', 3, 4088, 'Red-Eyes B. Dragon'),
    ('main', 2, 'serpentnightdragon', 2, 4712, 'Serpent Night Dragon'),
    ('main', 3, 'darkarmeddragon', 1, 7421, 'Dark Armed Dragon'),
    ('main', 4, 'exploderdragon', 3, 7094, 'Exploder Dragon'),
    ('main', 5, 'maskeddragon', 3, 6118, 'Masked Dragon'),
    ('main', 6, 'blackdragonschick', 3, 6109, 'Black Dragon''s Chick'),
    ('main', 7, 'redeyesdarknessdragon', 3, 6292, 'Red-Eyes Darkness Dragon'),
    ('main', 8, 'redeyesdarknessmetaldragon', 1, 7557, 'Red-Eyes Darkness Metal Dragon'),
    ('main', 9, 'redeyeswyvern', 3, 7982, 'Red-Eyes Wyvern'),
    ('main', 10, 'ancientrules', 3, 6995, 'Ancient Rules'),
    ('main', 11, 'dragonshrine', 3, 10590, 'Dragon Shrine'),
    ('main', 12, 'stampingdestruction', 2, 5345, 'Stamping Destruction'),
    ('main', 13, 'summonersart', 3, 7220, 'Summoner''s Art'),
    ('main', 14, 'swingofmemories', 1, 7256, 'Swing of Memories'),
    ('main', 15, 'birthright', 1, 7013, 'Birthright'),
    ('main', 16, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 17, 'dragonsrebirth', 1, 9959, 'Dragon''s Rebirth'),
    ('main', 18, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('extra', 19, 'gaiadragonthethundercharger', 1, 10069, 'Gaia Dragon, the Thunder Charger'),
    ('extra', 20, 'hieraticdragonkingofatum', 1, 10070, 'Hieratic Dragon King of Atum'),
    ('extra', 21, 'number74masterofblades', 1, 10706, 'Number 74: Master of Blades'),
    ('extra', 22, 'queendragundjinn', 1, 10072, 'Queen Dragun Djinn')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'atticus-rhodes-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Axel Brodie / A — Volcanic (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'axel-brodie-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'volcanicrat', 2, 7191, 'Volcanic Rat'),
    ('main', 2, 'firetrooper', 3, 7490, 'Fire Trooper'),
    ('main', 3, 'infernalflameemperor', 1, 6368, 'Infernal Flame Emperor'),
    ('main', 4, 'lavalmagmacannoneer', 1, 9643, 'Laval Magma Cannoneer'),
    ('main', 5, 'pyrorextheelementallord', 1, 10399, 'Pyrorex the Elemental Lord'),
    ('main', 6, 'volcanicblaster', 2, 7102, 'Volcanic Blaster'),
    ('main', 7, 'volcaniccounter', 2, 7415, 'Volcanic Counter'),
    ('main', 8, 'volcanicdoomfire', 1, 7085, 'Volcanic Doomfire'),
    ('main', 9, 'volcanichammerer', 1, 7104, 'Volcanic Hammerer'),
    ('main', 10, 'volcanicrocket', 1, 7243, 'Volcanic Rocket'),
    ('main', 11, 'volcanicscattershot', 3, 7083, 'Volcanic Scattershot'),
    ('main', 12, 'volcanicshell', 3, 7082, 'Volcanic Shell'),
    ('main', 13, 'volcanicslicer', 2, 7103, 'Volcanic Slicer'),
    ('main', 14, 'blazeaccelerator', 3, 7086, 'Blaze Accelerator'),
    ('main', 15, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 16, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 17, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 18, 'souloffire', 3, 7087, 'Soul of Fire'),
    ('main', 19, 'triblazeaccelerator', 2, 7088, 'Tri-Blaze Accelerator'),
    ('main', 20, 'wildfire', 2, 7089, 'Wild Fire'),
    ('main', 21, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('main', 22, 'volcanicrecharge', 1, 7131, 'Volcanic Recharge'),
    ('main', 23, 'widespreadruin', 1, 4692, 'Widespread Ruin')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'axel-brodie-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Axel Brodie / B — Fire Fist (25 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'axel-brodie-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blasterdragonrulerofinfernos', 2, 10521, 'Blaster, Dragon Ruler of Infernos'),
    ('main', 2, 'brotherhoodofthefirefistbear', 3, 10383, 'Brotherhood of the Fire Fist - Bear'),
    ('main', 3, 'brotherhoodofthefirefistboar', 3, 10629, 'Brotherhood of the Fire Fist - Boar'),
    ('main', 4, 'brotherhoodofthefirefistcaribou', 2, 10630, 'Brotherhood of the Fire Fist - Caribou'),
    ('main', 5, 'brotherhoodofthefirefistdragon', 3, 10384, 'Brotherhood of the Fire Fist - Dragon'),
    ('main', 6, 'brotherhoodofthefirefistgorilla', 3, 10382, 'Brotherhood of the Fire Fist - Gorilla'),
    ('main', 7, 'coachsoldierwolfbark', 3, 10444, 'Coach Soldier Wolfbark'),
    ('main', 8, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 9, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 10, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 11, 'fireformationgyokkou', 2, 10543, 'Fire Formation - Gyokkou'),
    ('main', 12, 'fireformationtenki', 2, 10418, 'Fire Formation - Tenki'),
    ('main', 13, 'fireformationtensu', 2, 10417, 'Fire Formation - Tensu'),
    ('main', 14, 'fireformationyoko', 2, 10668, 'Fire Formation - Yoko'),
    ('main', 15, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 17, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 18, 'fiendishchain', 1, 8675, 'Fiendish Chain'),
    ('main', 19, 'fireformationtenken', 1, 10431, 'Fire Formation - Tenken'),
    ('main', 20, 'fireformationtensen', 2, 10430, 'Fire Formation - Tensen'),
    ('main', 21, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 22, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('extra', 23, 'brotherhoodofthefirefistkirin', 3, 10645, 'Brotherhood of the Fire Fist - Kirin'),
    ('extra', 24, 'brotherhoodofthefirefistcardinal', 2, 10535, 'Brotherhood of the Fire Fist - Cardinal'),
    ('extra', 25, 'brotherhoodofthefirefisttigerking', 2, 10407, 'Brotherhood of the Fire Fist - Tiger King')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'axel-brodie-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bastion Misawa / A — Dinosaur H2O (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bastion-misawa-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'vorseraider', 3, 5004, 'Vorse Raider'),
    ('main', 2, 'babycerasaurus', 2, 6799, 'Babycerasaurus'),
    ('main', 3, 'hydrogeddon', 3, 6479, 'Hydrogeddon'),
    ('main', 4, 'miraclejurassicegg', 3, 6797, 'Miracle Jurassic Egg'),
    ('main', 5, 'oxygeddon', 3, 6480, 'Oxygeddon'),
    ('main', 6, 'summonermonk', 1, 6400, 'Summoner Monk'),
    ('main', 7, 'waterdragon', 2, 6481, 'Water Dragon'),
    ('main', 8, 'bondingh2o', 3, 6492, 'Bonding - H2O'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'fossildig', 3, 8352, 'Fossil Dig'),
    ('main', 11, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 12, 'potofavarice', 1, 6511, 'Pot of Avarice'),
    ('main', 13, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 14, 'tradein', 1, 7248, 'Trade-In'),
    ('main', 15, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 16, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 17, 'threateningroar', 2, 6278, 'Threatening Roar'),
    ('main', 18, 'torrentialtribute', 1, 5114, 'Torrential Tribute'),
    ('main', 19, 'waboku', 2, 4886, 'Waboku')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bastion-misawa-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Bastion Misawa / B — Dragon Ruler (34 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'bastion-misawa-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'flamvellguard', 1, 7535, 'Flamvell Guard'),
    ('main', 2, 'blasterdragonrulerofinfernos', 3, 10521, 'Blaster, Dragon Ruler of Infernos'),
    ('main', 3, 'cardtrooper', 2, 6939, 'Card Trooper'),
    ('main', 4, 'dandylion', 1, 6654, 'Dandylion'),
    ('main', 5, 'debrisdragon', 2, 8005, 'Debris Dragon'),
    ('main', 6, 'dragunitycorsesca', 2, 8716, 'Dragunity Corsesca'),
    ('main', 7, 'effectveiler', 1, 8933, 'Effect Veiler'),
    ('main', 8, 'maxxc', 2, 9455, 'Maxx "C"'),
    ('main', 9, 'redoxdragonrulerofboulders', 3, 10519, 'Redox, Dragon Ruler of Boulders'),
    ('main', 10, 'tempestdragonrulerofstorms', 3, 10522, 'Tempest, Dragon Ruler of Storms'),
    ('main', 11, 'tidaldragonrulerofwaterfalls', 3, 10520, 'Tidal, Dragon Ruler of Waterfalls'),
    ('main', 12, 'cardsofconsonance', 3, 8656, 'Cards of Consonance'),
    ('main', 13, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 14, 'dragonravine', 2, 9049, 'Dragon Ravine'),
    ('main', 15, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 16, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 17, 'lightningvortex', 1, 5217, 'Lightning Vortex'),
    ('main', 18, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 19, 'sacredswordofsevenstars', 3, 10547, 'Sacred Sword of Seven Stars'),
    ('main', 20, 'scapegoat', 1, 4818, 'Scapegoat'),
    ('main', 21, 'raigekibreak', 1, 5544, 'Raigeki Break'),
    ('main', 22, 'returnfromthedifferentdimension', 1, 6078, 'Return from the Different Dimension'),
    ('main', 23, 'skilldrain', 1, 5740, 'Skill Drain'),
    ('extra', 24, 'armoryarm', 1, 7987, 'Armory Arm'),
    ('extra', 25, 'colossalfighter', 1, 7698, 'Colossal Fighter'),
    ('extra', 26, 'crimsonblader', 1, 9801, 'Crimson Blader'),
    ('extra', 27, 'mistbirdclausolas', 1, 10646, 'Mist Bird Clausolas'),
    ('extra', 28, 'orientdragon', 1, 9845, 'Orient Dragon'),
    ('extra', 29, 'scraparchfiend', 1, 9202, 'Scrap Archfiend'),
    ('extra', 30, 'shootingstardragon', 1, 9117, 'Shooting Star Dragon'),
    ('extra', 31, 'stareater', 1, 10650, 'Star Eater'),
    ('extra', 32, 'gemknightpearl', 1, 9601, 'Gem-Knight Pearl'),
    ('extra', 33, 'mechaphantombeastdracossack', 1, 10534, 'Mecha Phantom Beast Dracossack'),
    ('extra', 34, 'number11bigeye', 1, 9861, 'Number 11: Big Eye')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'bastion-misawa-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Blair Flannigan / A — Twin Princesses (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'blair-flannigan-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'crystalseer', 2, 7208, 'Crystal Seer'),
    ('main', 2, 'ebonmagiciancurran', 3, 6429, 'Ebon Magician Curran'),
    ('main', 3, 'ironblacksmithkotetsu', 3, 5769, 'Iron Blacksmith Kotetsu'),
    ('main', 4, 'outstandingdogmarron', 3, 5767, 'Outstanding Dog Marron'),
    ('main', 5, 'princesscurran', 1, 6606, 'Princess Curran'),
    ('main', 6, 'princesspikeru', 1, 6605, 'Princess Pikeru'),
    ('main', 7, 'saambellthesummoner', 2, 9646, 'Saambell the Summoner'),
    ('main', 8, 'shiningangel', 2, 4924, 'Shining Angel'),
    ('main', 9, 'whitemagicianpikeru', 3, 5975, 'White Magician Pikeru'),
    ('main', 10, 'hiddenarmory', 2, 7493, 'Hidden Armory'),
    ('main', 11, 'riryoku', 2, 5009, 'Riryoku'),
    ('main', 12, 'shrink', 2, 5355, 'Shrink'),
    ('main', 13, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 14, 'trialoftheprincesses', 3, 6616, 'Trial of the Princesses'),
    ('main', 15, 'beckoninglight', 2, 5993, 'Beckoning Light'),
    ('main', 16, 'gracefulrevival', 3, 7754, 'Graceful Revival'),
    ('main', 17, 'lumenize', 2, 9788, 'Lumenize'),
    ('main', 18, 'mirrorwall', 2, 4993, 'Mirror Wall')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'blair-flannigan-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Blair Flannigan / B — Mystic Sword (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'blair-flannigan-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'commandknight', 2, 5017, 'Command Knight'),
    ('main', 2, 'ddassailant', 2, 5932, 'D.D. Assailant'),
    ('main', 3, 'ddwarriorlady', 2, 5719, 'D.D. Warrior Lady'),
    ('main', 4, 'exiledforce', 2, 5323, 'Exiled Force'),
    ('main', 5, 'maraudingcaptain', 3, 5318, 'Marauding Captain'),
    ('main', 6, 'mysticswordsmanlv2', 3, 6103, 'Mystic Swordsman LV2'),
    ('main', 7, 'mysticswordsmanlv4', 3, 6104, 'Mystic Swordsman LV4'),
    ('main', 8, 'mysticswordsmanlv6', 2, 6179, 'Mystic Swordsman LV6'),
    ('main', 9, 'tsukuyomi', 2, 5780, 'Tsukuyomi'),
    ('main', 10, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 13, 'levelmodulation', 2, 6468, 'Level Modulation'),
    ('main', 14, 'levelup', 3, 6133, 'Level Up!'),
    ('main', 15, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 16, 'swordsofconcealinglight', 2, 6268, 'Swords of Concealing Light'),
    ('main', 17, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 18, 'thewarriorreturningalive', 1, 5330, 'The Warrior Returning Alive'),
    ('main', 19, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 20, 'kunaiwithchain', 2, 4657, 'Kunai with Chain'),
    ('main', 21, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('extra', 22, 'bladearmorninja', 1, 9915, 'Blade Armor Ninja'),
    ('extra', 23, 'heroicchampionexcalibur', 2, 10171, 'Heroic Champion - Excalibur'),
    ('extra', 24, 'heroicchampiongandiva', 2, 10264, 'Heroic Champion - Gandiva'),
    ('extra', 25, 'heroicchampionkusanagi', 2, 10265, 'Heroic Champion - Kusanagi'),
    ('extra', 26, 'lavalvalignis', 1, 9602, 'Lavalval Ignis'),
    ('extra', 27, 'number39utopia', 1, 9575, 'Number 39: Utopia'),
    ('extra', 28, 'swordbreaker', 1, 10180, 'Sword Breaker')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'blair-flannigan-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Chazz Princeton / A — Ojama Trio (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'chazz-princeton-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ojamablack', 2, 5812, 'Ojama Black'),
    ('main', 2, 'ojamagreen', 2, 5761, 'Ojama Green'),
    ('main', 3, 'ojamayellow', 2, 5811, 'Ojama Yellow'),
    ('main', 4, 'armeddragonlv10', 1, 6540, 'Armed Dragon LV10'),
    ('main', 5, 'armeddragonlv3', 3, 6105, 'Armed Dragon LV3'),
    ('main', 6, 'armeddragonlv5', 2, 6106, 'Armed Dragon LV5'),
    ('main', 7, 'armeddragonlv7', 1, 6107, 'Armed Dragon LV7'),
    ('main', 8, 'dragonicknight', 1, 6790, 'Dragonic Knight'),
    ('main', 9, 'flyingkamakiri1', 2, 4927, 'Flying Kamakiri #1'),
    ('main', 10, 'genesisdragon', 1, 7978, 'Genesis Dragon'),
    ('main', 11, 'golemdragon', 2, 8420, 'Golem Dragon'),
    ('main', 12, 'lancerlindwurm', 1, 8418, 'Lancer Lindwurm'),
    ('main', 13, 'maskeddragon', 2, 6118, 'Masked Dragon'),
    ('main', 14, 'carddestruction', 1, 4821, 'Card Destruction'),
    ('main', 15, 'enchantingfittingroom', 1, 6055, 'Enchanting Fitting Room'),
    ('main', 16, 'levelmodulation', 1, 6468, 'Level Modulation'),
    ('main', 17, 'levelup', 2, 6133, 'Level Up!'),
    ('main', 18, 'lightningvortex', 1, 5217, 'Lightning Vortex'),
    ('main', 19, 'magicalmallet', 2, 6541, 'Magical Mallet'),
    ('main', 20, 'ojamadeltahurricane', 1, 5839, 'Ojama Delta Hurricane!!'),
    ('main', 21, 'ojamagic', 1, 6470, 'Ojamagic'),
    ('main', 22, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 23, 'triwight', 2, 9777, 'Tri-Wight'),
    ('main', 24, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 25, 'damagecondenser', 1, 6582, 'Damage Condenser'),
    ('main', 26, 'ojamatrio', 1, 5738, 'Ojama Trio'),
    ('main', 27, 'raigekibreak', 1, 5544, 'Raigeki Break')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'chazz-princeton-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Chazz Princeton / B — Dragon LV (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'chazz-princeton-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'armeddragonlv10', 1, 6540, 'Armed Dragon LV10'),
    ('main', 2, 'armeddragonlv3', 3, 6105, 'Armed Dragon LV3'),
    ('main', 3, 'armeddragonlv5', 2, 6106, 'Armed Dragon LV5'),
    ('main', 4, 'armeddragonlv7', 1, 6107, 'Armed Dragon LV7'),
    ('main', 5, 'debrisdragon', 2, 8005, 'Debris Dragon'),
    ('main', 6, 'deltaflyer', 2, 8947, 'Delta Flyer'),
    ('main', 7, 'exploderdragon', 1, 7094, 'Exploder Dragon'),
    ('main', 8, 'horustheblackflamedragonlv4', 3, 6098, 'Horus the Black Flame Dragon LV4'),
    ('main', 9, 'horustheblackflamedragonlv6', 3, 6099, 'Horus the Black Flame Dragon LV6'),
    ('main', 10, 'horustheblackflamedragonlv8', 1, 6100, 'Horus the Black Flame Dragon LV8'),
    ('main', 11, 'maskeddragon', 3, 6118, 'Masked Dragon'),
    ('main', 12, 'redeyesdarknessmetaldragon', 1, 7557, 'Red-Eyes Darkness Metal Dragon'),
    ('main', 13, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 14, 'levelmodulation', 1, 6468, 'Level Modulation'),
    ('main', 15, 'levelup', 3, 6133, 'Level Up!'),
    ('main', 16, 'lightningvortex', 1, 5217, 'Lightning Vortex'),
    ('main', 17, 'magicalmallet', 2, 6541, 'Magical Mallet'),
    ('main', 18, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 19, 'solidarity', 3, 8344, 'Solidarity'),
    ('main', 20, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 21, 'royaldecree', 3, 4866, 'Royal Decree'),
    ('extra', 22, 'azureeyessilverdragon', 1, 10593, 'Azure-Eyes Silver Dragon'),
    ('extra', 23, 'exploderdragonwing', 1, 8192, 'Exploder Dragonwing'),
    ('extra', 24, 'ironchaindragon', 1, 7899, 'Iron Chain Dragon'),
    ('extra', 25, 'reddragonarchfiend', 1, 7735, 'Red Dragon Archfiend'),
    ('extra', 26, 'stareater', 1, 10650, 'Star Eater'),
    ('extra', 27, 'stardustdragon', 1, 7734, 'Stardust Dragon'),
    ('extra', 28, 'tridentdragion', 1, 8195, 'Trident Dragion')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'chazz-princeton-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Chumley Huffington / A — Des Koalas (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'chumley-huffington-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'bigkoala', 3, 5814, 'Big Koala'),
    ('main', 2, 'greatbill', 2, 4613, 'Great Bill'),
    ('main', 3, 'deskangaroo', 3, 5815, 'Des Kangaroo'),
    ('main', 4, 'deskoala', 3, 5661, 'Des Koala'),
    ('main', 5, 'deswombat', 2, 6340, 'Des Wombat'),
    ('main', 6, 'garmrofthenordicbeasts', 2, 9303, 'Garmr of the Nordic Beasts'),
    ('main', 7, 'kangaroochamp', 3, 6246, 'Kangaroo Champ'),
    ('main', 8, 'mechabunny', 3, 7724, 'Mecha Bunny'),
    ('main', 9, 'seakoala', 3, 7437, 'Sea Koala'),
    ('main', 10, 'treeotter', 3, 7844, 'Tree Otter'),
    ('main', 11, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 12, 'scapegoat', 1, 4818, 'Scapegoat'),
    ('main', 13, 'thebigmarchofanimals', 2, 6274, 'The Big March of Animals'),
    ('main', 14, 'wildnaturesrelease', 2, 5838, 'Wild Nature''s Release'),
    ('main', 15, 'd2shield', 2, 9140, 'D2 Shield'),
    ('main', 16, 'destructionpunch', 1, 5267, 'Destruction Punch'),
    ('main', 17, 'magiccylinder', 1, 5124, 'Magic Cylinder'),
    ('main', 18, 'traphole', 1, 4836, 'Trap Hole'),
    ('extra', 19, 'koalokoala', 3, 7845, 'Koalo-Koala'),
    ('extra', 20, 'masterofoz', 3, 6127, 'Master of Oz'),
    ('extra', 21, 'diamonddirewolf', 1, 10410, 'Diamond Dire Wolf')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'chumley-huffington-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Chumley Huffington / B — The Fabled (31 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'chumley-huffington-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'fabledgrimro', 3, 8093, 'Fabled Grimro'),
    ('main', 2, 'fabledkrus', 2, 8234, 'Fabled Krus'),
    ('main', 3, 'fabledkushano', 2, 8095, 'Fabled Kushano'),
    ('main', 4, 'fabledlurrie', 2, 8092, 'Fabled Lurrie'),
    ('main', 5, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 6, 'honest', 1, 7574, 'Honest'),
    ('main', 7, 'maxxc', 2, 9455, 'Maxx "C"'),
    ('main', 8, 'tgwarwolf', 2, 9491, 'T.G. Warwolf'),
    ('main', 9, 'thefabledcerburrel', 3, 8556, 'The Fabled Cerburrel'),
    ('main', 10, 'thefabledchawa', 3, 8554, 'The Fabled Chawa'),
    ('main', 11, 'thefabledganashia', 3, 8557, 'The Fabled Ganashia'),
    ('main', 12, 'thetricky', 1, 6150, 'The Tricky'),
    ('main', 13, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 14, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 15, 'monsterreincarnation', 1, 6213, 'Monster Reincarnation'),
    ('main', 16, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 17, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 18, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 19, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 20, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 21, 'phoenixwingwindblast', 3, 6279, 'Phoenix Wing Wind Blast'),
    ('extra', 22, 'ancientsacredwyvern', 1, 8333, 'Ancient Sacred Wyvern'),
    ('extra', 23, 'fabledleviathan', 1, 8258, 'Fabled Leviathan'),
    ('extra', 24, 'fabledragin', 1, 8415, 'Fabled Ragin'),
    ('extra', 25, 'fabledvalkyrus', 1, 8117, 'Fabled Valkyrus'),
    ('extra', 26, 'ironchaindragon', 1, 7899, 'Iron Chain Dragon'),
    ('extra', 27, 'stareater', 1, 10650, 'Star Eater'),
    ('extra', 28, 'stardustdragon', 1, 7734, 'Stardust Dragon'),
    ('extra', 29, 'thefabledkudabbi', 1, 8730, 'The Fabled Kudabbi'),
    ('extra', 30, 'thefabledunicore', 1, 8575, 'The Fabled Unicore'),
    ('extra', 31, 'gachigachigantetsu', 1, 9576, 'Gachi Gachi Gantetsu')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'chumley-huffington-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dr. Vellian Crowler / A — Ancient Gear (30 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'vellian-crowler-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ancientgearbeast', 1, 6316, 'Ancient Gear Beast'),
    ('main', 2, 'ancientgearcannon', 1, 6587, 'Ancient Gear Cannon'),
    ('main', 3, 'ancientgearengineer', 2, 6841, 'Ancient Gear Engineer'),
    ('main', 4, 'ancientgeargadjiltronchimera', 2, 6933, 'Ancient Gear Gadjiltron Chimera'),
    ('main', 5, 'ancientgeargadjiltrondragon', 2, 6932, 'Ancient Gear Gadjiltron Dragon'),
    ('main', 6, 'ancientgeargolem', 2, 6315, 'Ancient Gear Golem'),
    ('main', 7, 'ancientgearknight', 3, 7294, 'Ancient Gear Knight'),
    ('main', 8, 'ancientgearsoldier', 1, 6317, 'Ancient Gear Soldier'),
    ('main', 9, 'cyberdragon', 1, 6390, 'Cyber Dragon'),
    ('main', 10, 'giantrat', 2, 4915, 'Giant Rat'),
    ('main', 11, 'minefieldriller', 1, 8325, 'Minefieldriller'),
    ('main', 12, 'redoxdragonrulerofboulders', 2, 10519, 'Redox, Dragon Ruler of Boulders'),
    ('main', 13, 'ancientgearcastle', 2, 6578, 'Ancient Gear Castle'),
    ('main', 14, 'ancientgeardrill', 1, 6574, 'Ancient Gear Drill'),
    ('main', 15, 'ancientgearexplosive', 1, 6843, 'Ancient Gear Explosive'),
    ('main', 16, 'ancientgearfactory', 1, 6573, 'Ancient Gear Factory'),
    ('main', 17, 'ancientgearfist', 1, 6844, 'Ancient Gear Fist'),
    ('main', 18, 'ancientgeartank', 1, 6842, 'Ancient Gear Tank'),
    ('main', 19, 'ancientgearworkshop', 2, 6935, 'Ancient Gear Workshop'),
    ('main', 20, 'doublecyclone', 1, 8977, 'Double Cyclone'),
    ('main', 21, 'geartown', 2, 7683, 'Geartown'),
    ('main', 22, 'machinaarmoredunit', 1, 8696, 'Machina Armored Unit'),
    ('main', 23, 'marchofthemonarchs', 2, 10423, 'March of the Monarchs'),
    ('main', 24, 'polymerization', 1, 4837, 'Polymerization'),
    ('main', 25, 'powerbond', 1, 6398, 'Power Bond'),
    ('main', 26, 'spellgear', 1, 7622, 'Spell Gear'),
    ('main', 27, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 28, 'zone', 1, 9447, 'Z-ONE'),
    ('extra', 29, 'ultimateancientgeargolem', 2, 7616, 'Ultimate Ancient Gear Golem'),
    ('extra', 30, 'superdreadnoughtrailcannongustavmax', 1, 9963, 'Superdreadnought Rail Cannon Gustav Max')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'vellian-crowler-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Dr. Vellian Crowler / B — Gadjiltron (30 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'vellian-crowler-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ancientgearbeast', 1, 6316, 'Ancient Gear Beast'),
    ('main', 2, 'ancientgearcannon', 1, 6587, 'Ancient Gear Cannon'),
    ('main', 3, 'ancientgearengineer', 2, 6841, 'Ancient Gear Engineer'),
    ('main', 4, 'ancientgeargadjiltronchimera', 2, 6933, 'Ancient Gear Gadjiltron Chimera'),
    ('main', 5, 'ancientgeargadjiltrondragon', 2, 6932, 'Ancient Gear Gadjiltron Dragon'),
    ('main', 6, 'ancientgeargolem', 2, 6315, 'Ancient Gear Golem'),
    ('main', 7, 'ancientgearknight', 3, 7294, 'Ancient Gear Knight'),
    ('main', 8, 'ancientgearsoldier', 1, 6317, 'Ancient Gear Soldier'),
    ('main', 9, 'cyberdragon', 1, 6390, 'Cyber Dragon'),
    ('main', 10, 'giantrat', 2, 4915, 'Giant Rat'),
    ('main', 11, 'minefieldriller', 1, 8325, 'Minefieldriller'),
    ('main', 12, 'redoxdragonrulerofboulders', 2, 10519, 'Redox, Dragon Ruler of Boulders'),
    ('main', 13, 'ancientgearcastle', 2, 6578, 'Ancient Gear Castle'),
    ('main', 14, 'ancientgeardrill', 1, 6574, 'Ancient Gear Drill'),
    ('main', 15, 'ancientgearexplosive', 1, 6843, 'Ancient Gear Explosive'),
    ('main', 16, 'ancientgearfactory', 1, 6573, 'Ancient Gear Factory'),
    ('main', 17, 'ancientgearfist', 1, 6844, 'Ancient Gear Fist'),
    ('main', 18, 'ancientgeartank', 1, 6842, 'Ancient Gear Tank'),
    ('main', 19, 'ancientgearworkshop', 2, 6935, 'Ancient Gear Workshop'),
    ('main', 20, 'doublecyclone', 1, 8977, 'Double Cyclone'),
    ('main', 21, 'geartown', 2, 7683, 'Geartown'),
    ('main', 22, 'machinaarmoredunit', 1, 8696, 'Machina Armored Unit'),
    ('main', 23, 'marchofthemonarchs', 2, 10423, 'March of the Monarchs'),
    ('main', 24, 'polymerization', 1, 4837, 'Polymerization'),
    ('main', 25, 'powerbond', 1, 6398, 'Power Bond'),
    ('main', 26, 'spellgear', 1, 7622, 'Spell Gear'),
    ('main', 27, 'terraforming', 1, 5537, 'Terraforming'),
    ('main', 28, 'zone', 1, 9447, 'Z-ONE'),
    ('extra', 29, 'ultimateancientgeargolem', 2, 7616, 'Ultimate Ancient Gear Golem'),
    ('extra', 30, 'superdreadnoughtrailcannongustavmax', 1, 9963, 'Superdreadnought Rail Cannon Gustav Max')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'vellian-crowler-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jaden Yuki / A — Neo-Spacian (34 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jaden-yuki-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'elementalheroneos', 3, 6653, 'Elemental HERO Neos'),
    ('main', 2, 'cardcard', 1, 10029, 'Cardcar D'),
    ('main', 3, 'crossporter', 3, 7575, 'Cross Porter'),
    ('main', 4, 'elementalheroprisma', 2, 7491, 'Elemental HERO Prisma'),
    ('main', 5, 'neospacianairhummingbird', 1, 6769, 'Neo-Spacian Air Hummingbird'),
    ('main', 6, 'neospacianaquadolphin', 1, 6768, 'Neo-Spacian Aqua Dolphin'),
    ('main', 7, 'neospaciandarkpanther', 1, 6772, 'Neo-Spacian Dark Panther'),
    ('main', 8, 'neospacianflarescarab', 1, 6773, 'Neo-Spacian Flare Scarab'),
    ('main', 9, 'neospacianglowmoss', 1, 6771, 'Neo-Spacian Glow Moss'),
    ('main', 10, 'neospaciangrandmole', 1, 6770, 'Neo-Spacian Grand Mole'),
    ('main', 11, 'wingedkuriboh', 1, 6314, 'Winged Kuriboh'),
    ('main', 12, 'aherolives', 2, 7187, 'A Hero Lives'),
    ('main', 13, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 14, 'contactout', 2, 7255, 'Contact Out'),
    ('main', 15, 'convertcontact', 3, 7159, 'Convert Contact'),
    ('main', 16, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 17, 'eemergencycall', 2, 6672, 'E - Emergency Call'),
    ('main', 18, 'miraclecontact', 3, 10213, 'Miracle Contact'),
    ('main', 19, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 20, 'nex', 1, 7162, 'NEX'),
    ('main', 21, 'neospace', 3, 6775, 'Neo Space'),
    ('main', 22, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 23, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 24, 'callofthehaunted', 2, 4989, 'Call of the Haunted'),
    ('extra', 25, 'elementalheroairneos', 1, 6989, 'Elemental HERO Air Neos'),
    ('extra', 26, 'elementalheroaquaneos', 1, 6766, 'Elemental HERO Aqua Neos'),
    ('extra', 27, 'elementalherochaosneos', 1, 7275, 'Elemental HERO Chaos Neos'),
    ('extra', 28, 'elementalherodarkneos', 1, 6765, 'Elemental HERO Dark Neos'),
    ('extra', 29, 'elementalheroglowneos', 1, 6988, 'Elemental HERO Glow Neos'),
    ('extra', 30, 'elementalherograndneos', 1, 6990, 'Elemental HERO Grand Neos'),
    ('extra', 31, 'elementalheromagmaneos', 1, 7177, 'Elemental HERO Magma Neos'),
    ('extra', 32, 'elementalheromarineneos', 1, 7175, 'Elemental HERO Marine Neos'),
    ('extra', 33, 'neospacianmarinedolphin', 1, 7174, 'Neo-Spacian Marine Dolphin'),
    ('extra', 34, 'neospaciantwinklemoss', 1, 7441, 'Neo-Spacian Twinkle Moss')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jaden-yuki-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jaden Yuki / B — Elemental HERO (43 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jaden-yuki-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'elementalheroavian', 1, 6310, 'Elemental HERO Avian'),
    ('main', 2, 'elementalheroburstinatrix', 1, 6311, 'Elemental HERO Burstinatrix'),
    ('main', 3, 'elementalheroclayman', 1, 6312, 'Elemental HERO Clayman'),
    ('main', 4, 'elementalheroneos', 1, 6653, 'Elemental HERO Neos'),
    ('main', 5, 'elementalherosparkman', 2, 6313, 'Elemental HERO Sparkman'),
    ('main', 6, 'elementalherobladedge', 1, 6477, 'Elemental HERO Bladedge'),
    ('main', 7, 'elementalherobubbleman', 1, 6393, 'Elemental HERO Bubbleman'),
    ('main', 8, 'elementalheronecroshade', 1, 6527, 'Elemental HERO Necroshade'),
    ('main', 9, 'elementalheroprisma', 1, 7491, 'Elemental HERO Prisma'),
    ('main', 10, 'elementalherowildheart', 1, 6478, 'Elemental HERO Wildheart'),
    ('main', 11, 'kingoftheswamp', 3, 6044, 'King of the Swamp'),
    ('main', 12, 'defusion', 1, 5118, 'De-Fusion'),
    ('main', 13, 'eemergencycall', 2, 6672, 'E - Emergency Call'),
    ('main', 14, 'fusiongate', 1, 5276, 'Fusion Gate'),
    ('main', 15, 'fusionrecovery', 1, 6431, 'Fusion Recovery'),
    ('main', 16, 'hheatedheart', 2, 6671, 'H - Heated Heart'),
    ('main', 17, 'heroflash', 1, 6675, 'Hero Flash!!'),
    ('main', 18, 'miraclefusion', 2, 6432, 'Miracle Fusion'),
    ('main', 19, 'ooversoul', 2, 6674, 'O - Oversoul'),
    ('main', 20, 'parallelworldfusion', 1, 7942, 'Parallel World Fusion'),
    ('main', 21, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 22, 'rrighteousjustice', 3, 6673, 'R - Righteous Justice'),
    ('main', 23, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 24, 'superpolymerization', 2, 7445, 'Super Polymerization'),
    ('main', 25, 'thewarriorreturningalive', 1, 5330, 'The Warrior Returning Alive'),
    ('main', 26, 'heroblast', 1, 7637, 'Hero Blast'),
    ('main', 27, 'herocounterattack', 1, 7160, 'Hero Counterattack'),
    ('main', 28, 'herosignal', 1, 6356, 'Hero Signal'),
    ('extra', 29, 'elementalheroabsolutezero', 1, 8129, 'Elemental HERO Absolute Zero'),
    ('extra', 30, 'elementalherodarkbright', 1, 7176, 'Elemental HERO Darkbright'),
    ('extra', 31, 'elementalheroescuridao', 1, 9838, 'Elemental HERO Escuridao'),
    ('extra', 32, 'elementalheroflamewingman', 1, 6344, 'Elemental HERO Flame Wingman'),
    ('extra', 33, 'elementalherogaia', 1, 8122, 'Elemental HERO Gaia'),
    ('extra', 34, 'elementalheromudballman', 1, 6529, 'Elemental HERO Mudballman'),
    ('extra', 35, 'elementalheronecroidshaman', 1, 6644, 'Elemental HERO Necroid Shaman'),
    ('extra', 36, 'elementalheronovamaster', 1, 9439, 'Elemental HERO Nova Master'),
    ('extra', 37, 'elementalheroplasmavice', 1, 7252, 'Elemental HERO Plasma Vice'),
    ('extra', 38, 'elementalherorampartblaster', 1, 6486, 'Elemental HERO Rampart Blaster'),
    ('extra', 39, 'elementalheroshiningflarewingman', 1, 6467, 'Elemental HERO Shining Flare Wingman'),
    ('extra', 40, 'elementalherotheshining', 1, 8545, 'Elemental HERO The Shining'),
    ('extra', 41, 'elementalherothundergiant', 1, 6345, 'Elemental HERO Thunder Giant'),
    ('extra', 42, 'elementalherowildwingman', 1, 6643, 'Elemental HERO Wild Wingman'),
    ('extra', 43, 'elementalherowildedge', 1, 6488, 'Elemental HERO Wildedge')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jaden-yuki-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jesse Anderson / A — Crystal Beast (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jesse-anderson-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'crystalbeastamethystcat', 3, 7071, 'Crystal Beast Amethyst Cat'),
    ('main', 2, 'crystalbeastemeraldtortoise', 3, 7075, 'Crystal Beast Emerald Tortoise'),
    ('main', 3, 'crystalbeastrubycarbuncle', 3, 7074, 'Crystal Beast Ruby Carbuncle'),
    ('main', 4, 'giantrat', 3, 4915, 'Giant Rat'),
    ('main', 5, 'ancientcityrainbowruins', 3, 7079, 'Ancient City - Rainbow Ruins'),
    ('main', 6, 'blackpendant', 3, 4317, 'Black Pendant'),
    ('main', 7, 'crystalbeacon', 3, 7073, 'Crystal Beacon'),
    ('main', 8, 'crystalblessing', 3, 7122, 'Crystal Blessing'),
    ('main', 9, 'crystalpromise', 3, 7124, 'Crystal Promise'),
    ('main', 10, 'crystalrelease', 3, 7390, 'Crystal Release'),
    ('main', 11, 'crystaltree', 1, 7391, 'Crystal Tree'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'levellimitareab', 3, 6054, 'Level Limit - Area B'),
    ('main', 14, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 15, 'swordsofrevealinglight', 2, 4354, 'Swords of Revealing Light'),
    ('main', 16, 'torrentialtribute', 2, 5114, 'Torrential Tribute')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jesse-anderson-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jesse Anderson / B — Crystal Rainbow (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jesse-anderson-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'crystalbeastambermammoth', 2, 7072, 'Crystal Beast Amber Mammoth'),
    ('main', 2, 'crystalbeastamethystcat', 1, 7071, 'Crystal Beast Amethyst Cat'),
    ('main', 3, 'crystalbeastcobalteagle', 2, 7077, 'Crystal Beast Cobalt Eagle'),
    ('main', 4, 'crystalbeastemeraldtortoise', 1, 7075, 'Crystal Beast Emerald Tortoise'),
    ('main', 5, 'crystalbeastrubycarbuncle', 3, 7074, 'Crystal Beast Ruby Carbuncle'),
    ('main', 6, 'crystalbeastsapphirepegasus', 3, 7078, 'Crystal Beast Sapphire Pegasus'),
    ('main', 7, 'crystalbeasttopaztiger', 3, 7076, 'Crystal Beast Topaz Tiger'),
    ('main', 8, 'rainbowdragon', 1, 7171, 'Rainbow Dragon'),
    ('main', 9, 'ancientcityrainbowruins', 3, 7079, 'Ancient City - Rainbow Ruins'),
    ('main', 10, 'crystalabundance', 2, 7123, 'Crystal Abundance'),
    ('main', 11, 'crystalbeacon', 3, 7073, 'Crystal Beacon'),
    ('main', 12, 'crystalblessing', 3, 7122, 'Crystal Blessing'),
    ('main', 13, 'crystalpromise', 2, 7124, 'Crystal Promise'),
    ('main', 14, 'crystalrelease', 2, 7390, 'Crystal Release'),
    ('main', 15, 'crystaltree', 1, 7391, 'Crystal Tree'),
    ('main', 16, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 17, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 18, 'rarevalue', 3, 7080, 'Rare Value'),
    ('main', 19, 'pinpointguard', 1, 10550, 'Pinpoint Guard'),
    ('main', 20, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 21, 'gemknightpearl', 2, 9601, 'Gem-Knight Pearl'),
    ('extra', 22, 'windupzenmaines', 1, 9870, 'Wind-Up Zenmaines')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jesse-anderson-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jim Crocodile Cook / A — Rock Golem (18 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jim-cook-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'barrelrock', 3, 4461, 'Barrel Rock'),
    ('main', 2, 'dissolverock', 3, 4250, 'Dissolverock'),
    ('main', 3, 'fossiltusker', 2, 7338, 'Fossil Tusker'),
    ('main', 4, 'giantsoldierofstone', 3, 4080, 'Giant Soldier of Stone'),
    ('main', 5, 'blockgolem', 3, 10165, 'Block Golem'),
    ('main', 6, 'gaiaplatetheearthgiant', 2, 7558, 'Gaia Plate the Earth Giant'),
    ('main', 7, 'koakimeiruguardian', 2, 8175, 'Koa''ki Meiru Guardian'),
    ('main', 8, 'lostguardian', 2, 6320, 'Lost Guardian'),
    ('main', 9, 'megarockdragon', 3, 6324, 'Megarock Dragon'),
    ('main', 10, 'minegolem', 3, 6327, 'Mine Golem'),
    ('main', 11, 'therockspirit', 1, 5254, 'The Rock Spirit'),
    ('main', 12, 'catapultzone', 2, 10194, 'Catapult Zone'),
    ('main', 13, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'callofthehaunted', 1, 4989, 'Call of the Haunted'),
    ('main', 15, 'noentry', 3, 6746, 'No Entry!!'),
    ('main', 16, 'releasefromstone', 2, 7317, 'Release from Stone'),
    ('main', 17, 'rockbombardment', 3, 6362, 'Rock Bombardment'),
    ('extra', 18, 'giantsoldierofsteel', 2, 10355, 'Giant Soldier of Steel')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jim-cook-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Jim Crocodile Cook / B — Gem-Knight (27 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'jim-cook-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'gemknightcrystal', 2, 9372, 'Gem-Knight Crystal'),
    ('main', 2, 'gemknightgarnet', 3, 8893, 'Gem-Knight Garnet'),
    ('main', 3, 'gemknighttourmaline', 3, 8895, 'Gem-Knight Tourmaline'),
    ('main', 4, 'gemarmadillo', 3, 8897, 'Gem-Armadillo'),
    ('main', 5, 'gemknightalexandrite', 3, 8896, 'Gem-Knight Alexandrite'),
    ('main', 6, 'gemknightobsidian', 3, 9582, 'Gem-Knight Obsidian'),
    ('main', 7, 'gemturtle', 3, 9441, 'Gem-Turtle'),
    ('main', 8, 'morphingjar', 1, 4597, 'Morphing Jar'),
    ('main', 9, 'rescuerabbit', 1, 9755, 'Rescue Rabbit'),
    ('main', 10, 'ddrdifferentdimensionreincarnation', 1, 7519, 'D.D.R. - Different Dimension Reincarnation'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'gemknightfusion', 3, 8918, 'Gem-Knight Fusion'),
    ('main', 13, 'lightningvortex', 2, 5217, 'Lightning Vortex'),
    ('main', 14, 'mysticalspacetyphoon', 1, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'divinewrath', 2, 6217, 'Divine Wrath'),
    ('main', 16, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 17, 'pyroxenefusion', 2, 9399, 'Pyroxene Fusion'),
    ('main', 18, 'raigekibreak', 3, 5544, 'Raigeki Break'),
    ('main', 19, 'returnfromthedifferentdimension', 1, 6078, 'Return from the Different Dimension'),
    ('main', 20, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('extra', 21, 'gemknightcitrine', 2, 9390, 'Gem-Knight Citrine'),
    ('extra', 22, 'gemknightmasterdiamond', 1, 10001, 'Gem-Knight Master Diamond'),
    ('extra', 23, 'gemknightprismaura', 2, 9391, 'Gem-Knight Prismaura'),
    ('extra', 24, 'gemknightruby', 2, 8911, 'Gem-Knight Ruby'),
    ('extra', 25, 'gemknighttopaz', 2, 8913, 'Gem-Knight Topaz'),
    ('extra', 26, 'gemknightzirconia', 2, 9820, 'Gem-Knight Zirconia'),
    ('extra', 27, 'gemknightpearl', 2, 9601, 'Gem-Knight Pearl')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'jim-cook-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Kagemaru / A — The Creator (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'kagemaru-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'battlefader', 3, 8617, 'Battle Fader'),
    ('main', 2, 'exiledforce', 3, 5323, 'Exiled Force'),
    ('main', 3, 'heraldofcreation', 3, 7246, 'Herald of Creation'),
    ('main', 4, 'honest', 1, 7574, 'Honest'),
    ('main', 5, 'kaiserseahorse', 3, 5409, 'Kaiser Sea Horse'),
    ('main', 6, 'marshmallon', 1, 6000, 'Marshmallon'),
    ('main', 7, 'primematerialdragon', 2, 7567, 'Prime Material Dragon'),
    ('main', 8, 'thecreator', 3, 6176, 'The Creator'),
    ('main', 9, 'thecreatorincarnate', 3, 6177, 'The Creator Incarnate'),
    ('main', 10, 'abyssaldesignator', 1, 6132, 'Abyssal Designator'),
    ('main', 11, 'carddestruction', 1, 4821, 'Card Destruction'),
    ('main', 12, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 13, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 14, 'monsterreincarnation', 1, 6213, 'Monster Reincarnation'),
    ('main', 15, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 16, 'cemetarybomb', 2, 6148, 'Cemetary Bomb'),
    ('main', 17, 'divinewrath', 1, 6217, 'Divine Wrath'),
    ('main', 18, 'malevolentcatastrophe', 2, 5493, 'Malevolent Catastrophe'),
    ('main', 19, 'penaltygame', 1, 6277, 'Penalty Game!'),
    ('main', 20, 'statueofthewicked', 1, 5443, 'Statue of the Wicked'),
    ('main', 21, 'threateningroar', 3, 6278, 'Threatening Roar'),
    ('main', 22, 'torrentialtribute', 1, 5114, 'Torrential Tribute')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'kagemaru-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Kagemaru / B — Trap Monster (19 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'kagemaru-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cardcard', 2, 10029, 'Cardcar D'),
    ('main', 2, 'morphingjar', 1, 4597, 'Morphing Jar'),
    ('main', 3, 'thecalculator', 3, 7436, 'The Calculator'),
    ('main', 4, 'urialordofsearingflames', 3, 6563, 'Uria, Lord of Searing Flames'),
    ('main', 5, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 6, 'antispellfragrance', 1, 5008, 'Anti-Spell Fragrance'),
    ('main', 7, 'embodimentofapophis', 3, 5234, 'Embodiment of Apophis'),
    ('main', 8, 'fiendishchain', 3, 8675, 'Fiendish Chain'),
    ('main', 9, 'imperialcustom', 3, 8357, 'Imperial Custom'),
    ('main', 10, 'metalreflectslime', 3, 5686, 'Metal Reflect Slime'),
    ('main', 11, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 12, 'nightmarewheel', 3, 5298, 'Nightmare Wheel'),
    ('main', 13, 'ordealofatraveler', 1, 5439, 'Ordeal of a Traveler'),
    ('main', 14, 'raigekibreak', 1, 5544, 'Raigeki Break'),
    ('main', 15, 'safezone', 1, 9549, 'Safe Zone'),
    ('main', 16, 'strongholdthemovingfortress', 1, 6153, 'Stronghold the Moving Fortress'),
    ('main', 17, 'tikicurse', 3, 9370, 'Tiki Curse'),
    ('main', 18, 'tikisoul', 3, 9371, 'Tiki Soul'),
    ('main', 19, 'zomathespirit', 3, 5935, 'Zoma the Spirit')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'kagemaru-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Nightshroud / A — Darkness (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'nightshroud-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'redeyesblackdragon', 2, 4088, 'Red-Eyes B. Dragon'),
    ('main', 2, 'darknecrofear', 1, 5222, 'Dark Necrofear'),
    ('main', 3, 'darknessdestroyer', 1, 7983, 'Darkness Destroyer'),
    ('main', 4, 'darknessneosphere', 3, 8537, 'Darkness Neosphere'),
    ('main', 5, 'gaapthedivinesoldier', 1, 7514, 'Gaap the Divine Soldier'),
    ('main', 6, 'giantgerm', 3, 4921, 'Giant Germ'),
    ('main', 7, 'giantorc', 3, 5586, 'Giant Orc'),
    ('main', 8, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 9, 'phantomskyblaster', 3, 7384, 'Phantom Skyblaster'),
    ('main', 10, 'redeyesdarknessdragon', 1, 6292, 'Red-Eyes Darkness Dragon'),
    ('main', 11, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 12, 'tragoedia', 2, 8089, 'Tragoedia'),
    ('main', 13, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 14, 'creatureswap', 2, 5162, 'Creature Swap'),
    ('main', 15, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 16, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 17, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 18, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 19, 'fiendishchain', 1, 8675, 'Fiendish Chain'),
    ('main', 20, 'kunaiwithchain', 3, 4657, 'Kunai with Chain'),
    ('main', 21, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 22, 'mysticalrefpanel', 1, 4826, 'Mystical Refpanel')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'nightshroud-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Nightshroud / B — Archfiend (28 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'nightshroud-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'archfiendcavalry', 3, 10633, 'Archfiend Cavalry'),
    ('main', 2, 'archfiendemperorthefirstlordofhorror', 3, 10634, 'Archfiend Emperor, the First Lord of Horror'),
    ('main', 3, 'archfiendheiress', 3, 10632, 'Archfiend Heiress'),
    ('main', 4, 'archfiendinterceptor', 1, 8783, 'Archfiend Interceptor'),
    ('main', 5, 'battlefader', 3, 8617, 'Battle Fader'),
    ('main', 6, 'darkarmeddragon', 1, 7421, 'Dark Armed Dragon'),
    ('main', 7, 'darknessneosphere', 2, 8537, 'Darkness Neosphere'),
    ('main', 8, 'maskedchameleon', 2, 10641, 'Masked Chameleon'),
    ('main', 9, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 10, 'archfiendpalabyrinth', 3, 10669, 'Archfiend Palabyrinth'),
    ('main', 11, 'fallingdown', 3, 5786, 'Falling Down'),
    ('main', 12, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 13, 'mysticalspacetyphoon', 3, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 15, 'archfiendsroar', 3, 5796, 'Archfiend''s Roar'),
    ('main', 16, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 17, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 18, 'fiendishchain', 2, 8675, 'Fiendish Chain'),
    ('main', 19, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('extra', 20, 'armadeskeeperofboundaries', 1, 10648, 'Armades, Keeper of Boundaries'),
    ('extra', 21, 'bloodmefist', 1, 9220, 'Blood Mefist'),
    ('extra', 22, 'chaoskingarchfiend', 1, 8816, 'Chaos King Archfiend'),
    ('extra', 23, 'gravitywarrior', 1, 9969, 'Gravity Warrior'),
    ('extra', 24, 'scraparchfiend', 1, 9202, 'Scrap Archfiend'),
    ('extra', 25, 'shootingstardragon', 1, 9117, 'Shooting Star Dragon'),
    ('extra', 26, 'abyssdweller', 1, 10354, 'Abyss Dweller'),
    ('extra', 27, 'steelswarmroach', 1, 9612, 'Steelswarm Roach'),
    ('extra', 28, 'temtempothepercussiondjinn', 1, 10126, 'Temtempo the Percussion Djinn')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'nightshroud-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sartorius Kumar / A — Arcana Force (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sartorius-kumar-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'arcanaforce0thefool', 2, 7581, 'Arcana Force 0 - The Fool'),
    ('main', 2, 'arcanaforceexthedarkruler', 1, 7590, 'Arcana Force EX - The Dark Ruler'),
    ('main', 3, 'arcanaforceexthelightruler', 1, 7344, 'Arcana Force EX - The Light Ruler'),
    ('main', 4, 'arcanaforceithemagician', 1, 7582, 'Arcana Force I - The Magician'),
    ('main', 5, 'arcanaforceiiitheempress', 1, 7583, 'Arcana Force III - The Empress'),
    ('main', 6, 'arcanaforceivtheemperor', 3, 7584, 'Arcana Force IV - The Emperor'),
    ('main', 7, 'arcanaforceviithechariot', 2, 7586, 'Arcana Force VII - The Chariot'),
    ('main', 8, 'arcanaforcexivtemperance', 3, 7587, 'Arcana Force XIV - Temperance'),
    ('main', 9, 'arcanaforcexviiithemoon', 1, 7588, 'Arcana Force XVIII - The Moon'),
    ('main', 10, 'arcanaforcexxitheworld', 1, 7589, 'Arcana Force XXI - The World'),
    ('main', 11, 'athena', 2, 7571, 'Athena'),
    ('main', 12, 'honest', 1, 7574, 'Honest'),
    ('main', 13, 'marshmallon', 1, 6000, 'Marshmallon'),
    ('main', 14, 'tethysgoddessoflight', 1, 7560, 'Tethys, Goddess of Light'),
    ('main', 15, 'lightbarrier', 3, 7624, 'Light Barrier'),
    ('main', 16, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 17, 'noblemanofcrossout', 2, 4963, 'Nobleman of Crossout'),
    ('main', 18, 'secondcointoss', 3, 5391, 'Second Coin Toss'),
    ('main', 19, 'solidarity', 2, 8344, 'Solidarity'),
    ('main', 20, 'valhallahallofthefallen', 3, 7573, 'Valhalla, Hall of the Fallen'),
    ('main', 21, 'beckoninglight', 1, 5993, 'Beckoning Light'),
    ('main', 22, 'tourofdoom', 3, 7641, 'Tour of Doom')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sartorius-kumar-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Sartorius Kumar / B — Constellar (31 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'sartorius-kumar-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'constellarantares', 1, 9989, 'Constellar Antares'),
    ('main', 2, 'constellaralrescha', 1, 9988, 'Constellar Alrescha'),
    ('main', 3, 'constellarzubeneschamali', 1, 9811, 'Constellar Zubeneschamali'),
    ('main', 4, 'constellarvirgo', 1, 9812, 'Constellar Virgo'),
    ('main', 5, 'constellaracubens', 1, 9986, 'Constellar Acubens'),
    ('main', 6, 'constellarkaus', 2, 9987, 'Constellar Kaus'),
    ('main', 7, 'constellaralgiedi', 2, 9809, 'Constellar Algiedi'),
    ('main', 8, 'constellarsombre', 2, 10440, 'Constellar Sombre'),
    ('main', 9, 'constellarpollux', 2, 9810, 'Constellar Pollux'),
    ('main', 10, 'constellarsheratan', 2, 9807, 'Constellar Sheratan'),
    ('main', 11, 'constellaraldebaran', 1, 9808, 'Constellar Aldebaran'),
    ('main', 12, 'constellarleonis', 2, 9985, 'Constellar Leonis'),
    ('main', 13, 'constellarrasalhague', 2, 9984, 'Constellar Rasalhague'),
    ('main', 14, 'constellarsiat', 2, 9983, 'Constellar Siat'),
    ('main', 15, 'soulexchange', 1, 5099, 'Soul Exchange'),
    ('main', 16, 'constellarstarchart', 2, 9829, 'Constellar Star Chart'),
    ('main', 17, 'constellarstarcradle', 2, 10009, 'Constellar Star Cradle'),
    ('main', 18, 'constellarbelt', 1, 10087, 'Constellar Belt'),
    ('main', 19, 'doublesummon', 2, 7219, 'Double Summon'),
    ('main', 20, 'photonveil', 1, 9768, 'Photon Veil'),
    ('main', 21, 'photonlead', 1, 9769, 'Photon Lead'),
    ('main', 22, 'xyzreborn', 2, 9950, 'Xyz Reborn'),
    ('main', 23, 'shadowimprisoningmirror', 2, 7319, 'Shadow-Imprisoning Mirror'),
    ('main', 24, 'constellarmeteor', 2, 10011, 'Constellar Meteor'),
    ('main', 25, 'beckoninglight', 1, 5993, 'Beckoning Light'),
    ('main', 26, 'lumenize', 1, 9788, 'Lumenize'),
    ('extra', 27, 'constellarptolemym7', 1, 10004, 'Constellar Ptolemy M7'),
    ('extra', 28, 'constellarpleiades', 1, 9824, 'Constellar Pleiades'),
    ('extra', 29, 'constellaromega', 1, 10013, 'Constellar Omega'),
    ('extra', 30, 'constellarpraesepe', 1, 10003, 'Constellar Praesepe'),
    ('extra', 31, 'constellarhyades', 1, 9823, 'Constellar Hyades')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'sartorius-kumar-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Syrus Truesdale / A — Vehicroid (31 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'syrus-truesdale-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'ambulanceroid', 1, 6736, 'Ambulanceroid'),
    ('main', 2, 'armoroid', 1, 7057, 'Armoroid'),
    ('main', 3, 'carrierroid', 1, 7056, 'Carrierroid'),
    ('main', 4, 'decoyroid', 1, 6742, 'Decoyroid'),
    ('main', 5, 'drillroid', 2, 6387, 'Drillroid'),
    ('main', 6, 'expressroid', 2, 6735, 'Expressroid'),
    ('main', 7, 'gyroid', 2, 6385, 'Gyroid'),
    ('main', 8, 'jetroid', 1, 6389, 'Jetroid'),
    ('main', 9, 'patroid', 1, 6384, 'Patroid'),
    ('main', 10, 'rescueroid', 1, 6745, 'Rescueroid'),
    ('main', 11, 'stealthroid', 1, 6741, 'Stealthroid'),
    ('main', 12, 'steamroid', 2, 6386, 'Steamroid'),
    ('main', 13, 'submarineroid', 2, 6738, 'Submarineroid'),
    ('main', 14, 'truckroid', 2, 6743, 'Truckroid'),
    ('main', 15, 'polymerization', 3, 4837, 'Polymerization'),
    ('main', 16, 'powerbond', 1, 6398, 'Power Bond'),
    ('main', 17, 'fusionsage', 2, 4872, 'Fusion Sage'),
    ('main', 18, 'ironcall', 2, 10008, 'Iron Call'),
    ('main', 19, 'limiterremoval', 1, 5129, 'Limiter Removal'),
    ('main', 20, 'machinaarmoredunit', 2, 8696, 'Machina Armored Unit'),
    ('main', 21, 'solidarity', 2, 8344, 'Solidarity'),
    ('main', 22, 'vehicroidconnectionzone', 3, 6748, 'Vehicroid Connection Zone'),
    ('main', 23, 'chainmaterial', 1, 7466, 'Chain Material'),
    ('main', 24, 'supercharge', 2, 6747, 'Supercharge'),
    ('main', 25, 'wondergarage', 1, 6749, 'Wonder Garage'),
    ('extra', 26, 'ambulancerescueroid', 2, 6744, 'Ambulance Rescueroid'),
    ('extra', 27, 'barbaroidtheultimatebattlemachine', 2, 9402, 'Barbaroid, the Ultimate Battle Machine'),
    ('extra', 28, 'ignitionbeastvolcannon', 1, 9195, 'Ignition Beast Volcannon'),
    ('extra', 29, 'steamgyroid', 2, 6394, 'Steam Gyroid'),
    ('extra', 30, 'supervehicroidstealthunion', 2, 6835, 'Super Vehicroid - Stealth Union'),
    ('extra', 31, 'supervehicroidjumbodrill', 2, 6739, 'Super Vehicroid Jumbo Drill')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'syrus-truesdale-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Syrus Truesdale / B — Scrap Machine (23 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'syrus-truesdale-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'cardcard', 2, 10029, 'Cardcar D'),
    ('main', 2, 'photonthrasher', 3, 9882, 'Photon Thrasher'),
    ('main', 3, 'redoxdragonrulerofboulders', 1, 10519, 'Redox, Dragon Ruler of Boulders'),
    ('main', 4, 'scrapbeast', 3, 8952, 'Scrap Beast'),
    ('main', 5, 'scrapchimera', 3, 8950, 'Scrap Chimera'),
    ('main', 6, 'scrapgoblin', 2, 8951, 'Scrap Goblin'),
    ('main', 7, 'scrapgolem', 2, 8954, 'Scrap Golem'),
    ('main', 8, 'scrapkong', 1, 9503, 'Scrap Kong'),
    ('main', 9, 'summonermonk', 1, 6400, 'Summoner Monk'),
    ('main', 10, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'forbiddenlance', 3, 9352, 'Forbidden Lance'),
    ('main', 13, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 14, 'nightbeam', 2, 10078, 'Night Beam'),
    ('main', 15, 'reinforcementofthearmy', 1, 5328, 'Reinforcement of the Army'),
    ('main', 16, 'scrapstorm', 3, 8979, 'Scrapstorm'),
    ('main', 17, 'scrapyard', 3, 8978, 'Scrapyard'),
    ('main', 18, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 19, 'fiendishchain', 3, 8675, 'Fiendish Chain'),
    ('extra', 20, 'atomicscrapdragon', 2, 9334, 'Atomic Scrap Dragon'),
    ('extra', 21, 'scraparchfiend', 2, 9202, 'Scrap Archfiend'),
    ('extra', 22, 'scrapdragon', 3, 8974, 'Scrap Dragon'),
    ('extra', 23, 'scraptwindragon', 2, 9121, 'Scrap Twin Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'syrus-truesdale-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Tyranno Hassleberry / A — Tyranno-saurus (22 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tyranno-hassleberry-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'babycerasaurus', 3, 6799, 'Babycerasaurus'),
    ('main', 2, 'blackstego', 1, 6776, 'Black Stego'),
    ('main', 3, 'blacktyranno', 2, 5889, 'Black Tyranno'),
    ('main', 4, 'blackveloci', 3, 7433, 'Black Veloci'),
    ('main', 5, 'destroyersaurus', 1, 7108, 'Destroyersaurus'),
    ('main', 6, 'gilasaurus', 3, 5256, 'Gilasaurus'),
    ('main', 7, 'hydrogeddon', 3, 6479, 'Hydrogeddon'),
    ('main', 8, 'hyperhammerhead', 3, 5888, 'Hyper Hammerhead'),
    ('main', 9, 'superconductortyranno', 3, 6816, 'Super Conductor Tyranno'),
    ('main', 10, 'superancientdinobeast', 1, 7802, 'Super-Ancient Dinobeast'),
    ('main', 11, 'ultimatetyranno', 2, 6777, 'Ultimate Tyranno'),
    ('main', 12, 'bigevolutionpill', 3, 6819, 'Big Evolution Pill'),
    ('main', 13, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 14, 'earthquake', 1, 5983, 'Earthquake'),
    ('main', 15, 'fossildig', 2, 8352, 'Fossil Dig'),
    ('main', 16, 'jurassicworld', 2, 6823, 'Jurassic World'),
    ('main', 17, 'huntinginstinct', 2, 6817, 'Hunting Instinct'),
    ('main', 18, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('main', 19, 'volcaniceruption', 2, 6824, 'Volcanic Eruption'),
    ('extra', 20, 'grenosaurus', 3, 9577, 'Grenosaurus'),
    ('extra', 21, 'hieraticsundragonoverlordofheliopolis', 1, 10071, 'Hieratic Sun Dragon Overlord of Heliopolis'),
    ('extra', 22, 'evolzardolkka', 1, 9869, 'Evolzar Dolkka')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tyranno-hassleberry-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Tyranno Hassleberry / B — Jurrac (33 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'tyranno-hassleberry-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'blasterdragonrulerofinfernos', 1, 10521, 'Blaster, Dragon Ruler of Infernos'),
    ('main', 2, 'jurracaeolo', 3, 8565, 'Jurrac Aeolo'),
    ('main', 3, 'jurracdino', 3, 8563, 'Jurrac Dino'),
    ('main', 4, 'jurracgallim', 2, 8564, 'Jurrac Gallim'),
    ('main', 5, 'jurracguaiba', 3, 8397, 'Jurrac Guaiba'),
    ('main', 6, 'jurracherra', 2, 8566, 'Jurrac Herra'),
    ('main', 7, 'jurracstauriko', 2, 8398, 'Jurrac Stauriko'),
    ('main', 8, 'jurractitano', 2, 8396, 'Jurrac Titano'),
    ('main', 9, 'jurracvelo', 3, 8097, 'Jurrac Velo'),
    ('main', 10, 'bookofmoon', 1, 5432, 'Book of Moon'),
    ('main', 11, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 12, 'forbiddenlance', 3, 9352, 'Forbidden Lance'),
    ('main', 13, 'fossildig', 3, 8352, 'Fossil Dig'),
    ('main', 14, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 15, 'potofduality', 1, 8993, 'Pot of Duality'),
    ('main', 16, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 17, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 18, 'dimensionalprison', 2, 7400, 'Dimensional Prison'),
    ('main', 19, 'mirrorforce', 1, 4887, 'Mirror Force'),
    ('main', 20, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('main', 21, 'breakthroughskill', 2, 10437, 'Breakthrough Skill'),
    ('extra', 22, 'jurracgiganoto', 2, 8118, 'Jurrac Giganoto'),
    ('extra', 23, 'jurracmeteor', 1, 8577, 'Jurrac Meteor'),
    ('extra', 24, 'jurracvelphito', 1, 8259, 'Jurrac Velphito'),
    ('extra', 25, 'brotherhoodofthefirefisthorseprince', 1, 10328, 'Brotherhood of the Fire Fist - Horse Prince'),
    ('extra', 26, 'evolzardolkka', 1, 9869, 'Evolzar Dolkka'),
    ('extra', 27, 'evolzarlaggia', 1, 9761, 'Evolzar Laggia'),
    ('extra', 28, 'gemknightpearl', 2, 9601, 'Gem-Knight Pearl'),
    ('extra', 29, 'mechaphantombeastdracossack', 1, 10534, 'Mecha Phantom Beast Dracossack'),
    ('extra', 30, 'windupzenmaines', 1, 9870, 'Wind-Up Zenmaines'),
    ('extra', 31, 'brotherhoodofthefirefistlionemperor', 1, 10330, 'Brotherhood of the Fire Fist - Lion Emperor'),
    ('side', 32, 'evolsaurcerato', 3, 9738, 'Evolsaur Cerato'),
    ('side', 33, 'evoltilewestlo', 3, 9735, 'Evoltile Westlo')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'tyranno-hassleberry-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yubel / A — Terror Incarnate (21 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yubel-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'armageddonknight', 3, 7423, 'Armageddon Knight'),
    ('main', 2, 'caiustheshadowmonarch', 1, 7516, 'Caius the Shadow Monarch'),
    ('main', 3, 'mystictomato', 3, 4930, 'Mystic Tomato'),
    ('main', 4, 'thecalculator', 3, 7436, 'The Calculator'),
    ('main', 5, 'yubel', 3, 7409, 'Yubel'),
    ('main', 6, 'yubelterrorincarnate', 2, 7410, 'Yubel - Terror Incarnate'),
    ('main', 7, 'yubeltheultimatenightmare', 2, 7411, 'Yubel - The Ultimate Nightmare'),
    ('main', 8, 'allureofdarkness', 1, 7570, 'Allure of Darkness'),
    ('main', 9, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 10, 'foolishburial', 1, 5236, 'Foolish Burial'),
    ('main', 11, 'lightningvortex', 1, 5217, 'Lightning Vortex'),
    ('main', 12, 'mysticalspacetyphoon', 2, 4909, 'Mystical Space Typhoon'),
    ('main', 13, 'savagecolosseum', 3, 8482, 'Savage Colosseum'),
    ('main', 14, 'terraforming', 2, 5537, 'Terraforming'),
    ('main', 15, 'callofthehaunted', 3, 4989, 'Call of the Haunted'),
    ('main', 16, 'damagegate', 1, 8845, 'Damage Gate'),
    ('main', 17, 'darkarmeddragon', 1, 7421, 'Dark Armed Dragon'),
    ('main', 18, 'destructionring', 2, 5912, 'Destruction Ring'),
    ('main', 19, 'limitreverse', 3, 7636, 'Limit Reverse'),
    ('main', 20, 'torrentialtribute', 2, 5114, 'Torrential Tribute'),
    ('extra', 21, 'superdreadnoughtrailcannongustavmax', 1, 9963, 'Superdreadnought Rail Cannon Gustav Max')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yubel-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Yubel / B — Doomsday (16 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'yubel-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'caiustheshadowmonarch', 3, 7516, 'Caius the Shadow Monarch'),
    ('main', 2, 'darkhunter', 3, 7727, 'Dark Hunter'),
    ('main', 3, 'darknecrofear', 2, 5222, 'Dark Necrofear'),
    ('main', 4, 'darkresonator', 3, 7708, 'Dark Resonator'),
    ('main', 5, 'darkrulerhades', 2, 5301, 'Dark Ruler Ha Des'),
    ('main', 6, 'evilheroinfernalprodigy', 3, 7376, 'Evil HERO Infernal Prodigy'),
    ('main', 7, 'giantgerm', 3, 4921, 'Giant Germ'),
    ('main', 8, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 9, 'mystictomato', 3, 4930, 'Mystic Tomato'),
    ('main', 10, 'phantomskyblaster', 3, 7384, 'Phantom Skyblaster'),
    ('main', 11, 'raviellordofphantasms', 3, 6565, 'Raviel, Lord of Phantasms'),
    ('main', 12, 'tourguidefromtheunderworld', 2, 9702, 'Tour Guide From the Underworld'),
    ('main', 13, 'tragoedia', 2, 8089, 'Tragoedia'),
    ('main', 14, 'firesofdoomsday', 3, 7454, 'Fires of Doomsday'),
    ('main', 15, 'goldsarcophagus', 1, 6161, 'Gold Sarcophagus'),
    ('main', 16, 'swordsofrevealinglight', 3, 4354, 'Swords of Revealing Light')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'yubel-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Zane Truesdale / A — Cyber Dragons (25 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'zane-truesdale-a');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'armoredcybern', 2, 7412, 'Armored Cybern'),
    ('main', 2, 'cyberbarrierdragon', 1, 6568, 'Cyber Barrier Dragon'),
    ('main', 3, 'cyberdragon', 3, 6390, 'Cyber Dragon'),
    ('main', 4, 'cyberdragonzwei', 3, 8646, 'Cyber Dragon Zwei'),
    ('main', 5, 'cybereltanin', 2, 8430, 'Cyber Eltanin'),
    ('main', 6, 'cyberlarva', 3, 8421, 'Cyber Larva'),
    ('main', 7, 'cyberlaserdragon', 1, 6569, 'Cyber Laser Dragon'),
    ('main', 8, 'cybervalley', 2, 7413, 'Cyber Valley'),
    ('main', 9, 'protocyberdragon', 3, 6588, 'Proto-Cyber Dragon'),
    ('main', 10, 'shiningangel', 2, 4924, 'Shining Angel'),
    ('main', 11, 'thelighthexsealedfusion', 2, 6256, 'The Light - Hex-Sealed Fusion'),
    ('main', 12, 'evolutionburst', 2, 7556, 'Evolution Burst'),
    ('main', 13, 'finalgesture', 2, 10285, 'Final Gesture'),
    ('main', 14, 'lightofredemption', 2, 7630, 'Light of Redemption'),
    ('main', 15, 'overloadfusion', 2, 6783, 'Overload Fusion'),
    ('main', 16, 'photongeneratorunit', 1, 6577, 'Photon Generator Unit'),
    ('main', 17, 'polymerization', 2, 4837, 'Polymerization'),
    ('main', 18, 'powerbond', 2, 6398, 'Power Bond'),
    ('main', 19, 'attackreflectorunit', 1, 6581, 'Attack Reflector Unit'),
    ('main', 20, 'cybernetichiddentechnology', 1, 7468, 'Cybernetic Hidden Technology'),
    ('main', 21, 'returnfromthedifferentdimension', 1, 6078, 'Return from the Different Dimension'),
    ('extra', 22, 'chimeratechfortressdragon', 2, 7403, 'Chimeratech Fortress Dragon'),
    ('extra', 23, 'chimeratechoverdragon', 2, 6734, 'Chimeratech Overdragon'),
    ('extra', 24, 'cyberenddragon', 3, 6397, 'Cyber End Dragon'),
    ('extra', 25, 'cybertwindragon', 2, 6396, 'Cyber Twin Dragon')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'zane-truesdale-a'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

-- Zane Truesdale / B — Mecha Phantom (39 entradas)
delete from public.anime_deck_cards where deck_id = (select id from public.anime_decks where slug = 'zane-truesdale-b');
insert into public.anime_deck_cards (deck_id, card_id, language, quantity, zone, sort_order, art_id, card_name, is_ace)
select dk.id, ec.id, 'en', sum(v.qty), v.zone, min(v.sort_order), min(v.art_id), min(v.original_name), false
from (values
    ('main', 1, 'dandylion', 1, 6654, 'Dandylion'),
    ('main', 2, 'debrisdragon', 2, 8005, 'Debris Dragon'),
    ('main', 3, 'destinyheroplasma', 1, 7096, 'Destiny HERO - Plasma'),
    ('main', 4, 'gorztheemissaryofdarkness', 1, 6558, 'Gorz the Emissary of Darkness'),
    ('main', 5, 'lonefireblossom', 1, 7568, 'Lonefire Blossom'),
    ('main', 6, 'mechaphantombeasthamstrat', 3, 10506, 'Mecha Phantom Beast Hamstrat'),
    ('main', 7, 'mechaphantombeastharrliard', 1, 10628, 'Mecha Phantom Beast Harrliard'),
    ('main', 8, 'mechaphantombeastmegaraptor', 3, 10502, 'Mecha Phantom Beast Megaraptor'),
    ('main', 9, 'mechaphantombeasttetherwolf', 3, 10503, 'Mecha Phantom Beast Tetherwolf'),
    ('main', 10, 'mechaphantombeastwarbluran', 1, 10625, 'Mecha Phantom Beast Warbluran'),
    ('main', 11, 'tempestdragonrulerofstorms', 3, 10522, 'Tempest, Dragon Ruler of Storms'),
    ('main', 12, 'creatureswap', 3, 5162, 'Creature Swap'),
    ('main', 13, 'darkhole', 1, 4342, 'Dark Hole'),
    ('main', 14, 'potofduality', 2, 8993, 'Pot of Duality'),
    ('main', 15, 'sacredswordofsevenstars', 3, 10547, 'Sacred Sword of Seven Stars'),
    ('main', 16, 'scapegoat', 1, 4818, 'Scapegoat'),
    ('main', 17, 'aerialrecharge', 1, 10554, 'Aerial Recharge'),
    ('main', 18, 'bottomlesstraphole', 1, 5400, 'Bottomless Trap Hole'),
    ('main', 19, 'compulsoryevacuationdevice', 1, 5914, 'Compulsory Evacuation Device'),
    ('main', 20, 'dimensionalprison', 1, 7400, 'Dimensional Prison'),
    ('main', 21, 'fiendishchain', 2, 8675, 'Fiendish Chain'),
    ('main', 22, 'malevolentcatastrophe', 1, 5493, 'Malevolent Catastrophe'),
    ('main', 23, 'mirrorforce', 2, 4887, 'Mirror Force'),
    ('main', 24, 'solemnwarning', 1, 9008, 'Solemn Warning'),
    ('extra', 25, 'allyofjusticecatastor', 1, 7552, 'Ally of Justice Catastor'),
    ('extra', 26, 'armoryarm', 1, 7987, 'Armory Arm'),
    ('extra', 27, 'formulasynchron', 1, 9118, 'Formula Synchron'),
    ('extra', 28, 'ironchaindragon', 1, 7899, 'Iron Chain Dragon'),
    ('extra', 29, 'mechaphantombeastconcoruda', 1, 10644, 'Mecha Phantom Beast Concoruda'),
    ('extra', 30, 'mistbirdclausolas', 1, 10646, 'Mist Bird Clausolas'),
    ('extra', 31, 'scrapdragon', 1, 8974, 'Scrap Dragon'),
    ('extra', 32, 'stareater', 1, 10650, 'Star Eater'),
    ('extra', 33, 'geargigantx', 1, 10176, 'Gear Gigant X'),
    ('extra', 34, 'mechaphantombeastdracossack', 1, 10534, 'Mecha Phantom Beast Dracossack'),
    ('extra', 35, 'number11bigeye', 1, 9861, 'Number 11: Big Eye'),
    ('extra', 36, 'number74masterofblades', 1, 10706, 'Number 74: Master of Blades'),
    ('extra', 37, 'photonstrikebounzer', 1, 10066, 'Photon Strike Bounzer'),
    ('extra', 38, 'skypalacegangaridai', 1, 10718, 'Skypalace Gangaridai'),
    ('extra', 39, 'superdreadnoughtrailcannongustavmax', 1, 9963, 'Superdreadnought Rail Cannon Gustav Max')
) as v(zone, sort_order, norm, qty, art_id, original_name)
join public.anime_decks dk on dk.slug = 'zane-truesdale-b'
left join en_cards ec on ec.norm = v.norm
group by dk.id, ec.id, (case when ec.id is null then v.norm end), v.zone;

commit;
