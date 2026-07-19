import {
  bubbleBurstParticles,
  cameraShakeSpec,
  catchReelSpec,
  coinFlightSpec,
  combatTextSpec,
  escapeSwimSpec,
  killBurstColors,
  killBurstParticles,
  killFlashMs,
  killLaunchMs,
  killSquashMs,
  killSquashScale,
  reducedMotionKillFadeMs,
  rippleSpec,
  type KillLaunchSpec
} from "@/lib/practiceGameJuice";

// These helpers run inside a Phaser scene but must not import phaser at
// runtime: the games load Phaser lazily with a timeout, so only the global
// namespace types may be referenced here.

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function flashSprite(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, durationMs = killFlashMs) {
  // Phaser.TintModes.FILL (1): the tint replaces the texture color, the
  // classic hit-flash. clearTint restores both color and mode.
  sprite.setTint(0xffffff).setTintMode(1);
  scene.time.delayedCall(durationMs, () => {
    if (sprite.scene) sprite.clearTint();
  });
}

export function shakeCamera(scene: Phaser.Scene) {
  scene.cameras.main.shake(cameraShakeSpec.durationMs, cameraShakeSpec.intensity);
}

export function spawnKillBurst(scene: Phaser.Scene, x: number, y: number) {
  const ring = scene.add.circle(x, y, 10, 0xffffff, 0.35).setDepth(35);
  scene.tweens.add({
    targets: ring,
    alpha: 0,
    scale: 6,
    duration: 480,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy()
  });

  killBurstParticles().forEach((spec) => {
    const color = killBurstColors[spec.colorIndex];
    const particle = spec.shape === "star"
      ? scene.add.star(x, y, 5, spec.sizePx / 2, spec.sizePx, color, 1)
      : scene.add.circle(x, y, spec.sizePx, color, 1);
    particle.setDepth(36);
    const angle = degToRad(spec.angleDeg);
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * spec.distancePx,
      y: y + Math.sin(angle) * spec.distancePx,
      alpha: 0,
      scale: 0.25,
      duration: spec.durationMs,
      ease: "Cubic.easeOut",
      onComplete: () => particle.destroy()
    });
  });
}

export function spawnCombatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  message: string,
  options: { color: string; scale?: number; depth?: number }
) {
  const text = scene.add
    .text(x, y, message, {
      fontFamily: "Arial, sans-serif",
      fontSize: `${combatTextSpec.fontSizePx}px`,
      fontStyle: "bold",
      color: options.color,
      stroke: "#0f172a",
      strokeThickness: 6
    })
    .setOrigin(0.5)
    .setDepth(options.depth ?? 40)
    .setScale(0.6);

  scene.tweens.add({
    targets: text,
    scale: options.scale ?? 1,
    duration: 140,
    ease: "Back.easeOut"
  });
  scene.tweens.add({
    targets: text,
    y: y - combatTextSpec.riseDistancePx,
    alpha: 0,
    delay: 120,
    duration: combatTextSpec.durationMs,
    ease: "Cubic.easeOut",
    onComplete: () => text.destroy()
  });
  return text;
}

export function playKillTumble(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  spec: KillLaunchSpec,
  onComplete?: () => void
) {
  scene.tweens.add({
    targets: sprite,
    scaleX: killSquashScale.x,
    scaleY: killSquashScale.y,
    duration: killSquashMs,
    ease: "Quad.easeOut",
    onComplete: () => {
      scene.tweens.add({
        targets: sprite,
        x: sprite.x + spec.driftPx,
        angle: spec.spinDeg,
        alpha: 0.4,
        duration: killLaunchMs,
        ease: "Sine.easeOut"
      });
      scene.tweens.add({
        targets: sprite,
        y: sprite.y - spec.hopPx,
        duration: Math.round(killLaunchMs * 0.35),
        ease: "Quad.easeOut",
        onComplete: () => {
          scene.tweens.add({
            targets: sprite,
            y: spec.fallToY,
            duration: Math.round(killLaunchMs * 0.65),
            ease: "Quad.easeIn",
            onComplete: () => {
              sprite.destroy();
              onComplete?.();
            }
          });
        }
      });
    }
  });
}

export function fadeOutKill(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, onComplete?: () => void) {
  scene.tweens.add({
    targets: sprite,
    alpha: 0,
    scaleY: 0.6,
    duration: reducedMotionKillFadeMs,
    ease: "Quad.easeOut",
    onComplete: () => {
      sprite.destroy();
      onComplete?.();
    }
  });
}

export function spawnRippleRings(scene: Phaser.Scene, x: number, y: number) {
  for (let index = 0; index < rippleSpec.rings; index += 1) {
    scene.time.delayedCall(index * rippleSpec.ringDelayMs, () => {
      const ring = scene.add.circle(x, y, rippleSpec.startRadiusPx).setStrokeStyle(3, 0xe0f2fe, 0.8).setDepth(14);
      scene.tweens.add({
        targets: ring,
        scale: rippleSpec.maxScale,
        alpha: 0,
        duration: rippleSpec.durationMs,
        ease: "Sine.easeOut",
        onComplete: () => ring.destroy()
      });
    });
  }
}

