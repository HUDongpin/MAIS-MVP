// Prompt-derived checks for the bounded Arkansas G6-G12 correction slice.
// These functions never read the stored answer, accepted answers, or options.
const prefix = "us-ar-g6-g12-v1-";

export const correctedArkansasIds = new Set(
  `g06-c05-q019 g06-c05-q038 g10-c01-q004 g10-c01-q014 g10-c01-q036
   g10-c03-q007 g10-c05-q004 g10-c05-q010 g10-c05-q014 g10-c05-q016
   g10-c05-q020 g11-c02-q039 g11-c03-q002 g11-c03-q008 g11-c03-q020
   g11-c03-q035 g11-c03-q036 g11-c03-q041 g11-c04-q015 g12-c04-q014
   g12-c04-q023`.trim().split(/\s+/).map((id) => prefix + id)
);

function firstPositiveRoot(fn, step = 0.01, end = 100) {
  let previousX = 0;
  let previous = fn(0);
  for (let x = step; x <= end; x += step) {
    const current = fn(x);
    if (previous * current <= 0) {
      let low = previousX;
      let high = x;
      for (let i = 0; i < 60; i += 1) {
        const middle = (low + high) / 2;
        if (fn(low) * fn(middle) <= 0) high = middle;
        else low = middle;
      }
      return (low + high) / 2;
    }
    previousX = x;
    previous = current;
  }
  return null;
}

function triangleSine(prompt) {
  const match = prompt.match(/angle A is (\d+)°, angle B is (\d+)°, and side AB is (\d+) cm\. Find the length of side BC/);
  if (!match) return null;
  const [, a, b, side] = match.map(Number);
  const radians = (degrees) => degrees * Math.PI / 180;
  return { value: side * Math.sin(radians(a)) / Math.sin(radians(180 - a - b)), decimals: 1 };
}

function angleBisector(prompt) {
  const match = prompt.match(/angle A is (\d+)°, angle B is (\d+)°, and side AB = (\d+).*AD is the angle bisector of angle A.*DE is parallel to AB.*length of DE/s);
  if (!match) return null;
  const [, a, b, side] = match.map(Number);
  const oppositeB = side * Math.sin(b * Math.PI / 180) / Math.sin((180 - a - b) * Math.PI / 180);
  return { value: side * oppositeB / (side + oppositeB) };
}

function chord(prompt) {
  const match = prompt.match(/radius of (\d+) cm\. A chord is (\d+) cm from the center\. Find the length of the chord/);
  if (!match) return null;
  const radius = Number(match[1]);
  const distance = Number(match[2]);
  return distance <= radius ? { value: 2 * Math.sqrt(radius ** 2 - distance ** 2) } : null;
}

function hypotenuseProbability(prompt) {
  const match = prompt.match(/hypotenuse is (\d+)(?: cm)? and one leg is (\d+)(?: cm)?\. A point is chosen uniformly at random inside the triangle\..*closer to the hypotenuse than to either leg/s);
  if (!match) return null;
  const hypotenuse = Number(match[1]);
  const leg = Number(match[2]);
  if (hypotenuse <= leg) return null;
  const otherLeg = Math.sqrt(hypotenuse ** 2 - leg ** 2);
  // The favorable triangle has hypotenuse c as base and inradius r as height;
  // the entire right triangle has area r(a+b+c)/2.
  return { value: hypotenuse / (hypotenuse + leg + otherLeg) };
}

function scoreStatistic(prompt, statistic) {
  const label = statistic === "median" ? "scores are:" : "week:";
  const match = prompt.match(new RegExp(`${label} ([\\d, ]+)\\. What is the ${statistic}`));
  if (!match) return null;
  const values = match[1].split(",").map(Number).sort((a, b) => a - b);
  if (values.some((value) => !Number.isFinite(value))) return null;
  return statistic === "median"
    ? { value: (values[(values.length - 1) >> 1] + values[values.length >> 1]) / 2 }
    : { value: values.reduce((sum, value) => sum + value, 0) / values.length };
}

function seasonalIntersection(prompt) {
  const match = prompt.match(/P\(t\) = (\d+) \+ (\d+) sin\(π t \/ (\d+)\).*Q\(t\) = (\d+) e\^\{([\d.]+) t\}/s);
  if (!match || !/first (?:month|time)|first time/.test(prompt)) return null;
  const [, base, amplitude, period, initial, rate] = match.map(Number);
  const value = firstPositiveRoot((t) => base + amplitude * Math.sin(Math.PI * t / period) - initial * Math.exp(rate * t));
  if (value == null) return null;
  return { value, decimals: /two decimal places/.test(prompt) ? 2 : 1 };
}

