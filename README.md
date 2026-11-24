# Lucky Picks

A number-picking advisor for two draw-based number games:

- **Red-Blue**: pick 6 numbers from 1–33 and 1 number from 1–16.
- **Front-Back**: pick 5 numbers from 1–35 and 2 numbers from 1–12.

It generates random or balance-filtered suggestions, supports single, multiple and banker-dragging selections, shows the distribution of every suggestion, and keeps a local history of your picks.

> **Disclaimer**: Draw results are independent random events. Suggestions produced by this tool are for entertainment only, do not constitute betting advice, and never guarantee a prize. Please participate responsibly and only where it is legal.

## Features

- **Two modes**: Red-Blue and Front-Back, with the matching number ranges, area sizes and price per line.
- **Quick pick**: 1–10 lines with either pure random or balanced selection.
- **Multiple selection**: choose more numbers than a single line needs and see the combination count and cost.
- **Banker-dragging selection**: lock banker numbers and enumerate combinations from the remaining pool, with a safety cap.
- **Number analysis**: odd/even ratio, big/small ratio, sum, span and three-zone distribution for every generated line.
- **Local history**: save generated lines in the browser, copy them, and manage the list.
- **Responsive UI** built with Ant Design 5.

## Tech Stack

- React 18 + TypeScript 5
- Vite 5
- Ant Design 5
- Vitest + Testing Library
- ESLint 9 (flat config)

The app is a fully static single-page application. All number generation and analysis run in the browser; no account, backend, network request, or personal data is involved.

## Getting Started

Requirements: Node.js >= 20 and pnpm.

```bash
cd frontend
pnpm install
pnpm dev         # start the dev server
pnpm test        # run unit tests
pnpm lint        # run ESLint
pnpm typecheck   # run TypeScript type checking
pnpm check:terms # verify the terminology policy
pnpm build       # build for production
```

## Deployment

The workflow in `.github/workflows/deploy.yml` runs the terminology check, lint, type checking, unit tests and the production build on every pull request. Only pushes to `main` are deployed to GitHub Pages (Settings → Pages → Source: GitHub Actions).

Live site: <https://hotpotcloud.github.io/lucky-picks/>

## Terminology Policy

This project must not contain the names of the real-world games it models, nor any equivalent wording in product copy, code identifiers, documents or metadata. Use the neutral terms below instead.

| Instead of | Use |
|---|---|
| The real game names | `Red-Blue` / `红蓝玩法` and `Front-Back` / `前后玩法` |
| Game names in identifiers | `redblue` / `frontback` |
| Category wording for the product | number picking / number advisor / 选号 |
| Official upstream sources | `官方数据源 A` / `官方数据源 B` |

External proper nouns (third-party repository names, upstream protocol field names, official source URLs) are cited as-is because they cannot be renamed, and they are not product copy.

The policy is enforced by `frontend/scripts/check-terminology.mjs`, which runs in CI.

## Project Structure

```text
.
├── .github/workflows/   # GitHub Pages deployment + CI gates
├── docs/                # Requirements, design, contracts, test cases, tasks
├── frontend/            # React + TypeScript + Ant Design application
├── backend/             # FastAPI service (planned, FEAT-002)
└── README.md
```

## Development Process

This project follows the team's AI-assisted front-end/back-end development process:

1. Requirement and core test cases
2. Design and task breakdown
3. Implementation with tests
4. Lint, type check, unit tests, and production build
5. Independent AI review
6. Pull request, merge, and deployment

See `docs/features/FEAT-002/` for the design of the next feature (historical draw data, explainable recommendation strategies, all official bet modes and a FastAPI backend).

## License

[MIT](./LICENSE)
