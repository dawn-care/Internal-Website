# Community: cozy ideas for Sunset Acres

Status: **being built, in the suggested order.** Built so far: the introduction, a brighter look and feel, pets, animals on the property,
benches, board-game tables (Connect 4 and checkers), larger plots as upgrades (with digging
plants up), and cooking (garden recipes; forest ingredients come with the forest). These are the additions that make the property worth
coming back to (the forest, in FOREST.md, is the other half). Suggested order: build the
introduction first, then the rest roughly in the order listed.

## Why

The game works but is thin: there's no clear goal after the first few minutes and little reason to
log in again. These ideas add a first-session goal (the introduction), small daily reasons to
return (pets, Chef Rosa's orders), long-term goals (plot upgrades, collecting) and more ways to
spend time with each other (benches, board games).

## Introduction (do this first)

- Today new players get two pop-up tips and that's it.
- **Nurse Ada greets you at the gate** and walks you through a short first task:
  1. plant something,
  2. sell it,
  3. buy one piece of furniture.
- Goal: the first five minutes have a clear goal.

**Built** (src/intro.ts, wired up in src/game.ts and src/ui.ts). How it works and the calls made:

- **Who sees it:** new characters only. The save has an `intro` step (0 greet, 1 plant, 2 sell,
  3 buy); a finished intro has no field, so saves from before the intro existed count as finished
  and those players never see it. The server validates the step (0–3) like the rest of the save.
- **Where Ada is:** while your intro runs, a second Nurse Ada stands on the plaza just west of
  where you arrive (tile 21,11) and her greeting opens on its own. She stays put (no walking);
  she's drawn only in your own game, so neighbours don't see her. The front-desk Ada is unchanged.
  Talking to either Ada mid-intro repeats the current hint.
- **Skipping:** Ada's greeting ends with "Lead the way!" or "I know my way around". Skipping
  finishes the intro straight away, without the gift.
- **The list:** a small card under the HUD ("Nurse Ada's list · 1 of 3 done") shows the current
  task and a hint that follows what you're doing (dig, plant, water, wait, pick, take it to Rosa;
  go in, find your door, press Catalog).
- **The arrow:** a bobbing gold arrow over where to go next (Ada, your plot, Chef Rosa, the front
  door, your hallway door, your room's way out). If the target is off screen, a pointer at the edge
  of the view aims at it. At your plot the arrow hides so it doesn't cover your seedlings. In your
  room the Catalog button glows instead.
- **Order is strict:** a task only counts while it's the current one (e.g. a fern bought before
  you've planted doesn't tick off "buy"). Simple, and the intro is short enough that it's fine.
- **Finish growing:** once a plant in your plot is planted and watered (but not ripe) during the
  plant or sell task, Nurse Ada's list shows a "Finish growing" button that ripens it at once, so
  new players needn't wait out a whole growth. Watering still has to be done first, so the intro
  still teaches it. The hint mentions the button. It only exists during the introduction.
- **Gift:** finishing gives a Flower painting (worth 30) into room storage, or 30 coins if storage
  is full. Ada's goodbye waits until you've closed the Catalog and put down what you bought.
- **No plot, no tour:** if the home is full (no garden slot), the intro is skipped.
- **Dialogue box:** a reusable speech box (`ui.dialogue(speaker, lines, { look, old, pitch,
choices })`) in a carved wooden frame. The speaker's **portrait is on the left** with their name
  plate under it, and the text is on parchment to the right. Text types out with a soft
  synthesized blip per letter (`voice()` in src/audio.ts, a pitch per speaker) while the portrait's
  mouth moves; the portrait blinks now and then. E, Space, Enter or a click finishes the line or
  goes on; Esc skips to the end; arrow keys move between choices. With reduced motion the text
  appears at once and the portrait holds still. FOREST.md's encounter dialogue builds on it.
- Replaces the two welcome pop-ups new players used to get.

## Layout of the grounds (done)

Things used to be scattered (trees and bushes were placed by noise, benches and lamps wherever
there was room). Now everything is placed on purpose in src/maps.ts `buildGrounds`, round the
home's centre line (between x 23 and 24):

