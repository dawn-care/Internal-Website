// Category 18 is "Science: Computers". url3986 encoding avoids HTML entities in the text.
const API_URL = "https://opentdb.com/api.php?category=18&type=multiple&encode=url3986";

// Questions kept ready in the background so the next one shows without waiting.
const QUEUE_SIZE = 3;

// The API allows one request every 5 seconds per IP and answers code 5 when that's exceeded.
const RATE_LIMITED = 5;
const RETRY_DELAY_MS = 5000;

export type Question = {
  question: string;
  correctAnswer: string;
  answers: string[];
};

type ApiResponse = {
  response_code: number;
  results: {
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }[];
};

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchQuestions(amount: number): Promise<Question[]> {
  const response = await fetch(`${API_URL}&amount=${amount}`);
  const data: ApiResponse = await response.json();

  if (data.response_code === RATE_LIMITED) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return fetchQuestions(amount);
  }
  if (data.response_code !== 0 || data.results.length === 0) {
    throw new Error(`OpenTDB returned response code ${data.response_code}`);
  }

  return data.results.map((result) => {
    const correctAnswer = decodeURIComponent(result.correct_answer);
    return {
      question: decodeURIComponent(result.question),
      correctAnswer,
      answers: shuffle([correctAnswer, ...result.incorrect_answers.map(decodeURIComponent)]),
    };
  });
}

const queue: Question[] = [];
// Callers of nextQuestion() waiting on an empty queue; refills fetch enough for them too.
let waiting = 0;
// At most one request in flight, since the API rate-limits.
let refilling: Promise<void> | null = null;

async function fillQueue(): Promise<void> {
  while (queue.length < QUEUE_SIZE + waiting) {
    queue.push(...(await fetchQuestions(QUEUE_SIZE + waiting - queue.length)));
  }
}

function refill(): Promise<void> {
  // .finally() always runs asynchronously, so it clears `refilling` only after it's set,
  // even when the queue is already full and fillQueue() finishes immediately.
  refilling ??= fillQueue().finally(() => {
    refilling = null;
  });
  return refilling;
}

// Returns a ready question without waiting, or undefined if none is queued yet.
export function takeQueuedQuestion(): Question | undefined {
  const question = queue.shift();
  // A failed background refill is retried by the next caller that finds the queue empty.
  refill().catch(() => {});
  return question;
}

export async function nextQuestion(): Promise<Question> {
  waiting++;
  try {
    while (queue.length === 0) await refill();
  } finally {
    waiting--;
  }
  return takeQueuedQuestion()!;
}
