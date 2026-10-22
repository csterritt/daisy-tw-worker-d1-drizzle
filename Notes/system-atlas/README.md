# System atlas — mini-auth

An explorable map of this codebase: an interactive isometric page, a
generated text twin, and the hand-written context around them. One data
file is the source of truth; both views rebuild from it.

## The set

| File | Role | Edit it? |
|---|---|---|
| `atlas/data.mjs` | Single source of truth: structures, flows, chapters, decisions, questions | Yes |
| `atlas/template.html` + `atlas/build.mjs` | Renderer + generator | Presentation only |
| `atlas.html` | Built interactive atlas | No (generated) |
| `SYSTEM.md` | Built text twin — decisions, every structure, flows, questions by ID | No (generated) |
| `CONTEXT.md` | Glossary — the nouns, one line each | By hand |
| `adr/` | Decisions that are hard to reverse or surprising without context | By hand |

## Rebuild

```bash
bun Notes/system-atlas/atlas/build.mjs
```

Writes `SYSTEM.md` and `atlas.html` next to this README. Rebuild after
every change to `data.mjs`; never edit generated files by hand.

## View

Serve the folder and open the page (file:// can render as a static
snapshot in some browsers):

```bash
cd Notes/system-atlas && python3 -m http.server 8137
# → http://localhost:8137/atlas.html
```

Hover a structure to read it, click to pin, `→` goes inside for the
execution steps, `]`/`[` moves between chapters, and a dot on a flow line
is a data packet you can click to inspect. The **Open questions** tab
lists every question by ID (`Q-<code><n>`).

## Updating

Edit `atlas/data.mjs` — move boxes with `gx/gy`, add questions to a
structure's `cond`, mark decisions in `DECISIONS` — rebuild, republish.
Keep questions stable: resolve them (`{q, r: '…'}`) rather than deleting
so IDs don't shift.
