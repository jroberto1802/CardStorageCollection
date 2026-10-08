-- Catálogo Anime → Personagem → Deck → Cartas
--
-- As tabelas public.decks / public.deck_cards já são os decks pessoais do usuário.
-- public.synced_decks é o catálogo da comunidade (Master Duel Meta).
-- Este catálogo da franquia usa anime_decks / anime_deck_cards para não colidir
-- com nenhum dos dois. A carta continua em public.cards (PK id + language).

create table if not exists public.animes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  release_date date,
  end_date date,
  cover_image text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  anime_id uuid not null references public.animes (id) on delete cascade,
  name text not null,
  japanese_name text,
  slug text not null unique,
  description text,
  image text,
  is_duelist boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_anime_id_idx on public.characters (anime_id);
create index if not exists characters_name_idx on public.characters (name);

create table if not exists public.anime_decks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_decks (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  deck_id uuid not null references public.anime_decks (id) on delete cascade,
  anime_arc text,
  season text,
  description text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (character_id, deck_id)
);

create index if not exists character_decks_character_id_idx
  on public.character_decks (character_id, sort_order);
create index if not exists character_decks_deck_id_idx
  on public.character_decks (deck_id);

-- zone reutiliza o vocabulário já usado em decks/synced_decks: main | extra | side
create table if not exists public.anime_deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.anime_decks (id) on delete cascade,
  card_id bigint not null,
  language text not null default 'en' check (language in ('en', 'pt')),
  quantity integer not null default 1 check (quantity > 0),
  zone text not null check (zone in ('main', 'extra', 'side')),
  is_ace boolean not null default false,
  is_signature boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anime_deck_cards_card_fk
    foreign key (card_id, language) references public.cards (id, language) on delete restrict,
  unique (deck_id, card_id, language, zone)
);

create index if not exists anime_deck_cards_deck_id_idx
  on public.anime_deck_cards (deck_id, zone, sort_order);
create index if not exists anime_deck_cards_card_id_idx
  on public.anime_deck_cards (card_id, language);

alter table public.animes enable row level security;
alter table public.characters enable row level security;
alter table public.anime_decks enable row level security;
alter table public.character_decks enable row level security;
alter table public.anime_deck_cards enable row level security;

drop policy if exists "Authenticated can read animes" on public.animes;
create policy "Authenticated can read animes"
  on public.animes for select to authenticated using (true);

drop policy if exists "Authenticated can read characters" on public.characters;
create policy "Authenticated can read characters"
  on public.characters for select to authenticated using (true);

drop policy if exists "Authenticated can read anime decks" on public.anime_decks;
create policy "Authenticated can read anime decks"
  on public.anime_decks for select to authenticated using (true);

drop policy if exists "Authenticated can read character decks" on public.character_decks;
create policy "Authenticated can read character decks"
  on public.character_decks for select to authenticated using (true);

drop policy if exists "Authenticated can read anime deck cards" on public.anime_deck_cards;
create policy "Authenticated can read anime deck cards"
  on public.anime_deck_cards for select to authenticated using (true);

grant select on public.animes to authenticated;
grant select on public.characters to authenticated;
grant select on public.anime_decks to authenticated;
grant select on public.character_decks to authenticated;
grant select on public.anime_deck_cards to authenticated;

comment on table public.animes is 'Animes/séries da franquia Yu-Gi-Oh!';
comment on table public.characters is 'Personagens vinculados a um anime';
comment on table public.anime_decks is 'Decks/arquétipos de personagens (catálogo, não é deck do usuário)';
comment on table public.character_decks is 'N:N personagem ↔ deck, com arco e deck principal';
comment on table public.anime_deck_cards is 'Cartas do deck de personagem; referencia public.cards';

-- Seeds idempotentes -------------------------------------------------------

insert into public.animes (name, slug, sort_order)
values
  ('Yu-Gi-Oh!', 'yu-gi-oh', 1),
  ('Yu-Gi-Oh! GX', 'yu-gi-oh-gx', 2)
on conflict (slug) do nothing;

