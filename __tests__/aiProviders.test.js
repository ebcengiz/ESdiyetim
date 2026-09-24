import { FunctionsHttpError, FunctionsFetchError } from '@supabase/supabase-js';

const mockInvoke = jest.fn();
jest.mock('../src/services/supabase', () => ({
  supabase: { functions: { invoke: (...args) => mockInvoke(...args) } },
}));
jest.mock('../src/services/aiConsentService', () => ({
  assertAIConsent: jest.fn(() => Promise.resolve()),
}));

import {
  callTextWithProviderChain,
  callMealCalorieVisionChain,
  parseJsonObjectFromLlmText,
} from '../src/services/ai/providers';
import { ERROR_CODES } from '../src/services/errors';

function httpError(status, body) {
  const response = { status, json: () => Promise.resolve(body) };
  return new FunctionsHttpError(response);
}

describe('ai providers (ai-proxy istemcisi)', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('metin isteğini proxy üzerinden gönderir, anahtar göndermez', async () => {
    mockInvoke.mockResolvedValue({ data: { text: 'merhaba', provider: 'gemini' }, error: null });
    await expect(callTextWithProviderChain('soru')).resolves.toEqual({ text: 'merhaba', provider: 'gemini' });
    const [fn, opts] = mockInvoke.mock.calls[0];
    expect(fn).toBe('ai-proxy');
    expect(opts.body).toEqual({ kind: 'text', prompt: 'soru' });
  });

  it('sunucu tavanı → AI_DAILY_LIMIT', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: httpError(429, { error: 'AI_DAILY_LIMIT' }) });
    await expect(callTextWithProviderChain('x')).rejects.toMatchObject({ code: ERROR_CODES.AI_DAILY_LIMIT });
  });

  it('tanınmayan sunucu kodu → AI_UNAVAILABLE (ham kod kullanıcıya gitmez)', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: httpError(500, { error: 'SOMETHING_ELSE' }) });
    await expect(callTextWithProviderChain('x')).rejects.toMatchObject({ code: ERROR_CODES.AI_UNAVAILABLE });
  });

  it('ağ hatası → ağ kodu', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new TypeError('Network request failed')) });
    const err = await callTextWithProviderChain('x').catch((e) => e);
    expect([ERROR_CODES.NETWORK_OFFLINE, ERROR_CODES.SERVER_UNAVAILABLE]).toContain(err.code);
  });

  it('boş yanıt → AI_EMPTY_RESPONSE', async () => {
    mockInvoke.mockResolvedValue({ data: { text: '  ' }, error: null });
    await expect(callTextWithProviderChain('x')).rejects.toMatchObject({ code: ERROR_CODES.AI_EMPTY_RESPONSE });
  });

  it('görsel yanıtını yemek sonucuna çevirir', async () => {
    mockInvoke.mockResolvedValue({
      data: { text: '```json\n{"mealName":"Menemen","estimatedCalories":320,"items":[]}\n```', provider: 'gemini-vision' },
      error: null,
    });
    const res = await callMealCalorieVisionChain({ cleanMime: 'image/jpeg', cleanB64: 'AAAA', prompt: 'p' });
    expect(res).toMatchObject({ success: true, mealName: 'Menemen', estimatedCalories: 320, provider: 'gemini-vision' });
    expect(mockInvoke.mock.calls[0][1].body).toMatchObject({ kind: 'vision', mime: 'image/jpeg', b64: 'AAAA' });
  });
});

describe('parseJsonObjectFromLlmText', () => {
  it('metin içindeki JSON nesnesini ayıklar', () => {
    expect(parseJsonObjectFromLlmText('Sonuç: {"a":1} bitti')).toEqual({ a: 1 });
  });

  it('JSON yoksa AI_PARSE_FAILED', () => {
    expect(() => parseJsonObjectFromLlmText('yok')).toThrow(expect.objectContaining({ code: ERROR_CODES.AI_PARSE_FAILED }));
  });
});
