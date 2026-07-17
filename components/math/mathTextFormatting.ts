const mathDelimiterPattern = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|(?<![A-Za-z0-9])\$([^$\n]+?)\$/g;
const bareLogExpressionPattern = /(^|[^A-Za-z\\])\\?log_\{?([A-Za-z0-9]+)\}?\s*((?:\\?[A-Za-z]+\{[^{}]+\}|\([^)]*\)|[A-Za-z0-9]+(?:\^[A-Za-z0-9]+)?)(?:\s*(?:=|≈|<|>|≤|≥|\+|-|−|–|\*|\/|\^)\s*(?:\\?[A-Za-z]+\{[^{}]+\}|\([^)]*\)|[A-Za-z0-9]+(?:\^[A-Za-z0-9]+)?))*)/g;
const bareLogFractionProductPattern = /(^|[^A-Za-z\\])((?:\\?log_\{?[A-Za-z0-9]+\}?\s+\\frac\{[^{}]+\}\{[^{}]+\})(?:\s*(?:\\cdot|·|×|\*)\s*\\?log_\{?[A-Za-z0-9]+\}?\s+\\frac\{[^{}]+\}\{[^{}]+\})*)/g;
const compactLogExpressionPattern = /(^|[^A-Za-z])log([A-Za-z0-9]+)_([A-Za-z0-9]+)/g;
const texSymbolCommandPattern = /\\(times|div|cdot|leq|geq|neq|pm)(?![A-Za-z])/g;
const temperaturePattern = /(^|[^A-Za-z0-9])([+-]?\d+(?:\.\d+)?)\s*°\s*C\b/g;
const mathOnlyTexCommandPattern = /\\(?:frac|sqrt|log|lg|ln|sin|cos|tan|times|div|cdot|leq|geq|neq|pm|left|right)(?![A-Za-z])/;
const leftRightExpressionPattern = /((?:[0-9]+(?:\.\d+)?\s*(?:\\(?:times|div|cdot)|[+\-*/÷×])\s*)?\\left[\[\(\{][^\n]*?\\right[\]\)\}](?:\s*(?:\\(?:times|div|cdot)|[+\-*/÷×])\s*[0-9]+(?:\.\d+)?)?)/g;
const signedBareFractionPattern = /(^|[^A-Za-z\\])([+-]?\s*\\frac\{[^{}]+\}\{[^{}]+\})/g;
const unitExponentPattern = /(^|[^A-Za-z0-9\\])((?:\d+(?:\.\d+)?\s*)?)(km|cm|mm|m)(?:\^([23])|([²³]))(?=$|[^A-Za-z0-9])/gi;
const indexedRootPattern = /(^|[^A-Za-z0-9\\])\^([2-9])√\s*(\d+(?:\.\d+)?|[A-Za-z][A-Za-z0-9]*|\([^()]+\))/g;
const blankPoweredGroupPattern = /(\([^()]*_{2,}[^()]*\))(?:\^([0-9]+)|([²³]))/g;
const superscriptExponentMap: Record<string, string> = { "²": "2", "³": "3" };

type PowerCandidate = {
  start: number;
  end: number;
  source: string;
};

function currency(amount: string) {
  return `HK$${amount}`;
}

function formatCurrencyAmount(amount: string) {
  return amount.includes("\\") ? `HK$\\(${amount}\\)` : currency(amount);
}