insert into public.characters (anime_id, name, slug, is_duelist, sort_order)
select a.id, v.name, v.slug, true, v.sort_order
from (
  values
    ('yu-gi-oh', 'Yugi Muto', 'yugi-muto', 1),
    ('yu-gi-oh', 'Seto Kaiba', 'seto-kaiba', 2),
    ('yu-gi-oh', 'Joey Wheeler', 'joey-wheeler', 3),
    ('yu-gi-oh', 'Mai Valentine', 'mai-valentine', 4),
    ('yu-gi-oh', 'Yami Bakura', 'yami-bakura', 5),
    ('yu-gi-oh', 'Marik Ishtar', 'marik-ishtar', 6),
    ('yu-gi-oh', 'Yami Marik', 'yami-marik', 7),
    ('yu-gi-oh', 'Ishizu Ishtar', 'ishizu-ishtar', 8),
    ('yu-gi-oh', 'Odion', 'odion', 9),
    ('yu-gi-oh', 'Maximillion Pegasus', 'maximillion-pegasus', 10),
    ('yu-gi-oh', 'Weevil Underwood', 'weevil-underwood', 11),
    ('yu-gi-oh', 'Rex Raptor', 'rex-raptor', 12),
    ('yu-gi-oh', 'Mako Tsunami', 'mako-tsunami', 13),
    ('yu-gi-oh', 'Bandit Keith', 'bandit-keith', 14),
    ('yu-gi-oh', 'Espa Roba', 'espa-roba', 15),
    ('yu-gi-oh', 'Arkana', 'arkana', 16),
    ('yu-gi-oh', 'Strings', 'strings', 17),
    ('yu-gi-oh', 'Bonz', 'bonz', 18),
    ('yu-gi-oh', 'Duke Devlin', 'duke-devlin', 19),
    ('yu-gi-oh', 'Mokuba Kaiba', 'mokuba-kaiba', 20),
    ('yu-gi-oh', 'Téa Gardner', 'tea-gardner', 21),
    ('yu-gi-oh', 'Tristan Taylor', 'tristan-taylor', 22),
    ('yu-gi-oh', 'Rebecca Hawkins', 'rebecca-hawkins', 23),
    ('yu-gi-oh', 'Dartz', 'dartz', 24),
    ('yu-gi-oh', 'Rafael', 'rafael', 25),
    ('yu-gi-oh', 'Alister', 'alister', 26),
    ('yu-gi-oh', 'Valon', 'valon', 27),
    ('yu-gi-oh', 'Leon Wilson', 'leon-wilson', 28),
    ('yu-gi-oh', 'Zigfried Lloyd', 'zigfried-lloyd', 29),
    ('yu-gi-oh', 'Noah Kaiba', 'noah-kaiba', 30),
    ('yu-gi-oh-gx', 'Jaden Yuki', 'jaden-yuki', 1),
    ('yu-gi-oh-gx', 'Zane Truesdale', 'zane-truesdale', 2),
    ('yu-gi-oh-gx', 'Chazz Princeton', 'chazz-princeton', 3),
    ('yu-gi-oh-gx', 'Alexis Rhodes', 'alexis-rhodes', 4),
    ('yu-gi-oh-gx', 'Syrus Truesdale', 'syrus-truesdale', 5),
    ('yu-gi-oh-gx', 'Bastion Misawa', 'bastion-misawa', 6),
    ('yu-gi-oh-gx', 'Tyranno Hassleberry', 'tyranno-hassleberry', 7),
    ('yu-gi-oh-gx', 'Chumley Huffington', 'chumley-huffington', 8),
    ('yu-gi-oh-gx', 'Blair Flannigan', 'blair-flannigan', 9),
    ('yu-gi-oh-gx', 'Atticus Rhodes', 'atticus-rhodes', 10),
    ('yu-gi-oh-gx', 'Aster Phoenix', 'aster-phoenix', 11),
    ('yu-gi-oh-gx', 'Jesse Anderson', 'jesse-anderson', 12),
    ('yu-gi-oh-gx', 'Axel Brodie', 'axel-brodie', 13),
    ('yu-gi-oh-gx', 'Jim Crocodile Cook', 'jim-crocodile-cook', 14),
    ('yu-gi-oh-gx', 'Adrian Gecko', 'adrian-gecko', 15),
    ('yu-gi-oh-gx', 'Sartorius Kumar', 'sartorius-kumar', 16),
    ('yu-gi-oh-gx', 'Yubel', 'yubel', 17),
    ('yu-gi-oh-gx', 'Vellian Crowler', 'vellian-crowler', 18),
    ('yu-gi-oh-gx', 'Lyman Banner', 'lyman-banner', 19),
    ('yu-gi-oh-gx', 'Kagemaru', 'kagemaru', 20),
    ('yu-gi-oh-gx', 'Camula', 'camula', 21),
    ('yu-gi-oh-gx', 'Tania', 'tania', 22),
    ('yu-gi-oh-gx', 'Abidos the Third', 'abidos-the-third', 23),
    ('yu-gi-oh-gx', 'Titan', 'titan', 24),
    ('yu-gi-oh-gx', 'Professor Viper', 'professor-viper', 25),
    ('yu-gi-oh-gx', 'Yusuke Fujiwara', 'yusuke-fujiwara', 26),
    ('yu-gi-oh-gx', 'Trueman', 'trueman', 27),
    ('yu-gi-oh-gx', 'Nightshroud', 'nightshroud', 28)
) as v(anime_slug, name, slug, sort_order)
join public.animes a on a.slug = v.anime_slug
on conflict (slug) do nothing;

