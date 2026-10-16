# Bugs fixed

A log of bugs found and fixed, newest first. Severity: crash, wrong result, data loss, security, cosmetic.

## 2026-10-16 (v1.6.2)
- **wrong result** `toolbox/apps/dailymix.html`: after Games and Arcade were merged, Daily mix still looked for the old Arcade section and had no games to pick. It now reads Games & Arcade and skips the two level builders.
- **wrong result** `toolbox/apps/music.js`: a page opened in a background tab started its music before any tap, which browsers keep silent, and the first tap no longer woke it up. The first tap now resumes it.

## 2026-10-14 (v1.2.1)
- **wrong result** `toolbox/apps/bracket.html`: players with the same name could not be told apart, so both were marked as winners. Repeated names are now numbered.
- **wrong result** `toolbox/apps/pixelwall.html`: taps were measured including the 1px border, so a tap near an edge could land on the next pixel (fixed in 1.3.0).
