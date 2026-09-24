jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDailyUsageCount,
  hasReachedDailyLimit,
  incrementDailyUsage,
  addDailyBonus,
} from '../src/services/dailyUsageService';

describe('dailyUsageService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 25, 10, 0));
  });

  afterEach(() => jest.useRealTimers());

  it('sayaç artar ve limit ödüllü bonusla genişler', async () => {
    await incrementDailyUsage('ai_search');
    expect(await hasReachedDailyLimit('ai_search', 1)).toBe(true);
    await addDailyBonus('ai_search');
    expect(await hasReachedDailyLimit('ai_search', 1)).toBe(false);
  });

  it('yerel gece yarısında sıfırlanır (UTC 21:00 değil, yerel 00:00)', async () => {
    jest.setSystemTime(new Date(2026, 8, 25, 23, 59));
    await incrementDailyUsage('ai_search');
    expect(await getDailyUsageCount('ai_search')).toBe(1);

    jest.setSystemTime(new Date(2026, 8, 26, 0, 1));
    expect(await getDailyUsageCount('ai_search')).toBe(0);
  });
});
