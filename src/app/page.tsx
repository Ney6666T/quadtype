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
  "→↓←↑": " ",  // 右回り四角 = スペース
  "→↑←↓": "\b", // 左回り四角 = バックスペース
};

const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  "↑": { x: 0, y: -1 },
  "↓": { x: 0, y: 1 },
  "→": { x: 1, y: 0 },
  "←": { x: -1, y: 0 },
};

const DEFAULT_THRESHOLD = 30;
const DEFAULT_ANGLE_TOLERANCE = 1.5; // 1.0 = 45度、2.0 = より垂直/水平寄り

function getDirection(
  dx: number,
  dy: number,
  threshold: number,
  angleTolerance: number
): Direction | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < threshold && absDy < threshold) return null;

  // angleTolerance倍の差があれば判定（遊びを追加）
  if (absDy > absDx * angleTolerance) {
    return dy < 0 ? "↑" : "↓";
  } else if (absDx > absDy * angleTolerance) {
    return dx > 0 ? "→" : "←";
  }

  return null; // どちらとも言えない場合は判定しない
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
  { title: "4入力", items: [["?", "↓↑↓↑"], ["␣", "→↓←↑"], ["⌫", "→↑←↓"]] },
];

interface LastGestureInfo {
  gesture: Direction[];
  char: string | null;
  isShift: boolean;
  timestamp: number;
}

