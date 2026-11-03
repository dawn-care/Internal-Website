// The memories on the paintings and the riddles on the doors. Each painting and riddle door
// is placed on the map in map.ts by its key: a lowercase letter for a painting, a digit for
// a door. To add a memory: add an entry here, then put its letter on a wall in the map.

export type Painting = {
  image: string | null; // a file in jumpscare/media, or null for a frame of pure black
  memory: string;
};

export type RiddleDoor = {
  riddle: string;
  answers: string[]; // compared ignoring case, spaces and punctuation
};

export const PAINTINGS: Record<string, Painting> = {
  // The first thing you see when you wake up. Its memory opens door 1.
  a: {
    image: "ashton.jpg",
    memory:
      "I remember I had a buddy that looked like this in college. Ashton was his name. He didn't have hair, did he?",
  },
  b: {
    image: "clown.png",
    memory:
      "I dressed up as a clown for Halloween one year when I was a kid. I got so much candy that night. I didn't look this creepy, though.",
  },
  c: {
    image: null,
    memory: "Black is my favorite color. I remember that now, after looking at this.",
  },
  d: {
    image: "hwkmwnrbfq0h1.jpg",
    memory: "I never went down to the basement in my grandma's house. But I can't remember why.",
  },
  e: {
    image: "scary_woman.png",
    memory:
      "My mom scared me so bad one time when she hid in my room. But what I'm looking at isn't her.",
  },
  // Behind door 1, in the room where the head lives. Its memory opens door 2.
  f: {
    image: "Goblin_shark.png",
    memory:
      "I used to play this game called Blue World with my sister. We found a 30-foot shark called Thanatos. But we never found any goblin sharks. I remember it so clearly. Where am I right now?",
  },
  g: {
    image: "scary-ocean-photos-9-65646c1f021ec.jpg",
    memory:
      "I don't even know what I'm looking at. All I know is it makes me feel sad, and I don't even know why.",
  },
  h: {
    image: "idek.jpg",
    memory:
      "Grandma's last birthday. Everyone said she was laughing. I keep telling myself she was laughing.",
  },
  i: {
    image: "Treisman-Scary-Stories.png",
    memory:
      "Is that... me? I don't remember getting this old. I don't remember getting here at all.",
  },
};

export const DOORS: Record<string, RiddleDoor> = {
  "1": {
    riddle:
      'Someone has scratched words into the wood:\n\n"We shared a dorm, but never a comb.\nWhat was my name?"',
    answers: ["ashton"],
  },
  // The way out of the house. It leads outside, into the fog.
  "2": {
    riddle:
      'Carved under the handle:\n\n"Thirty feet long, it swam through the blue world\nyou shared with your sister.\nWhat did you call it?"',
    answers: ["thanatos"],
  },
};

// The floating head that lives behind door 1.
export const HEAD_IMAGE = "fzi0qw3ahctc1.jpg";

export const LOCKED_MESSAGE = "It's locked. It won't budge.";
export const WRONG_ANSWER = "No... that isn't it.";
export const RIGHT_ANSWER = "You remember. Something unlocks.";
export const FOG_MESSAGE = "The fog won't let you through.";
export const ENDING = ["There's nothing left to remember.", "To be continued..."];

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isAnswer(door: RiddleDoor, guess: string) {
  return door.answers.some((answer) => normalize(answer) === normalize(guess));
}
