// Category 18 is "Science: Computers". url3986 encoding avoids HTML entities in the text.
const API_URL = "https://opentdb.com/api.php?amount=1&category=18&type=multiple&encode=url3986";

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

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function fetchQuestion(): Promise<Question> {
  const response = await fetch(API_URL);
  const data: ApiResponse = await response.json();

  if (data.response_code === RATE_LIMITED) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return fetchQuestion();
  }
  if (data.response_code !== 0 || data.results.length === 0) {
    throw new Error(`OpenTDB returned response code ${data.response_code}`);
  }

  const result = data.results[0];
  const correctAnswer = decodeURIComponent(result.correct_answer);
  return {
    question: decodeURIComponent(result.question),
    correctAnswer,
    answers: shuffle([correctAnswer, ...result.incorrect_answers.map(decodeURIComponent)]),
  };
}