- **Plaza and front walk, mirrored:** lamps on the plaza's front corners (17,13) and (30,13);
  benches facing out at (19,14) and (27,14); a lamp either side of the front walk where it meets
  the main path, (22,16) and (25,16), with the mailbox at the roadside beside the east one (26,16).
- **Garden gate, on the same line:** the Community Garden's gate is two tiles wide at (23–24,20),
  straight down from the front walk, with the noticeboard (22,19) and a tub of flowers (25,19)
  either side of it.
- **Games tables:** a matching pair on the lawns either side of the plaza, (14,13) and (33,13), and
  one by the pond in line with the Kitchen's path (40,21), shaded by a tree at (44,21).
- **Benches in pairs, facing what's worth looking at:** the plaza (above), the garden (on the verge
  either side of its gate, (19,19) and (27,19)) and the pond (on its north shore, (37,24) and
  (41,24)). Six in all.
- **Garden and pond:** the garden fills the south-west (x 3–35, y 20–46; see "Larger plots"), the
  pond the east (`POND` in src/maps.ts, centre (41.6,32)), reached by a path down the garden's east
  fence (x 36).
- **Lamps:** the four above, plus one at each end of the main path, (6,16) and (45,16).
- **Trees:** the border ring all round; an orchard of six apple trees behind the Kitchen (x 37, 40,
  43 by y 3, 6); a little wood below the pond (x 38, 41, 44 by y 40, 43, 46, tree and pine in
  turn); a tree either side of the henhouse path, (4,14) and (10,14). Two bushes frame the front of the home
  (13,9) and (34,9). There are no random trees or bushes any more; wildflower patches are still
  scattered, as they're meant to look wild.
- To add something to the grounds, give it a place in this plan (a pair, a row, or on a line)
  rather than an open spot.

## Look and feel (done)

The property should feel bright and warm, in the spirit of classic farming games; the forest is
where things go grey (FOREST.md).

- **Richer palette:** deeper, more saturated grass with yellow-green highlights, warm orange paths
  and dirt, warmer cobbles, bluer water, brighter flowers and outfit colours, a butter-yellow home
  with green shutters.
- **More detailed scenery:** trees are built from clumps of leaves (shaded mounds with individual
  leaves, back to front, dark-outlined, three greens, apples on some); pines have tiers of needles
  with jagged hems; bushes are leaf clumps too. The plaza is real cobblestones (irregular stones of
  slightly different colours, lit from the top left, dark grout with the odd bit of moss). The
  home has shingles, a ridge and fascia, siding boards with shadows, trim boards, a stone
  foundation, brick chimneys, curtains and window glints, louvred shutters, a porch on posts and a
  panelled glass door; the kitchen has tiled roof, varied bricks and a scalloped awning. Buildings
  are rendered once into cached sprites, so the extra detail costs nothing per frame.
- **Grass, fences, benches, lamps, plots, pond:** the lawn has soft patches of three greens,
  tufts of blades and the odd clover instead of a flat colour. Fences are picket posts with
  rounded tops, grain and nailed rails; benches have wooden slats on iron ends; lamp posts are
  Victorian (stepped base, ringed pole, crossbar, four-pane lantern, finial). Garden plots sit in
  raised wooden beds with corner posts (brass caps on yours), and tilled soil has raised rows and
  clods, glistening when watered. The pond goes from light shallows to deep blue, with an earth
  bank, foam at the shore, wet sand, pebbles, reeds and cattails, and lily pads with pink flowers.
  All of these are cached sprites or part of the once-rendered ground.
- **Colour grade per area:** `MOODS` in src/game.ts is a filter over the whole scene. The property
  uses `property` (a little more saturation and contrast); the forest will switch to `forest`
  (drained and dark). One line to change the mood of an area.
- **Lighting:** dusk and dawn tint the scene warm orange, night deep blue, by multiplying rather
  than painting grey over everything, so colours stay rich. After dark the home's and kitchen's
  windows glow warm, next to the lamp-post pools of light.
