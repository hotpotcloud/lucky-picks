# Lucky Picks

A lottery number advisor for China's Double Color Ball (双色球) and Super Lotto (大乐透). It generates random or balance-filtered number suggestions, supports single, multiple (复式), and banker-dragging (胆拖) selections, and helps users review the basic distribution of a ticket.

> **Disclaimer**: Lottery draws are independent random events. Suggestions produced by this tool are for entertainment only, do not constitute betting advice, and never guarantee a prize. Please play responsibly and only if it is legal in your region.

## Features

- **Two games**: Double Color Ball (6 reds from 33 + 1 blue from 16) and Super Lotto (5 fronts from 35 + 2 backs from 12).
- **Quick pick**: generate 1–10 random tickets with either pure random or balanced selection.
- **Multiple selection (复式)**: choose more numbers than the base ticket size and see the number of combinations and the cost.
- **Banker-dragging selection (胆拖)**: lock banker numbers and enumerate combinations from the dragging pool, with a safety cap.
- **Number analysis**: odd/even ratio, big/small ratio, sum, and three-zone distribution for every generated ticket.
- **Local history**: save generated tickets in the browser, copy them, and manage the list.
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
pnpm dev        # start the dev server
pnpm test       # run unit tests
pnpm lint       # run ESLint
pnpm typecheck  # run TypeScript type checking
pnpm build      # build for production
```

## Deployment

The workflow in `.github/workflows/deploy.yml` runs lint, type checking, unit tests, and the production build on every pull request. Only pushes to `main` are deployed to GitHub Pages (Settings → Pages → Source: GitHub Actions).

Live site: <https://hotpotcloud.github.io/lucky-picks/>

## Project Structure

```text
.
├── .github/workflows/   # GitHub Pages deployment
├── docs/                # Requirements, design, test cases, tasks, progress
├── frontend/            # React + TypeScript + Ant Design application
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

See `docs/features/FEAT-001-lottery-advisor/` for the artifacts of the first feature.

## License

[MIT](./LICENSE)
