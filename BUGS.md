# Bugs fixed

A log of bugs found and fixed, newest first. Severity: crash, wrong result, data loss, security, cosmetic.

## 2026-10-14 (v1.2.1)
- **wrong result** `toolbox/apps/bracket.html`: players with the same name could not be told apart, so both were marked as winners. Repeated names are now numbered.
- **wrong result** `toolbox/apps/pixelwall.html`: taps were measured including the 1px border, so a tap near an edge could land on the next pixel (fixed in 1.3.0).
