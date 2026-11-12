# Agent Lab

An interactive, self-study field guide for building AI agents with **OpenCode V2**.

**Live demo:** <https://ann-jacqueline.github.io/opencode-agent-lab/>

Agent Lab is a static web app: no build step, no package manager, no backend. It
runs from a folder and stores your progress in the browser.

## Run it

From this folder:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

You can also open `index.html` directly, but a local server is recommended for
the embedded video and consistent browser behavior.

The public site is deployed with **GitHub Pages** from the `main` branch root.
The `.nojekyll` file tells Pages to serve the static files as-is.

## What is inside

- **7 units** — six lessons plus a capstone mission, roughly four focused hours.
- **Progress tracking** — completion, quiz answers, the mission checklist, the
  audit, your name, theme, and studio drafts are saved in `localStorage`.
- **Checkpoint quizzes** — immediate feedback with explanations.
- **Build studio** — live generators for OpenCode agent files and `SKILL.md`
  files, with presets for an onboarding scout, a citation reviewer, and a
  release captain.
- **Permission lab** — reorder permission rules and watch “last match wins”
  change the outcome.
- **Agent loop simulator** — a scripted demonstration of plan → act → observe →
  verify.
- **Capstone mission control** — eight guided steps, copy-ready files, a
  verification rubric, troubleshooting, and a completion certificate.
- **Resource shelf** — 24 curated resources, including the requested YouTube
  video, skills.sh, and the MindStudio article on Free Claude Code.
- **Search** — press `/` anywhere to jump to a module, section, or resource.

## The capstone

The capstone builds **Onboarding Scout**, a read-only agent that turns a
repository into a cited onboarding brief.

The included [`practice-repo/`](practice-repo/) is a small Express + SQLite API
with a deliberate auth risk and stale architecture docs. Use it for a first run,
or point the agent at your own repository.

The mission produces:

```text
.opencode/
├── agents/onboarding-scout.md
├── skills/repo-onboarding/SKILL.md
└── commands/onboard.md
AGENTS.md
ONBOARDING.md        # written by the agent
```

## Project structure

```text
agent-lab/
├── index.html              app shell and all course content
├── assets/
│   ├── styles.css           design system and responsive layout
│   ├── app.js               routing, state, quizzes, studio, mission, certificate
│   └── favicon.svg
├── practice-repo/           capstone target repository
└── README.md
```

## Customize it

- **Content:** edit the `<section class="view" ...>` blocks in `index.html`.
- **Design:** the tokens at the top of `assets/styles.css` control colors,
  typography, spacing, and the sidebar width.
- **New resources:** add a `.resource-card` to `#resource-grid` and update the
  filter counts in `#resource-filters`.
- **New modules:** add a view, a route entry in `ROUTES` and `VIEW_ROUTES` in
  `assets/app.js`, and a nav item. Completion is driven by `data-complete`
  attributes and the `UNITS` array.
- **New quiz questions:** add a `.quiz-q` with `data-q`, `data-answer` (zero-based),
  and `data-explanation`. The engine handles the rest.
- **New studio preset:** add an entry to `AGENT_PRESETS` or `SKILL_PRESETS` in
  `assets/app.js` and a `data-agent-preset` / `data-skill-preset` button.

## Accuracy note

The course targets OpenCode V2 and was checked against the official docs in
November 2026. OpenCode evolves quickly; when this guide and the docs disagree,
trust the docs. Every module links its source of truth.

Agent Lab is an independent educational project, not affiliated with or endorsed
by OpenCode, Vercel, MindStudio, or the authors of the linked resources.

## License

The course content and code are provided for personal learning. External
resources keep their own licenses and terms.
