-- Deck Dark Magician de Yugi Muto (main, extra e side)
--
-- Fonte da lista: Dueling Nexus, "Yugi Muto OCG Dark Magician" (LicheLu1476, 2026-05-13).
-- Passcodes conferidos na YGOPRODeck API v7 (campo id gravado em public.cards).
-- Insere em todos os idiomas já sincronizados. Cartas ainda não sincronizadas são ignoradas.

update public.anime_decks
set
  description = 'Deck Dark Magician de Yugi Muto: 40 no main, 10 no extra e 15 no side. Lista OCG baseada nas cartas usadas por ele no anime.',
  updated_at = now()
where slug = 'dark-magician';

delete from public.anime_deck_cards
where deck_id in (
  select id from public.anime_decks where slug = 'dark-magician'
);

insert into public.anime_deck_cards (
  deck_id,
  card_id,
  language,
  quantity,
  zone,
  is_ace,
  is_signature,
  sort_order
)
select
  d.id,
  c.id,
  c.language,
  1,
  v.zone,
  v.is_ace,
  v.is_signature,
  v.sort_order
from (
  values
    -- Main (40)
    (46986415, 'main', true, true, 1),    -- Dark Magician
    (72989439, 'main', false, false, 2),  -- Black Luster Soldier - Envoy of the Beginning
    (40737112, 'main', false, false, 3),  -- Dark Magician of Chaos
    (44330098, 'main', false, false, 4),  -- Gorz the Emissary of Darkness
    (78193832, 'main', false, false, 5),  -- Buster Blader
    (38033126, 'main', false, true, 6),   -- Dark Magician Girl
    (45462639, 'main', false, false, 7),  -- Dark Red Enchanter
    (14778250, 'main', false, false, 8),  -- The Tricky
    (73752131, 'main', false, false, 9),  -- Skilled Dark Magician
    (46363422, 'main', false, false, 10), -- Skilled White Magician
    (80304126, 'main', false, false, 11), -- Magician's Valkyria
    (71413901, 'main', false, false, 12), -- Breaker the Magical Warrior
    (52077741, 'main', false, false, 13), -- Obnoxious Celtic Guard
    (78010363, 'main', false, false, 14), -- Witch of the Black Forest
    (65240384, 'main', false, false, 15), -- Big Shield Gardna
    (26202165, 'main', false, false, 16), -- Sangan
    (34124316, 'main', false, false, 17), -- Cyber Jar
    (31305911, 'main', false, false, 18), -- Marshmallon
    (45141844, 'main', false, false, 19), -- Old Vindictive Magician
    (31560081, 'main', false, false, 20), -- Magician of Faith
    (2314238, 'main', false, false, 21),  -- Dark Magic Attack
    (4031928, 'main', false, false, 22),  -- Change of Heart
    (13604200, 'main', false, false, 23), -- Sage's Stone
    (19613556, 'main', false, false, 24), -- Heavy Storm
    (27847700, 'main', false, false, 25), -- Polymerization
    (53129443, 'main', false, false, 26), -- Dark Hole
    (55144522, 'main', false, false, 27), -- Pot of Greed
    (63391643, 'main', false, false, 28), -- Thousand Knives
    (75500286, 'main', false, false, 29), -- Gold Sarcophagus
    (79571449, 'main', false, false, 30), -- Graceful Charity
    (83764719, 'main', false, false, 31), -- Monster Reborn
    (87910978, 'main', false, false, 32), -- Brain Control
    (99789342, 'main', false, false, 33), -- Dark Magic Curtain
    (5318639, 'main', false, false, 34),  -- Mystical Space Typhoon
    (28553439, 'main', false, false, 35), -- Magical Dimension
    (69542930, 'main', false, false, 36), -- Dedication through Light and Darkness
    (70828912, 'main', false, false, 37), -- Premature Burial
    (50755, 'main', false, false, 38),    -- Magician's Circle
    (44095762, 'main', false, false, 39), -- Mirror Force
    (81210420, 'main', false, false, 40), -- Magical Hats
    -- Extra (10)
    (62873545, 'extra', false, false, 41), -- Dragon Master Knight
    (23995346, 'extra', false, false, 42), -- Blue-Eyes Ultimate Dragon
    (6150044, 'extra', false, false, 43),  -- Arcana Knight Joker
    (11901678, 'extra', false, false, 44), -- Black Skull Dragon
    (90660762, 'extra', false, false, 45), -- Meteor Black Dragon
    (98502113, 'extra', false, true, 46),  -- Dark Paladin
    (66889139, 'extra', false, false, 47), -- Gaia the Dragon Champion
    (13722870, 'extra', false, false, 48), -- Dark Flare Knight
    (4796100, 'extra', false, false, 49),  -- Chimera the Flying Mythical Beast
    (45231177, 'extra', false, false, 50), -- Flame Swordsman
    -- Side (15)
    (5758500, 'side', false, false, 51),   -- Soul Release
    (66788016, 'side', false, false, 52),  -- Fissure
    (72302403, 'side', false, false, 53),  -- Swords of Revealing Light
    (72892473, 'side', false, false, 54),  -- Card Destruction
    (74848038, 'side', false, false, 55),  -- Monster Reincarnation
    (81510157, 'side', false, false, 56),  -- Soul Taker
    (69279219, 'side', false, false, 57),  -- My Body as a Shield
    (93260132, 'side', false, false, 58),  -- Spell Shattering Arrow
    (15800838, 'side', false, false, 59),  -- Mind Crush
    (35316708, 'side', false, false, 60),  -- Time Seal
    (60082869, 'side', false, false, 61),  -- Dust Tornado
    (62279055, 'side', false, false, 62),  -- Magic Cylinder
    (18807109, 'side', false, false, 63),  -- Spellbinding Circle
    (3819470, 'side', false, false, 64),   -- Seven Tools of the Bandit
    (98069388, 'side', false, false, 65)   -- Horn of Heaven
) as v(card_id, zone, is_ace, is_signature, sort_order)
join public.anime_decks d on d.slug = 'dark-magician'
join public.cards c on c.id = v.card_id
on conflict (deck_id, card_id, language, zone) do nothing;
