# Contributing to The ToolBox

Thanks for helping! Everything is plain HTML and JavaScript with no build step, so you can open a file, change it and reload.

## Run it

```bash
npx http-server toolbox -p 5174 -c-1
```

Then open http://localhost:5174. The desktop app: `cd toolbox-desktop && npm install && npm start`.

## Add an app

1. Copy a small app such as `toolbox/apps/palette.html`. Give the `<body>` a `data-app` id, a `data-cat` (quick, games, tools, creative, bigger, wild, community) and a `data-title`, and load `common.js` first. That gives you the top bar, saving with `load()` / `save()`, sounds, shortcuts, controller support and family rules.
2. Add a line to `toolbox/apps/registry.js` so it shows up on the menu.
3. Save data only through `load('key')` / `save('key', value)`. It's stored under `app_<id>_key`, so it's included in backups and profiles. See [STORAGE.md](STORAGE.md) for every key in use.
4. Keep it working offline: everything it needs must be in the repo (put libraries in `toolbox/apps/vendor/`).

A mini-app for everyone, with no access to ToolBox data, goes in `toolbox/community/` instead (see the README).

## Check your change

```bash
node tests/check.js     # every page parses, links and offline files exist
node tests/unit.js      # reminders, share target, quests, online rooms
node tests/keys.js      # refresh STORAGE.md
npx playwright test     # opens every page in a browser (needs: npm i -D @playwright/test && npx playwright install chromium)
```

On Windows, if Playwright's Chromium won't start, use Edge: `PW_CHANNEL=msedge npx playwright test`.

GitHub runs all of these on every pull request. If you change files in `toolbox/`, bump the offline cache with `node scripts/release.js --bump-only`, or installed copies won't update.

## Release (maintainers)

```bash
node scripts/release.js 1.3.0 --push
```

It sets the version, refreshes the offline list, runs the checks, commits, tags and pushes. GitHub then builds the Windows exe, the Linux AppImages and the extension and attaches them to the release. Add a "What's new" line for the version to `TB_NEWS` in `toolbox/apps/errors.js` first.

## Style

- Match the code around you: short helpers, few comments, comments that say why.
- Plain words in the interface. Say what something does, not how it works.
- Nothing leaves the device unless the user clearly chooses an online feature, and that feature says what it sends.
