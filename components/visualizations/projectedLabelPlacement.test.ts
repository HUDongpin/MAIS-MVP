import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectedLabelPlacement } from "./three/manim/mathProjectedLabelPlacement";

const viewport = { width: 320, height: 180 };

test("projected HTML labels use inward anchors at every canvas edge", () => {
  assert.deepEqual(buildProjectedLabelPlacement([0, 0], viewport), {
    bounds: { bottom: 88, height: 80, left: 8, right: 200, top: 8, width: 192 },
    horizontalAnchor: "start",
    left: "8.00px",
    maxHeight: "80.00px",
    maxWidth: "192.00px",
    top: "8.00px",
    transform: "translate(0%, 0%)",
    verticalAnchor: "start"
  });
  assert.deepEqual(buildProjectedLabelPlacement([320, 180], viewport), {
    bounds: { bottom: 172, height: 80, left: 120, right: 312, top: 92, width: 192 },
    horizontalAnchor: "end",
    left: "312.00px",
    maxHeight: "80.00px",
    maxWidth: "192.00px",
    top: "172.00px",
    transform: "translate(-100%, -100%)",
    verticalAnchor: "end"
  });
});

test("projected HTML labels remain centered away from edge guard bands", () => {
  assert.deepEqual(buildProjectedLabelPlacement([160, 90], viewport), {
    bounds: { bottom: 130, height: 80, left: 64, right: 256, top: 50, width: 192 },
    horizontalAnchor: "center",
    left: "160.00px",
    maxHeight: "80.00px",
    maxWidth: "192.00px",
    top: "90.00px",
    transform: "translate(-50%, -50%)",
    verticalAnchor: "center"
  });
  assert.equal(buildProjectedLabelPlacement([100, 41], viewport).horizontalAnchor, "start");
  assert.equal(buildProjectedLabelPlacement([105, 49], viewport).horizontalAnchor, "center");
  assert.equal(buildProjectedLabelPlacement([105, 41], viewport).verticalAnchor, "start");
  assert.equal(buildProjectedLabelPlacement([105, 49], viewport).verticalAnchor, "center");
});

test("projected HTML label positions clamp scene overshoot to safe edges", () => {
  const placement = buildProjectedLabelPlacement([-50, 250], viewport);
  assert.equal(placement.horizontalAnchor, "start");
  assert.equal(placement.verticalAnchor, "end");
  assert.equal(placement.left, "8.00px");
  assert.equal(placement.top, "172.00px");
  assert.equal(placement.transform, "translate(0%, -100%)");
});

test("every projected point keeps the maximum label box inside the eight-pixel gutter", () => {
  for (let x = -32; x <= viewport.width + 32; x += 1) {
    for (let y = -16; y <= viewport.height + 16; y += 1) {
      const placement = buildProjectedLabelPlacement([x, y], viewport);
      const placedX = Number.parseFloat(placement.left);
      const placedY = Number.parseFloat(placement.top);
      const width = Number.parseFloat(placement.maxWidth);
      const height = Number.parseFloat(placement.maxHeight);
      const left = placement.horizontalAnchor === "start"
        ? placedX
        : placement.horizontalAnchor === "end"
          ? placedX - width
          : placedX - width / 2;
      const top = placement.verticalAnchor === "start"
        ? placedY
        : placement.verticalAnchor === "end"
          ? placedY - height
          : placedY - height / 2;

      assert.ok(left >= 8, `left=${left} at ${x},${y}`);
      assert.ok(left + width <= viewport.width - 8, `right=${left + width} at ${x},${y}`);
      assert.ok(top >= 8, `top=${top} at ${x},${y}`);
      assert.ok(top + height <= viewport.height - 8, `bottom=${top + height} at ${x},${y}`);
    }
  }
});

test("projected label bounds describe the same final clamped placement used by CSS", () => {
  const placement = buildProjectedLabelPlacement([0, 0], viewport);

  assert.deepEqual(placement.bounds, {
    bottom: 88,
    height: 80,
    left: 8,
    right: 200,
    top: 8,
    width: 192
  });
});
