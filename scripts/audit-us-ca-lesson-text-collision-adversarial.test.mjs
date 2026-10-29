// Adversarial regression fixtures from the independent A11 review of 45fe424d.
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { auditLessonControlStates } from './audit-us-ca-lesson-text-collision.mjs';

const browser = await chromium.launch();
const options = {slug:'review-fixture',tol:0,maxPresses:100,maxMs:5000};
const cases=[];
const wrap=body=>'<section data-lesson-role="opener"><div data-ccss-lesson="review-fixture">'+body+'</div></section>';
const svg='<svg width="200" height="90"><text id="a" x="10" y="30">Alpha</text><text id="b" x="120" y="30">Beta</text></svg>';
const range='<input type="range" aria-label="Position" min="0" max="4" step="1" value="0">';
const compact=r=>({visited:r.visited,axes:r.axes,unsupported:r.unsupported,lost:r.lost,stuck:r.stuck,capped:r.capped,findings:r.findings,walkthroughCoverage:r.walkthroughCoverage});
async function actualOverlap(page){return page.evaluate(()=>{const a=document.getElementById('a').getBoundingClientRect(),b=document.getElementById('b').getBoundingClientRect();return {x:Math.min(a.right,b.right)-Math.max(a.left,b.left),y:Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)};});}
function clean(r){return !r.error&&!r.capped&&!r.findings.length&&!r.unsupported.length&&!r.lost.length&&!r.stuck.length;}
try {
  await test('late controls cannot silently escape the coverage roster', async () => {
    const page=await browser.newPage();
    await page.setContent(wrap(svg+'<div><button type="button" id="toggle" aria-pressed="false">Reveal action</button></div>')+'<script>(()=>{const t=document.getElementById("toggle");t.onclick=()=>{const on=t.getAttribute("aria-pressed")!=="true";t.setAttribute("aria-pressed",String(on));document.getElementById("late")?.remove();if(on){const b=document.createElement("button");b.id="late";b.type="button";b.textContent="Unclassified late action";b.onclick=()=>document.getElementById("b").setAttribute("x","10");t.parentElement.after(b);}};})();</script>');
    const result=await page.evaluate(auditLessonControlStates,options);
    assert.ok(!clean(result), "a reachable collision or incomplete traversal must never be accepted as clean");
    await page.locator('#late').click();
    const overlap=await actualOverlap(page);assert.ok(overlap.x>0&&overlap.y>0);
    cases.push({id:'dynamic-unclassified-control',auditReturnedClean:clean(result),audit:compact(result),reachableCollision:overlap});await page.close();
  });
  await test('unanswered choice state is crossed with all range values', async () => {
    const page=await browser.newPage();
    const html=wrap(svg+range+'<div><button type="button" aria-pressed="false">Choice one</button><button type="button" aria-pressed="false">Choice two</button></div>')+'<script>(()=>{const slider=document.querySelector("input");let selected=false;const draw=()=>document.getElementById("b").setAttribute("x",!selected&&slider.value==="2"?"10":"120");slider.oninput=draw;document.querySelectorAll("button").forEach(b=>b.onclick=()=>{selected=true;document.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));draw();});})();</script>';
    await page.setContent(html);const result=await page.evaluate(auditLessonControlStates,options);assert.ok(!clean(result), "a reachable collision or incomplete traversal must never be accepted as clean");
    await page.setContent(html);await page.locator('input').fill('2');
    const overlap=await actualOverlap(page);assert.ok(overlap.x>0&&overlap.y>0);
    cases.push({id:'unselected-choice-cross-range',auditReturnedClean:clean(result),audit:compact(result),reachableCollision:overlap});await page.close();
  });
  await test('worked-example SVG dependencies are crossed with all range values', async () => {
    const page=await browser.newPage();
    const body='<svg width="200" height="40"><text id="grid" x="20" y="25">Grid 0</text></svg>'+range+svg+'<div><button id="next" type="button">Next step</button><button id="reset" type="button" disabled>Start over</button></div>';
    const html=wrap(body)+'<script>(()=>{let count=0;const slider=document.querySelector("input"),next=document.getElementById("next"),reset=document.getElementById("reset");const draw=()=>{document.getElementById("grid").textContent="Grid "+slider.value;document.getElementById("b").setAttribute("x",count===1&&slider.value==="2"?"10":"120");next.disabled=count===1;reset.disabled=count===0;};slider.oninput=draw;next.onclick=()=>{count=1;draw();};reset.onclick=()=>{count=0;draw();};})();</script>';
    await page.setContent(html);const result=await page.evaluate(auditLessonControlStates,options);assert.ok(!clean(result), "a reachable collision or incomplete traversal must never be accepted as clean");
    await page.setContent(html);await page.locator('input').fill('2');await page.locator('#next').click();
    const overlap=await actualOverlap(page);assert.ok(overlap.x>0&&overlap.y>0);
    cases.push({id:'reveal-dependent-svg-hidden-during-grid',auditReturnedClean:clean(result),audit:compact(result),reachableCollision:overlap});await page.close();
  });
  await test('nonfinite tolerance is rejected before measurement', async () => {
    const page=await browser.newPage();await page.setContent(wrap(svg.replace('x="120"','x="10"')));
    const result=await page.evaluate(auditLessonControlStates,{...options,tol:NaN});assert.ok(!clean(result), "a reachable collision or incomplete traversal must never be accepted as clean");
    const overlap=await actualOverlap(page);assert.ok(overlap.x>0&&overlap.y>0);
    cases.push({id:'nonfinite-tolerance',auditReturnedClean:clean(result),audit:compact(result),reachableCollision:overlap});await page.close();
  });
} finally {await browser.close();}
console.log(JSON.stringify(cases.map(x=>({id:x.id,auditReturnedClean:x.auditReturnedClean,actualOverlap:x.reachableCollision}))));
