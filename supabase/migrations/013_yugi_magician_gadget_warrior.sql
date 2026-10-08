-- Decks Magician, Gadget e Warrior de Yugi Muto (main, extra e side)
--
-- Magician: YGOPRODeck "DM Character Deck - Yugi Muto (Basic)" (696281) no main/extra.
--   Side: cartas do Grand Championship na Yugipedia que não entraram nessa lista.
-- Gadget: YGOPRODeck "Yugi Muto - Proof of Friendship" (373986) no main.
--   Side/extra: suporte do Dawn of the Duel (Yugipedia) que existe no catálogo.
-- Warrior: YGOPRODeck "Yugi Muto - Season 1 - 02 - Duelist Kingdom Custom" (726619).
--   O slug warrior é compartilhado com Joey Wheeler.
-- Passcodes da YGOPRODeck API v7. Cartas ainda não sincronizadas são ignoradas.
-- Cartas só do anime, sem impressão no catálogo, ficaram de fora
-- (Necromancy, Spell Textbook, Turn Jump, Ambush Shield, Ground Erosion, Soul Shield).

update public.anime_decks
set
  description = 'Deck de magos de Yugi Muto: Skilled Dark Magician, Magician''s Valkyria e as fusões Dark Paladin, Amulet Dragon e Arcana Knight Joker.',
  updated_at = now()
where slug = 'magician';

update public.anime_decks
set
  description = 'Deck Gadget de Yugi Muto, usado no Duelo Cerimonial com Stronghold the Moving Fortress e Ties of the Brethren.',
  updated_at = now()
where slug = 'gadget';

update public.anime_decks
set
  description = 'Deck Warrior de Yugi Muto no Duelist Kingdom: Celtic Guardian, Gaia e as fusões do arco.',
  updated_at = now()
where slug = 'warrior';

