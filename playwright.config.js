// Browser tests (tests/smoke.spec.js). The site is served by a tiny static server, the same files GitHub Pages serves.
const path = require('path');
const DIR = process.env.TOOLBOX_DIR || path.join(__dirname, 'toolbox');
module.exports = {
  testDir: 'tests', testMatch: /.*\.spec\.js/, timeout: 30000, fullyParallel: true, retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-report' }]],
  // first run on a machine saves the screenshots; later runs compare against them
  updateSnapshots: 'missing', snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
  use: { baseURL: 'http://localhost:5199', serviceWorkers: 'allow' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: process.env.PW_CHANNEL || undefined } }], // PW_CHANNEL=msedge uses the installed Edge
  webServer: { command: `node tests/serve.js "${DIR}" 5199`, port: 5199, reuseExistingServer: true },
};
