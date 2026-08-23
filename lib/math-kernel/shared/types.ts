import type { KernelErrorDto } from "./errors";

export type JsonPrimitive = null | boolean | number | string;

export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * MAIS-owned, JSON-safe representation of a MathJSON expression.
 *
 * This deliberately does not expose Compute Engine classes or other
 * third-party runtime values. Object-form MathJSON remains JSON data and is
 * checked by validateMathJson() before entering the CAS boundary.
 */
export type MathJsonExpr = JsonValue;

export interface ExactValueDto {
  readonly schemaVersion: 1;
  readonly mathJson: MathJsonExpr;
  readonly latex: string;
  readonly decimal: string | null;
  readonly approx: number | null;
}

export type ExactComparison = "equal" | "not-equal" | "unknown";

export type KernelResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: KernelErrorDto };

export interface SolutionStepDto {
  readonly id: string;
  readonly title: string;
  readonly explanation: string;
  readonly value: ExactValueDto | null;
}

export type IntervalWitnessKind = "attained" | "limit" | "excluded";

export interface RangeWitnessDto {
  readonly kind: IntervalWitnessKind;
  readonly parameters: Readonly<Record<string, ExactValueDto>>;
  readonly note: string | null;
}

export type ExactEndpointDto =
  | {
      readonly kind: "finite";
      readonly value: ExactValueDto;
      readonly closed: boolean;
      readonly witnesses: readonly RangeWitnessDto[];
    }
  | {
      readonly kind: "infinity";
      readonly sign: -1 | 1;
      readonly closed: false;
    };

export interface ExactIntervalDto {
  readonly lower: ExactEndpointDto;
  readonly upper: ExactEndpointDto;
}

/** @deprecated Use RangeWitnessDto. */
export type IntervalWitnessDto = RangeWitnessDto;

/** @deprecated Use ExactEndpointDto. */
export type IntervalEndpointDto = ExactEndpointDto;
