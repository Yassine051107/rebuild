# Rebuild

Personal habit system for fat loss. Installable web app (PWA): works offline, all data stays on your phone.

## 1. Put it on your Android phone (one time, ~10 min)

A phone can only install a web app from an `https://` address, so host the files for free on GitHub Pages.

1. On your PC, go to **github.com** → Sign up (free). Pick a username, e.g. `yassine-rb`.
2. Top right **+** → **New repository** → name `rebuild` → **Public** → **Create repository**.
3. On the new page click **uploading an existing file**.
4. Open this `rebuild` folder, select **everything inside it** (`index.html`, `manifest.webmanifest`, `sw.js`, and the `css`, `js`, `icons` folders) and drag it into the browser. Wait until all files are listed → **Commit changes**.
5. Repository → **Settings** → **Pages** (left menu) → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → **Save**.
6. Wait 1–2 minutes and refresh the Pages screen. It shows your address: `https://<username>.github.io/rebuild/`
7. On your phone, open that address in **Chrome** → menu **⋮** → **Add to Home screen** → **Install**.
8. Open Rebuild from the home screen. It now works offline like a normal app.

Your logs never leave the phone; the GitHub page only holds the empty app.

## 2. Reminders on your phone (e.g. 19:00 "Done eating for the day")

A web app can't wake your phone at set times by itself, so the reminders go into Google Calendar, which notifies you reliably even when the app is closed.

**In the app (phone):**
1. More → Settings → **Phone reminders**. Edit times and texts, pick days (every day / training days / specific days), add or delete reminders. "Done eating for the day" at 19:00 is already there.
2. Paste your GitHub Pages address in **App link inside reminders** (so tapping a reminder opens the app).
3. Tap **Download reminders (.ics)** and send the file to your PC (Google Drive, WhatsApp to yourself, or cable). Or open the app on your PC and download it there.

**In Google Calendar (on the PC, one time):**
1. Go to **calendar.google.com**, signed in with the same Google account as your phone.
2. Left side, **Other calendars → + → Create new calendar** → name it `Rebuild` → **Create calendar**.
3. Open that calendar's settings → **Event notifications** → **Add notification** → **Notification, 0 minutes**. (Google ignores the alerts inside imported files and uses this instead.)
4. Settings → **Import & export** → **Import** → choose `rebuild-reminders.ics` → "Add to calendar": **Rebuild** → **Import**.

**On the phone:** open the Google Calendar app once, make sure the `Rebuild` calendar is ticked, and that Calendar notifications are allowed (Android Settings → Apps → Calendar → Notifications).

**Changing reminders later:** edit them in the app, download the file again, import again into the same `Rebuild` calendar. Events update instead of duplicating. To remove everything: delete the `Rebuild` calendar.

**No PC? Quick alternative:** Android **Clock** app → **Alarm** → **+** → 19:00 → repeat every day → **Label**: "Done eating for the day". Works instantly, but alarms ring instead of notifying and can't open the app.

## Run on the PC

```
node serve.mjs
```
Open http://localhost:5173

## Backup

Settings → Backup → **Export** once a week and keep the file on your PC or Google Drive. Clearing Chrome's site data or losing the phone deletes the data otherwise. **Import** restores it. Progress photos are not in the backup: use Download on each photo.

## Updating the app

After changing any file, bump `CACHE` in `sw.js` (e.g. `rebuild-v6`), upload the changed files to GitHub again (same "upload files" button, same folders), then close and reopen the app twice on the phone.
