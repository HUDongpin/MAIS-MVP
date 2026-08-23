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
export interface MathJsonFunction extends ReadonlyArray<MathJsonExpr> {
  readonly 0: string;
}

export type MathJsonExpr =
  | number
  | string
  | MathJsonFunction
  | { readonly [key: string]: JsonValue };

export interface ExactValueDto {
  readonly schemaVersion: 1;
  readonly mathJson: MathJsonExpr;
  readonly latex: string;
  readonly decimal: string | null;
  readonly approx: number | null;
}

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

export interface IntervalWitnessDto {
  readonly kind: IntervalWitnessKind;
  readonly parameters: Readonly<Record<string, ExactValueDto>>;
  readonly note: string | null;
}

export type IntervalEndpointDto =
  | {
      readonly kind: "finite";
      readonly value: ExactValueDto;
      readonly closed: boolean;
      readonly witness: IntervalWitnessDto | null;
    }
  | {
      readonly kind: "negative-infinity" | "positive-infinity";
      readonly value: null;
      readonly closed: false;
      readonly witness: IntervalWitnessDto | null;
    };