delete from public.anime_deck_cards
where deck_id in (
  select id from public.anime_decks where slug in ('magician', 'gadget', 'warrior')
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
  v.quantity,
  v.zone,
  v.is_ace,
  v.is_signature,
  v.sort_order
from (
  values
    -- Magician / main
    (46986415, 'magician', 'main', 1, true, true, 1),
    (90876561, 'magician', 'main', 1, false, false, 2),
    (15025844, 'magician', 'main', 1, false, false, 3),
    (25652259, 'magician', 'main', 1, false, false, 4),
    (65240384, 'magician', 'main', 1, false, false, 5),
    (71413901, 'magician', 'main', 1, false, false, 6),
    (78193832, 'magician', 'main', 1, false, false, 7),
    (38033126, 'magician', 'main', 1, false, true, 8),
    (40737112, 'magician', 'main', 1, false, false, 9),
    (34710660, 'magician', 'main', 1, false, false, 10),
    (64788463, 'magician', 'main', 1, false, false, 11),
    (16404809, 'magician', 'main', 1, false, false, 12),
    (40640059, 'magician', 'main', 1, false, false, 13),
    (80304126, 'magician', 'main', 2, false, false, 14),
    (52077741, 'magician', 'main', 1, false, false, 15),
    (73752131, 'magician', 'main', 2, false, true, 16),
    (10000020, 'magician', 'main', 1, false, false, 17),
    (14778250, 'magician', 'main', 1, false, false, 18),
    (10667321, 'magician', 'main', 1, false, false, 19),
    (72892473, 'magician', 'main', 1, false, false, 20),
    (99789342, 'magician', 'main', 1, false, false, 21),
    (95286165, 'magician', 'main', 1, false, false, 22),
    (69542930, 'magician', 'main', 1, false, false, 23),
    (24096228, 'magician', 'main', 1, false, false, 24),
    (67227834, 'magician', 'main', 1, false, false, 25),
    (28553439, 'magician', 'main', 1, false, false, 26),
    (83764719, 'magician', 'main', 1, false, false, 27),
    (27847700, 'magician', 'main', 2, false, false, 28),
    (58415502, 'magician', 'main', 1, false, false, 29),
    (13604200, 'magician', 'main', 1, false, false, 30),
    (72302403, 'magician', 'main', 1, false, false, 31),
    (1784686, 'magician', 'main', 1, false, false, 32),
    (63391643, 'magician', 'main', 1, false, false, 33),
    (32754886, 'magician', 'main', 1, false, false, 34),
    (9287078, 'magician', 'main', 1, false, false, 35),
    (62279055, 'magician', 'main', 1, false, false, 36),
    (44095762, 'magician', 'main', 1, false, false, 37),
    -- Magician / extra
    (6150044, 'magician', 'extra', 1, false, false, 101),
    (75380687, 'magician', 'extra', 1, false, false, 102),
    (43892409, 'magician', 'extra', 1, false, false, 103),
    (98502114, 'magician', 'extra', 1, false, true, 104),
    (4796100, 'magician', 'extra', 1, false, false, 105),
    -- Magician / side
    (87774234, 'magician', 'side', 1, false, false, 201),
    (45141844, 'magician', 'side', 1, false, false, 202),
    (5818798, 'magician', 'side', 1, false, false, 203),
    (77207191, 'magician', 'side', 1, false, false, 204),
    (28279543, 'magician', 'side', 1, false, false, 205),
    (13039848, 'magician', 'side', 1, false, false, 206),
    (6390406, 'magician', 'side', 1, false, false, 207),
    (87880531, 'magician', 'side', 1, false, false, 208),
    (53046408, 'magician', 'side', 1, false, false, 209),
    (55144522, 'magician', 'side', 1, false, false, 210),
    (40703222, 'magician', 'side', 1, false, false, 211),
    (42664989, 'magician', 'side', 1, false, false, 212),
    (74848038, 'magician', 'side', 1, false, false, 213),
    (1248895, 'magician', 'side', 1, false, false, 214),
    -- Gadget / main
    (64681432, 'gadget', 'main', 1, true, false, 1),
    (41172955, 'gadget', 'main', 3, false, true, 2),
    (86445415, 'gadget', 'main', 3, false, true, 3),
    (13839120, 'gadget', 'main', 3, false, true, 4),
    (7572887, 'gadget', 'main', 1, false, false, 5),
    (26202165, 'gadget', 'main', 1, false, false, 6),
    (31305911, 'gadget', 'main', 1, false, false, 7),
    (31560081, 'gadget', 'main', 1, false, false, 8),
    (55144522, 'gadget', 'main', 1, false, false, 9),
    (79571449, 'gadget', 'main', 1, false, false, 10),
    (19613556, 'gadget', 'main', 1, false, false, 11),
    (42703248, 'gadget', 'main', 1, false, false, 12),
    (83764719, 'gadget', 'main', 1, false, false, 13),
    (75500286, 'gadget', 'main', 1, false, false, 14),
    (53129443, 'gadget', 'main', 1, false, false, 15),
    (72302403, 'gadget', 'main', 1, false, false, 16),
    (5318639, 'gadget', 'main', 1, false, false, 17),
    (71044499, 'gadget', 'main', 1, false, false, 18),
    (69162969, 'gadget', 'main', 1, false, false, 19),
    (97169186, 'gadget', 'main', 3, false, false, 20),
    (23171610, 'gadget', 'main', 3, false, false, 21),
    (60082869, 'gadget', 'main', 1, false, false, 22),
    (56120475, 'gadget', 'main', 3, false, false, 23),
    (63356631, 'gadget', 'main', 1, false, false, 24),
    (13955608, 'gadget', 'main', 1, false, false, 25),
    (62279055, 'gadget', 'main', 1, false, false, 26),
    (44095762, 'gadget', 'main', 1, false, false, 27),
    (80604092, 'gadget', 'main', 1, false, false, 28),
    -- Gadget / extra
    (4628897, 'gadget', 'extra', 1, false, false, 101),
    -- Gadget / side
    (40450317, 'gadget', 'side', 1, false, false, 201),
    (99785935, 'gadget', 'side', 1, false, false, 202),
    (39256679, 'gadget', 'side', 1, false, false, 203),
    (11549357, 'gadget', 'side', 1, false, false, 204),
    (75347539, 'gadget', 'side', 1, false, false, 205),
    (48115277, 'gadget', 'side', 1, false, false, 206),
    (42664989, 'gadget', 'side', 1, false, false, 207),
    (80352158, 'gadget', 'side', 1, false, false, 208),
    (66865880, 'gadget', 'side', 1, false, false, 209),
    (17841166, 'gadget', 'side', 1, false, false, 210),
    (37383714, 'gadget', 'side', 1, false, false, 211),
    -- Warrior / main
    (46986415, 'warrior', 'main', 1, false, false, 1),
    (70781055, 'warrior', 'main', 1, false, false, 2),
    (6368038, 'warrior', 'main', 1, false, true, 3),
    (91152258, 'warrior', 'main', 1, false, true, 4),
    (15025844, 'warrior', 'main', 1, false, false, 5),
    (28279543, 'warrior', 'main', 1, false, false, 6),
    (87796900, 'warrior', 'main', 1, false, false, 7),
    (41392891, 'warrior', 'main', 1, false, false, 8),
    (53829412, 'warrior', 'main', 1, false, false, 9),
    (13039848, 'warrior', 'main', 1, false, false, 10),
    (40374923, 'warrior', 'main', 1, false, false, 11),
    (32452818, 'warrior', 'main', 1, false, false, 12),
    (90357090, 'warrior', 'main', 1, false, false, 13),
    (69669405, 'warrior', 'main', 1, false, false, 14),
    (40640059, 'warrior', 'main', 2, false, false, 15),
    (95727991, 'warrior', 'main', 1, false, false, 16),
    (83764719, 'warrior', 'main', 1, false, false, 17),
    (27847700, 'warrior', 'main', 1, false, false, 18),
    (87910978, 'warrior', 'main', 1, false, false, 19),
    (40703222, 'warrior', 'main', 1, false, false, 20),
    (89086566, 'warrior', 'main', 1, false, false, 21),
    (27827272, 'warrior', 'main', 1, false, false, 22),
    (93108433, 'warrior', 'main', 1, false, false, 23),
    (91595718, 'warrior', 'main', 1, false, false, 24),
    (64047146, 'warrior', 'main', 1, false, false, 25),
    (72302403, 'warrior', 'main', 1, false, false, 26),
    (93260132, 'warrior', 'main', 1, false, false, 27),
    (25774450, 'warrior', 'main', 1, false, false, 28),
    (81210420, 'warrior', 'main', 1, false, false, 29),
    (18807108, 'warrior', 'main', 1, false, false, 30),
    (44095762, 'warrior', 'main', 1, false, false, 31),
    (59560625, 'warrior', 'main', 1, false, false, 32),
    (98069388, 'warrior', 'main', 1, false, false, 33),
    (5405694, 'warrior', 'main', 1, false, false, 34),
    (55761792, 'warrior', 'main', 1, false, false, 35),
    (30208479, 'warrior', 'main', 1, false, false, 36),
    (76792184, 'warrior', 'main', 1, false, false, 37),
    (13048472, 'warrior', 'main', 1, false, false, 38),
    (10667321, 'warrior', 'main', 1, false, false, 39),
    -- Warrior / extra
    (66889139, 'warrior', 'extra', 1, true, false, 101),
    (11901678, 'warrior', 'extra', 1, false, false, 102),
    (62873545, 'warrior', 'extra', 1, false, false, 103),
    (31339260, 'warrior', 'extra', 1, false, false, 104),
    -- Warrior / side
    (92377303, 'warrior', 'side', 1, false, false, 201),
    (24294108, 'warrior', 'side', 1, false, false, 202),
    (34694160, 'warrior', 'side', 1, false, false, 203),
    (71625222, 'warrior', 'side', 1, false, false, 204),
    (67724379, 'warrior', 'side', 1, false, false, 205),
    (80813021, 'warrior', 'side', 1, false, false, 206),
    (53129443, 'warrior', 'side', 1, false, false, 207),
    (5758500, 'warrior', 'side', 1, false, false, 208),
    (36607978, 'warrior', 'side', 1, false, false, 209),
    (83715234, 'warrior', 'side', 1, false, false, 210),
    (84813516, 'warrior', 'side', 1, false, false, 211),
    (41006930, 'warrior', 'side', 1, false, false, 212)
) as v(card_id, deck_slug, zone, quantity, is_ace, is_signature, sort_order)
join public.anime_decks d on d.slug = v.deck_slug
join public.cards c on c.id = v.card_id
on conflict (deck_id, card_id, language, zone) do update
set
  quantity = excluded.quantity,
  is_ace = excluded.is_ace,
  is_signature = excluded.is_signature,
  sort_order = excluded.sort_order,
  updated_at = now();
