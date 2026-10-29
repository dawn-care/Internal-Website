import { useCallback, useEffect, useRef, useState } from "react";
import { fetchQuestion, type Question } from "./trivia";
import { randomImage, randomSound } from "./media";

const JUMPSCARE_MS = 3000;

export default function App() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined: no jumpscare showing. A null image or sound means its folder is empty.
  const [jumpscare, setJumpscare] = useState<
    { image: string | null; sound: string | null } | undefined
  >(undefined);
  const loading = useRef(false);

  const loadQuestion = useCallback(async () => {
    // Guards against double loads (React dev mode, fast clicks), which the API rate-limits.
    if (loading.current) return;
    loading.current = true;
    setQuestion(null);
    setSelected(null);
    setError(null);
    try {
      setQuestion(await fetchQuestion());
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
    if (choice !== question.correctAnswer) setJumpscare({ image: randomImage(), sound: randomSound() });
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
          {jumpscare.image === null ? <p>WRONG!</p> : <img src={jumpscare.image} alt="" />}
          {/* Unmounting with the overlay stops the sound after the 3 seconds. */}
          {jumpscare.sound && <audio src={jumpscare.sound} autoPlay />}
        </div>
      )}
    </main>
  );
}