insert into public.anime_decks (name, slug)
values
  ('Dark Magician', 'dark-magician'),
  ('Magician', 'magician'),
  ('Gadget', 'gadget'),
  ('Warrior', 'warrior'),
  ('Blue-Eyes', 'blue-eyes'),
  ('XYZ', 'xyz'),
  ('Machine', 'machine'),
  ('Red-Eyes', 'red-eyes'),
  ('Gambling', 'gambling'),
  ('Harpie', 'harpie'),
  ('Toon', 'toon'),
  ('Relinquished', 'relinquished'),
  ('Gravekeeper', 'gravekeeper'),
  ('Ra', 'ra'),
  ('Elemental HERO', 'elemental-hero'),
  ('Neo-Spacian', 'neo-spacian'),
  ('Evil HERO', 'evil-hero'),
  ('Cyber Dragon', 'cyber-dragon'),
  ('Cyberdark', 'cyberdark'),
  ('Ojama', 'ojama'),
  ('Armed Dragon', 'armed-dragon'),
  ('VWXYZ', 'vwxyz'),
  ('Cyber Angel', 'cyber-angel'),
  ('Cyber Girl', 'cyber-girl'),
  ('Water Dragon', 'water-dragon'),
  ('Magnet Warrior', 'magnet-warrior'),
  ('Elemental', 'elemental'),
  ('Destiny HERO', 'destiny-hero'),
  ('Crystal Beast', 'crystal-beast'),
  ('Volcanic', 'volcanic'),
  ('Fossil', 'fossil'),
  ('Exodia', 'exodia'),
  ('Cloudian', 'cloudian'),
  ('Arcana Force', 'arcana-force'),
  ('Yubel', 'yubel')
on conflict (slug) do nothing;

insert into public.character_decks (character_id, deck_id, is_primary, sort_order)
select c.id, d.id, v.is_primary, v.sort_order
from (
  values
    ('yugi-muto', 'dark-magician', true, 1),
    ('yugi-muto', 'magician', false, 2),
    ('yugi-muto', 'gadget', false, 3),
    ('yugi-muto', 'warrior', false, 4),
    ('seto-kaiba', 'blue-eyes', true, 1),
    ('seto-kaiba', 'xyz', false, 2),
    ('seto-kaiba', 'machine', false, 3),
    ('joey-wheeler', 'red-eyes', true, 1),
    ('joey-wheeler', 'warrior', false, 2),
    ('joey-wheeler', 'gambling', false, 3),
    ('mai-valentine', 'harpie', true, 1),
    ('maximillion-pegasus', 'toon', true, 1),
    ('maximillion-pegasus', 'relinquished', false, 2),
    ('marik-ishtar', 'gravekeeper', true, 1),
    ('marik-ishtar', 'ra', false, 2),
    ('jaden-yuki', 'elemental-hero', true, 1),
    ('jaden-yuki', 'neo-spacian', false, 2),
    ('jaden-yuki', 'evil-hero', false, 3),
    ('zane-truesdale', 'cyber-dragon', true, 1),
    ('zane-truesdale', 'cyberdark', false, 2),
    ('chazz-princeton', 'ojama', true, 1),
    ('chazz-princeton', 'armed-dragon', false, 2),
    ('chazz-princeton', 'vwxyz', false, 3),
    ('alexis-rhodes', 'cyber-angel', true, 1),
    ('alexis-rhodes', 'cyber-girl', false, 2),
    ('bastion-misawa', 'water-dragon', true, 1),
    ('bastion-misawa', 'magnet-warrior', false, 2),
    ('bastion-misawa', 'elemental', false, 3),
    ('aster-phoenix', 'destiny-hero', true, 1),
    ('jesse-anderson', 'crystal-beast', true, 1),
    ('axel-brodie', 'volcanic', true, 1),
    ('jim-crocodile-cook', 'fossil', true, 1),
    ('adrian-gecko', 'exodia', true, 1),
    ('adrian-gecko', 'cloudian', false, 2),
    ('sartorius-kumar', 'arcana-force', true, 1),
    ('yubel', 'yubel', true, 1)
) as v(character_slug, deck_slug, is_primary, sort_order)
join public.characters c on c.slug = v.character_slug
join public.anime_decks d on d.slug = v.deck_slug
on conflict (character_id, deck_id) do nothing;
