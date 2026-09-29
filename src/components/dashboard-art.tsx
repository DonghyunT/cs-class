import styles from "./dashboard-art.module.css";

const patterns = {
  student: ["000000000", "011000000", "012100000", "012210000", "012221000", "012222100", "011211110", "000121000", "000011000"],
  teacher: ["000000000", "000000000", "001000300", "012000430", "120000043", "012000430", "001000300", "000000000", "000000000"],
};
const colors = ["#eaf0f9", "#6593d7", "#b8d3f6", "#a99bd0", "#e9e4f7"];

// A quiet, static version of the public home's pixel canvas.
export function DashboardArt({ variant, className = "" }: { variant: keyof typeof patterns; className?: string }) {
  return <div className={`${styles.art} ${className}`} aria-hidden="true">
    <svg viewBox="0 0 240 240" fill="none" focusable="false">
      <circle cx="121" cy="124" r="104" fill="#e3edfc" />
      <rect x="205" y="50" width="23" height="23" rx="7" fill="#e9e4f7" transform="rotate(12 205 50)" />
      <rect x="13" y="185" width="25" height="25" rx="7" fill="#f8e1d5" transform="rotate(-12 13 185)" />
      <g className={styles.board}>
        <rect x="31" y="25" width="180" height="190" rx="23" fill="white" />
        <circle cx="48" cy="43" r="3" fill="#b8d3f6" />
        <circle cx="58" cy="43" r="3" fill="#d3c9eb" />
        <circle cx="68" cy="43" r="3" fill="#f1d1ba" />
        {patterns[variant].join("").split("").map((color, index) =>
          <rect key={index} x={47 + (index % 9) * 16.5} y={57 + Math.floor(index / 9) * 16.5} width="13.5" height="13.5" rx="3" fill={colors[Number(color)]} />)}
      </g>
    </svg>
  </div>;
}
