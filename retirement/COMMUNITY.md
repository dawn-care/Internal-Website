# Community: cozy ideas for Sunset Acres

Status: **ideas agreed, not built yet.** These are the additions that make the property worth
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

## Pets

- Probably the best value for the effort.
- You **pick a dog or cat and name it.** It **follows you around**, and **other players can see
  it.**
- It **sleeps in its bed in your room.**
- You can **pet or feed it**, which gives people a small reason to log in each day.

Notes: the pet goes in the save and in presence (so neighbours see it walking behind you). The
existing "Cat (with bed)" furniture could become the pet's bed.

## Animals on the property

- Cheap, and makes the place feel alive: **ducks on the pond, a cat sunning itself, butterflies,
  squirrels.**
- **Chickens that lay eggs you can sell**, so the animals tie into the economy and aren't just
  decoration.

Notes: ambient animals can run in each browser (no syncing needed). Eggs need to work the same way
for everyone, e.g. a coop that gives each player a few eggs per in-game day, like crops grow from
timestamps.

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
