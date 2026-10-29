import { shuffle } from "./trivia";

// Files are picked up at build time. Restart the dev server after adding or renaming them.
const images = Object.values(
  import.meta.glob("../media/*.{png,jpg,jpeg,gif,webp,svg}", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>,
);

// Played while an image shows.
const sounds = Object.values(
  import.meta.glob("../sounds/*.{mp3,wav,ogg}", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>,
);

// Shuffle bag: every item comes up once before any repeats. When the bag refills,
// the last item picked is kept off the top so it can't come up twice in a row.
function shuffleBag(items: string[]): () => string | null {
  let bag: string[] = [];
  let last: string | null = null;
  return () => {
    if (items.length === 0) return null;
    if (bag.length === 0) {
      bag = shuffle(items);
      if (bag.length > 1 && bag[bag.length - 1] === last) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    last = bag.pop()!;
    return last;
  };
}

export const randomImage = shuffleBag(images);
export const randomSound = shuffleBag(sounds);