function normalizeMalformedCurrencyText(value: string) {
  return value
    .replace(/\\\)\\\\\(([0-9][0-9,]*(?:\.\d+)?(?:\\frac\{[^{}]+\}\{[^{}]+\})?)\\\)/g, (_match, amount: string) => formatCurrencyAmount(amount))
    .replace(/\\\(\$([0-9][0-9,]*(?:\.\d+)?)\\\)/g, (_match, amount: string) => currency(amount))
    .replace(/\\\(\\\\\)([0-9][0-9,]*(?:\.\d+)?)(?:\$)?/g, (_match, amount: string) => currency(amount))
    .replace(/\\\\\(([0-9][0-9,]*(?:\.\d+)?)/g, (_match, amount: string) => currency(amount))
    .replace(/\\\\\)([0-9][0-9,]*(?:\.\d+)?)/g, (_match, amount: string) => currency(amount))
    .replace(/\\\$([0-9][0-9,]*(?:\.\d+)?)/g, (_match, amount: string) => currency(amount))
    .replace(/\\([0-9][0-9,]*(?:\.\d+)?)(?=\s|$|[.,;:，。])/g, (_match, amount: string) => currency(amount))
    .replace(/(HK\$[0-9][0-9,]*(?:\.\d+)?)\\\((?=[A-Za-z,，.。])/g, "$1 ")
    .replace(/(HK\$[0-9][0-9,]*(?:\.\d+)?)\\\)/g, "$1")
    .replace(/\\\)([0-9][0-9,]*(?:\.\d+)?)(?:\$)?\\\((?=[A-Za-z])/g, " $1 ")
    .replace(/\\\)([0-9][0-9,]*(?:\.\d+)?)(?:\$)?(?=\s|$|[.,;:)])/g, " $1")
    .replace(/([0-9])\\\((?=[A-Za-z])/g, "$1 ")
    .replace(/([A-Za-z])HK\$/g, "$1 HK$")
    .replace(/\\\)(\\frac\{[^{}]+\}\{[^{}]+\})\$/g, (_match, fraction: string) => `\\(${fraction}\\)`);
}

function normalizeControlCharacterTexArtifacts(value: string) {
  return value.replace(/\u000crac(?=\{)/g, "\\frac");
}

function normalizeWellFormedDoubleEscapedMathDelimiters(value: string) {
  return value.replace(/\\\\\(((?:(?!\\\\\(|\\\\\)|\\\(|\\\))[\s\S])+?)\\\\\)/g, (match, expression: string) => {
    const trimmed = expression.trim();
    const isNumericMath = /^[0-9][0-9,]*(?:\.\d+)?$/.test(trimmed);
    const hasMathSignal = /\\(?:frac|sqrt|log|left|right|times|div|cdot)|\^|_|=|[+\-*/÷×]/.test(trimmed);
    if (!isNumericMath && !hasMathSignal) return match;
    return `\\(${expression}\\)`;
  });
}

function normalizeDoubleEscapedMathDelimiters(value: string) {
  return value
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)");
}

function formatOutsideMathDelimiters(value: string, formatPlainText: (plainText: string) => string) {
  mathDelimiterPattern.lastIndex = 0;
  let cursor = 0;
  let next = "";
  let match: RegExpExecArray | null;

  while ((match = mathDelimiterPattern.exec(value)) !== null) {
    next += formatPlainText(value.slice(cursor, match.index));
    next += match[0];
    cursor = mathDelimiterPattern.lastIndex;
  }

  next += formatPlainText(value.slice(cursor));
  return next;
}

function formatMathOnlyPlainText(value: string) {
  const leadingWhitespace = value.match(/^\s*/)?.[0] ?? "";
  const trailingWhitespace = value.match(/\s*$/)?.[0] ?? "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 180 || !mathOnlyTexCommandPattern.test(trimmed)) return value;
  if (!/^[\\A-Za-z0-9{}_[\]^()+\-/*=<>≤≥≈.,:\s]+$/.test(trimmed)) return value;

  const allowedWords = new Set(["frac", "sqrt", "log", "lg", "ln", "sin", "cos", "tan", "times", "div", "cdot", "leq", "geq", "neq", "pm", "left", "right"]);
  const words = trimmed.match(/[A-Za-z]+/g) ?? [];
  if (words.some((word) => word.length > 1 && !allowedWords.has(word.toLowerCase()))) return value;

  return `${leadingWhitespace}\\(${trimmed}\\)${trailingWhitespace}`;
}

function formatCompactLogarithmsInPlainText(value: string) {
  return value.replace(compactLogExpressionPattern, (_match, prefix: string, base: string, expression: string) => (
    `${prefix}\\(\\log_{${base}} ${expression}\\)`
  ));
}

function formatBareLogarithmsInPlainText(value: string) {
  return value.replace(bareLogExpressionPattern, (_match, prefix: string, base: string, expression: string) => {
    const normalizedExpression = expression.replace(/[−–]/g, "-").trim();
    return `${prefix}\\(\\log_{${base}} ${normalizedExpression}\\)`;
  });
}

function formatBareLogFractionProductsInPlainText(value: string) {
  return value.replace(bareLogFractionProductPattern, (_match, prefix: string, expression: string) => {
    const normalizedExpression = expression
      .replace(/\\?log_\{?([A-Za-z0-9]+)\}?/g, "\\log_{$1}")
      .replace(/[·×]/g, "\\cdot")
      .trim();

    return `${prefix}\\(${normalizedExpression}\\)`;
  });
}

function formatBareSignedFractionsInPlainText(value: string) {
  return value.replace(signedBareFractionPattern, (_match, prefix: string, expression: string) => {
    return `${prefix}\\(${expression.replace(/\s+/g, "").trim()}\\)`;
  });
}

function formatLeftRightExpressionsInPlainText(value: string) {
  return value.replace(leftRightExpressionPattern, (expression: string) => `\\(${expression.replace(/[−–]/g, "-").trim()}\\)`);
}

function formatUnitExponentsInPlainText(value: string) {
  return value.replace(unitExponentPattern, (match, prefix: string, quantity: string, unit: string, caretExponent: string | undefined, superscriptExponent: string | undefined, offset: number, fullValue: string) => {
    const exponent = caretExponent ?? superscriptExponentMap[superscriptExponent ?? ""] ?? "";
    const coefficient = quantity.trim();
    if (unit.toLowerCase() === "m" && !coefficient) return match;
    if (unit.toLowerCase() === "m" && /[+\-−–*/×÷·]/.test(fullValue[offset + match.length] ?? "")) return match;

    const mathSource = coefficient ? `${coefficient}\\,\\text{${unit}}^{${exponent}}` : `\\text{${unit}}^{${exponent}}`;
    return `${prefix}\\(${mathSource}\\)`;
  });
}