export default function Home() {
  const [text, setText] = useState("");
  const [currentGesture, setCurrentGesture] = useState<Direction[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isShiftMode, setIsShiftMode] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [angleTolerance, setAngleTolerance] = useState(DEFAULT_ANGLE_TOLERANCE);
  const [showSettings, setShowSettings] = useState(false);
  const [lastGesture, setLastGesture] = useState<LastGestureInfo | null>(null);
  const lastDirection = useRef<Direction | null>(null);
  const gestureRef = useRef<Direction[]>([]);
  const peakPos = useRef({ x: 0, y: 0 }); // 現在の方向での最も遠い位置

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 設定パネル内のクリックは無視
    if ((e.target as HTMLElement).closest("[data-settings]")) return;

    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    peakPos.current = { x: e.clientX, y: e.clientY };
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

      // 最初の方向判定（まだ方向が決まっていない場合）
      if (lastDirection.current === null) {
        const direction = getDirection(dx, dy, threshold, angleTolerance);
        if (direction) {
          lastDirection.current = direction;
          gestureRef.current = [direction];
          setCurrentGesture(gestureRef.current);
          peakPos.current = { x: e.clientX, y: e.clientY };

          if (direction === "↑") {
            setIsShiftMode(true);
          }
        }
        return;
      }

      // 現在の方向に沿ってピーク位置を更新（その軸のみ）
      const currentDir = lastDirection.current;
      const isVertical = currentDir === "↑" || currentDir === "↓";

      // 現在の方向に進んでいるかどうか
      let isAdvancing = false;

      if (isVertical) {
        if (currentDir === "↑" && e.clientY < peakPos.current.y) {
          peakPos.current = { ...peakPos.current, y: e.clientY };
          isAdvancing = true;
        } else if (currentDir === "↓" && e.clientY > peakPos.current.y) {
          peakPos.current = { ...peakPos.current, y: e.clientY };
          isAdvancing = true;
        }
      } else {
        if (currentDir === "→" && e.clientX > peakPos.current.x) {
          peakPos.current = { ...peakPos.current, x: e.clientX };
          isAdvancing = true;
        } else if (currentDir === "←" && e.clientX < peakPos.current.x) {
          peakPos.current = { ...peakPos.current, x: e.clientX };
          isAdvancing = true;
        }
      }

      // 進行中はstartPosも更新（直交方向の累積を防ぐ）
      if (isAdvancing) {
        setStartPos({ x: e.clientX, y: e.clientY });
      }

      // 方向転換の検出
      const turnThreshold = Math.max(threshold * 0.4, 12);
      let newDirection: Direction | null = null;

      if (isVertical) {
        const dyFromPeak = e.clientY - peakPos.current.y;
        const dxFromStart = e.clientX - startPos.x;
        const dyFromStart = Math.abs(e.clientY - startPos.y);

        // 逆方向への戻りを検出
        if (currentDir === "↑" && dyFromPeak > turnThreshold) {
          newDirection = "↓";
        } else if (currentDir === "↓" && dyFromPeak < -turnThreshold) {
          newDirection = "↑";
        }
        // 横方向への転換: 横移動が縦移動より大きい場合のみ
        else if (Math.abs(dxFromStart) > turnThreshold && Math.abs(dxFromStart) > dyFromStart * angleTolerance) {
          newDirection = dxFromStart > 0 ? "→" : "←";
        }
      } else {
        const dxFromPeak = e.clientX - peakPos.current.x;
        const dyFromStart = e.clientY - startPos.y;
        const dxFromStart = Math.abs(e.clientX - startPos.x);

        // 逆方向への戻りを検出
        if (currentDir === "→" && dxFromPeak < -turnThreshold) {
          newDirection = "←";
        } else if (currentDir === "←" && dxFromPeak > turnThreshold) {
          newDirection = "→";
        }
        // 縦方向への転換: 縦移動が横移動より大きい場合のみ
        else if (Math.abs(dyFromStart) > turnThreshold && Math.abs(dyFromStart) > dxFromStart * angleTolerance) {
          newDirection = dyFromStart > 0 ? "↓" : "↑";
        }
      }

      // 新しい方向が検出された場合
      if (newDirection && newDirection !== currentDir) {
        lastDirection.current = newDirection;
        gestureRef.current = [...gestureRef.current, newDirection];
        setCurrentGesture(gestureRef.current);
        // 新しい方向の起点をリセット
        peakPos.current = { x: e.clientX, y: e.clientY };
        setStartPos({ x: e.clientX, y: e.clientY });
      }
    },
    [isDragging, startPos, threshold, angleTolerance]
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
      if (char === "\b") {
        // バックスペース
        setText((prev) => prev.slice(0, -1));
      } else {
        const finalChar = shift ? char.toUpperCase() : char;
        setText((prev) => prev + finalChar);
      }
    }

    // 余韻表示用に最後のジェスチャーを保存
    if (gesture.length > 0) {
      let displayChar = char;
      if (char === " ") displayChar = "␣";
      else if (char === "\b") displayChar = "⌫";
      setLastGesture({
        gesture: [...gesture],
        char: displayChar ? (shift && displayChar.length === 1 && /[a-z]/.test(displayChar) ? displayChar.toUpperCase() : displayChar) : null,
        isShift: shift,
        timestamp: Date.now(),
      });
    }

    setCurrentGesture([]);
    setIsShiftMode(false);
    gestureRef.current = [];
  }, [isDragging]);

  // 余韻表示のフェードアウト
  useEffect(() => {
    if (lastGesture) {
      const timer = setTimeout(() => {
        setLastGesture(null);
      }, 1500); // 1.5秒後に消える
      return () => clearTimeout(timer);
    }
  }, [lastGesture]);

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

  const previewChar = (() => {
    if (currentGesture.length === 0) return null;
    let lookupGesture = currentGesture;
    let shift = false;
    if (currentGesture[0] === "↑") {
      shift = true;
      lookupGesture = currentGesture.slice(1);
    }
    const char = GESTURE_MAP[lookupGesture.join("")];
    if (!char) return null;
    if (char === " ") return "␣";
    if (char === "\b") return "⌫";
    return shift ? char.toUpperCase() : char;
  })();

  // 表示するジェスチャー情報（ドラッグ中 or 余韻）
  const displayGesture = isDragging ? currentGesture : lastGesture?.gesture ?? [];
  const displayChar = isDragging ? previewChar : lastGesture?.char ?? null;
  const displayShift = isDragging ? isShiftMode : lastGesture?.isShift ?? false;
  const showGestureDisplay = isDragging || lastGesture !== null;

  // 余韻のフェードアウト用のopacity
  const gestureOpacity = isDragging ? 1 : lastGesture ? 0.6 : 0;

  return (
    <div
      className="relative flex min-h-screen flex-col select-none overflow-hidden bg-zinc-900 text-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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

      {/* Settings toggle button */}
      <button
        data-settings
        onClick={() => setShowSettings(!showSettings)}
        className="pointer-events-auto absolute right-4 top-4 z-30 rounded-lg bg-zinc-800 p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div
          data-settings
          className="pointer-events-auto absolute right-4 top-14 z-30 w-72 rounded-lg border border-zinc-700 bg-zinc-800/95 p-4 backdrop-blur-sm"
        >
          <h3 className="mb-4 font-bold text-zinc-200">設定</h3>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                移動距離しきい値: {threshold}px
              </label>
              <input
                type="range"
                min="10"
                max="80"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                小さいほど少ない移動で方向判定
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                方向判定の遊び: {angleTolerance.toFixed(1)}
              </label>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={angleTolerance}
                onChange={(e) => setAngleTolerance(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                大きいほど斜め移動を許容（上下左右判定が緩く）
              </p>
            </div>

            <button
              onClick={() => {
                setThreshold(DEFAULT_THRESHOLD);
                setAngleTolerance(DEFAULT_ANGLE_TOLERANCE);
              }}
              className="w-full rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-600"
            >
              デフォルトに戻す
            </button>
          </div>
        </div>
      )}

      {/* Background reference guide */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-auto p-4">
        <div className="grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-3">
          {REFERENCE_DATA.map((section) => (
            <div key={section.title} className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
              <h3 className="mb-2 text-xs font-bold text-blue-400/70">
                {section.title}
              </h3>
              <div className="grid grid-cols-3 gap-1 text-xs">
                {section.items.map(([char, gesture]) => (
                  <div
                    key={char + gesture}
                    className="flex items-center justify-between gap-1 rounded border border-zinc-600/30 bg-zinc-700/30 px-1.5 py-0.5"
                  >
                    <span className="font-bold text-emerald-400/80">{char}</span>
                    <span className="text-zinc-400">{gesture}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
            <h3 className="mb-2 text-xs font-bold text-blue-400/70">シフト</h3>
            <p className="text-xs text-amber-400/70">↑ + パターン = 大文字</p>
          </div>
        </div>
      </div>

      {/* Current gesture display in center */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div
          className="flex flex-col items-center gap-4 transition-opacity duration-500"
          style={{ opacity: gestureOpacity }}
        >
          {showGestureDisplay && (
            <>
              {/* Direction indicator */}
              <div className="relative h-40 w-40">
                {/* Center dot */}
                <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-600" />

                {/* Direction arrows */}
                {(["↑", "↓", "→", "←"] as Direction[]).map((dir) => {
                  const vec = DIRECTION_VECTORS[dir];
                  const isActive = displayGesture[displayGesture.length - 1] === dir;
                  const wasUsed = displayGesture.includes(dir);
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
                  {displayGesture.length > 0 && (
                    <path
                      d={(() => {
                        let path = "M 80 80";
                        let x = 80,
                          y = 80;
                        for (const dir of displayGesture) {
                          const vec = DIRECTION_VECTORS[dir];
                          x += vec.x * 30;
                          y += vec.y * 30;
                          path += ` L ${x} ${y}`;
                        }
                        return path;
                      })()}
                      stroke={displayShift ? "#f59e0b" : "#3b82f6"}
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
                    displayShift ? "text-amber-400" : "text-blue-400"
                  }`}
                >
                  {displayGesture.join("") || "..."}
                </div>
                {displayShift && (
                  <div className="rounded bg-amber-500/20 px-2 py-1 text-sm text-amber-400">
                    SHIFT
                  </div>
                )}
                {displayChar && (
                  <div className="mt-2 text-6xl font-bold text-green-400">
                    {displayChar}
                  </div>
                )}
              </div>
            </>
          )}

          {!showGestureDisplay && (
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
