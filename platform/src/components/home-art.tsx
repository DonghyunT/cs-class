"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { CodeXml, MousePointer2 } from "lucide-react";

const patterns = [
  {
    name: "커서",
    rows: [
      "000000000",
      "011000000",
      "012100000",
      "012210000",
      "012221000",
      "012222100",
      "011211110",
      "000121000",
      "000011000",
    ],
  },
  {
    name: "반짝임",
    rows: [
      "000030000",
      "000343000",
      "000343000",
      "033444330",
      "344444443",
      "033444330",
      "000343000",
      "000343000",
      "000030000",
    ],
  },
  {
    name: "코드",
    rows: [
      "000000000",
      "000000000",
      "001000300",
      "012000430",
      "120000043",
      "012000430",
      "001000300",
      "000000000",
      "000000000",
    ],
  },
];

// One keyboard target for the canvas; pointer decoration never drives React renders.
export function HomeArt({ paused }: { paused: boolean }) {
  const [pattern, setPattern] = useState(0);
  const board = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(frame.current);
      board.current?.style.removeProperty("--pixel-tilt-x");
      board.current?.style.removeProperty("--pixel-tilt-y");
    }
    return () => cancelAnimationFrame(frame.current);
  }, [paused]);

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (paused || event.pointerType !== "mouse") return;
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--pixel-tilt-x", `${(0.5 - y) * 8}deg`);
      node.style.setProperty("--pixel-tilt-y", `${(x - 0.5) * 8}deg`);
    });
  }

  function reset() {
    cancelAnimationFrame(frame.current);
    board.current?.style.removeProperty("--pixel-tilt-x");
    board.current?.style.removeProperty("--pixel-tilt-y");
  }

  return (
    <div className="home-art">
      <div className="pixel-halo" aria-hidden="true" />
      <button
        ref={board}
        type="button"
        className="pixel-trigger"
        aria-label={`픽셀 모양 바꾸기, 현재 ${patterns[pattern].name}`}
        onClick={() => setPattern((current) => (current + 1) % patterns.length)}
        onPointerMove={move}
        onPointerLeave={reset}
        onBlur={reset}
      >
        <span className="pixel-float">
          <span className="pixel-canvas">
            <span className="pixel-topline" aria-hidden="true">
              <span>
                <i />
                <i />
                <i />
              </span>
              <span>9 × 9</span>
            </span>
            <span className="pixel-grid" aria-hidden="true">
              {patterns[pattern].rows
                .join("")
                .split("")
                .map((color, index) => (
                  <span className="pixel-cell" data-color={color} key={index} />
                ))}
            </span>
            <span className="pixel-bottomline" aria-hidden="true">
              <span>{patterns[pattern].name}</span>
              <span>0{pattern + 1} / 03</span>
            </span>
          </span>
        </span>
      </button>
      <span className="pixel-code" aria-hidden="true">
        <CodeXml strokeWidth={1.7} />
      </span>
      <span className="pixel-bit" aria-hidden="true">
        0<span>1</span>
      </span>
      <span className="pixel-dot" aria-hidden="true" />
      <span className="pixel-hint" aria-hidden="true">
        <MousePointer2 size={13} />
        눌러서 모양 바꾸기
      </span>
      <span className="sr-only" role="status">
        {patterns[pattern].name} 모양
      </span>
    </div>
  );
}
