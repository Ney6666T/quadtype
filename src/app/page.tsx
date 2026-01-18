"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type Direction = "↑" | "↓" | "→" | "←";

const GESTURE_MAP: Record<string, string> = {
  // 1入力
  "↓": "a",
  "→": "i",
  "←": "u",
  // 2入力
  "↓↑": "e",
  "↓→": "o",
  "↓←": "n",
  "→↑": "k",
  "→↓": "s",
  "→←": "h",
  "←↑": "m",
  "←↓": "t",
  "←→": "r",
  // 3入力 - 子音（↓始まり）
  "↓↑↓": "y",
  "↓↑→": "w",
  "↓↑←": "g",
  "↓→↑": "f",
  "↓→↓": "z",
  "↓→←": "b",
  "↓←↑": "d",
  "↓←↓": "j",
  "↓←→": "p",
  // 3入力 - 数字（→始まり）
  "→↑↓": "1",
  "→↑→": "2",
  "→↑←": "3",
  "→↓↑": "4",
  "→↓→": "5",
  "→↓←": "6",
  "→←↑": "7",
  "→←↓": "8",
  "→←→": "9",
  // 3入力 - その他（←始まり）
  "←↑↓": "0",
  "←↑→": "c",
  "←↑←": "l",
  "←↓↑": "v",
  "←↓→": "x",
  "←↓←": "q",
  "←→↑": ",",
  "←→↓": ".",
  "←→←": "!",
  // 4入力
  "↓↑↓↑": "?",
};

const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  "↑": { x: 0, y: -1 },
  "↓": { x: 0, y: 1 },
  "→": { x: 1, y: 0 },
  "←": { x: -1, y: 0 },
};

const THRESHOLD = 30;

function getDirection(dx: number, dy: number): Direction | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < THRESHOLD && absDy < THRESHOLD) return null;

  if (absDy > absDx) {
    return dy < 0 ? "↑" : "↓";
  } else {
    return dx > 0 ? "→" : "←";
  }
}

const REFERENCE_DATA = [
  { title: "1入力", items: [["A", "↓"], ["I", "→"], ["U", "←"]] },
  {
    title: "2入力",
    items: [
      ["E", "↓↑"], ["O", "↓→"], ["N", "↓←"],
      ["K", "→↑"], ["S", "→↓"], ["H", "→←"],
      ["M", "←↑"], ["T", "←↓"], ["R", "←→"],
    ],
  },
  {
    title: "3入力 子音",
    items: [
      ["Y", "↓↑↓"], ["W", "↓↑→"], ["G", "↓↑←"],
      ["F", "↓→↑"], ["Z", "↓→↓"], ["B", "↓→←"],
      ["D", "↓←↑"], ["J", "↓←↓"], ["P", "↓←→"],
    ],
  },
  {
    title: "3入力 数字",
    items: [
      ["1", "→↑↓"], ["2", "→↑→"], ["3", "→↑←"],
      ["4", "→↓↑"], ["5", "→↓→"], ["6", "→↓←"],
      ["7", "→←↑"], ["8", "→←↓"], ["9", "→←→"],
    ],
  },
  {
    title: "3入力 その他",
    items: [
      ["0", "←↑↓"], ["C", "←↑→"], ["L", "←↑←"],
      ["V", "←↓↑"], ["X", "←↓→"], ["Q", "←↓←"],
      [",", "←→↑"], [".", "←→↓"], ["!", "←→←"],
    ],
  },
  { title: "4入力", items: [["?", "↓↑↓↑"]] },
];

