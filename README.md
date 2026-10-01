# AI Maker Studio

AI Maker Studio is a polished, fully static showcase website for a hub of AI builders. Each builder lives in its own HTML page with an interactive UI mock-up: configuration panels, templates, features and a live output preview. All of it runs in the browser. There's no backend, no build step and no framework.

## Builders

| Page | Builder | What the demo shows |
| --- | --- | --- |
| [`index.html`](index.html) | Landing page | Hero, builder overview with filter and search, feature highlights, how it works, CTA cards |
| [`chatbot-builder.html`](chatbot-builder.html) | 💬 Chatbot Builder | Persona and tone config, live test chat, embed code, analytics |
| [`image-builder.html`](image-builder.html) | 🎨 Image Builder | Prompt, style, aspect ratio and seed controls, generated art gallery |
| [`video-builder.html`](video-builder.html) | 🎬 Video Builder | Script-to-storyboard, player and multi-track timeline |
| [`agent-builder.html`](agent-builder.html) | 🤖 Agent Builder | Goal, tools, memory and guardrails, animated execution trace, JSON config |
| [`prompt-builder.html`](prompt-builder.html) | ✍️ Prompt Builder | Structured prompt blocks, `{{variable}}` highlighting, quality scores |
| [`app-builder.html`](app-builder.html) | 📱 App Builder | Component picker, live phone preview, generated code |
| [`workflow-builder.html`](workflow-builder.html) | ⚡ Workflow Builder | Trigger, AI steps and actions, animated flow canvas, run history |
| [`voice-builder.html`](voice-builder.html) | 🎙️ Voice Builder | Voice, emotion, speed and pitch, waveform player using the browser's Speech Synthesis API, SSML |

> All "AI" output is simulated locally for demonstration purposes. No data leaves the browser.

## Project structure

```
ai-maker-studio/
├── index.html                # Landing page / builder hub
├── chatbot-builder.html      # One HTML file per builder …
├── image-builder.html
├── video-builder.html
├── agent-builder.html
├── prompt-builder.html
├── app-builder.html
├── workflow-builder.html
├── voice-builder.html
├── assets/
│   ├── css/styles.css        # Shared design system (tokens, layout, components, previews)
│   ├── js/script.js          # Shared vanilla JS (theme, nav, tabs, filters, mock generators)
│   └── img/favicon.svg       # Logo / favicon
├── README.md
└── LICENSE
```

### How the pages are organised

Every builder page uses the same structure, so the site stays consistent and easy to extend:

1. **Header**: brand, main navigation back to the homepage, theme toggle and mobile menu.
2. **Builder hero**: breadcrumb, icon, description and an "at a glance" card.
3. **Workspace** (`#workspace`): a configuration `<form data-builder="…">` next to an output preview panel with tabs.
4. **Templates** (`#templates`): filterable template cards. Clicking **Use** fills in the form.
5. **Features**: a feature list and cards.
6. **Related builders**: links to every other builder plus a back-to-home button.
7. **Footer**

### Theming

Each page sets a theme class on `<body>`, for example `class="theme-voice"`. The class overrides the `--accent`, `--accent-2` and `--accent-soft` CSS variables, so every builder gets its own colour while sharing one stylesheet. Light and dark mode come from `[data-theme="light"]` on `<html>`, and the user's choice is saved in `localStorage`.

### Shared JavaScript hooks

`assets/js/script.js` uses data attributes, so pages need no inline scripts:

| Attribute | Purpose |
| --- | --- |
| `data-theme-toggle` | Switches between light and dark theme |
| `data-nav-toggle` | Opens and closes the mobile navigation |
| `.tabs` + `role="tab"` / `role="tabpanel"` | Accessible tabs with arrow-key support |
| `data-filter-group="#grid"` + `data-filter` / `data-category` | Chip filters for card grids |
| `data-search-target="#grid"` | Free-text search over a card grid |
| `data-template='{"field":"value"}'` | Template button that pre-fills the builder form |
| `data-copy="#element"` | Copies an element's text to the clipboard |
| `form[data-builder="name"]` | Runs the matching mock renderer on submit |
| `.reveal` | Fades an element in on scroll |

## Adding a new builder

1. Copy an existing builder page, for example `prompt-builder.html`, and rename it to `my-builder.html`.
2. Change the `<title>`, the meta description, the body theme class and the page content.
3. Optionally add a colour theme in `styles.css`:
   ```css
   .theme-my { --accent: #e11d48; --accent-2: #a855f7; --accent-soft: rgba(225, 29, 72, .16); }
   ```
4. Register a renderer in `script.js`:
   ```js
   renderers.my = function (values, outputEl) { /* update the preview */ };
   ```
   and give the form `data-builder="my"`.
5. Add a card for it to the builder grid in `index.html`, then add it to the related-builders list and the footer on each page.

## Running locally

No tooling is required. Open `index.html` directly in a browser, or start any static server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publishing with GitHub Pages

1. Push the repository to GitHub. The site files are already at the repository root.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then click **Save**.
5. After a minute or so the site is live at
   `https://<your-username>.github.io/ai-maker-studio/`.
   For this repository that's `https://jodaaisupport-commits.github.io/ai-maker-studio/`.

All links between pages are relative (`index.html`, `assets/...`), so the site works from the GitHub Pages sub-path, from a custom domain and from the local file system.

## License

[MIT](LICENSE)
