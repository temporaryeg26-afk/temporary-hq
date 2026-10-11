# TEMP. HQ

The private marketing headquarters for **TEMPORARY™**, ready for more brands later.

**Claude is the manager. ChatGPT writes. Flow and ChatGPT make the visuals. You approve.**

The website is hosted free on GitHub Pages and contains no data. Everything private lives in Supabase (free plan), locked in the database to the two team emails.

First time? Follow **[SETUP.md](SETUP.md)**.

## How the work flows

```
Trend Radar   ChatGPT searches the web (6 areas)  →  Claude picks trends to ride + invents new ones
     ↓
Plan          Claude sets the goal, strategy and a short brief for every piece
     ↓
Write         ChatGPT writes 5 pieces per paste (Reels, carousels, posts, story sets)
     ↓
Rule check    The site checks prices, discounts, fake urgency, stock claims, website mentions, invented specs
     ↓
Review        Claude approves or sends back with a one-line note
     ↓
Visuals       You make images in Flow (Nano Banana) or ChatGPT and video in Flow (Veo) with the exact prompts;
              upload → the site pastes your ORIGINAL logo/files on top and verifies every pixel
     ↓
You approve and post
```

Claude, ChatGPT and Flow are used through your existing plans by copy and paste, so there's no extra cost. If Claude hits its limit, one switch sends the manager work to ChatGPT.

## Your files are never redrawn

- **Images**: the AI only makes the scene. The site pastes the logo, artwork, mask and product cut-outs from your original uploads, scaling them evenly without cropping or recolouring. Every opaque pixel is then verified. When you add slide text, the site checks again, and text over a locked file is refused.
- **Your own photos**: you mark the design area once. After an AI edit (e.g. a new background), that area is put back from your original pixels, or the edit is rejected if the AI moved it.
- **Video**: your original logo is burned onto the Flow video in your browser. Always watch videos before posting to confirm prints and the mask look right.

All of this runs in your browser, so no server is needed.

## Tech

React + Vite (static site on GitHub Pages), Supabase (Postgres + private storage + email-code login, row-level security locked to `team_members`), canvas pixel checks, ffmpeg.wasm (self-hosted) for video.

Developer self-test of the pixel checks: `npm install && npm run dev`, then open `/scripts/harness.html`.
