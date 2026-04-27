import { describe, it, expect } from 'vitest';
import { normalizeServerOrigin } from './api';

describe('normalizeServerOrigin', () => {
  it('defaults to current browser origin when env is missing', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: { location: { origin: 'https://ncyulanguageexam.com' } },
      configurable: true,
    });
    expect(normalizeServerOrigin(undefined)).toBe('https://ncyulanguageexam.com');
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    });
  });

  it('strips trailing /api', () => {
    expect(normalizeServerOrigin('http://localhost:3000/api')).toBe('http://localhost:3000');
    expect(normalizeServerOrigin('http://localhost:3000/api/')).toBe('http://localhost:3000');
  });

  it('preserves origin without /api', () => {
    expect(normalizeServerOrigin('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
  });

  it('replaces localhost env with current site origin on deployed host', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          origin: 'https://ncyulanguageexam.com',
          hostname: 'ncyulanguageexam.com',
        },
      },
      configurable: true,
    });
    expect(normalizeServerOrigin('http://localhost:3000')).toBe('https://ncyulanguageexam.com');
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    });
  });
});
