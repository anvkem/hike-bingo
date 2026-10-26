# Trail Bingo

A hike icebreaker bingo game. Each player gets a shuffled 5x5 card and fills squares by meeting people from **other colleges**. Same-college signatures and repeat people are blocked. A full line unlocks a reward ticket with a check code to show organisers.

Live: https://anvkem.github.io/hike-bingo/

## Files
- `index.html` – page structure
- `style.css` – styles
- `app.js` – game logic and settings
- `exco.html`, `exco.js`, `exco.css` – exco dashboard (password protected)
- `apps-script/Code.gs` – Google Sheet backend

## Customise
Edit the `CONFIG` block at the top of `app.js`:
- `eventName` – name shown on the ticket
- `colleges` – the list of colleges/groups
- `winCondition` – `"line"` or `"blackout"` (full card)
- `prompts` – the bingo squares (need at least 24)

Progress is saved on each phone (localStorage), so refreshing won't lose a card.

## Exco tracking
Off by default. See `SETUP-TRACKING.md` to connect a Google Sheet and use the dashboard at `/exco.html`.