function formatIndexedRootsInPlainText(value: string) {
  return value.replace(indexedRootPattern, (_match, prefix: string, index: string, radicand: string) => {
    const normalizedRadicand = radicand.replace(/^\((.*)\)$/, "$1").trim();
    return `${prefix}\\(\\sqrt[${index}]{${normalizedRadicand}}\\)`;
  });
}

function formatBlankPoweredGroupsInPlainText(value: string) {
  return value.replace(blankPoweredGroupPattern, (_source: string, group: string, caretExponent: string | undefined, superscriptExponent: string | undefined) => {
    const exponent = caretExponent ?? superscriptExponentMap[superscriptExponent ?? ""] ?? "";
    const normalizedGroup = group.replace(/_{2,}/g, "\\underline{\\hspace{2em}}");
    return `\\(${normalizedGroup}^{${exponent}}\\)`;
  });
}

function isAsciiLetter(char: string) {
  return /^[A-Za-z]$/.test(char);
}

function isAsciiDigit(char: string) {
  return /^[0-9]$/.test(char);
}

function isPowerBaseChar(char: string) {
  return isAsciiLetter(char) || isAsciiDigit(char) || char === ".";
}

function isPowerBoundaryChar(char: string | undefined) {
  return !char || /[\s,，.。;；:：()[\]{}<>≤≥=+*/÷×·]/.test(char);
}

function readDelimitedGroupEnd(value: string, openIndex: number, openChar: string, closeChar: string) {
  if (value[openIndex] !== openChar) return -1;

  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return -1;
}

