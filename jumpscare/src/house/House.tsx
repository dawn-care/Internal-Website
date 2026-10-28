import { useEffect, useRef, useState, type FormEvent } from "react";
import { playMemory, playWrongAnswer } from "../audio";
import { imageByName } from "../media";
import { startGame, type Focus, type Game } from "./game";
import {
  DOORS,
  ENDING,
  FOG_MESSAGE,
  LOCKED_MESSAGE,
  PAINTINGS,
  RIGHT_ANSWER,
  WRONG_ANSWER,
  isAnswer,
} from "./story";

const TOUCH = window.matchMedia("(pointer: coarse)").matches;
const NOTICE_MS = 2500;
const UNLOCKED_MS = 1500; // how long "You remember" shows before the door opens

type Overlay = { kind: "memory"; key: string } | { kind: "riddle"; key: string } | null;

export default function House({ onJumpscare }: { onJumpscare: (image: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const onJumpscareRef = useRef(onJumpscare);
  const [walked, setWalked] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    onJumpscareRef.current = onJumpscare;
  });

  useEffect(() => {
    const game = startGame(canvasRef.current!, {
      onJumpscare: (image) => onJumpscareRef.current(image),
      onWalk: () => setWalked(true),
      onFocus: setFocus,
      onEnding: () => setEnded(true),
      onInteract: (target) => {
        if (target.kind === "door" && target.key === null) {
          setNotice(LOCKED_MESSAGE);
          return;
        }
        game.pause();
        if (target.kind === "painting") {
          playMemory();
          setOverlay({ kind: "memory", key: target.key });
        } else if (target.kind === "door") {
          setOverlay({ kind: "riddle", key: target.key! });
        }
      },
    });
    gameRef.current = game;
    return () => game.stop();
  }, []);

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

      {!overlay && !ended && focus && focus.kind !== "fog" && (
        <button className="house-prompt" onClick={() => gameRef.current?.interact()}>
          {TOUCH ? "" : "E · "}
          {focus.kind === "painting" ? "Look closer" : "Try the door"}
        </button>
      )}
      {!overlay && !ended && (notice || focus?.kind === "fog") && (
        <p className="house-notice">{notice ?? FOG_MESSAGE}</p>
      )}
      {!walked && (
        <p className="house-hint">
          {TOUCH
            ? "Drag on the left to walk. Drag on the right to look around."
            : "Click to look around. WASD or arrow keys to walk. Hold Shift to hurry. E to look closer."}
        </p>
      )}

      {overlay?.kind === "memory" && <Memory paintingKey={overlay.key} onClose={close} />}
      {overlay?.kind === "riddle" && (
        <Riddle doorKey={overlay.key} onCancel={close} onSolve={() => unlock(overlay.key)} />
      )}
      {ended && <Ending />}
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "KeyE" || e.code === "Escape" || e.code === "Enter") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
