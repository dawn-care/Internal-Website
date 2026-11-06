// The memories on the paintings and the riddles on the doors. Each painting and riddle door
// is placed on the map in map.ts by its key: a lowercase letter for a painting, a digit for
// a door. To add a memory: add an entry here, then put its letter on a wall in the map.

export type Painting = {
  image: string | null; // a file in jumpscare/media, or null for a frame of pure black
  memory: string;
  stone?: boolean; // hangs on the basement's stone instead of wallpaper
};

export type RiddleDoor = {
  riddle: string;
  answers: string[]; // compared ignoring case, spaces and punctuation
  stairs?: boolean; // opens onto stairs down to the basement
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
  // In the basement behind door 1, past the statue. Its memory opens door 2.
  f: {
    stone: true,
    image: "Goblin_shark.png",
    memory:
      "I used to play this game called Blue World with my sister. We found a 30-foot shark called Thanatos. But we never found any goblin sharks. I remember it so clearly. Where am I right now?",
  },
  l: {
    stone: true,
    image: "Mandela_Catalogue.png",
    memory:
      "I made it to the third step once, before I ran back up. Grandma laughed and laughed. She said there was nothing down here to be scared of. So who is this?",
  },
  // In the east wing behind door 2, where the pale thing lives. How to live with it.
  k: {
    image: "scary_face.png",
    memory:
      "Dad told me what to do if a strange dog ever followed me home. Don't run. Don't walk up to it. Stand still and let it smell you until it gets bored. Why am I remembering that now?",
  },
  // In the east wing's far room. Its memory opens the double door.
  j: {
    image: "images (1).jpeg",
    memory:
      "This isn't her. But it's how her face looked at the end, in the dark of that hallway. She never once called me by my name. \"Minnow,\" she'd say. \"Come down here, Minnow.\"",
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
    stairs: true,
  },
  // Leads to the east wing.
  "2": {
    riddle:
      'Carved under the handle:\n\n"Thirty feet long, it swam through the blue world\nyou shared with your sister.\nWhat did you call it?"',
    answers: ["thanatos"],
  },
  // The way out of the house, into the fog. The answer is behind door 2, so you find this one
  // early and have to come back to it.
  "3": {
    riddle:
      'Carved across both doors:\n\n"She never once called you by your name.\nWhat did she call you?"',
    answers: ["minnow"],
  },
};

// One page each, on the J cells of the map, in order reading left to right, top to bottom.
// All placeholder for now.
export const JOURNALS = [
  "I found this notebook on the table. The handwriting is mine, I think. It says I've been here before. It says not to trust the clock.\n\nI can't remember writing any of it.",
  "Someone has been rocking in that chair. I lie awake and listen to it. In the morning it's still, and I can't remember whose chair it was.\n\nThere's a dent in the bed that isn't mine.",
  "The windows only ever show the fog and the water. I asked the man in the hallway how long I've been here. He didn't answer.\n\nI don't think there's a man in the hallway.",
  "I tried the big doors again. Someone carved a question into them, and it's meant for me, and I don't know the answer.\n\nI used to know what she called me. I'll write it here when I remember.\n\n\n",
  "She was praying when I came down here. She's always praying. I turned around to look for the stairs, and when I turned back she wasn't praying anymore.\n\nKeep the light on her. Do not look away from her.",
  "The webs hold you back. They don't hold her back.\n\nGrandma said there was nothing down here to be scared of. If the flashlight goes, run. If you can hear her running, she isn't where you're looking.",
];

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
