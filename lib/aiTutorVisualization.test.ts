import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAITutorVisualization } from "./aiTutorVisualization";

test("accepts a safe quadratic function graph visualization", () => {
  assert.deepEqual(
    normalizeAITutorVisualization({
      tool: "show_function_graph",
      parameters: { a: 1, b: -4, c: 3 }
    }),
    {
      tool: "show_function_graph",
      parameters: { a: 1, b: -4, c: 3 }
    }
  );
});

test("accepts boundary-safe coefficient values", () => {
  assert.deepEqual(
    normalizeAITutorVisualization({
      tool: "show_function_graph",
      parameters: { a: -3, b: 6, c: -8 }
    }),
    {
      tool: "show_function_graph",
      parameters: { a: -3, b: 6, c: -8 }
    }
  );
});

test("rejects missing, zero, non-finite, and out-of-range coefficients", () => {
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { b: -4, c: 3 } }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: 0, b: -4, c: 3 } }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: 0.00001, b: -4, c: 3 } }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: 1, b: Number.NaN, c: 3 } }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: "1", b: -4, c: 3 } }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: 4, b: -4, c: 3 } }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: 1, b: -7, c: 3 } }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: 1, b: -4, c: 9 } }), undefined);
});

test("rejects unknown tools and executable-looking extra fields", () => {
  assert.equal(normalizeAITutorVisualization(null), undefined);
  assert.equal(normalizeAITutorVisualization([{ tool: "show_function_graph", parameters: { a: 1, b: -4, c: 3 } }]), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "draw_svg", parameters: { a: 1, b: -4, c: 3 } }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: 1, b: -4, c: 3 }, html: "<svg />" }), undefined);
  assert.equal(normalizeAITutorVisualization({ tool: "show_function_graph", parameters: { a: 1, b: -4, c: 3, svg: "<svg />" } }), undefined);
});