function predatorIntersection(prompt) {
  const match = prompt.match(/Q\(t\) = (\d+) \* e\^\(([\d.]+)t\) \* cos\(πt\/(\d+)\).*reaches (\d+) rabbits/s);
  if (!match) return null;
  const [, initial, rate, period, target] = match.map(Number);
  const value = firstPositiveRoot((t) => initial * Math.exp(rate * t) * Math.cos(Math.PI * t / period) - target);
  return value == null ? null : { value, decimals: 2 };
}

function residual(prompt) {
  const match = prompt.match(/P\(t\)=(\d+)·e\^\(([\d.]+)t\).*After (\d+) years, the actual population is (\d+).*residual at t=\d+/s);
  if (!match) return null;
  const [, initial, rate, years, actual] = match.map(Number);
  return { value: actual - initial * Math.exp(rate * years), decimals: /two decimal places/.test(prompt) ? 2 : null };
}

function accumulatedProfit(prompt) {
  if (!/profit rate P\(t\), in thousands of dollars per year/.test(prompt)) return null;
  const match = prompt.match(/P\(t\) = (-?\d+)t\^3 \+ (\d+)t\^2 - (\d+)t \+ (\d+).*from t=(\d+) to t=(\d+)/s);
  if (!match) return null;
  const [, cubic, quadratic, linear, constant, start, end] = match.map(Number);
  const antiderivative = (t) => cubic * t ** 4 / 4 + quadratic * t ** 3 / 3 - linear * t ** 2 / 2 + constant * t;
  return { value: antiderivative(end) - antiderivative(start), decimals: 0 };
}

function maximumProfit(prompt) {
  const match = prompt.match(/P\(x\) = (-?\d+)x\^3 \+ (\d+)x\^2 - (\d+)x \+ (\d+).*between (\d+) and (\d+) hundred units.*maximum daily profit/s);
  if (!match) return null;
  const [, cubic, quadratic, linear, constant, start, end] = match.map(Number);
  const discriminant = (2 * quadratic) ** 2 - 4 * 3 * cubic * -linear;
  if (discriminant < 0) return null;
  const stationary = [(-2 * quadratic - Math.sqrt(discriminant)) / (6 * cubic), (-2 * quadratic + Math.sqrt(discriminant)) / (6 * cubic)];
  const evaluate = (x) => cubic * x ** 3 + quadratic * x ** 2 - linear * x + constant;
  return { value: Math.max(...[start, end, ...stationary.filter((x) => x >= start && x <= end)].map(evaluate)), decimals: 0 };
}

export function solveArkansasCorrection(question) {
  if (!correctedArkansasIds.has(question.id)) return null;
  const prompt = question.prompt?.en ?? "";
  const id = question.id.slice(prefix.length);
  if (id === "g06-c05-q019") return scoreStatistic(prompt, "median");
  if (id === "g06-c05-q038") return scoreStatistic(prompt, "mean");
  if (id === "g10-c01-q004" || id === "g10-c01-q036") return triangleSine(prompt);
  if (id === "g10-c01-q014") return angleBisector(prompt);
  if (id === "g10-c03-q007") return chord(prompt);
  if (id.startsWith("g10-c05-")) return hypotenuseProbability(prompt);
  if (id === "g11-c02-q039") return predatorIntersection(prompt);
  if (id.startsWith("g11-c03-")) return seasonalIntersection(prompt);
  if (id === "g11-c04-q015") return residual(prompt);
  if (id === "g12-c04-q014") return accumulatedProfit(prompt);
  if (id === "g12-c04-q023") return maximumProfit(prompt);
  return null;
}

export function numericCorrectionAnswer(answer) {
  const raw = String(answer).trim().replace(/[−–—]/g, "-")
    .replace(/^(?:about\s+|t\s*(?:≈|=)\s*)/i, "")
    .replace(/\s+after January 1$/i, "")
    .replace(/\s+thousand(?: dollars?)?$/i, "")
    .replace(/\s+(?:個月|个月)$/, "");
  const simple = raw.match(/^\$?(-?\d+(?:\.\d+)?)(?:\s*(?:cm|months?|years?|dollars?))?$/i);
  if (simple) return Number(simple[1]);
  const fraction = raw.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const radical = raw.match(/^(-?\d+)√(\d+)([+-]\d+)$/);
  if (radical) return Number(radical[1]) * Math.sqrt(Number(radical[2])) + Number(radical[3]);
  return null;
}
