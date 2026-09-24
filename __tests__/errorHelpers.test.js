import { isUniqueViolation, isMissingConflictTarget, isMissingRpc, normalizeError, ERROR_CODES } from '../src/services/errors';

describe('Postgres hata yardımcıları', () => {
  it('unique ihlalini koddan ya da mesajdan tanır', () => {
    expect(isUniqueViolation({ code: '23505', message: 'x' })).toBe(true);
    expect(isUniqueViolation({ message: 'duplicate key value violates unique constraint' })).toBe(true);
    expect(isUniqueViolation({ code: '42501', message: 'permission denied' })).toBe(false);
  });

  it('ON CONFLICT hedefi yok (42P10)', () => {
    expect(isMissingConflictTarget({ code: '42P10' })).toBe(true);
    expect(isMissingConflictTarget({ code: '23505' })).toBe(false);
  });

  it('RPC yok (PGRST202)', () => {
    expect(isMissingRpc({ code: 'PGRST202' })).toBe(true);
    expect(isMissingRpc({ code: 'PGRST116' })).toBe(false);
  });

  it('bilinmeyen hata UNKNOWN olur ve ham mesaj kullanıcı metnine sızmaz', () => {
    const e = normalizeError(new Error('SECRET_ENV_NAME tanımlı değil'));
    expect(e.code).toBe(ERROR_CODES.UNKNOWN);
    expect(e.userMessage).not.toMatch(/SECRET_ENV_NAME/);
  });
});