function findMatchingGroupStart(value: string, closeIndex: number, openChar: string, closeChar: string) {
  if (value[closeIndex] !== closeChar) return -1;

  let depth = 0;
  for (let index = closeIndex; index >= 0; index -= 1) {
    const char = value[index];
    if (char === closeChar) depth += 1;
    if (char === openChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function readPowerEnd(value: string, powerIndex: number) {
  const marker = value[powerIndex];
  if (marker === "²" || marker === "³") return powerIndex + 1;
  if (marker !== "^") return -1;

  const nextChar = value[powerIndex + 1];
  if (nextChar === "{") return readBraceGroupEnd(value, powerIndex + 1);
  if (nextChar === "(") return readDelimitedGroupEnd(value, powerIndex + 1, "(", ")");

  let cursor = powerIndex + 1;
  if (value[cursor] === "+" || value[cursor] === "-") cursor += 1;
  const exponentStart = cursor;

  if (isAsciiDigit(value[cursor])) {
    while (cursor < value.length && isAsciiDigit(value[cursor])) {
      cursor += 1;
    }
    if (value[cursor] === "/" && isAsciiDigit(value[cursor + 1])) {
      cursor += 1;
      while (cursor < value.length && isAsciiDigit(value[cursor])) {
        cursor += 1;
      }
    }
    return cursor;
  }

  if (isAsciiLetter(value[cursor])) {
    while (cursor < value.length && (isAsciiLetter(value[cursor]) || isAsciiDigit(value[cursor]))) {
      cursor += 1;
    }
    return cursor;
  }

  while (cursor < value.length && isAsciiDigit(value[cursor])) {
    cursor += 1;
  }

  return cursor > exponentStart ? cursor : -1;
}

function findPowerBaseStart(value: string, powerIndex: number) {
  let baseEnd = powerIndex;
  while (baseEnd > 0 && /\s/.test(value[baseEnd - 1])) {
    baseEnd -= 1;
  }

  const previousChar = value[baseEnd - 1];
  if (previousChar === ")" || previousChar === "]") {
    const groupStart = findMatchingGroupStart(value, baseEnd - 1, previousChar === ")" ? "(" : "[", previousChar);
    return groupStart === -1 ? baseEnd - 1 : groupStart;
  }

  let start = baseEnd - 1;
  while (start >= 0 && isPowerBaseChar(value[start])) {
    start -= 1;
  }
  start += 1;

  const base = value.slice(start, baseEnd);
  const embeddedCoefficient = base.match(/^[A-Za-z]{2,}(\d[A-Za-z0-9.]*)$/);
  if (embeddedCoefficient?.[1]) {
    start = baseEnd - embeddedCoefficient[1].length;
  }

  const signIndex = start - 1;
  if ((value[signIndex] === "-" || value[signIndex] === "+") && isPowerBoundaryChar(value[signIndex - 1])) {
    start = signIndex;
  }

  return start;
}

function extendPoweredTokenRight(value: string, end: number) {
  let cursor = end;

  while (cursor < value.length && isAsciiLetter(value[cursor])) {
    const word = value.slice(cursor).match(/^[A-Za-z]+/)?.[0] ?? "";
    if (word.length > 2 && value[cursor + word.length] !== "^" && value[cursor + word.length] !== "²" && value[cursor + word.length] !== "³") {
      break;
    }

    cursor += Math.min(word.length, 2);
    if (value[cursor] === "^" || value[cursor] === "²" || value[cursor] === "³") {
      const nextPowerEnd = readPowerEnd(value, cursor);
      if (nextPowerEnd === -1) break;
      cursor = nextPowerEnd;
    }
  }

  return cursor;
}

function isSafePowerCandidate(source: string) {
  if (!source || source.includes("_") || source.includes("\\") || source.includes("____")) return false;
  if (!/(?:\^|[²³])/.test(source)) return false;
  if (!/[A-Za-z0-9)\]²³]/.test(source)) return false;
  return true;
}

function collectPowerCandidates(value: string) {
  const candidates: PowerCandidate[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "^" && char !== "²" && char !== "³") continue;

    const powerEnd = readPowerEnd(value, index);
    if (powerEnd === -1) continue;

    const start = findPowerBaseStart(value, index);
    if (start < 0 || start >= index) continue;

    const end = extendPoweredTokenRight(value, powerEnd);
    const source = value.slice(start, end);
    if (!isSafePowerCandidate(source)) continue;

    candidates.push({ start, end, source });
  }

  return candidates;
}

function selectPowerCandidates(candidates: PowerCandidate[]) {
  const selected: PowerCandidate[] = [];

  for (const candidate of [...candidates].sort((first, second) => (
    (second.end - second.start) - (first.end - first.start) || first.start - second.start
  ))) {
    if (selected.some((item) => candidate.start < item.end && candidate.end > item.start)) continue;
    selected.push(candidate);
  }

  return selected.sort((first, second) => first.start - second.start);
}

function normalizeBarePowerSource(source: string) {
  return source
    .replace(/[−–]/g, "-")
    .replace(/\s+\^/g, "^")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/\^\(([^()]+)\)/g, "^{$1}");
}

function formatBarePowerTokensInPlainText(value: string) {
  const candidates = selectPowerCandidates(collectPowerCandidates(value));
  if (!candidates.length) return value;

  let cursor = 0;
  let next = "";
  for (const candidate of candidates) {
    next += value.slice(cursor, candidate.start);
    next += `\\(${normalizeBarePowerSource(candidate.source)}\\)`;
    cursor = candidate.end;
  }

  next += value.slice(cursor);
  return next;
}

