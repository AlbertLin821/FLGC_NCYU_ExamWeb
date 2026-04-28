import { describe, it, expect } from 'vitest';
import { cheatSocketStatusMessage } from './useCheatSocketStatus';

describe('cheatSocketStatusMessage', () => {
  it('三種狀態皆有明確中文文案', () => {
    expect(cheatSocketStatusMessage('connected', 'exam')).toContain('已連線');
    expect(cheatSocketStatusMessage('reconnecting', 'monitor')).toContain('重新連線中');
    expect(cheatSocketStatusMessage('disconnected', 'exam')).toContain('無法連線');
  });

  it('supports clear English monitor copy', () => {
    expect(cheatSocketStatusMessage('connected', 'monitor', 'en')).toContain('connected');
    expect(cheatSocketStatusMessage('reconnecting', 'monitor', 'en')).toContain('reconnecting');
    expect(cheatSocketStatusMessage('disconnected', 'monitor', 'en')).toContain('offline');
  });
});
