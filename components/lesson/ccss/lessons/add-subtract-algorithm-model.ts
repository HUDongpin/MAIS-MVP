export type ThreeDigitColumns = [hundreds: number, tens: number, ones: number];

export type SubtractionRegrouping = {
  originalDigits: ThreeDigitColumns;
  renamedDigits: ThreeDigitColumns;
  renamedValue: number;
  borrowedAcrossZero: boolean;
};

function digits(n: number): ThreeDigitColumns {
  return [Math.floor(n / 100), Math.floor((n / 10) % 10), n % 10];
}

/**
 * Renames a three-digit minuend by place value so every subtraction column can
 * be evaluated without pretending the source digit stayed unchanged.
 */
export function buildSubtractionRegrouping(
  minuend: number,
  subtrahend: number,
): SubtractionRegrouping {
  if (!Number.isInteger(minuend) || !Number.isInteger(subtrahend)) {
    throw new TypeError("Subtraction regrouping requires whole numbers.");
  }
  if (minuend < 100 || minuend > 999 || subtrahend < 0 || subtrahend > minuend) {
    throw new RangeError("Subtraction regrouping requires 0 ≤ subtrahend ≤ minuend ≤ 999 and a three-digit minuend.");
  }

  const originalDigits = digits(minuend);
  const bottomDigits = digits(subtrahend);
  const renamedDigits: ThreeDigitColumns = [...originalDigits];
  let borrowedAcrossZero = false;

  if (renamedDigits[2] < bottomDigits[2]) {
    if (renamedDigits[1] === 0) {
      renamedDigits[0] -= 1;
      renamedDigits[1] += 10;
      borrowedAcrossZero = true;
    }
    renamedDigits[1] -= 1;
    renamedDigits[2] += 10;
  }

  if (renamedDigits[1] < bottomDigits[1]) {
    renamedDigits[0] -= 1;
    renamedDigits[1] += 10;
  }

  return {
    originalDigits,
    renamedDigits,
    renamedValue:
      renamedDigits[0] * 100 + renamedDigits[1] * 10 + renamedDigits[2],
    borrowedAcrossZero,
  };
}
