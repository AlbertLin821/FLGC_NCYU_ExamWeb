import { describe, it, expect } from 'vitest';
import { normalizeServerOrigin } from './api';

describe('normalizeServerOrigin', () => {
  it('defaults to localhost:3000', () => {
    expect(normalizeServerOrigin(undefined)).toBe('http://localhost:3000');
  });

  it('strips trailing /api', () => {
    expect(normalizeServerOrigin('http://localhost:3000/api')).toBe('http://localhost:3000');
    expect(normalizeServerOrigin('http://localhost:3000/api/')).toBe('http://localhost:3000');
  });

  it('preserves origin without /api', () => {
    expect(normalizeServerOrigin('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
  });
});
