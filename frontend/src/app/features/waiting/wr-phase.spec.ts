import { describe, expect, it } from 'vitest';
import { resolveWrPhase } from './wr-phase';

describe('resolveWrPhase', () => {
  it('routes pre-start gathering to waiting', () => {
    expect(resolveWrPhase('players', false)).toBe('waiting');
  });

  it('routes inter-session lobby to transition', () => {
    expect(resolveWrPhase('players', true)).toBe('transition');
  });

  it('routes vote phases to transition', () => {
    expect(resolveWrPhase('voting', true)).toBe('transition');
    expect(resolveWrPhase('tieBreak', true)).toBe('transition');
    expect(resolveWrPhase('voteResult', true)).toBe('transition');
    expect(resolveWrPhase('sessionResult', true)).toBe('transition');
  });

  it('routes final phases to final', () => {
    expect(resolveWrPhase('podium', true)).toBe('final');
    expect(resolveWrPhase('gallery', true)).toBe('final');
  });
});
