const mockInvoke = jest.fn();
jest.mock('../src/services/supabase', () => ({
  supabase: { functions: { invoke: (...args) => mockInvoke(...args) } },
}));
jest.mock('expo-iap', () => ({}));

import { syncSubscriptionWithServer, PRODUCT_IDS } from '../src/services/subscriptionService';

const JWS = 'aaa.bbb.ccc';

describe('syncSubscriptionWithServer', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('yalnızca aktif abonelik JWS\'lerini gönderir', async () => {
    mockInvoke.mockResolvedValue({ data: { premium: true }, error: null });
    const res = await syncSubscriptionWithServer([
      { productId: PRODUCT_IDS.monthly, purchaseToken: JWS },
      { productId: 'baska.urun', purchaseToken: 'x.y.z' },
      { productId: PRODUCT_IDS.yearly, purchaseToken: 'jws-degil' },
    ]);
    expect(res).toEqual({ premium: true });
    expect(mockInvoke).toHaveBeenCalledWith('verify-subscription', { body: { transactions: [JWS] } });
  });

  it('gönderilecek işlem yoksa ağa çıkmaz', async () => {
    expect(await syncSubscriptionWithServer([])).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('sunucu hatası akışı bozmaz (null döner)', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('500') });
    await expect(syncSubscriptionWithServer([{ productId: PRODUCT_IDS.monthly, purchaseToken: JWS }])).resolves.toBeNull();
  });
});
