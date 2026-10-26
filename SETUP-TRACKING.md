# Exco tracking setup (about 10 minutes)

Tracking is **off** by default (`logging: false` in `app.js`), so testing the game sends nothing anywhere.

## 1. Create the Google Sheet
1. Go to sheets.new and name it e.g. "MC Rangers Hike Bingo".
2. Extensions > Apps Script. Delete what's there and paste everything from `apps-script/Code.gs`.
3. On the first line, change `EXCO_PASSWORD = "change-me"` to your own exco password.
   Only change it there, inside Google – never commit the real password to GitHub (this repo is public).
4. Save, then Deploy > New deployment > type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click Deploy, allow the permissions, and copy the **Web app URL** (ends in `/exec`).

## 2. Paste the URL into the site
- `app.js` → `sheetUrl: "PASTE_URL_HERE"`
- `exco.js` → `const SHEET_URL = "PASTE_URL_HERE";`

## 3. Test it
- In `app.js` set `logging: true` and keep `mode: "test"`.
- Play a few squares, then open `/exco.html`, log in and switch to the **Test** tab.
- The Sheet gets two tabs: **Log** (every action) and **Players** (one row per player, latest progress).

## 4. Hike day
- In `app.js` set `mode: "live"` (keep `logging: true`).
- Ask everyone to tap **Reset** on their card if they tested before, so they start fresh.
- Optional: delete the test rows from the Sheet (filter the Mode column for "test").

## How it behaves on the trail
- If a phone has no signal, updates are saved on the phone and sent automatically when signal returns.
- The dashboard refreshes every 60 seconds. The password is checked by Google, so player data isn't visible to people without it.
- If you edit Code.gs later: Deploy > Manage deployments > Edit > Version: New version (keeps the same URL).
