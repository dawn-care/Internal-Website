import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { pauseAudio, playMemory, playPage, playWrongAnswer, resumeAudio } from "../audio";
import { imageByName } from "../media";
import { startGame, type Focus, type Game } from "./game";
import {
  DOORS,
  ENDING,
  FOG_MESSAGE,
  JOURNALS,
  LOCKED_MESSAGE,
  PAINTINGS,
  RIGHT_ANSWER,
  WRONG_ANSWER,
  isAnswer,
} from "./story";

const TOUCH = window.matchMedia("(pointer: coarse)").matches;
const NOTICE_MS = 2500;
const UNLOCKED_MS = 1500; // how long "You remember" shows before the door opens

type Overlay =
  | { kind: "memory"; key: string }
  | { kind: "riddle"; key: string }
  | { kind: "journal"; key: string }
  | null;

const CONTROLS = TOUCH
  ? "Drag on the left to walk. Drag on the right to look around. Tap the prompts."
  : "Click to look around. WASD or arrow keys to walk. Hold Shift to hurry. E to look closer. P to pause.";

export default function House({ onJumpscare }: { onJumpscare: (image: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const onJumpscareRef = useRef(onJumpscare);
  const [walked, setWalked] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const overlayRef = useRef<Overlay>(null);

  useEffect(() => {
    onJumpscareRef.current = onJumpscare;
    overlayRef.current = overlay;
  });

  // Something being read has already frozen the game, and P might be a letter in a riddle.
  const togglePause = useCallback(() => {
    if (overlayRef.current) return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) {
      gameRef.current?.pause();
      pauseAudio();
    } else {
      resumeAudio();
      gameRef.current?.resume();
    }
  }, []);

  useEffect(() => {
    const game = startGame(canvasRef.current!, {
      onJumpscare: (image) => onJumpscareRef.current(image),
      onWalk: () => setWalked(true),
      onFocus: setFocus,
      onEnding: () => setEnded(true),
      onPauseKey: togglePause,
      onInteract: (target) => {
        if (target.kind === "door" && target.key === null) {
          setNotice(LOCKED_MESSAGE);
          return;
        }
        game.pause();
        if (target.kind === "painting") {
          playMemory();
          setOverlay({ kind: "memory", key: target.key });
        } else if (target.kind === "journal") {
          playPage();
          setOverlay({ kind: "journal", key: target.key });
        } else if (target.kind === "door") {
          setOverlay({ kind: "riddle", key: target.key! });
        }
      },
    });
    gameRef.current = game;
    return () => game.stop();
  }, [togglePause]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function close() {
    setOverlay(null);
    gameRef.current?.resume();
  }

  function unlock(key: string) {
    close();
    gameRef.current?.openDoor(key);
  }

  return (
    <div className="house">
      <canvas ref={canvasRef} />

      {!overlay && !ended && !paused && (
        <button className="house-pause" onClick={togglePause}>
          {TOUCH ? "Pause" : "Pause (P)"}
        </button>
      )}
      {!overlay && !ended && focus && focus.kind !== "fog" && (
        <button className="house-prompt" onClick={() => gameRef.current?.interact()}>
          {TOUCH ? "" : "E · "}
          {focus.kind === "painting" && "Look closer"}
          {focus.kind === "door" && "Try the door"}
          {focus.kind === "journal" && "Read the journal"}
          {focus.kind === "stairs" && (focus.key === "down" ? "Go down the stairs" : "Go back up")}
        </button>
      )}
      {!overlay && !ended && (notice || focus?.kind === "fog") && (
        <p className="house-notice">{notice ?? FOG_MESSAGE}</p>
      )}
      {!walked && (
        <p className="house-hint">{CONTROLS}</p>
      )}

      {overlay?.kind === "memory" && <Memory paintingKey={overlay.key} onClose={close} />}
      {overlay?.kind === "journal" && <Journal page={Number(overlay.key)} onClose={close} />}
      {overlay?.kind === "riddle" && (
        <Riddle doorKey={overlay.key} onCancel={close} onSolve={() => unlock(overlay.key)} />
      )}
      {paused && <PauseMenu onResume={togglePause} />}
      {ended && <Ending />}
    </div>
  );
}

function PauseMenu({ onResume }: { onResume: () => void }) {
  return (
    <div className="house-overlay" role="dialog" aria-label="Paused">
      <div className="house-card">
        <h2 className="pause-title">Paused</h2>
        <p className="pause-controls">{CONTROLS}</p>
        <button onClick={onResume} autoFocus>
          {TOUCH ? "Resume" : "Resume (P)"}
        </button>
      </div>
    </div>
  );
}

// Closing something you're reading from the keyboard.
function useCloseKeys(onClose: () => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "KeyE" || e.code === "Escape" || e.code === "Enter") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
}

// A single torn-out page.
function Journal({ page, onClose }: { page: number; onClose: () => void }) {
  useCloseKeys(onClose);
  return (
    <div className="house-overlay" role="dialog" aria-label="A journal page">
      <div className="journal-page">
        <p>{JOURNALS[page]}</p>
        <button onClick={onClose}>{TOUCH ? "Close" : "Close (E)"}</button>
      </div>
    </div>
  );
}

// Where the story stops, for now.
function Ending() {
  return (
    <div className="house-ending" role="dialog" aria-label="The end">
      {ENDING.map((line, i) => (
        <p key={line} style={{ animationDelay: `${3 + i * 2.5}s` }}>
          {line}
        </p>
      ))}
      <button style={{ animationDelay: `${3 + ENDING.length * 2.5}s` }} onClick={() => location.reload()}>
        Wake up
      </button>
    </div>
  );
}

function Memory({ paintingKey, onClose }: { paintingKey: string; onClose: () => void }) {
  const painting = PAINTINGS[paintingKey];
  const image = painting.image ? imageByName(painting.image) : null;
  useCloseKeys(onClose);

  return (
    <div className="house-overlay" role="dialog" aria-label="A memory">
      <div className="house-card">
        {image ? (
          <img className="memory-image" src={image} alt="" />
        ) : (
          <div className="memory-image memory-blank" aria-hidden="true" />
        )}
        <p className="memory-text">{painting.memory}</p>
        <button onClick={onClose}>{TOUCH ? "Close" : "Close (E)"}</button>
      </div>
    </div>
  );
}

function Riddle({
  doorKey,
  onCancel,
  onSolve,
}: {
  doorKey: string;
  onCancel: () => void;
  onSolve: () => void;
}) {
  const door = DOORS[doorKey];
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<"wrong" | "right" | null>(null);
  const onSolveRef = useRef(onSolve);

  useEffect(() => {
    onSolveRef.current = onSolve;
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (result !== "right") return;
    const timer = setTimeout(() => onSolveRef.current(), UNLOCKED_MS);
    return () => clearTimeout(timer);
  }, [result]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (result === "right" || !guess.trim()) return;
    if (isAnswer(door, guess)) {
      setResult("right");
    } else {
      setResult("wrong");
      playWrongAnswer();
    }
  }

  return (
    <div className="house-overlay" role="dialog" aria-label="A locked door">
      <form className="house-card" onSubmit={submit}>
        <p className="riddle-text">{door.riddle}</p>
        <input
          value={guess}
          onChange={(e) => {
            setGuess(e.target.value);
            if (result === "wrong") setResult(null);
          }}
          aria-label="Your answer"
          placeholder="Remember..."
          autoComplete="off"
          autoFocus
          disabled={result === "right"}
        />
        {result && <p className={`riddle-result ${result}`}>{result === "right" ? RIGHT_ANSWER : WRONG_ANSWER}</p>}
        <div className="riddle-buttons">
          <button type="button" onClick={onCancel} disabled={result === "right"}>
            Walk away
          </button>
          <button type="submit" disabled={result === "right"}>
            Answer
          </button>
        </div>
      </form>
    </div>
  );
}
