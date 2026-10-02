(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StackCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RULES = Object.freeze({
    worldWidth: 480,
    edge: 18,
    baseLeft: 120,
    baseWidth: 240,
    initialSpeed: 90,
    speedPerLayer: 3,
    maximumSpeed: 150,
    settleDuration: 0.45,
    warningDuration: 1.3,
    wobbleAmplitude: 15,
    wobblePeriod: 2.8,
    shieldSpeedFactor: 0.68,
    shieldDrops: 2
  });

  function modeName(mode) {
    return mode === 'challenge' || mode === 18 || mode === '18' ? 'challenge' : 'intro';
  }

  function smoothstep(t) {
    const u = Math.max(0, Math.min(1, t));
    return u * u * (3 - 2 * u);
  }

  class Game {
    constructor(mode) {
      this._eventId = 0;
      this.restart(mode);
    }

    restart(mode) {
      const selected = modeName(mode === undefined && this.state ? this.state.mode : mode);
      this._landingOffset = 0;
      this.state = {
        mode: selected,
        target: selected === 'challenge' ? 18 : 12,
        height: 0,
        nextHeight: 1,
        phase: 'moving',
        paused: false,
        time: 0,
        elapsed: 0,
        stageTime: 0,
        speed: RULES.initialSpeed,
        baseSpeed: RULES.initialSpeed,
        streak: 0,
        shield: 0,
        perfectCount: 0,
        wobbleScheduled: false,
        wobblePhase: 'none',
        layers: [{ left: RULES.baseLeft, width: RULES.baseWidth, perfect: false, pose: 0 }],
        mover: null,
        lastEvent: null
      };
      this._spawn();
      this._event('start', { mode: selected });
      return this.state;
    }

    _event(kind, details) {
      const event = Object.assign({ id: ++this._eventId, kind, height: this.state.height }, details || {});
      this.state.lastEvent = event;
      return event;
    }

    _spawn() {
      const s = this.state;
      const top = s.layers[s.layers.length - 1];
      s.phase = 'moving';
      s.stageTime = 0;
      s.nextHeight = s.height + 1;
      s.baseSpeed = Math.min(RULES.maximumSpeed, RULES.initialSpeed + s.height * RULES.speedPerLayer);
      s.speed = s.baseSpeed * (s.shield > 0 ? RULES.shieldSpeedFactor : 1);
      s.wobbleScheduled = s.nextHeight % 5 === 0;
      s.wobblePhase = s.wobbleScheduled ? (s.shield > 0 ? 'steady' : 'warning') : 'none';
      s.mover = {
        left: s.height % 2 === 0 ? RULES.edge : RULES.worldWidth - RULES.edge - top.width,
        width: top.width,
        direction: s.height % 2 === 0 ? 1 : -1,
        pose: s.height % 3
      };
      this._landingOffset = 0;
    }

    // The renderer must add this value to EVERY settled layer's local left.
    // The incoming mover uses world coordinates and does not follow this offset.
    supportOffset() {
      const s = this.state;
      if (s.phase === 'settling') {
        return this._landingOffset * (1 - smoothstep(s.stageTime / RULES.settleDuration));
      }
      if (s.phase === 'won' || s.phase === 'lost') return this._landingOffset;
      if (!s.wobbleScheduled || s.shield > 0 || s.stageTime <= RULES.warningDuration) return 0;
      const t = s.stageTime - RULES.warningDuration;
      // Starts at rest with a soft amplitude ramp, so the warning ends without a jump.
      const ramp = smoothstep(t / 0.55);
      return Math.sin(t * Math.PI * 2 / RULES.wobblePeriod) * RULES.wobbleAmplitude * ramp;
    }

    perfectTolerance() {
      const width = this.state.mover ? this.state.mover.width : this.state.layers[this.state.layers.length - 1].width;
      return this.state.shield > 0
        ? Math.max(8, Math.min(18, width * 0.08))
        : Math.max(5, Math.min(12, width * 0.05));
    }

    canDrop() {
      const s = this.state;
      return !s.paused && s.phase === 'moving'
        && (!s.wobbleScheduled || s.shield > 0 || s.stageTime + 1e-9 >= RULES.warningDuration);
    }

    pause() {
      if (this.state.paused || !['moving', 'settling'].includes(this.state.phase)) return false;
      this.state.paused = true;
      return true;
    }

    resume() {
      if (!this.state.paused) return false;
      this.state.paused = false;
      return true;
    }

    // dt is seconds. Analytic ping-pong movement preserves distance through any
    // number of reflections, independent of the caller's frame partitioning.
    step(dt) {
      const s = this.state;
      if (!Number.isFinite(dt) || dt <= 0 || s.paused || s.phase === 'lost' || s.phase === 'won') return;
      let remaining = dt;
      while (remaining > 0) {
        if (s.phase === 'settling') {
          const segment = Math.min(remaining, Math.max(0, RULES.settleDuration - s.stageTime));
          s.stageTime += segment;
          s.time += segment;
          s.elapsed += segment;
          remaining -= segment;
          if (s.stageTime >= RULES.settleDuration - 1e-12) this._spawn();
          else break;
        } else if (s.phase === 'moving') {
          s.stageTime += remaining;
          s.time += remaining;
          s.elapsed += remaining;
          const min = RULES.edge;
          const span = RULES.worldWidth - RULES.edge * 2 - s.mover.width;
          const cycle = span * 2;
          const local = s.mover.left - min;
          const unfolded = (s.mover.direction > 0 ? local : cycle - local) + s.speed * remaining;
          const wrapped = ((unfolded % cycle) + cycle) % cycle;
          s.mover.left = min + (wrapped <= span ? wrapped : cycle - wrapped);
          s.mover.direction = wrapped < span ? 1 : -1;
          s.wobblePhase = !s.wobbleScheduled ? 'none'
            : s.shield > 0 ? 'steady'
              : s.stageTime + 1e-9 < RULES.warningDuration ? 'warning' : 'shaking';
          remaining = 0;
        } else break;
      }
    }

    drop() {
      const s = this.state;
      if (!this.canDrop()) return false;
      const top = s.layers[s.layers.length - 1];
      const mover = s.mover;
      const offset = this.supportOffset();
      const supportLeft = top.left + offset;
      const supportRight = supportLeft + top.width;
      const overlapLeft = Math.max(mover.left, supportLeft);
      const overlapRight = Math.min(mover.left + mover.width, supportRight);
      const overlap = overlapRight - overlapLeft;
      const dropLeft = mover.left;
      const incomingWidth = mover.width;
      const shieldUsed = s.shield > 0;
      this._landingOffset = offset;

      // Even an active perfect allowance cannot catch a cushion with no overlap.
      if (overlap <= 0) {
        s.phase = 'lost';
        s.streak = 0;
        s.stageTime = 0;
        s.wobblePhase = 'none';
        return this._event('lost', {
          dropLeft, incomingWidth, supportLeft, offset,
          lostWidth: incomingWidth, perfect: false, shieldUsed,
          cut: { left: dropLeft, width: incomingWidth }
        });
      }

      const perfect = Math.abs(mover.left - supportLeft) <= this.perfectTolerance();
      const keptLeft = perfect ? supportLeft : overlapLeft;
      const keptWidth = perfect ? top.width : overlap;
      const lostWidth = Math.max(0, incomingWidth - keptWidth);
      const cut = lostWidth > 0 ? {
        left: mover.left < supportLeft ? mover.left : overlapRight,
        width: lostWidth,
        side: mover.left < supportLeft ? -1 : 1
      } : null;

      if (shieldUsed) s.shield -= 1;
      s.streak = perfect ? s.streak + 1 : 0;
      if (perfect) s.perfectCount += 1;
      const shieldAwarded = s.streak === 3;
      if (shieldAwarded) {
        s.shield = RULES.shieldDrops;
        s.streak = 0;
      }
      s.height += 1;
      s.layers.push({ left: keptLeft - offset, width: keptWidth, perfect, pose: mover.pose });
      s.mover = { left: keptLeft, width: keptWidth, direction: mover.direction, pose: mover.pose };
      s.phase = s.height >= s.target ? 'won' : 'settling';
      s.stageTime = 0;
      s.wobblePhase = 'none';
      return this._event(s.phase === 'won' ? 'won' : perfect ? 'perfect' : 'land', {
        dropLeft, incomingWidth, supportLeft, offset, keptLeft, keptWidth,
        lostWidth, cut, perfect, shieldUsed, shieldAwarded,
        shieldRemaining: s.shield, elapsed: s.elapsed
      });
    }
  }

  return Object.freeze({ Game, RULES });
});
