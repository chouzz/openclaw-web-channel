# Repository Guidelines

## Project Structure & Module Organization
This repository has two TypeScript packages. Root `src/` contains the OpenClaw plugin backend: route registration in `src/index.ts`, handlers in `src/api.ts`, SSE helpers in `src/sse.ts`, and shared types/config in `src/types.ts` and `src/config.ts`. The React frontend lives in `web/src/` with components, hooks, API calls, and Zustand state split into feature folders. Built artifacts go to `dist/`, including `dist/web/` from Vite.

## Build, Test, and Development Commands
Use `pnpm install` at the repo root, then `cd web && pnpm install` for frontend dependencies.

- `pnpm build`: builds the frontend first, then compiles the plugin with `tsc`.
- `pnpm dev`: starts the Vite dev server from `web/`.
- `pnpm lint`: runs ESLint across backend and frontend code.
- `pnpm typecheck`: checks both TypeScript projects without emitting files.
- `pnpm test`: runs the Node test runner for root-level tests.
- `cd web && pnpm preview`: serves the built frontend locally.

## Coding Style & Naming Conventions
Use TypeScript throughout and match the current style: 2-space indentation, semicolons, and single quotes. Keep backend files focused by responsibility (`api`, `sse`, `config`). Use `PascalCase` for React components, `camelCase` for functions and hooks, and descriptive names such as `chatStore.ts`. Run `pnpm lint` and `pnpm typecheck` before opening a PR.

## Testing Guidelines
`pnpm test` uses Node’s built-in test runner, but the repository does not yet include committed test files. Add new tests as `*.test.ts` near the code they cover or under `tests/`. Prioritize HTTP handlers, SSE streaming behavior, and frontend state updates. For UI work, include a brief manual verification note covering session creation, streaming replies, and failure states.

## Commit & Pull Request Guidelines
Recent commits use short Conventional Commit-style subjects such as `fix(web): ...` and `fix: ...`. Keep commits focused, use lowercase types like `fix`, `feat`, or `chore`, and add a scope when the change is isolated to `web` or the backend plugin.

PRs should describe the user-visible change, list verification steps, and link related issues when applicable. Include screenshots for frontend changes that affect chat flow or session management.

## Configuration & Runtime Notes
Do not hardcode tokens or gateway URLs. Plugin settings come from OpenClaw configuration, and the frontend is built for the fixed base path `/plugins/web-channel/`. If local API calls fail during frontend work, verify the proxy target in `web/vite.config.ts` matches the local plugin server you are running.
