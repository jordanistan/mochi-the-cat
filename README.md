# Cat on the Hat

A fun, interactive profile site for a cat.

**Live site:** https://jordanistan.github.io/mochi-the-cat/

**Profile site (`/`)**
- The cursor is a mouse. Linger near a screen edge and a cat paw reaches in to grab it (toggle with "Paw traps" in the nav).
- Pet the cat (click it) for purrs and hearts, and toss it treats. Clicking the belly is a trap: the cat hisses and swats, except for a rare 1-in-10 belly rub. A treat makes up for it.
- About section with details and a personality meter.
- Photo gallery with a lightbox and likes.
- Fun-fact flip cards.
- Potty training journey: an interactive tracker for toilet training with training rings.
- Arcade section that links to the game.

**Whack-a-Mouse (`/game/`)**: a separate NES-style game where the cat's paw is the hammer.

## Make it yours

Edit **`src/cat.js`**: name, bio, details, personality, fun facts, potty-training stage (`currentStage`), and photos.
Put real photos in `public/photos/` and list them in `photos`. The current images are illustrated placeholders.

## Run with Docker (recommended)

```bash
docker compose up dev            # http://localhost:5173, hot reload on file save
docker compose --profile prod up prod   # production build via nginx on http://localhost:8080
```

## Run without Docker

```bash
npm install
npm run dev      # http://localhost:5173 (also reachable on your LAN)
npm run build    # static site in dist/
```

## Files

- `index.html`, `src/profile.js`, `src/profile.css`: profile page
- `src/cursor.js`: mouse cursor and edge-grabbing paw
- `src/cat.js`: all the cat's content
- `game/index.html`, `src/game.js`, `src/game.css`: Whack-a-Mouse
- `Dockerfile`, `docker-compose.yml`: container setup

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.
Edit, commit, push, and the live site updates in a minute or two.
