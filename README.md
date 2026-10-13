# The ToolBox

A main menu with six categories: Quick wins, Games, Useful tools, Creative & art, Bigger projects and Wild ideas. Inside are 64 everyday tools plus 43 apps and games. Everything is saved on your own device. There are no accounts and nothing is sent to a server.

## Use it

- **Online / Chromebook:** open **https://usernam69.github.io/The-ToolBox/** in Chrome. To install it, click the install icon at the right end of the address bar. After that it opens from the launcher and works offline.
- **Windows app:** download [](release/UsefulToolbox.exe) and double-click it. No install needed. Windows may show "Windows protected your PC" because the file isn't signed. Click *More info* → *Run anyway*.
- **From the files:** open  in Chrome or Edge.

**Room chat** and **Draw & guess** play over home Wi-Fi. Someone on Windows presses **Host** in the desktop app, or runs  in . Everyone else, Chromebooks included, opens the address it shows. Draw & guess also has a one-screen mode.

## The 64 tools (Useful tools)

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
| System | Backup & sync (optional encryption, GitHub Gist sync), Share with a friend, Achievements, Plugins, Settings (accent color, compact mode, PIN lock, screensaver), Help |

Shortcuts: **Ctrl+K** opens the command bar (try `todo buy milk tomorrow`, `timer 10m tea`, `spent 12 lunch food`, or 🎤 to speak), **/** searches, **1–9** switch tools, **[ ]** switch groups, **F** starts focus mode.

The file tools never touch your disk themselves. They write a PowerShell script for you to read and run.

## Build the .exe yourself

```bash
cd toolbox-desktop
npm install
npm run build
```

The exe is written to `toolbox-desktop/dist/UsefulToolbox.exe`. `npm start` runs the app without building it.

## Your data

Data lives in local storage, in the browser or in the app's own folder, so the browser version and the desktop app don't share it. To move it between them, use **System → Backup & sync**: download a backup in one and restore it in the other.
