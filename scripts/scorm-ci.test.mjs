import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testFiles = [
  'lib/courseIntegration/admission.test.ts',
  'lib/courseIntegration/diff.test.ts',
  'lib/courseIntegration/importer.test.ts',
  'lib/courseIntegration/model.test.ts',
  'lib/courseIntegration/readiness.test.ts',
  'lib/courseIntegration/sideEffects.test.ts',
  'lib/courseIntegration/xml.test.ts',
  'app/api/teacher/course-imports/handler.test.ts',
];

test('SCORM command runs the complete safety suite with strict rejection handling', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:scorm'],
    'node --test scripts/scorm-ci.test.mjs && node --unhandled-rejections=strict --import tsx --test --test-concurrency=1 ' + testFiles.join(' '));
});

test('normal CI invokes the SCORM gate without a conditional skip', () => {
  const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ci, /      - name: Run SCORM import safety gates\n        env:\n          NODE_ENV: test\n          TSX_DISABLE_CACHE: "1"\n          TSX_TSCONFIG_PATH: tsconfig.json\n        run: npm run test:scorm\n/);
});