- **Portraits:** src/portraits.ts draws a detailed 48×48 bust from any Look (shaded face, eyes with
  whites and a glint, brows, nose, lips, rosy cheeks, smile lines for residents, every hairstyle
  and accessory), shown at 3× in dialogue, with talking and blinking frames. Eye colour isn't part
  of a Look, so it's picked steadily from the character's name.

## Pets

- Probably the best value for the effort.
- You **pick a dog or cat and name it.** It **follows you around**, and **other players can see
  it.**
- It **sleeps in its bed in your room.**
- You can **pet or feed it**, which gives people a small reason to log in each day.

Notes: the pet goes in the save and in presence (so neighbours see it walking behind you). The
existing "Cat (with bed)" furniture could become the pet's bed.

**Built** (src/pets.ts for sprites, following and helpers; src/game.ts for care, sleeping and
drawing; the adoption panel in src/ui.ts). How it works and the calls made:

- **Getting one:** free, from Nurse Ada (desk or, during the intro, outside) once the intro is
  done: "Would you like one?" opens the pet programme panel: Dog or Cat, one of 4 coats each
  (dog: Golden, Chocolate, Black & white, Silver; cat: Orange tabby, Black, Grey tabby, Calico),
  and a name (up to 14 characters; "Biscuit" for dogs and "Pickles" for cats by default), with a
  big preview. One pet each. Talking to Ada later offers "Rename". Ada's intro goodbye mentions it.
- **Its bed:** a free Pet bed (new furniture, price 0 so it's not in the Catalog) is put in the
  first free floor spot from the bottom right of your room, or in storage if there's no room. The
  old "Cat (with bed)" stays a separate decoration (Mittens, the house cat).
- **Following:** the pet trots along your path about two tiles behind you (it won't walk closer than 1.4 tiles;
  if you double back or walk up to it, it stays where it is and you can stand right on top of it,
  then it trots after you once you've gone past), sits (wagging)
  when you stop, and comes with you into the hallway and other people's rooms. In your own room
  it's asleep in its bed (z's drifting up). At night on the shared clock (9 pm to 6 am) it's
  asleep at home; in the morning it comes out of the front door to find you.
- **Neighbours:** presence carries `pet: { kind, coat, name }` only while it's following you
  (validated on the server); each viewer runs the same follower behind your synced position, so
  the pet's own position is never sent. A neighbour's room shows their pet asleep in its bed when
  it isn't out with them (the world profile carries the pet's look, never its care details).
- **Care:** face a pet and press E to pet it (hearts float up; a bark, or a purr). Your own pet
  gains a heart for the first pat each New York calendar day. F gives a treat (within 2.5 tiles):
  another heart, once a day. Treats are sold by Chef Rosa ("Seeds & treats" tab, 3 for 10 coins)
  and sit in your basket. Nothing bad happens if you skip a day. Petting neighbours' pets only
  shows hearts.
- **Hearts:** 0–10, saved on the pet. From 5 hearts, once a day (a few seconds after it's out
  with you) there's a 60% chance it brings a gift: 5–15 coins, or a few carrot, radish or (rarely)
  strawberry seeds. Hearts are kept for the forest's pet rescue (FOREST.md).
- **Sounds:** recorded (retirement/sounds → sfx/pet-*.mp3, see CLAUDE.md "Music and sound"):
  petting makes a dog pant and a cat purr; a treat, a gift, adoption and your pet trotting out of
  the front door get a bark or a meow; begging for a treat you can't give gets a whine (dog) or a
  meow (cat). Only the treat crunch is synthesized.
- **Coming next (forest):** the grounds grow a wide band of outskirts that fade (colours, music,
  grass) as you walk out; near the treeline beyond them, a dog growls and a cat hisses at the
  trees, warning you that the forest is dangerous. Designed in FOREST.md ("Your pet"), not
  built yet; it needs growl and hiss recordings.
- **Offline:** in LocalNet, Nana June walks with Pickles (a calico) and Grandpa Walt's dog Duke
  is asleep at home in his room. Both have beds.

