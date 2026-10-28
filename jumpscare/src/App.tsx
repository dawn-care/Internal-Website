import { useCallback, useEffect, useRef, useState } from "react";
import { nextQuestion, takeQueuedQuestion, type Question } from "./trivia";
import { jumpscareSound, randomImage } from "./media";

const JUMPSCARE_MS = 3000;

export default function App() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined: no jumpscare showing. null: showing, but the media folder has no images.
  const [jumpscare, setJumpscare] = useState<string | null | undefined>(undefined);
  const loading = useRef(false);

  const loadQuestion = useCallback(async () => {
    // Guards against double loads (React dev mode, fast clicks), which the API rate-limits.
    if (loading.current) return;
    setSelected(null);
    setError(null);
    // Usually a question is already queued, so swap it in without a loading state.
    const queued = takeQueuedQuestion();
    if (queued) {
      setQuestion(queued);
      return;
    }
    loading.current = true;
    setQuestion(null);
    try {
      setQuestion(await nextQuestion());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load a question");
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  useEffect(() => {
    if (jumpscare === undefined) return;
    const timer = setTimeout(() => setJumpscare(undefined), JUMPSCARE_MS);
    return () => clearTimeout(timer);
  }, [jumpscare]);

  function answer(choice: string) {
    if (!question || selected) return;
    setSelected(choice);
    if (choice !== question.correctAnswer) setJumpscare(randomImage());
  }

  function answerClass(choice: string) {
    if (!selected || !question) return "answer";
    if (choice === question.correctAnswer) return "answer correct";
    if (choice === selected) return "answer wrong";
    return "answer";
  }

  return (
    <main>
      <h1>Computer Trivia</h1>

      {error && (
        <div className="card">
          <p>{error}</p>
          <button onClick={loadQuestion}>Try again</button>
        </div>
      )}

      {!error && !question && <p>Loading question...</p>}

      {question && (
        <div className="card">
          <p className="question">{question.question}</p>
          <div className="answers">
            {question.answers.map((choice) => (
              <button
                key={choice}
                className={answerClass(choice)}
                onClick={() => answer(choice)}
                disabled={selected !== null}
              >
                {choice}
              </button>
            ))}
          </div>
          {selected && (
            <>
              <p>{selected === question.correctAnswer ? "Correct!" : "Wrong!"}</p>
              <button onClick={loadQuestion} disabled={jumpscare !== undefined}>
                Next question
              </button>
            </>
          )}
        </div>
      )}

      {jumpscare !== undefined && (
        <div className="jumpscare">
          {jumpscare === null ? <p>WRONG!</p> : <img src={jumpscare} alt="" />}
          {/* Unmounting with the overlay stops the sound after the 3 seconds. */}
          {jumpscareSound && <audio src={jumpscareSound} autoPlay />}
        </div>
      )}
    </main>
  );
}
