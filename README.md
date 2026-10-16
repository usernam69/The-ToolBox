# The ToolBox

A main menu with seven categories: Quick wins, Games, Useful tools, Creative & art, Bigger projects, Wild ideas and Community. Inside are 65 everyday tools plus about 112 apps and games and games. Your data stays on your own device and there are no accounts. A few online extras (online rooms, world high scores, the radio) send only what they say they send.

## Use it

- **Online, Chromebook, Android:** open **https://usernam69.github.io/The-ToolBox/** in Chrome and click **⬇ Install app** on the menu (or the install icon in the address bar). It then opens from the launcher, works offline, shows up in **Open with** and **Share** menus, and can send reminders.
- **Windows app:** download `UsefulToolbox.exe` from the [latest release](https://github.com/usernam69/The-ToolBox/releases/latest) and double-click it. No install needed. Windows may show "Windows protected your PC" because the file isn't signed. Click *More info* → *Run anyway*.
- **Chromebook with Linux turned on:** the same release has `TheToolBox-x86_64.AppImage` (Intel/AMD) and `TheToolBox-arm64.AppImage` (ARM). This version can also host Wi-Fi games.
- **Chrome extension:** download `TheToolBox-extension.zip` from the release, unzip it, open `chrome://extensions`, turn on *Developer mode* and click *Load unpacked*. Then click the toolbar icon, or type `tb snake` in the address bar.

## Playing together

- **Online rooms (anywhere, no PC needed):** Room chat, Draw & guess, Sumo duel and Party quiz have **🌐 Play online**. Make a room code and send it to friends. Messages go through free public relays but are encrypted with the room code, so only people with the code can read them.
- **Home Wi-Fi only (no internet):** on Windows, press **Host** in the desktop app (or run `npm run lan` in `toolbox-desktop`). Everyone else opens the address it shows.
- **World high scores** (Snake, Falling words, roguelike, Parkour levels) and **ToolBox radio** (share your lo-fi loop) are public and opt-in: only the nickname, score or loop you choose is shared.

## What's inside

- **Menu:** search (also by words like "music" or "draw"), favourites ★, today's mix, Surprise me, recently opened, light/dark switch, QR code to open it on a phone, voice commands 🎤 ("open snake", "10 minute timer"), reminders 🔔, story mode 📖, languages (English, Español, Français, עברית), seasonal effects.
- **Every app:** 🔗 share link, **?** keyboard shortcuts, 🛠️ Remix (see and change its code), game controller support, screen-reader labels, bigger buttons on touch screens.
- **Family settings:** profiles for each person, screen time per day and per app, school hours, kiosk mode, all behind a PIN. (A gentle lock for kids, not real security.)
- **Make & share:** Parkour level editor, escape room builder, Voxel world links, classroom packs (Wordle words + flashcards in one link), AI app maker (needs your own Claude API key), community apps that run in a locked box.
- **Fun extras:** quests across apps, achievements, ToolBox OS (a desktop with windows), ToolBox Wrapped, your art in the Infinite museum, a whole-ToolBox time capsule, to-dos that become roguelike gear.

## The 65 tools (Useful tools)

| Group | Tools |
|---|---|
| Daily | Dashboard (briefing, weather, to-dos, daily challenge, pet), Habits, Notes, Timers, Calendar, Weekly review, Year in review, Time machine |
| Life | Shopping list, Meal planner, Goals, Mood journal, Water & sleep, Countdowns, Birthdays, Kid mode |
| Money | Budget splitter (with receipt scan), Tip calculator, Expense tracker, Bills, Savings goals, Subscriptions, Loan calculator |
| Study | Flashcards (spaced repetition), Grade calculator, Typing trainer |
| Files | File renamer, Extension changer, Photo date renamer, Screenshot organizer, Downloads cleaner, Duplicate finder, Big file finder, Empty folder sweeper, Video chapters & trimmer |
| Text & convert | Unit converter, Recipe scaler, Password generator, QR codes, Word counter, Text cleaner, Color tool, Time zones, Random picker, Calculator, Date calculator, Markdown preview, JSON formatter, Image resizer |
| Media & dev | Regex tester, Encoder/decoder, Placeholder data, Colors from image, PDF merger, Audio trimmer, GIF maker |
| Saved | Link saver (imports browser bookmarks), Clipboard history |
| System | Backup & sync (file, folder such as Google Drive, or GitHub Gist; optional encryption; CSV export), Trash, Share with a friend, Achievements, Plugins, Settings, Help |

Shortcuts: **Ctrl+K** opens the command bar (try `todo buy milk tomorrow`, `timer 10m tea`, `spent 12 lunch food`, or 🎤 to speak), **/** searches, **1–9** switch tools, **[ ]** switch groups, **F** starts focus mode.

The file tools never touch your disk themselves. They write a PowerShell script for you to read and run.

## Share your own mini-app

Make one `.html` file with everything inside it (copy `toolbox/community/dice.html` to start), add it to `toolbox/community/`, add a line to `toolbox/community/apps.json`, and open a pull request. Community apps run in a sandbox with no access to anyone's ToolBox data.

## Build it yourself

```bash
cd toolbox-desktop
npm install
npm run build        # Windows exe → toolbox-desktop/dist/UsefulToolbox.exe
npm run build:linux  # Linux AppImages (run this on Linux)
```

`npm start` runs the desktop app without building it. `node tests/check.js` checks every page, link and offline file; GitHub runs it on every push. Pushing a tag like `v1.2.0` builds the exe, the AppImages and the extension and attaches them to a release.

## Your data

Data lives in local storage, in the browser or in the app's own folder, so the browser version and the desktop app don't share it. To move it between them, use **System → Backup & sync**: download a backup in one and restore it in the other, or point both at the same synced folder.
