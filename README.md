# YAML Clean • In-Browser YAML Validator & Anchor Manager

[![CI](https://github.com/smford/yaml-web-validator/actions/workflows/ci.yml/badge.svg)](https://github.com/smford/yaml-web-validator/actions/workflows/ci.yml)
[![Release](https://github.com/smford/yaml-web-validator/actions/workflows/release.yml/badge.svg)](https://github.com/smford/yaml-web-validator/actions/workflows/release.yml)
[![Deploy to GitHub Pages](https://github.com/smford/yaml-web-validator/actions/workflows/deploy.yml/badge.svg)](https://github.com/smford/yaml-web-validator/actions/workflows/deploy.yml)
[![Dependabot](https://img.shields.io/badge/dependabot-enabled-blue.svg?logo=dependabot)](https://github.com/smford/yaml-web-validator)

---

## Key Features

### 1. 100% Client-Side In-Browser Processing & Offline PWA
- **Zero Server Latency & 100% Privacy**: All parsing, AST traversal, anchor dereferencing, and validation occur locally in browser memory.
- **Air-Gapped Ready (PWA)**: Includes Service Worker caching and Web App Manifest for standalone desktop installation and complete offline functionality.
- **Session Auto-Save**: Seamlessly preserves editor drafts in `localStorage` across page refreshes.

### 2. Advanced Anchor (`&`), Alias (`*`), and Merge Key (`<<`) Management
- **Anchor Inventory**: Catalogs defined anchors (`&name`), node types (mapping, sequence, scalar), line numbers, and live content previews.
- **Usage Metrics & Reverse Cross-References**: Tracks alias references (`*name`) across files with one-click line jumps.
- **Merge Key (`<<`) Support**: Full support for YAML merge keys (`<<: *anchor` and `<<: [*a, *b]`), displaying inherited structures.
- **Dead Code & Dangling Reference Detection**: Highlights unused anchors and flags dangling aliases as errors.

### 3. Multi-Document Streams & Kubernetes Ready
- Full support for multi-document YAML files separated by `---` (such as Kubernetes manifests and Helm charts).
- Accurate document-aware line and column error reporting.

### 4. Shift-Left Security & Secret Scanner
- Scans YAML files for accidentally committed plaintext secrets, API keys, private keys, and authentication tokens with remediation recommendations.

### 5. In-Editor Inline Linter & Diagnostics
- Direct `@codemirror/lint` integration providing inline squiggly underlines, gutter warning/error icons, and hover tooltips.

### 6. Side-by-Side Visual Diff & Resolved Exports
- **Diff View**: Compare raw YAML against resolved, dereferenced output side-by-side.
- **One-Click Export**: Export clean, dereferenced YAML or evaluated JSON ready for CI/CD pipelines.

---

## Tech Stack

- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Framework**: [React 18](https://react.dev/) + [Vite 6](https://vite.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Modern dark/light developer theme)
- **Editor**: [CodeMirror 6](https://codemirror.net/) with `@codemirror/lang-yaml`
- **YAML Engine**: [`yaml`](https://eemeli.org/yaml/) (YAML 1.2 & 1.1 merge keys with CST/AST traversal)
- **Testing**: [Vitest](https://vitest.dev/)
- **CI/CD & Automation**: GitHub Actions (Lint, Test, Build, GitHub Pages deployment, Semantic Release) & Dependabot

---

## Local Development

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Quick Start
```bash
# 1. Clone the repository
git clone git@github.com:smford/yaml-web-validator.git
cd yaml-web-validator

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```
Open `http://localhost:5173` in your browser.

### Running Tests & Quality Checks
```bash
# Run unit test suite (Vitest)
npm run test

# Typecheck and lint
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Semantic Versioning & Releases

This project uses [Semantic Release](https://github.com/semantic-release/semantic-release) and adheres to [Conventional Commits](https://www.conventionalcommits.org/).

When a pull request is merged into `main`, GitHub Actions automatically:
1. Determines the next semantic version number based on commit messages:
   - `fix:` / `perf:` / `refactor:` -> **Patch** (`v1.0.X`)
   - `feat:` -> **Minor** (`v1.X.0`)
   - `BREAKING CHANGE:` -> **Major** (`vX.0.0`)
2. Updates `CHANGELOG.md` with categorized release notes.
3. Bumps version in `package.json` and `package-lock.json`.
4. Creates a Git tag and publishes a **GitHub Release**.
5. Packages and attaches the production bundle (`release-dist.zip`) directly to the GitHub release assets.

---

## License

This project is open-source software licensed under the [GNU Affero General Public License v3.0 (AGPLv3)](./LICENSE).
