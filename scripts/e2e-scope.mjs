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
  /^src\/lib\/classroom\/entry-workspace(?:\.json|-frame\.ts)$/,
  // The teacher runner boots the same iframe for every Entry lesson; its E2E check lives in programming-learning.
  /^src\/components\/teacher\/entry-project-preview\.tsx$/,
  /^tests\/programming-learning\.spec\.ts$/,
  // The bundled Entry object library and its picker.
  /^src\/components\/student\/entry-library-picker\.tsx$/,
  /^src\/lib\/classroom\/entry-library\.json$/,
  /^scripts\/(?:fetch-entry-library\.mjs|entry-library-picks\.json)$/
];

// The concept-screen pictures; conditionals, loops and brick-breaker have entries, and the teacher preview shows them too.
const CONCEPT_VISUAL = /^src\/components\/student\/concept-visual(?:\.tsx|\.module\.css)$/;

// Shared session and polling files stay unmapped, so local runs still need the full suite; automatic CI's smoke
// fallback adds the specs that pin their timing.
export const SMOKE_RELATED = [{
  patterns: [
    /^src\/components\/session-provider\.tsx$/,
    /^src\/app\/api\/auth\/\[action\]\/route\.ts$/,
    /^src\/lib\/classroom\/features\.ts$/,
    /^src\/components\/student\/(?:lesson-workspace|dashboard)\.tsx$/,
    /^src\/components\/dashboard\/dashboard\.tsx$/,
    /^tests\/(?:read-polling|manual-save-entry|classroom-api)\.spec\.ts$/
  ],
  tests: ["tests/read-polling.spec.ts", "tests/manual-save-entry.spec.ts", "tests/classroom-api.spec.ts"]
}, {
  patterns: [
    /^src\/components\/teacher\/(?:(?:dashboard|dialogs)\.tsx|presentation\.ts)$/,
    /^src\/components\/teacher\/(?:class-preparation-table|class-progress|teacher-toolbar)(?:\.tsx|\.module\.css)$/,
    /^src\/components\/teacher\/teacher\.module\.css$/
  ],
  tests: ["tests/teacher-class-management.spec.ts", "tests/classroom-api.spec.ts", "tests/teacher-preparation.spec.ts", "tests/ui-teacher-refinement.spec.ts"]
}, {
  patterns: [/^src\/components\/teacher\/(?:lesson-preview\.tsx|use-preview-work\.ts)$/],
  tests: ["tests/teacher-lesson-preview.spec.ts", "tests/teacher-preview-api.spec.ts"]
}, {
  patterns: [
    /^src\/components\/teacher\/(?:assessment|teacher-toolbar)(?:\.tsx|\.module\.css)$/,
    /^src\/components\/teacher\/presentation\.ts$/,
    /^src\/components\/teacher\/teacher\.module\.css$/
  ],
  tests: ["tests/teacher-assessment.spec.ts"]
}, {
  patterns: [
    /^src\/components\/teacher\/(?:dashboard|dialogs|work-details)\.tsx$/,
    /^src\/components\/teacher\/(?:presentation\.ts|teacher\.module\.css)$/
  ],
  tests: ["tests/teacher-review-workflow.spec.ts", "tests/ui-teacher-refinement.spec.ts"]
}];

export function smokeRelatedTests(files) {
  const normalized = files.map(file => file.replaceAll("\\", "/"));
  return SMOKE_RELATED.filter(group => normalized.some(file => group.patterns.some(pattern => pattern.test(file)))).flatMap(group => group.tests);
}

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
      /^src\/components\/student\/review\/abstraction(?:\.tsx|\.module\.css|-concepts\.tsx|-concepts\.module\.css)$/,
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
  },
  "functions": {
    lessonId: "functions",
    patterns: [
      ...ENTRY_SHARED,
      /^src\/lib\/classroom\/functions-(?:lesson|data)\.ts$/,
      /^src\/components\/student\/function-(?:editing\.ts|concepts\.(?:tsx|module\.css))$/,
      /^tests\/(?:functions\.spec\.ts|fixtures\/entry-function-export\.json)$/,
      CONCEPT_VISUAL,
      /^public\/concepts\/functions-[\w-]+\.png$/
    ],
    tests: [
      "tests/functions.spec.ts",
      "tests/teacher-lesson-preview.spec.ts"
    ]
  },
  "brick-breaker": {
    lessonId: "brick-breaker",
    patterns: [
      ...ENTRY_SHARED,
      /^src\/lib\/classroom\/brick-breaker-(?:lesson|data)\.ts$/,
      /^tests\/brick-breaker\.spec\.ts$/,
      CONCEPT_VISUAL
    ],
    tests: [
      "tests/brick-breaker.spec.ts",
      "tests/teacher-lesson-preview.spec.ts"
    ]
  }
};

// Where production serves the Entry workspace (host, CDN, headers). Every Entry lesson boots that workspace the same way,
// so programming-classroom's entry-assets, entry-cdn and entry-host checks cover these without each lesson's missions.
const ENTRY_HOSTING = {
  lessonId: "programming-13",
  patterns: [
    // Moves the workspace to the Entry CDN on production builds.
    /^scripts\/entryjs-cdn\.(?:mjs|json)$/,
    /^cloudflare\/entry-cdn\/.+$/,
    // Only the Entry workspace's headers and its host's redirect live here; remove this entry if the config grows.
    /^next\.config\.ts$/,
    // Answers the sandboxed iframe's CORS preflights. Remove this entry if the matcher grows beyond /entryjs/.
    /^src\/proxy\.ts$/
  ],
  tests: ["tests/programming-classroom.spec.ts"]
};

const MAPPINGS = [...Object.values(LESSON_MAPPINGS), ENTRY_HOSTING];

// Shared files (the Entry interpreter, palette, iframe) belong to every lesson that lists them.
function matchMappings(file) {
  // Normalize Windows backslashes to POSIX
  const normalized = file.replaceAll("\\", "/");
  return MAPPINGS.filter(mapping => mapping.patterns.some(pattern => pattern.test(normalized)));
}

export function matchLessons(file) {
  return [...new Set(matchMappings(file).map(mapping => mapping.lessonId))];
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

  const matchedMappings = new Set();
  let unmapped = null;

  for (const file of codeFiles) {
    const mappings = matchMappings(file);
    if (mappings.length) {
      mappings.forEach(mapping => matchedMappings.add(mapping));
    } else {
      unmapped = file;
      break;
    }
  }

  // If any code file is not strictly mapped to a lesson, elevate to full
  if (unmapped || matchedMappings.size === 0) {
    return {
      mode: "full",
      reason: unmapped ? `unmapped file: ${unmapped}` : "no lesson matched",
      lessonIds: [],
      testFiles: []
    };
  }

  const lessonIds = [...new Set([...matchedMappings].map(mapping => mapping.lessonId))].sort();
  const testFiles = [...new Set([...matchedMappings].flatMap(mapping => mapping.tests))].sort();

  return {
    mode: "affected",
    reason: `affected lessons: ${lessonIds.join(", ")}`,
    lessonIds,
    testFiles
  };
}
