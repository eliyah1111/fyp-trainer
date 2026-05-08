import { DEFAULTS } from "../config/defaults.js";
import { chance, randomInt, sleep } from "../utils/random.js";

export class Humanizer {
  constructor(options = {}) {
    this.timing = { ...DEFAULTS.timing, ...options.timing };
    this.enabled = options.enabled !== false;
  }

  async pause(minMs = this.timing.pagePauseMinMs, maxMs = this.timing.pagePauseMaxMs) {
    if (!this.enabled) return;
    await sleep(randomInt(minMs, maxMs));
  }

  typingDelay() {
    return randomInt(this.timing.searchTypingDelayMinMs, this.timing.searchTypingDelayMaxMs);
  }

  watchDuration(score = 0) {
    if (score > 0.35) {
      return randomInt(this.timing.interestedWatchMinMs, this.timing.interestedWatchMaxMs);
    }
    if (score < -0.25) {
      return randomInt(this.timing.skipWatchMinMs, this.timing.skipWatchMaxMs);
    }
    return randomInt(this.timing.neutralWatchMinMs, this.timing.neutralWatchMaxMs);
  }

  async moveMouse(page) {
    if (!this.enabled || !chance(0.42)) return;
    const viewport = page.viewportSize() || { width: 1280, height: 900 };
    await page.mouse.move(
      randomInt(Math.floor(viewport.width * 0.25), Math.floor(viewport.width * 0.75)),
      randomInt(Math.floor(viewport.height * 0.18), Math.floor(viewport.height * 0.82)),
      { steps: randomInt(5, 14) }
    );
  }

  async smallScroll(page) {
    if (!this.enabled || !chance(0.35)) return;
    const viewport = page.viewportSize() || { width: 1280, height: 900 };
    await page.mouse.wheel(
      randomInt(-20, 24),
      randomInt(Math.floor(viewport.height * 0.08), Math.floor(viewport.height * 0.22))
    );
  }

  async watch(page, durationMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < durationMs) {
      await this.moveMouse(page);
      if (chance(0.25)) await this.smallScroll(page);
      await this.pause(this.timing.watchPulseMinMs, this.timing.watchPulseMaxMs);
    }
  }
}
