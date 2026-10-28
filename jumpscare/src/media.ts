import { shuffle } from "./trivia";

// Files are picked up at build time. Restart the dev server after adding or renaming them.
// The house hangs some of these on its walls as paintings (see house/story.ts).
const imageFiles = import.meta.glob("../media/*.{png,jpg,jpeg,gif,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const images = Object.values(imageFiles);

const imagesByName = new Map(
  Object.entries(imageFiles).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1), url]),
);

// The one sound in the jumpscare folder itself, played while an image shows.
const sounds = Object.values(
  import.meta.glob("../*.{mp3,wav,ogg}", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>,
);

export const jumpscareSound: string | null = sounds[0] ?? null;

// Shuffle bag: every image shows once before any repeats. When the bag refills,
// the last image shown is kept off the top so it can't appear twice in a row.
let bag: string[] = [];
let lastShown: string | null = null;

export function randomImage(): string | null {
  if (images.length === 0) return null;
  if (bag.length === 0) {
    bag = shuffle(images);
    if (bag.length > 1 && bag[bag.length - 1] === lastShown) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
  }
  lastShown = bag.pop()!;
  return lastShown;
}

// The URL of a file in media/, by its file name (e.g. "ashton.jpg").
export function imageByName(name: string): string | null {
  return imagesByName.get(name) ?? null;
}
