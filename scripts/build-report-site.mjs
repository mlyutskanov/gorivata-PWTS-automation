// Builds site/ for GitHub Pages: the HTML report plus each test's PNG evidence at
// stable paths, and site-summary.md (a job-summary template that embeds that
// evidence). {{PAGES_URL}} is filled in after deployment, when the URL is known.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const runId = process.env.GITHUB_RUN_ID ?? 'local';
const evidenceDir = join('site', 'evidence', runId);

cpSync('playwright-report', 'site', { recursive: true });
mkdirSync(evidenceDir, { recursive: true });

const results = JSON.parse(readFileSync('reports/results.json', 'utf8'));
const tests = [];
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) tests.push({ title: spec.title, project: t.projectName, result: t.results.at(-1) });
  }
  (suite.suites ?? []).forEach(walk);
};
results.suites.forEach(walk);

const icon = { passed: '✅', failed: '❌', timedOut: '❌', skipped: '⏭️', interrupted: '⚠️' };
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0 } = results.stats;
const lines = [
  `## Map tile checks: ${unexpected ? '❌ failed' : '✅ passed'}`,
  '',
  `${expected} passed · ${unexpected} failed · ${flaky} flaky · ${skipped} skipped`,
  '',
  '**[Open the full HTML report]({{PAGES_URL}})**',
  '',
  '| Result | Project | Test |',
  '|---|---|---|',
  ...tests.map((t) => `| ${icon[t.result.status] ?? t.result.status} | ${t.project} | ${t.title} |`),
];

tests.forEach((t, i) => {
  const images = t.result.attachments.filter((a) => a.contentType === 'image/png');
  const measurements = t.result.attachments.find((a) => a.name === 'tile-measurements.json');
  if (!images.length && !measurements) return;

  lines.push('', `### ${t.title}`, '');
  if (measurements) {
    const m = JSON.parse(Buffer.from(measurements.body, 'base64').toString());
    lines.push(
      `Tile ${m.width}×${m.height} · ${m.distinctColours} colours · ` +
        `most common colour ${(m.dominantColourRatio * 100).toFixed(1)}% · sha256 \`${m.sha256.slice(0, 12)}…\``,
      '',
    );
  }
  for (const a of images) {
    const file = `${i}-${a.name.replace(/[^\w.-]+/g, '-').replace(/(\.png)?$/, '.png')}`;
    writeFileSync(join(evidenceDir, file), a.body ? Buffer.from(a.body, 'base64') : readFileSync(a.path));
    lines.push(`<img src="{{PAGES_URL}}evidence/${runId}/${file}" alt="${a.name}" width="${a.name === 'screenshot' ? 640 : 256}">`);
  }
});

writeFileSync('site-summary.md', lines.join('\n') + '\n');
console.log(`Built site/ with ${tests.length} tests and evidence in ${evidenceDir}`);