## Animals on the property

- Cheap, and makes the place feel alive: **ducks on the pond, a cat sunning itself, butterflies,
  squirrels.**
- **Chickens that lay eggs you can sell**, so the animals tie into the economy and aren't just
  decoration.

Notes: ambient animals can run in each browser (no syncing needed). Eggs need to work the same way
for everyone, e.g. a coop that gives each player a few eggs per in-game day, like crops grow from
timestamps.

**Built** (src/animals.ts; the henhouse in src/maps.ts and src/art.ts; wired up in src/game.ts).
Every animal's position comes from the shared game clock, so everyone sees the same thing with
nothing synced; only eggs touch the save. How it works and the calls made:

- **Henhouse** in the north-west corner, west of the home: a fenced dirt run (picket fence, a
  gate at the bottom, a path down to the main path) with a red-roofed coop along the top. A tree
  stands either side of its path (see "Layout of the grounds").
- **Hens:** three (white, brown, speckled grey) wander the run from 6 am to 8 pm, stopping to peck;
  overnight they're in the coop.
- **Eggs:** each hen lays one egg a game day at 7 am (`LAY_HOUR`), so up to 3 per player per game
  day (every 24 real minutes). **Everyone collects their own**: the nest boxes show your share,
  and taking them never empties a neighbour's. Face the nest boxes from inside the run and press E
  to take them all. The save keeps `coop: { day, taken }` (the egg day, counted from 7 am, and how
  many you took), validated on the server. Eggs (`egg` in the inventory) go in your basket; Chef
  Rosa buys them for 15 coins each (Sell produce tab). They'll be a cooking ingredient later.
- **Ducks:** a mother and three ducklings paddle a slow loop on the pond (a minute per lap), with
  a little wake and the odd head dip; from 9 pm to 6 am they sleep in a huddle on the west shore.
- **Mittens, the house cat** (orange tabby): naps in the sun in a spot that moves through the day
  (the plaza from 7, the path by the garden gate from 10, outside the Kitchen from 2 pm, the front
  step from 6 pm) and strolls over in the first half game hour of each; from 9 pm she sleeps in
  the hallway. You can stroke her (she purrs). She walks in a straight line between spots, so she
  can pass over a bench or the cart for a moment. The "Cat (with bed)" furniture's text no longer
  calls its cat Mittens.
- **Squirrels:** three, each by a leafy tree, hopping about its base by day; when anyone (or any
  pet) comes within 2.5 tiles one darts up its trunk and peeks out for 6 seconds. That bit is
  worked out in each browser.
- **Butterflies:** nine, each over its own flower patch, 7 am to 7 pm. **Fireflies:** eighteen
  over the pond and the garden at night, glowing through the dark.
- **Sound** (recordings, see CLAUDE.md "Music and sound"): hens cluck now and then while you're
  near the run (and when you take their eggs), the ducks quack by day when you're near the pond,
  the rooster crows once at 6 am as the hens come out (you hear it across the grounds, and
  faintly indoors), and a squirrel chitters as it darts up its tree. All quieter with distance and
  panned to where they are. Mittens uses the cat purr recording.

## Benches

- Easy, and good for the social side: you can **sit on benches**, and **neighbours see you sitting
  together**, with speech bubbles going back and forth.

Notes: "sitting" is a pose sent with presence.

**Built** (seats in src/maps.ts `seatsOf`, sitting in src/game.ts, seated frames in
src/people.ts, the seat check in shared/schema.ts). How it works and the calls made:

