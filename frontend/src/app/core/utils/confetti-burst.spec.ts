import { describe, expect, it } from 'vitest';
import { fireVoteWinnerConfetti } from './confetti-burst';

describe('fireVoteWinnerConfetti', () => {
  it('does not throw without window', () => {
    const original = globalThis.window;
    // @ts-expect-error test SSR-like env
    delete globalThis.window;
    expect(() => fireVoteWinnerConfetti()).not.toThrow();
    globalThis.window = original;
  });
});
