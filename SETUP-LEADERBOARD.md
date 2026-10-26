# Leaderboard setup (about 5 minutes)

The leaderboard is **off** by default, so nothing is sent anywhere until you turn it on in the admin page.

1. Go to [sheets.new](https://sheets.new) and name the sheet, e.g. "MC Rangers Bingo".
2. **Extensions → Apps Script**. Delete what's there, paste everything from `apps-script/Code.gs`, and save.
3. **Deploy → New deployment →** type **Web app**. Set Execute as **Me** and Who has access **Anyone**. Deploy and allow the permissions.
4. Copy the **Web app URL** (ends in `/exec`).
5. In the admin page, turn **Leaderboard** on, paste the link, keep Board on **Test**, and save.
6. Hike day: switch Board to **Live**. Test and Live are separate boards, so test scores never show up on the day.

The Sheet keeps **one row per player** (their latest score), not a log of every tap. If a phone has no signal, the score waits on the phone and is sent when signal returns.

If you edit Code.gs later: Deploy → Manage deployments → Edit → Version: New version (keeps the same link).
