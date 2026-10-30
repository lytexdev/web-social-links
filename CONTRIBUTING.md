# Contributing

## Setup

Use Node 26.13.0 and pnpm 11. `pnpm install` installs the Git hooks through lefthook. The pre-commit hook runs gitleaks, using a local binary if present and the pinned Docker image otherwise.

## Checks

Every change passes `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`. Changes to the container also pass `docker compose build`.

`pnpm lint` includes `scripts/check-text.mjs`, which rejects comments in source files, task markers, emojis, en and em dashes and marketing vocabulary in prose.

## Code

- TypeScript strict, no `any`, no `@ts-ignore`, no `console`. Server code logs through `server/utils/logger.ts`
- No comments in code. Intent belongs in the commit message
- Vue components use `<script setup lang="ts">`
- Names: camelCase in TypeScript, PascalCase for components, snake_case for database columns, kebab-case for files
- Every input is validated with Zod before it reaches the database or a renderer
- Nothing operator specific in code. Names, domains, texts and links come from the environment or the database

## Dependencies

Pin exact versions. Check license and maintenance before adding a package. pnpm refuses releases younger than one day, packages whose provenance got weaker than in earlier releases and install scripts that are not on the allowlist in `pnpm-workspace.yaml`. Exceptions need a reason in the commit message.

## Commits

Conventional Commits in English and in the imperative, subject at most 72 characters, a body that explains why, wrapped at 72. One logical change per commit. The commit-msg hook enforces the format.

## Privacy

Pull requests that add a third party, new collected data, storage on the visitor's device or a change in retention must say so in the pull request description and update the privacy policy template.
