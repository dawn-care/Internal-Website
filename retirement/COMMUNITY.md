# Community: cozy ideas for Sunset Acres

Status: **being built, in the suggested order.** Built so far: the introduction, a brighter look and feel, pets, and animals on the property. These are the additions that make the property worth
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
- **Following:** the pet trots along your path about two tiles behind you (never closer than 1.4, so you
  don't hide it; if you double back or walk into it, it waits or steps aside, never into a wall), sits (wagging)
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
  gate at the bottom, a path down to the main path) with a red-roofed coop along the top. The
  bench that stood at (7,15) moved to (11,14) to make room for the path. Random trees stay out of
  that corner.
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

Notes: "sitting" is a pose sent with presence. The grounds already have five benches.

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

## Larger plots, as upgrades

- Don't just make every plot bigger: make **expansions something you buy: 5×3, then 7×4, then
  9×5.**
- Gives coins a long-term use.

Notes: the garden today fits 12 plots of 5×3 in a fixed grid. Room for 9×5 plots means a bigger
garden area or a new layout. Saves need the plot size, and the server's save validation must allow
the larger garden.

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

## Things to collect

- **Rare furniture, pets, outfits.**
- Gives long-term goals beyond money. Some rare items could come from the forest so the two halves
  of the game feed each other (see FOREST.md).
- Pets matter beyond the property: rarely, your pet finds you when you're lost in the forest, and
  it's always safe (FOREST.md, "Your pet").

## Plot upgrades

See "Larger plots, as upgrades" above.

## Suggested order

1. Introduction
2. Pets, animals on the property (with chickens and eggs), benches
3. Plot upgrades, Chef Rosa's daily orders and cooking
4. Board-game tables: Connect 4 and checkers, chess later
5. Collectibles, added alongside the others as they're built
