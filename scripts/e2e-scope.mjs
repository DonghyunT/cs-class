import { isDocument } from "./ci-policy.mjs";

// Files every Entry lesson runs on: the practice screen, interpreter, palette and iframe.
const ENTRY_SHARED = [
  /^src\/components\/student\/programming-(?:lesson\.tsx|lesson\.module\.css)$/,
  /^src\/components\/student\/entry-practice-workspace(?:\.tsx|\.module\.css)$/,
  /^src\/lib\/classroom\/(?:programming-entry|entry-palette)\.ts$/,
  /^src\/lib\/server\/programming-grader\.ts$/,
  /^tests\/(?:entry-palette\.test\.ts|entry-legacy-(?:inputs|objects)\.ts|fixtures\/entry-legacy-(?:keys|objects)\.json)$/,
  /^public\/entryjs\/.+$/,
  /^scripts\/prepare-entryjs\.mjs$/,
  // The teacher runner boots the same iframe for every Entry lesson; its E2E check lives in programming-learning.
  /^src\/components\/teacher\/entry-project-preview\.tsx$/,
  /^tests\/programming-learning\.spec\.ts$/,
  // The bundled Entry object library and its picker.
  /^src\/components\/student\/entry-library-picker\.tsx$/,
  /^src\/lib\/classroom\/entry-library\.json$/,
  /^scripts\/(?:fetch-entry-library\.mjs|entry-library-picks\.json)$/
];

// The concept-screen pictures; only conditionals and loops have entries, and the teacher preview shows them too.
const CONCEPT_VISUAL = /^src\/components\/student\/concept-visual(?:\.tsx|\.module\.css)$/;

// Logic tests run in the unit job (test:review), so on their own they need no E2E.
const LOGIC_ONLY = [/^tests\/lesson-feedback\.test\.ts$/];

export const LESSON_MAPPINGS = {
  "review-sandwich": {
    lessonId: "review-sandwich",
    patterns: [
      /^src\/components\/student\/review\/sandwich(?:\.tsx|\.module\.css|-stage\.tsx)$/,
      /^src\/lib\/classroom\/review\/sandwich-engine\.mjs$/
    ],
    tests: [
      "tests/review-sandwich.spec.ts",
      "tests/sandwich-conversation.spec.ts",
      "tests/review-practice-ui.spec.ts",
      "tests/lesson-feedback-workspace.spec.ts"
    ]
  },
  "review-flowchart": {
    lessonId: "review-flowchart",
    patterns: [
      /^src\/components\/student\/review\/flowchart(?:\.tsx|\.module\.css|-studio\.tsx|-concepts\.tsx|-concepts\.module\.css|-dialogs\.module\.css|-export\.ts|-presets\.ts)$/,
      /^src\/components\/student\/review\/flow-(?:diagram\.tsx|diagram\.module\.css|execution\.tsx)$/,
      /^src\/lib\/classroom\/review\/flow-(?:experience\.ts|expressions\.mjs|graph\.mjs|runner\.mjs)$/,
      /^src\/lib\/classroom\/review\/flowchart-data\.mjs$/
    ],
    tests: [
      "tests/review-flowchart.spec.ts",
      "tests/review-flowchart-v1-ui.spec.ts",
      "tests/review-flowchart-canvas-fixes.spec.ts",
      "tests/review-flowchart-puzzle-fixes.spec.ts",
      "tests/review-flowchart-studio-fixes.spec.ts",
      "tests/flowchart-auto-completion.spec.ts",
      "tests/review-practice-ui.spec.ts",
      "tests/practice-focus.spec.ts",
      "tests/lesson-feedback-workspace.spec.ts"
    ]
  },
  "review-abstraction": {
    lessonId: "review-abstraction",
    patterns: [
      /^src\/components\/student\/review\/abstraction(?:\.tsx|\.module\.css|-stage\.tsx|-concepts\.tsx|-concepts\.module\.css)$/,
      /^src\/lib\/classroom\/review\/abstraction-data\.mjs$/
    ],
    tests: [
      "tests/review-abstraction.spec.ts",
      "tests/review-abstraction-v1-ux.spec.ts",
      "tests/review-practice-ui.spec.ts",
      "tests/practice-focus.spec.ts",
      "tests/lesson-feedback-workspace.spec.ts"
    ]
  },
  "programming-13": {
    lessonId: "programming-13",
    patterns: [
      ...ENTRY_SHARED,
      /^src\/components\/student\/programming-concept(?:\.tsx|\.module\.css)$/,
      /^src\/lib\/classroom\/(?:programming-lesson|programming-data|name-entry)\.ts$/,
      /^tests\/(?:programming-name-mission|ui-workspace-refinement)\.spec\.ts$/
    ],
    tests: [
      "tests/programming-classroom.spec.ts",
      "tests/programming-learning.spec.ts",
      "tests/programming-mission-navigation.spec.ts",
      "tests/programming-name-mission.spec.ts",
      "tests/entryjs-ui.spec.ts",
      "tests/manual-save-entry.spec.ts",
      "tests/practice-focus.spec.ts",
      "tests/lesson-feedback-workspace.spec.ts",
      "tests/ui-workspace-refinement.spec.ts"
    ]
  },
  "conditionals": {
    lessonId: "conditionals",
    patterns: [
      ...ENTRY_SHARED,
      /^src\/lib\/classroom\/conditionals-(?:lesson|data)\.ts$/,
      /^tests\/conditionals\.spec\.ts$/,
      CONCEPT_VISUAL,
      /^public\/concepts\/conditionals-[\w-]+\.png$/
    ],
    tests: [
      "tests/conditionals.spec.ts",
      "tests/teacher-lesson-preview.spec.ts"
    ]
  },
  "loops": {
    lessonId: "loops",
    patterns: [
      ...ENTRY_SHARED,
      /^src\/lib\/classroom\/loops-(?:lesson|data)\.ts$/,
      /^tests\/loops\.spec\.ts$/,
      CONCEPT_VISUAL,
      /^public\/concepts\/loops-[\w-]+\.png$/
    ],
    tests: [
      "tests/loops.spec.ts",
      "tests/teacher-lesson-preview.spec.ts"
    ]
  }
};