function normalizeDelimitedMathCommands(value: string) {
  return value.replace(mathDelimiterPattern, (match, bracketMath, parenMath, blockDollarMath, inlineDollarMath) => {
    const source = bracketMath ?? parenMath ?? blockDollarMath ?? inlineDollarMath;
    if (typeof source !== "string") return match;

    const normalizedSource = source
      .replace(/\\(times|div|cdot)(?=[A-Za-z])/g, (_commandMatch: string, command: string) => `\\${command} `)
      .replace(/\^\(([^()]+)\)/g, "^{$1}");
    if (normalizedSource === source) return match;
    if (typeof bracketMath === "string") return `\\[${normalizedSource}\\]`;
    if (typeof parenMath === "string") return `\\(${normalizedSource}\\)`;
    if (typeof blockDollarMath === "string") return `$$${normalizedSource}$$`;
    return `$${normalizedSource}$`;
  });
}

function readBraceGroupEnd(value: string, openBraceIndex: number) {
  if (value[openBraceIndex] !== "{") return -1;

  let depth = 0;
  for (let index = openBraceIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return -1;
}

function wrapBareCommandWithBraceGroups(value: string, command: string, groupCount: number) {
  let cursor = 0;
  let next = "";
  let commandIndex = value.indexOf(command, cursor);

  while (commandIndex !== -1) {
    let endIndex = commandIndex + command.length;
    let isCompleteCommand = true;

    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      if (value[endIndex] !== "{") {
        isCompleteCommand = false;
        break;
      }

      const groupEndIndex = readBraceGroupEnd(value, endIndex);
      if (groupEndIndex === -1) {
        isCompleteCommand = false;
        break;
      }

      endIndex = groupEndIndex;
    }

    if (isCompleteCommand) {
      next += value.slice(cursor, commandIndex);
      next += `\\(${value.slice(commandIndex, endIndex)}\\)`;
      cursor = endIndex;
    } else {
      next += value.slice(cursor, commandIndex + command.length);
      cursor = commandIndex + command.length;
    }

    commandIndex = value.indexOf(command, cursor);
  }

  next += value.slice(cursor);
  return next;
}

function formatTemperaturesInPlainText(value: string) {
  return value.replace(temperaturePattern, (_match, prefix: string, amount: string) => (
    `${prefix}\\(${amount}^{\\circ}\\text{C}\\)`
  ));
}

function formatPlainTexCommands(value: string) {
  return value
    .replace(/\\quad(?![A-Za-z])/g, " ")
    .replace(texSymbolCommandPattern, (_match, command: string) => `\\(\\${command}\\)`);
}

export function normalizeMathTextForDisplay(value: string) {
  let next = normalizeControlCharacterTexArtifacts(value);
  next = normalizeWellFormedDoubleEscapedMathDelimiters(next);
  next = normalizeMalformedCurrencyText(next);
  next = normalizeDoubleEscapedMathDelimiters(next);
  next = formatOutsideMathDelimiters(next, formatMathOnlyPlainText);
  next = formatOutsideMathDelimiters(next, formatLeftRightExpressionsInPlainText);
  next = formatOutsideMathDelimiters(next, formatCompactLogarithmsInPlainText);
  next = formatOutsideMathDelimiters(next, formatBareLogFractionProductsInPlainText);
  next = formatOutsideMathDelimiters(next, formatBareLogarithmsInPlainText);
  next = formatOutsideMathDelimiters(next, formatBareSignedFractionsInPlainText);
  next = formatOutsideMathDelimiters(next, formatUnitExponentsInPlainText);
  next = formatOutsideMathDelimiters(next, formatTemperaturesInPlainText);
  next = formatOutsideMathDelimiters(next, (plainText) => wrapBareCommandWithBraceGroups(plainText, "\\frac", 2));
  next = formatOutsideMathDelimiters(next, (plainText) => wrapBareCommandWithBraceGroups(plainText, "\\sqrt", 1));
  next = formatOutsideMathDelimiters(next, formatIndexedRootsInPlainText);
  next = formatOutsideMathDelimiters(next, formatBlankPoweredGroupsInPlainText);
  next = formatOutsideMathDelimiters(next, formatBarePowerTokensInPlainText);
  next = formatOutsideMathDelimiters(next, formatPlainTexCommands);
  next = normalizeDelimitedMathCommands(next);
  return next.replace(/\s{2,}/g, " ");
}
