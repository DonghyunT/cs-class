import type { Question } from "./types";

// An assembled answer is saved as block ids joined by commas, in slot order.
export const assembledIds = (answer: string | undefined) => answer ? answer.split(",") : [];

export const validAssembly = (assemble: NonNullable<Question["assemble"]>, answer: string) => {
  const ids = assembledIds(answer);
  return ids.length <= assemble.slots.length && new Set(ids).size === ids.length && ids.every((id) => assemble.blocks.some((block) => block.id === id));
};

// Marks in a block label: {number}, [dropdown], <dropdown|text> a condition, ~before|dropdown|after~ a value block.
export const BLOCK_PARTS = /\{([^}]+)\}|\[([^\]]+)\]|<([^|>]+)\|([^>]+)>|~([^|~]+)\|([^|~]+)\|([^~]+)~/g;
export const blockText = (label: string) => label.replace(BLOCK_PARTS, (_, number, drop, target, test, before, middle, after) => number ?? drop ?? (target ? `${target}${test}` : `${before} ${middle} ${after}`));
