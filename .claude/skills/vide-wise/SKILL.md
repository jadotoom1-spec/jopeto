---
name: vide-wise
description: Work on the Vide Wise vibe-tracker app (index.html) — add features, restyle, fix bugs, or translate it. Use when the user mentions Vide Wise, the vibe/mood tracker, or asks to change the app in this repo.
---

# Vide Wise

Vide Wise is a single-file mood ("vibe") tracker in `index.html` (HTML + CSS + vanilla JS, no build step).

## How the app is built
- **Moods:** array `M` of `[emoji, label, color]`, 5 levels (0 = Low … 4 = Great). The selected mood tints the background glow (`glow()`).
- **Tags:** array `T`; selected tags are kept in the `tags` Set.
- **Storage:** `localStorage.vw` holds a JSON list, newest first: `{m: moodIndex, n: note, g: [tags], t: timestamp}`. Always read and write through `get()` / `put()`, which are wrapped in try/catch.
- **Rendering:** `render()` draws the history and calls `stats()`, which works out the 7-day average, the streak, the 14-day SVG chart and the tag insight.
- **Theme:** CSS variables on `:root`, with dark mode set by `prefers-color-scheme`.

## Rules when changing it
1. Keep it a single self-contained `index.html`: no frameworks and no external scripts.
2. Escape user text with `esc()` before inserting it as HTML.
3. Keep the storage format backward compatible: new fields must be optional.
4. Keep it phone-friendly (max-width 640px, 16px side padding).
5. After editing, check that the JS parses:
   `node -e "const h=require('fs').readFileSync('index.html','utf8');new Function(h.split('<script>')[1].split('</script>')[0])"`
6. Commit with a clear message and push to the working branch.
