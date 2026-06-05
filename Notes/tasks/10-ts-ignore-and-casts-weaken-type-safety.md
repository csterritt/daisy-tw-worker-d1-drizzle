# 14 occurrences of `@ts-ignore` / `as any` / `as unknown` weaken type safety

Scattered across `src/index.ts`, `src/lib/time-access.ts`, and handler files. Each `@ts-ignore` suppresses a compiler check that could catch regressions.

## Recommendation

Investigate and resolve each one (or narrow to `@ts-expect-error` with an explanation).

## Decision:

Attempt to fix each occurrence, or narrow to `@ts-expect-error` with an explanation.
