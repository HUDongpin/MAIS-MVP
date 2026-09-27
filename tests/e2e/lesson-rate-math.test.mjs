import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';

// Read the displayed value as a rational number; verify by integer cross-products.
function assertExactValue(label, numerator, denominator) {
  const [whole, fraction = ''] = label.split('.');
  const [top, bottom] = label.includes('/') ? label.split('/').map(Number) : [Number(whole + fraction), 10 ** fraction.length];
  assert.equal(top * denominator, numerator * bottom, `displayed ${label} must equal ${numerator}/${denominator} exactly`);
}

// Bundle the real client lessons; change state only through their public controls.
// This intentionally exercises component behavior, not application authentication.
test('all 175 ratio and 300 unit-rate control states preserve exact mathematics', async () => {
  const { outputFiles } = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Ratio from './components/lesson/ccss/lessons/ratio-double-number-line'; import Unit from './components/lesson/ccss/lessons/unit-rate'; createRoot(document.getElementById('root')).render(location.pathname === '/ratio' ? <Ratio/> : <Unit/>);`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/app.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/app.js' ? outputFiles[0].text : '<!doctype html><html><body><main id="root"></main><script src="/app.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = `http://127.0.0.1:${server.address().port}`;
    const click = label => page.getByRole('button', { name: label, exact: true }).click();
    const text = async () => (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    await page.goto(`${url}/ratio`);
    await click('Decrease Flour per batch');
    await click('Decrease Sugar per batch'); await click('Decrease Sugar per batch');
    let ratioCount = 0;
    for (let a = 1; a <= 5; a++) {
      for (let b = 1; b <= 5; b++) {
        for (let n = 0; n <= 6; n++) {
          await page.getByRole('slider', { name: 'Number of batches' }).fill(String(n));
          const rendered = await text();
          if (n === 0) {
            assert.match(rendered, /0 : 0 does not define a ratio/, `zero batches a=${a},b=${b}`);
            assert.doesNotMatch(rendered, /is the same ratio as/);
          } else {
            assert.ok(rendered.replace(/\s/g, "").includes(`${a*n}:${b*n}isthesameratioas${a}:${b}`), rendered);
          }
          assert.match(rendered, /positive whole number of batches/);
          const exact = Number.isInteger(100*b/a);
          const label = exact ? (b/a).toFixed(2) : `${b}/${a}`;
          assert.ok(rendered.includes(`Recipe unit rate: ${label} spoons`), rendered);
          assert.ok(rendered.includes(`paired with ${label} spoons`), rendered);
          if (!exact) assert.ok(rendered.includes(`Approximately ${(b/a).toFixed(2)}, rounded to the nearest hundredth.`));
          assertExactValue(rendered.match(/Recipe unit rate: ([0-9./]+) spoons/)[1], b, a);
          ratioCount++;
        }
        if (b < 5) await click('Increase Sugar per batch');
      }
      for (let i=0;i<4;i++) await click('Decrease Sugar per batch');
      if (a<5) await click('Increase Flour per batch');
    }
    assert.equal(ratioCount, 175);
    await page.goto(`${url}/unit`);
    for(let i=0;i<5;i++) await click('Decrease Total cost ($)');
    for(let i=0;i<2;i++) await click('Decrease Apples');
    let unitCount=0;
    for(let cost=1;cost<=30;cost++) {
      for(let items=1;items<=10;items++) {
        const rendered=await text();
        const exact = Number.isInteger(100*cost/items);
        const label = exact ? (cost/items).toFixed(2) : `${cost}/${items}`;
        assert.ok(rendered.includes(`${cost} ÷ ${items} = ${label}`), rendered);
        assert.ok(rendered.includes(`each apple is $${label}.`), rendered);
        assert.ok(rendered.includes(`unit-rate ratio (${label}):1`), rendered);
        assert.ok(rendered.includes(`${items*2} apples would be $${(cost*2).toFixed(2)}`), rendered);
        if(!exact) {
          assert.ok(rendered.includes(`Approximately $${(cost/items).toFixed(2)} per apple, rounded to the nearest cent.`));
          assert.ok(!rendered.includes(`${cost} ÷ ${items} = ${(cost/items).toFixed(2)}`));
        }
        assertExactValue(rendered.match(/each apple is \$([0-9./]+)\. At/)[1], cost, items);
        unitCount++;
        if(items<10) await click('Increase Apples');
      }
      for(let i=0;i<9;i++) await click('Decrease Apples');
      if(cost<30) await click('Increase Total cost ($)');
    }
    assert.equal(unitCount,300);
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${ratioCount} ratio states + ${unitCount} unit-rate states; real controls and rendered explanations; no browser errors.`);
  } finally {
    if(browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
