// The quiz before the house. Everything here is local, so a new question shows instantly. It
// starts out as harmless facts about memory, then turns to questions about you, where the only
// answer that counts as right is that you can't remember.

const CANT_REMEMBER = "I can't remember";
const FACT_QUESTIONS = 3;

export type Question = {
  question: string;
  correctAnswer: string;
  answers: string[];
};

// The right answer comes first in `answers`; they're shuffled when asked.
const FACTS: { question: string; answers: string[] }[] = [
  {
    question: "Which part of the brain is most important for forming new memories?",
    answers: ["Hippocampus", "Cerebellum", "Medulla", "Occipital lobe"],
  },
  {
    question: "Who first described the \"forgetting curve\"?",
    answers: ["Hermann Ebbinghaus", "Sigmund Freud", "Ivan Pavlov", "B. F. Skinner"],
  },
  {
    question: "About how many items can short-term memory hold, by George Miller's classic estimate?",
    answers: ["Seven, give or take two", "Two", "Twenty", "A hundred"],
  },
  {
    question: "What is it called when you can no longer form new memories?",
    answers: ["Anterograde amnesia", "Retrograde amnesia", "Aphasia", "Synesthesia"],
  },
  {
    question: "What is it called when you lose the memories you already had?",
    answers: ["Retrograde amnesia", "Anterograde amnesia", "Vertigo", "Apraxia"],
  },
  {
    question: "Which writer's madeleine dipped in tea brings back a flood of childhood memories?",
    answers: ["Marcel Proust", "Charles Dickens", "Edgar Allan Poe", "Ernest Hemingway"],
  },
  {
    question: "What is the feeling that you've already lived through this exact moment?",
    answers: ["Déjà vu", "Jamais vu", "Nostalgia", "Vertigo"],
  },
  {
    question: "What are memories thought to be strengthened by, more than anything else here?",
    answers: ["Sleep", "Sugar", "Caffeine", "Loud music"],
  },
  {
    question: "Which psychologist showed people can be convinced of childhood events that never happened?",
    answers: ["Elizabeth Loftus", "Carl Jung", "Carl Rogers", "Noam Chomsky"],
  },
];

// `options` are the wrong answers. "I can't remember" is always added last.
const ABOUT_YOU: { question: string; options: string[] }[] = [
  { question: "What did you have for breakfast this morning?", options: ["Toast", "Eggs", "Cereal"] },
  { question: "What color was the front door of your childhood home?", options: ["Red", "White", "Green"] },
  { question: "What was the name of your first pet?", options: ["Max", "Bella", "Buddy"] },
  { question: "Who was the last person you spoke to?", options: ["A friend", "Family", "A stranger"] },
];

// Always the last question, right before the ones with no answers at all.
const LAST_QUESTION = {
  question: "How did you get here?",
  options: ["I walked", "I drove", "Someone brought me"],
};

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function aboutYou({ question, options }: { question: string; options: string[] }): Question {
  return { question, correctAnswer: CANT_REMEMBER, answers: [...shuffle(options), CANT_REMEMBER] };
}

// A fresh set of questions, with no repeats.
export function createQuiz(): Question[] {
  const facts = shuffle(FACTS)
    .slice(0, FACT_QUESTIONS)
    .map(({ question, answers }) => ({
      question,
      correctAnswer: answers[0],
      answers: shuffle(answers),
    }));
  return [...facts, aboutYou(shuffle(ABOUT_YOU)[0]), aboutYou(LAST_QUESTION)];
}