- **Seats:** the six benches on the grounds (two places each, so neighbours sit side by side),
  the three hallway chairs, and any armchair or rocking chair placed in a room (yours or one
  you're visiting). Face one and press E: "Sit down". If that place is taken you get the other
  half of the bench; if it's full, "There's no room here just now". The hallway chairs back onto
  the wall, so you sit on them from the front (above).
- **Sitting:** you sit facing out, hands in your lap. Any movement key (WASD/arrows) gets you up;
  the prompt says "WASD Get up". You step out in front, or above or to the side if that's a wall.
  After 30 seconds you doze off (eyes closed, z's), and so do neighbours, worked out from when
  they sat down. No rewards: it's for sitting together and chatting (speech bubbles work as
  usual).
- **Your pet** trots to your feet (beside you if there's a wall there), sits, and curls up after
  a few seconds. Neighbours' pets do the same at theirs.
- **Presence:** `sit` (the seat id, e.g. `bench:19,14:0`) and `sitAt` (when you sat). The server
  checks the id's format and that the kind of seat belongs to where you are (benches on the
  grounds, chairs in the hallway, armchairs and rockers in rooms). If two people claim the same
  place, whoever sat first keeps it and the other gets `seatTaken` and stands up with a friendly
  note. This is worked out from the presence list, so it's the same on every store backend.
- **Offline:** Grandpa Walt now and then walks to one of the plaza benches, sits 20–60 seconds
  (long enough to doze off) and chats from there.

## Board-game tables

- The **biggest social payoff.** The networking already suits it: turn-based games are fine with the
  ~1-second updates.
- Occasional tables around the property where you play **with someone else.**
- **Start with Connect 4 and checkers** because their rules are simple. **Chess later**, since it's
  mostly more rules to check.
- **The game state lives on the server**, so both players see the same board.

Notes: add to the existing /api/retirement function (Vercel Hobby allows 12 functions). Moves should
be checked on the server and carry a version number, like team to-dos, so two players can't
overwrite each other's moves.

**Built** (rules and table positions in shared/tables.ts; the table, stools and tabletop miniature
in src/art.ts; the board card in src/ui.ts; wired up in src/game.ts; `POST ?op=table` in
api/retirement.ts). How it works and the calls made:

- **Tables:** three on the grounds, each a small wooden table with a stool either side: west of
  the plaza (14,13), east of the plaza (33,13) and by the pond (40,21). Built ahead of plot upgrades, Rosa's orders and cooking (the order above was a
  suggestion).
- **Sitting down:** a stool is a seat like a bench place (`table:14,13:0` west, `:1` east), so it
  uses the same presence, `seatTaken` rule and "WASD Get up". You sit side-on, facing the table,
  reaching for the board (a new side-on seated sprite in src/people.ts), and you never doze off at
  a table.
