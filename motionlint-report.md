# MotionLint review — SDS Citation Generator web app

**Date:** 2026-06-16
**Target:** `webapp/` (index.html, styles.css, app.js, parser.js, enrich.js)
**Tool:** [`motionlint`](https://github.com/bobaba99/motionlint) (npm `motionlint@0.1.0`) — "AI design review in your terminal."

---

## 1. Run status — MotionLint could NOT be executed in this remote sandbox

I tried to run MotionLint against the app here but the remote execution
environment blocks every prerequisite it needs. Evidence gathered this session:

| Prerequisite | Needed for | Result here |
| --- | --- | --- |
| Headless Chromium (Playwright) | `review`/`flow` screenshots | `playwright.azureedge.net` → **HTTP 403 (host not in allowlist)**; no system Chrome/Chromium; empty `~/.cache/ms-playwright`. Cannot download a browser. |
| Vision LLM provider | the actual AI analysis | `ANTHROPIC_API_KEY` **not set**; `api.anthropic.com` reachable but **401**; no local Ollama. No usable provider. |
| App's runtime CDN | app to render under Playwright | `cdn.jsdelivr.net` (pdf.js) → **HTTP 403**. The ES-module import at the top of `app.js` would fail, so no JS initialises and the page renders static-only. |
| Installing the package | running the CLI at all | `npm install -g motionlint` was **blocked by the safety classifier** (runs untrusted install scripts; you named the GitHub repo, not the registry package). I did not work around it. |

**Conclusion:** MotionLint is a Playwright + vision-LLM tool; with no browser, no
model key, and the app's own CDN blocked, it cannot produce a meaningful run in
this container. It will run fine **on your machine** (instructions below).

> The review in Section 3 is therefore a **manual** UI/animation audit I did by
> reading the code — it is explicitly **not** MotionLint's AI output. It is
> organised around the same dimensions MotionLint checks so it transfers cleanly
> once you run the real thing.

---

## 2. How to run MotionLint locally (where it works)

```bash
# 0. Serve the app (its pdf.js import needs HTTP, not file://)
cd webapp && python3 -m http.server 8000      # → http://localhost:8000

# 1. Install Playwright's browser once
npx playwright install chromium

# 2a. Static UX review at multiple viewports (most useful for this app's landing page)
npx motionlint review http://localhost:8000 --provider anthropic
#    (export ANTHROPIC_API_KEY=... first, or use --provider ollama with a local model)

# 2b. Animation / interaction-state review of the landing controls
npx motionlint flow \
  --url http://localhost:8000 \
  --steps "hover #dropzone; click #linkInput; type #linkInput=https://example.com/a.pdf; hover #linkForm button; capture \"landing-states\"" \
  --name sds-landing \
  --provider anthropic

# 3. Or drive it from Claude Code as an MCP server
claude mcp add motionlint -- npx -y motionlint mcp
# then: "use motionlint to review the local app at mobile and desktop, top 3 issues"
```

**Caveat for the `flow` review:** the app's core action is a *file drop*, and the
results toolbar / citation cards / "Verify names" button only appear after a PDF
is parsed. The inline-DSL flow above exercises the landing page and the
dropzone/link interaction states. To capture the populated-results flow you'll
need Playwright `setInputFiles` (use the MCP mode and point it at one of the
sample PDFs in `1.0/`), since the URL DSL can't attach a local file.

Reports land in `.motionlint/` next to where you run the command.

---

## 3. Manual UI / animation / UX review

Reading `webapp/styles.css` + `webapp/app.js`. Severity: 🔴 should fix · 🟡 nice to have · 🟢 good.

### Motion surface (the headline)
The whole stylesheet contains **one** transition (`.dropzone`, styles.css:52) and
**zero** `@keyframes`, `:active` states, spinners, or `prefers-reduced-motion`
guards (grep-confirmed). So almost every state change is instantaneous. This is
exactly the class of issue MotionLint exists to catch.

| # | Sev | Dimension | Finding | Where | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| 1 | 🔴 | Interaction state | Buttons have a hover (`filter: brightness(1.07)`) but **no `transition`** (it snaps) and **no `:active`/pressed state**. The primary actions (Copy ACS, Download .ris/.doc) give no tactile feedback. | styles.css `button` | Add `transition: filter .12s, transform .05s;` and `button:active { transform: translateY(1px); }`. |
| 2 | 🔴 | Loading state | Async work shows **text only, no motion**: "Reading N files…" during pdf.js parse and "Checking PubChem…" during the network lookup. A multi-second wait with a frozen UI reads as "broken." | app.js `setStatus`, `verifyCard` | Add a small CSS spinner (`@keyframes spin`) next to the status text and on the disabled Verify button. |
| 3 | 🟡 | Entrance / choreography | Citation cards are injected with `innerHTML` and **pop in** with no fade/slide; adding several PDFs at once snaps the whole list. | app.js `render` | A 120–160ms fade/slide-up on `.card` (respecting reduced-motion). Stagger is optional. |
| 4 | 🟡 | Feedback continuity | Status messages swap instantly; "Copied to clipboard." appears and lingers with no fade in/out, easy to miss. | app.js `setStatus` | Brief opacity transition; optionally auto-clear success notes after ~3s. |
| 5 | 🟡 | Accessibility (focus) | `.dropzone:focus { outline: none; }` removes the focus ring (styles.css). It is replaced by a border+background change, so it's not invisible, but keyboard users get a weaker indicator than a real ring. | styles.css `.dropzone:hover, :focus` | Keep a visible `:focus-visible` outline (e.g. `outline: 2px solid var(--accent)`). |
| 6 | 🟡 | Reduced motion | No `@media (prefers-reduced-motion: reduce)` block. Low risk today (motion is tiny) but if you add #1–#3 you should gate them. | styles.css | Wrap new transitions/animations so they collapse to none under reduced-motion. |
| 7 | 🟢 | Hierarchy / spacing | Clear visual hierarchy: gradient header, carded sections, consistent `--radius`/spacing, numbered card chips. Reads well. | — | — |
| 8 | 🟢 | Responsiveness | `.fields` and `.coverage-lists` collapse to one column at ≤600px; `flex-wrap` on toolbars. Mobile layout is handled. | styles.css:154 | Spot-check the link row (`input` + button) at ~320px. |
| 9 | 🟢 | Contrast | Body `--ink` on `--bg` is strong; muted text `#5b6770` on white ≈ **5.8:1** (passes WCAG AA for normal text; just under AAA). Support badges have adequate contrast. | — | Only revisit if you want AAA on the 0.82rem hints. |
| 10 | 🟡 | Empty / error states | Empty state is fine (results hidden until records). The link-fetch failure message is good and honest, but there's **no empty-state affordance** on first load beyond the dropzone, and a failed parse only shows a one-line status. | app.js | Consider a tiny "supported formats / example" hint and surfacing per-file parse failures as a dismissible card. |

### User-flow notes (read-through, not screenshotted)
- **Primary flow is sound:** drop/choose PDFs → editable cards with live ACS
  preview → Copy/Download. Editing a field updates the preview immediately (good).
- **Link flow** is honest about CORS and falls back to upload — good expectation-setting.
- **Coverage panel + "Request a supplier"** are present and clear (Full vs Beta).
- **Two things a user could miss:** (a) that outputs are alphabetised on export
  (not in card order) — worth a one-line note near the buttons; (b) that the
  `.doc` export opens in Word/Docs (the label says "Word (.doc)", which is fine).

---

## 4. Prioritised fixes (if you want me to implement)
1. 🔴 Button `transition` + `:active` pressed state (#1) — small, high perceived-quality win.
2. 🔴 Loading spinner for PDF parse + PubChem verify (#2).
3. 🟡 Card entrance transition + `prefers-reduced-motion` guard (#3, #6).
4. 🟡 Keep a visible focus ring on the dropzone (#5).
5. 🟡 Status fade + auto-clear (#4); per-file error cards (#10).

None of these touch the parser or citation logic — they're all CSS/UX polish in
`styles.css` and `app.js`.

---

## 5. What I did NOT do
- Did **not** run MotionLint (environment blockers above) — no AI-generated
  scores in this file; Section 3 is a manual code review.
- Did **not** modify the app — you asked to review first. Say the word and I'll
  implement the prioritised fixes, then you can run MotionLint locally to confirm.