// Shared files (the Entry interpreter, palette, iframe) belong to every lesson that lists them.
export function matchLessons(file) {
  // Normalize Windows backslashes to POSIX
  const normalized = file.replaceAll("\\", "/");
  return Object.values(LESSON_MAPPINGS).filter(mapping => mapping.patterns.some(pattern => pattern.test(normalized))).map(mapping => mapping.lessonId);
}

export function matchLesson(file) {
  return matchLessons(file)[0] ?? null;
}

export function selectE2E(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { mode: "full", reason: "no changed files provided", lessonIds: [], testFiles: [] };
  }

  const normalizedFiles = files.map(f => f.replaceAll("\\", "/"));

  // If all files are documentation, skip E2E
  if (normalizedFiles.every(isDocument)) {
    return { mode: "docs", reason: "documents only", lessonIds: [], testFiles: [] };
  }

  // Filter out documentation files to see the functional changes
  const codeFiles = normalizedFiles.filter(f => !isDocument(f) && !LOGIC_ONLY.some(pattern => pattern.test(f)));

  const matchedLessons = new Set();
  let unmapped = null;

  for (const file of codeFiles) {
    const lessons = matchLessons(file);
    if (lessons.length) {
      lessons.forEach(lesson => matchedLessons.add(lesson));
    } else {
      unmapped = file;
      break;
    }
  }

  // If any code file is not strictly mapped to a lesson, elevate to full
  if (unmapped || matchedLessons.size === 0) {
    return {
      mode: "full",
      reason: unmapped ? `unmapped file: ${unmapped}` : "no lesson matched",
      lessonIds: [],
      testFiles: []
    };
  }

  const lessonIds = Array.from(matchedLessons).sort();
  const testFilesSet = new Set();

  for (const id of lessonIds) {
    for (const test of LESSON_MAPPINGS[id].tests) {
      testFilesSet.add(test);
    }
  }

  const testFiles = Array.from(testFilesSet).sort();

  return {
    mode: "affected",
    reason: `affected lessons: ${lessonIds.join(", ")}`,
    lessonIds,
    testFiles
  };
}
