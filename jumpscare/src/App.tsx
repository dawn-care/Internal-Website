import { useCallback, useEffect, useRef, useState } from "react";
import { nextQuestion, takeQueuedQuestion, type Question } from "./trivia";
import { jumpscareSound, randomImage } from "./media";
import { startHeartbeat, unlockAudio } from "./audio";
import House from "./house/House";

const JUMPSCARE_MS = 3000;
// After this many real questions, the quiz stops being a quiz.
const TRIVIA_QUESTIONS = 5;
// How long "Wrong." stays up before the next question.
const LIFE_WRONG_MS = 3000;
// How long the unanswerable question stays up before you wake up in the house.
const MATTER_MS = 5000;
const BLACKOUT_MS = 1500;
const BLANK_ANSWERS = 4;

// trivia: real questions. life: "Can you remember your life?", where every (blank) answer is
// wrong. matter: "Can you remember why you matter?", where nothing can be clicked. house: walk.
type Phase = "trivia" | "life" | "matter" | "house";

// In dev, localhost:5173/game/#house skips straight to the house.
const START_PHASE: Phase = import.meta.env.DEV && location.hash === "#house" ? "house" : "trivia";

export default function App() {
  const [phase, setPhase] = useState<Phase>(START_PHASE);
  const [answered, setAnswered] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [lifeChoice, setLifeChoice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only the house has jumpscares. undefined: none showing. null: showing, but there's no image.
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
    if (START_PHASE === "trivia") loadQuestion();
  }, [loadQuestion]);

  useEffect(() => {
    if (jumpscare === undefined) return;
    const timer = setTimeout(() => setJumpscare(undefined), JUMPSCARE_MS);
    return () => clearTimeout(timer);
  }, [jumpscare]);

  // The page slowly goes dark once the questions stop being trivia.
  useEffect(() => {
    document.body.classList.toggle("forgetting", phase !== "trivia");
  }, [phase]);

  useEffect(() => {
    if (lifeChoice === null) return;
    const timer = setTimeout(() => setPhase("matter"), LIFE_WRONG_MS);
    return () => clearTimeout(timer);
  }, [lifeChoice]);

  useEffect(() => {
    if (phase !== "matter") return;
    const stopHeartbeat = startHeartbeat(MATTER_MS / 1000);
    const timer = setTimeout(() => setPhase("house"), MATTER_MS);
    return () => {
      clearTimeout(timer);
      stopHeartbeat();
    };
  }, [phase]);

  function answer(choice: string) {
    if (!question || selected) return;
    unlockAudio();
    setSelected(choice);
    setAnswered((count) => count + 1);
  }

  function next() {
    if (answered >= TRIVIA_QUESTIONS) setPhase("life");
    else loadQuestion();
  }

  function answerLife(choice: number) {
    if (lifeChoice !== null) return;
    unlockAudio();
    setLifeChoice(choice);
  }

  function answerClass(choice: string) {
    if (!selected || !question) return "answer";
    if (choice === question.correctAnswer) return "answer correct";
    if (choice === selected) return "answer wrong";
    return "answer";
  }

  const jumpscareOverlay = jumpscare !== undefined && (
    <div className="jumpscare">
      {jumpscare === null ? <p>WRONG!</p> : <img src={jumpscare} alt="" />}
      {/* Unmounting with the overlay stops the sound after the 3 seconds. */}
      {jumpscareSound && <audio src={jumpscareSound} autoPlay />}
    </div>
  );

  if (phase === "house") {
    return (
      <>
        <House onJumpscare={(image) => setJumpscare(image ?? randomImage())} />
        {jumpscareOverlay}
      </>
    );
  }

  return (
    <main>
      <h1>Computer Trivia</h1>

      {phase === "trivia" && error && (
        <div className="card">
          <p>{error}</p>
          <button onClick={loadQuestion}>Try again</button>
        </div>
      )}

      {phase === "trivia" && !error && !question && <p>Loading question...</p>}

      {phase === "trivia" && question && (
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
              <button onClick={next}>Next question</button>
            </>
          )}
        </div>
      )}

      {phase === "life" && (
        <div className="card">
          <p className="question">Can you remember your life?</p>
          <BlankAnswers selected={lifeChoice} onPick={answerLife} />
          {lifeChoice !== null && <p>Wrong.</p>}
        </div>
      )}

      {phase === "matter" && (
        <>
          <div className="card">
            <p className="question">Can you remember why you matter?</p>
            <BlankAnswers selected={null} />
          </div>
          <div className="blackout" style={{ animationDelay: `${MATTER_MS - BLACKOUT_MS}ms` }} />
        </>
      )}
    </main>
  );
}

// Answer buttons with nothing written on them. Without onPick, none of them can be clicked.
function BlankAnswers({
  selected,
  onPick,
}: {
  selected: number | null;
  onPick?: (choice: number) => void;
}) {
  return (
    <div className="answers">
      {Array.from({ length: BLANK_ANSWERS }, (_, i) => (
        <button
          key={i}
          className={i === selected ? "answer wrong" : "answer"}
          onClick={() => onPick?.(i)}
          disabled={!onPick || selected !== null}
          aria-label="Blank answer"
        >
          {" "}
        </button>
      ))}
    </div>
  );
}
