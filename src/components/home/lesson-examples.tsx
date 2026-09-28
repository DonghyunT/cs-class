"use client";

import { useState } from "react";
import { Check, Lightbulb, RotateCcw } from "lucide-react";

export function ConceptExample() {
  const [on, setOn] = useState(true);
  return (
    <>
      <div className="lesson-panel-heading">
        <span className="landing-badge">개념학습</span>
        <h3>컴퓨터가 사용하는 두 가지 신호</h3>
        <p>비트는 정보를 표현하는 가장 작은 단위예요.</p>
      </div>
      <button
        className="signal-demo"
        aria-label="비트 신호"
        aria-pressed={on}
        onClick={() => setOn(!on)}
        data-on={on}
      >
        <span className="signal-bulb">
          <Lightbulb size={56} strokeWidth={1.4} />
        </span>
        <span className="signal-number">{on ? "1" : "0"}</span>
        <span className="signal-switch" aria-hidden="true">
          <i />
        </span>
        <span>{on ? "켜짐 · ON" : "꺼짐 · OFF"}</span>
      </button>
      <p className="panel-footnote">스위치를 눌러 0과 1을 바꿔 보세요.</p>
    </>
  );
}

export function QuizExample() {
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <>
      <div className="lesson-panel-heading">
        <span className="landing-badge lilac">퀴즈</span>
        <h3>
          비트가 2개라면
          <br />몇 가지를 표현할 수 있을까요?
        </h3>
      </div>
      <div className="quiz-options" role="group" aria-label="퀴즈 답 고르기">
        {[2, 4, 8, 16].map((value, index) => (
          <button
            key={value}
            aria-pressed={answer === value}
            onClick={() => setAnswer(value)}
          >
            <span className="choice-number">{index + 1}</span>
            <strong>{value}가지</strong>
            <span className="choice-mark" aria-hidden="true">
              {answer === value ? <Check size={18} /> : null}
            </span>
          </button>
        ))}
      </div>
      <p className="quiz-feedback" role="status" data-correct={answer === 4}>
        {answer === null
          ? "답을 골라 보세요. 다른 단계도 자유롭게 볼 수 있어요."
          : answer === 4
            ? "맞아요! 00, 01, 10, 11의 네 가지를 표현해요."
            : "다시 생각해 볼까요? 00, 01, 10, 11을 세어 보세요."}
      </p>
    </>
  );
}

export function BitExample() {
  const [bits, setBits] = useState([false, true, false, true]);
  const weights = [8, 4, 2, 1];
  const total = bits.reduce((sum, on, i) => sum + (on ? weights[i] : 0), 0);
  return (
    <>
      <div className="lesson-panel-heading">
        <span className="landing-badge apricot">실습</span>
        <h3>스위치로 숫자를 만들어 봐요.</h3>
        <p>켜진 비트의 값을 더하면 어떤 숫자가 될까요?</p>
      </div>
      <div className="bit-switches" role="group" aria-label="비트 스위치">
        {weights.map((weight, i) => (
          <button
            key={weight}
            aria-label={`${weight} 비트`}
            aria-pressed={bits[i]}
            onClick={() =>
              setBits((current) => current.map((on, j) => (i === j ? !on : on)))
            }
          >
            <span>{weight}</span>
            <strong>{bits[i] ? "1" : "0"}</strong>
            <small>{bits[i] ? "ON" : "OFF"}</small>
          </button>
        ))}
      </div>
      <div className="bit-result">
        <span>10진수로 바꾸면</span>
        <output aria-live="polite" aria-label="10진수 결과">
          {total}
        </output>
        <button
          onClick={() => setBits([false, false, false, false])}
          aria-label="스위치 초기화"
        >
          <RotateCcw size={17} />
        </button>
      </div>
    </>
  );
}