export default function Home() {
  const [text, setText] = useState("");
  const [currentGesture, setCurrentGesture] = useState<Direction[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isShiftMode, setIsShiftMode] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const lastDirection = useRef<Direction | null>(null);
  const gestureRef = useRef<Direction[]>([]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    setCurrentGesture([]);
    setIsShiftMode(false);
    lastDirection.current = null;
    gestureRef.current = [];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      setCurrentPos({ x: e.clientX, y: e.clientY });

      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      const direction = getDirection(dx, dy);

      if (direction && direction !== lastDirection.current) {
        lastDirection.current = direction;
        gestureRef.current = [...gestureRef.current, direction];
        setCurrentGesture(gestureRef.current);

        if (gestureRef.current.length === 1 && direction === "↑") {
          setIsShiftMode(true);
        }

        setStartPos({ x: e.clientX, y: e.clientY });
      }
    },
    [isDragging, startPos]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    const gesture = gestureRef.current;
    let lookupGesture = gesture;
    let shift = false;

    if (gesture.length > 0 && gesture[0] === "↑") {
      shift = true;
      lookupGesture = gesture.slice(1);
    }

    const gestureKey = lookupGesture.join("");
    const char = GESTURE_MAP[gestureKey];

    if (char) {
      const finalChar = shift ? char.toUpperCase() : char;
      setText((prev) => prev + finalChar);
    }

    setCurrentGesture([]);
    setIsShiftMode(false);
    gestureRef.current = [];
  }, [isDragging]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      setText((prev) => prev.slice(0, -1));
    } else if (e.key === " ") {
      setText((prev) => prev + " ");
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        setText((prev) => prev.slice(0, -1));
        e.preventDefault();
      } else if (e.key === " ") {
        setText((prev) => prev + " ");
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const gestureDisplay = currentGesture.join("");
  const previewChar = (() => {
    if (currentGesture.length === 0) return null;
    let lookupGesture = currentGesture;
    let shift = false;
    if (currentGesture[0] === "↑") {
      shift = true;
      lookupGesture = currentGesture.slice(1);
    }
    const char = GESTURE_MAP[lookupGesture.join("")];
    if (char) return shift ? char.toUpperCase() : char;
    return null;
  })();

  return (
    <div
      className="relative flex min-h-screen flex-col select-none overflow-hidden bg-zinc-900 text-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ touchAction: "none" }}
    >
      {/* Input display at top */}
      <div className="pointer-events-none relative z-20 px-4 pt-4">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/90 px-4 py-3 backdrop-blur-sm">
            <div className="min-h-8 font-mono text-xl break-all">
              {text || <span className="text-zinc-500">ドラッグで入力...</span>}
              <span className="animate-pulse">|</span>
            </div>
          </div>
          <p className="mt-2 text-center text-sm text-zinc-500">
            スペースキー: 空白 / Backspace: 削除
          </p>
        </div>
      </div>

      {/* Background reference guide */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-auto p-4">
        <div className="grid max-w-5xl grid-cols-2 gap-4 opacity-30 md:grid-cols-3">
          {REFERENCE_DATA.map((section) => (
            <div key={section.title} className="rounded-lg bg-zinc-800/50 p-3">
              <h3 className="mb-2 text-xs font-bold text-zinc-400">
                {section.title}
              </h3>
              <div className="grid grid-cols-3 gap-1 text-xs">
                {section.items.map(([char, gesture]) => (
                  <div
                    key={char + gesture}
                    className="flex items-center justify-between gap-1 rounded bg-zinc-700/50 px-1.5 py-0.5"
                  >
                    <span className="font-bold text-zinc-300">{char}</span>
                    <span className="text-zinc-500">{gesture}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <h3 className="mb-2 text-xs font-bold text-zinc-400">シフト</h3>
            <p className="text-xs text-zinc-500">↑ + パターン = 大文字</p>
          </div>
        </div>
      </div>

      {/* Current gesture display in center */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {isDragging && (
            <>
              {/* Direction indicator */}
              <div className="relative h-40 w-40">
                {/* Center dot */}
                <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-600" />

                {/* Direction arrows */}
                {(["↑", "↓", "→", "←"] as Direction[]).map((dir) => {
                  const vec = DIRECTION_VECTORS[dir];
                  const isActive = currentGesture[currentGesture.length - 1] === dir;
                  const wasUsed = currentGesture.includes(dir);
                  return (
                    <div
                      key={dir}
                      className={`absolute flex items-center justify-center text-4xl transition-all duration-150 ${
                        isActive
                          ? "scale-150 text-blue-400"
                          : wasUsed
                            ? "text-zinc-400"
                            : "text-zinc-600"
                      }`}
                      style={{
                        left: `calc(50% + ${vec.x * 50}px)`,
                        top: `calc(50% + ${vec.y * 50}px)`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {dir}
                    </div>
                  );
                })}

                {/* Gesture trail line */}
                <svg className="absolute inset-0 h-full w-full overflow-visible">
                  {currentGesture.length > 0 && (
                    <path
                      d={(() => {
                        let path = "M 80 80";
                        let x = 80,
                          y = 80;
                        for (const dir of currentGesture) {
                          const vec = DIRECTION_VECTORS[dir];
                          x += vec.x * 30;
                          y += vec.y * 30;
                          path += ` L ${x} ${y}`;
                        }
                        return path;
                      })()}
                      stroke={isShiftMode ? "#f59e0b" : "#3b82f6"}
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>

              {/* Gesture sequence display */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`text-5xl font-bold tracking-wider ${
                    isShiftMode ? "text-amber-400" : "text-blue-400"
                  }`}
                >
                  {gestureDisplay || "..."}
                </div>
                {isShiftMode && (
                  <div className="rounded bg-amber-500/20 px-2 py-1 text-sm text-amber-400">
                    SHIFT
                  </div>
                )}
                {previewChar && (
                  <div className="mt-2 text-6xl font-bold text-green-400">
                    {previewChar}
                  </div>
                )}
              </div>
            </>
          )}

          {!isDragging && (
            <div className="text-center text-zinc-500">
              <p className="text-lg">画面をドラッグして入力</p>
              <p className="mt-1 text-sm">
                マウスを押しながら方向を変えると文字が入力されます
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live cursor position indicator when dragging */}
      {isDragging && (
        <div
          className="pointer-events-none absolute z-30 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-400 bg-blue-400/20"
          style={{ left: currentPos.x, top: currentPos.y }}
        />
      )}
    </div>
  );
}
