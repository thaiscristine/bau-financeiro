<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## React and Next.js conventions

Follow the Vercel React best practices skill in `.agents/skills/vercel-react-best-practices/` (`SKILL.md` for the index, `rules/` for details) when writing or reviewing React/Next.js code.

## Tests

`npm test` runs pure unit tests. `npm run test:db` (database tests in `tests/db/`) and `npm run test:e2e` (Playwright against a production build, `tests/e2e/`) need `TEST_DATABASE_URL` in `.env.local`, pointing at a database whose name ends in `_test`. Both suites create and migrate it, then wipe it between tests.
