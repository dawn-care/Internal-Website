// Files are picked up at build time. Restart the dev server after adding or renaming them.
const images = Object.values(
  import.meta.glob("../media/*.{png,jpg,jpeg,gif,webp,svg}", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>,
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

export function randomImage(): string | null {
  if (images.length === 0) return null;
  return images[Math.floor(Math.random() * images.length)];
}