- **The board card:** while you sit at a table a card on the right shows both stools (name, piece
  colour, a ring round whoever's turn it is), a status line, the board, and buttons. With someone
  opposite and no game on: "Play Connect 4" / "Play Checkers". After a game: "Rematch: …" and the
  other game. During your game: "Resign", which asks "Really resign?" first.
- **Watching:** face a table (not a stool) and press E to watch the game on it; the card shows it
  read-only, with "Stop watching". Walking more than a few tiles away stops it.
- **On the table itself:** everyone on the grounds sees the game in miniature on the tabletop (a
  blue Connect 4 frame with the real counters, or a checkerboard with the real pieces), or a game
  box when nothing has been played there.
- **Who plays:** the two people on the stools when a game starts. The game then belongs to those
  two logins; only they can move, only on their turn, and only while sitting at that table (stand
  up and the card says "Sit back down on your stool to carry on"). A game counts as abandoned once
  either of its players is off their stool, and then whoever is sitting there can start a new one.
  Who goes first alternates each game at a table (red in Connect 4, dark in checkers).
- **Connect 4:** 7 × 6; click a column to drop. Four in a row (any direction) wins and is ringed
  in gold; a full board is a draw.
- **Checkers:** American rules on 8 × 8: men move diagonally forward, kings both ways; captures are
  compulsory and a capture must carry on while it can; a man reaching the far row is crowned and
  that ends the move. You win when the other side has no move left (no pieces, or blocked). 40
  moves each with no capture and no man moving is a draw. The board is turned for the east player
  so your own pieces are always nearest you. Click a piece (your movable ones are ringed), then
  where it goes (dots); a multiple jump is clicked one landing at a time. Kings have a crown.
- **Server:** `POST ?op=table { id, version, action }` with action `start` (game), `move` (path:
  `[column]`, or the squares a checkers piece visits) or `resign`. The server works out who is on
  the stools from presence, checks the action with the shared rules and stores it only if the
  table is still at `version` (else 409 "changed", and the next sync brings the latest board).
  Storage: in Redis a `ret:tables` hash written with a small compare-and-set script; without Redis,
  in the function instance's memory (like presence). Syncs from the grounds return every table's
  state, so the opponent's move shows up within about a second (with a click, and a chime when
  it's your turn).
- **Sounds:** a synthesized "clack" for each move, the harvest jingle when you win.
- **Offline:** sit at any table and Grandpa Walt walks over and sits opposite. He plays both games
  (Connect 4: takes a win, blocks yours, likes the middle; checkers: the longest capture, else a
  random move that doesn't break his back row), and gets up a couple of seconds after you do.
- **Chess later:** add `'chess'` to `GAME_KINDS` with its board and move rules in shared/tables.ts;
  the table, card and server need no other change beyond drawing the board.

## Larger plots, as upgrades

- Don't just make every plot bigger: make **expansions something you buy: 5×3, then 7×4, then
  9×5.**
- Gives coins a long-term use.

Notes: the garden today fits 12 plots of 5×3 in a fixed grid. Room for 9×5 plots means a bigger
garden area or a new layout. Saves need the plot size, and the server's save validation must allow
the larger garden.

**Built** (sizes and prices in shared/catalog.ts `PLOT_SIZES`; `plot`, `growGarden` and validation in
shared/schema.ts; the new garden in src/maps.ts; buying, digging and potted plants in src/game.ts;
the noticeboard panel in src/ui.ts). How it works and the calls made:

- **A bigger garden:** the grounds grew 11 tiles south (48 × 49). The garden is now twelve
  **allotments** of 9 × 5 (3 across, 4 down, dirt paths between), each with room for the largest
  plot, so a plot grows in place and never moves anyone else's. Slot n is column n % 3, row n / 3.
  The grass in an allotment beyond your plot is marked out with stakes and string (yours only)
  while there's room to grow. The pond moved east of the garden, a little rounder, and the ducks,
  fireflies and Mittens' "garden gate" spot moved with it.
- **Sizes:** 5 × 3 (everyone starts here), then 7 × 4 for 600 coins, then 9 × 5 for 1,500, bought in
  that order. Your plot grows to the right and down; every planted tile keeps its row and column.
- **Where to buy:** the noticeboard by the garden gate (it replaces the old garden sign). It lists
  the three sizes, which one is yours, and a Buy button for the next (or how many coins short you
  are). It also explains digging up.
- **Saves:** `plot` is the size you've bought (an index into PLOT_SIZES; absent means the first, so
  old saves are 5 × 3). The garden is stored row by row at that width; the server refuses a garden
  whose length doesn't match its size, and sizes that don't exist. Profiles carry `plot` so
  everyone draws your plot the right size.
- **Offline:** Grandpa Walt has bought the 7 × 4.

**Digging up and potted plants** (so strawberries and tomatoes don't hold a tile forever):

- Face a crop in your plot and press **X** (or right-click it, next to you). The prompt shows a
  second key cap for it: "[E] Water the Tomato · [X] Dig up" (the prompt draws every `[Key]` in its
  text as a key cap, as with "[F] Give a treat" for your pet).
  - A **seed that hasn't sprouted** comes back into its packet.
  - A grown **strawberry or tomato** comes up whole, **potted** (`plant:<crop>` in the inventory),
    and any ripe fruit is picked first.
  - Anything else **unripe** would be lost, so the first X only warns ("Press X again…"); a second
    X within 4 seconds pulls it up. Ripe crops are simply harvested.
  - The tile is left tilled, ready for something else.
- **Potted plants** show in your basket (and as "seeds+pots" on that crop's hotbar slot).
  Chef Rosa buys them (Sell produce tab) for a little more than the seed (30 for strawberry, 36 for
  tomato), or plant one again: with that crop selected, E on empty soil replants the potted plant
  before using a seed. A replanted plant is established, so it starts most of the way to its next
  crop (where a harvested plant regrows from).

## Daily orders from Chef Rosa

- Requests like **"6 tomatoes by tonight for a bonus."**
- A small daily goal with a reward beyond the normal sell price.

Notes: orders can be worked out from the date (and the shared game clock) so everyone sees the same
order that day.

## Cooking

- Crops you grow (and ingredients foraged in the forest: mushrooms, wild berries, herbs) can be
  **cooked into meals.** This links the two halves of the game: the garden supplies the forest,
  and the forest supplies rare ingredients for the kitchen.
- **Where:** at the Community Kitchen, where **Chef Rosa teaches recipes**, and/or at a **stove you
  buy for your room.** New recipes can be rewards for Rosa's daily orders.
- **Meals sell for more than their raw ingredients**, so cooking is worth doing even if you never
  go into the forest.
- What meals do in the forest is described in FOREST.md ("Meals"): they help you survive
  (stamina, light, calm, clarity), never fight. There's no combat in the forest.

Notes: recipes are shared data in `shared/catalog.ts`; meals are inventory items in the save
(`meal:<id>` alongside `seed:` and `crop:`), validated by the server like the rest.

**Built** (garden recipes only; the forest ones arrive with the forest). How it works:

- **Recipes** (`RECIPES` in shared/catalog.ts): each has its ingredients (inventory keys), a sell
  price and a lesson fee. Cooking is instant (a sizzle and a ding) and takes the ingredients from
  your basket.

  | Meal                    | Made from              | Sells for | Ingredients' worth | Lesson |
  | ----------------------- | ---------------------- | --------- | ------------------ | ------ |
  | Radish salad            | 3 radishes             | 45        | 36                 | free   |
  | Garden omelette         | 2 eggs, 1 carrot       | 75        | 56                 | 40     |
  | Vegetable soup          | radish, carrot, tomato | 100       | 72                 | 60     |
  | Carrot cake             | 2 carrots, 1 egg       | 95        | 67                 | 80     |
  | Strawberry jam toast    | 3 strawberries         | 90        | 66                 | 80     |
  | Roasted sunflower seeds | 1 sunflower            | 120       | 90                 | 100    |
  | Pumpkin pie             | 1 pumpkin, 2 eggs      | 260       | 190                | 150    |

  A test checks every meal sells for more than its ingredients. Mushroom broth and herbal tea
  (FOREST.md) need forest ingredients, so they're left out until the forest exists.

- **Chef Rosa teaches:** the Kitchen panel has a **Cook** tab beside Sell produce and Buy seeds.
  It lists every recipe with its ingredients as icons and "have/need" (red when you're short).
  Recipes you know have Cook 1 / Cook all (n); the rest have a **Learn** button for the lesson fee.
  Radish salad is known by everyone, so a new player can cook straight after the introduction's
  first harvest. Learned recipes are `save.recipes` (starter recipes are never stored; the server
  keeps only known, non-starter ids, in catalog order).
- **A stove for your room:** "Little stove" (250 coins) in the Catalog. In your own room, face it
  and press E ("Cook at your stove") to cook the recipes you know; lessons stay at the Kitchen.
  In someone else's room it's just furniture. Its kettle steams now and then.
- **Meals** go in your basket and sell to Chef Rosa (Sell produce tab). Eating them, and what they
  do in the forest, comes with the forest. Rosa's daily orders (not built yet) can reward new
  recipes later.

## Things to collect

- **Rare furniture, pets, outfits.**
- Gives long-term goals beyond money. Some rare items could come from the forest so the two halves
  of the game feed each other (see FOREST.md).
- Pets matter beyond the property: rarely, your pet finds you when you're lost in the forest, and
  it's always safe (FOREST.md, "Your pet").

## Suggested order

1. Introduction
2. Pets, animals on the property (with chickens and eggs), benches
3. Plot upgrades (built), Chef Rosa's daily orders and cooking
4. Board-game tables: Connect 4 and checkers (built), chess later
5. Collectibles, added alongside the others as they're built