export function spawnBubbleBurst(scene: Phaser.Scene, x: number, y: number, count = 10) {
  bubbleBurstParticles(count).forEach((bubble) => {
    scene.time.delayedCall(bubble.delayMs, () => {
      const circle = scene.add.circle(x + bubble.offsetX, y, bubble.sizePx, 0xe0f2fe, 0.55).setDepth(13);
      scene.tweens.add({
        targets: circle,
        y: y - bubble.risePx,
        alpha: 0,
        duration: bubble.durationMs,
        ease: "Sine.easeOut",
        onComplete: () => circle.destroy()
      });
    });
  });
}

export function playStruggleWiggle(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, onComplete: () => void) {
  scene.tweens.add({
    targets: sprite,
    angle: catchReelSpec.struggleWiggleAngleDeg,
    duration: catchReelSpec.struggleWigglePeriodMs,
    yoyo: true,
    repeat: catchReelSpec.struggleRepeats,
    ease: "Sine.easeInOut",
    onComplete: () => {
      sprite.setAngle(0);
      onComplete();
    }
  });
}

// Reels the sprite along a sagging rope curve toward the cannon; the caller
// redraws rope/net per frame via onUpdate so the drawing stays game-owned.
export function playReelIn(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  to: { x: number; y: number },
  onUpdate: (x: number, y: number, progress: number) => void,
  onComplete: () => void
) {
  const startX = sprite.x;
  const startY = sprite.y;
  const controlX = (startX + to.x) / 2;
  const controlY = Math.max(startY, to.y) + catchReelSpec.ropeSagPx;
  let lastBubbleAt = 0;

  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: catchReelSpec.reelMs,
    ease: "Sine.easeIn",
    onUpdate: (tween) => {
      const progress = Number(tween.getValue() ?? 0);
      const inverse = 1 - progress;
      const x = inverse * inverse * startX + 2 * inverse * progress * controlX + progress * progress * to.x;
      const y = inverse * inverse * startY + 2 * inverse * progress * controlY + progress * progress * to.y;
      sprite.setPosition(x, y);
      sprite.setScale(1 - 0.25 * progress);
      const now = scene.time.now;
      if (now - lastBubbleAt >= catchReelSpec.bubbleEveryMs) {
        lastBubbleAt = now;
        const bubble = scene.add.circle(x, y + 10, 3, 0xe0f2fe, 0.5).setDepth(13);
        scene.tweens.add({
          targets: bubble,
          y: y - 26,
          alpha: 0,
          duration: 420,
          ease: "Sine.easeOut",
          onComplete: () => bubble.destroy()
        });
      }
      onUpdate(x, y, progress);
    },
    onComplete
  });
}

// The one that got away: a cosmetic copy of the caught species swims off
// screen with a taunting wiggle.
export function playEscapeSwim(scene: Phaser.Scene, fromX: number, fromY: number, textureKey: string, offscreenX: number) {
  const fish = scene.add.image(fromX, fromY, textureKey).setDepth(16).setFlipX(offscreenX < fromX);
  scene.tweens.add({
    targets: fish,
    angle: { from: -escapeSwimSpec.wiggleAngleDeg, to: escapeSwimSpec.wiggleAngleDeg },
    duration: 130,
    yoyo: true,
    repeat: Math.ceil(escapeSwimSpec.durationMs / 260)
  });
  scene.tweens.add({
    targets: fish,
    x: offscreenX,
    y: fromY - 24,
    alpha: 0.25,
    duration: escapeSwimSpec.durationMs,
    ease: "Quad.easeIn",
    onComplete: () => fish.destroy()
  });
}

export function spawnCoinFly(scene: Phaser.Scene, worldX: number, worldY: number, count: number, textureKey: string) {
  const camera = scene.cameras.main;
  const startX = worldX - camera.scrollX;
  const startY = worldY - camera.scrollY;
  const endX = camera.width - coinFlightSpec.hudOffset.x;
  const endY = coinFlightSpec.hudOffset.y;
  const controlX = (startX + endX) / 2;
  const controlY = Math.min(startY, endY) - coinFlightSpec.arcLiftPx;

  for (let index = 0; index < count; index += 1) {
    const coin = scene.add.image(startX, startY, textureKey).setScrollFactor(0).setDepth(45).setScale(0.9);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: coinFlightSpec.durationMs,
      delay: index * coinFlightSpec.staggerMs,
      ease: "Sine.easeIn",
      onUpdate: (tween) => {
        const progress = Number(tween.getValue() ?? 0);
        const inverse = 1 - progress;
        coin.x = inverse * inverse * startX + 2 * inverse * progress * controlX + progress * progress * endX;
        coin.y = inverse * inverse * startY + 2 * inverse * progress * controlY + progress * progress * endY;
        coin.setScale(0.9 - 0.4 * progress);
      },
      onComplete: () => coin.destroy()
    });
  }
}
