import { toDateString } from '../src/utils/date';

describe('toDateString', () => {
  it('YEREL takvim gününü döner (UTC değil)', () => {
    // Yerel saatle 23:30 — UTC+3'te toISOString bir önceki güne kayardı
    const d = new Date(2026, 8, 17, 23, 30);
    expect(toDateString(d)).toBe('2026-09-17');
  });

  it('gün ve ayı sıfırla doldurur', () => {
    expect(toDateString(new Date(2026, 0, 5, 1, 0))).toBe('2026-01-05');
  });
});
