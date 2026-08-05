import { describe, it, expect } from 'vitest';
import { generateWhatsAppDeepLink } from '../whatsapp';

describe('V2-301 Safe WhatsApp Deep Link Generator', () => {
  it('generates a valid WhatsApp deep link for assigned callers', () => {
    const res = generateWhatsAppDeepLink({
      phone: '03001234567',
      templateMessage: 'Assalam-o-Alaikum, this is Shabab 360.',
      callerScopeId: 'caller_101',
      assignedCallerId: 'caller_101',
    });

    expect(res.isAuthorized).toBe(true);
    expect(res.formattedPhone).toBe('+923001234567');
    expect(res.url).toContain('https://wa.me/923001234567');
    expect(res.url).toContain('text=Assalam-o-Alaikum');
  });

  it('rejects access when callerScopeId does not match assignedCallerId', () => {
    const res = generateWhatsAppDeepLink({
      phone: '03001234567',
      callerScopeId: 'caller_unauthorized_99',
      assignedCallerId: 'caller_101',
    });

    expect(res.isAuthorized).toBe(false);
    expect(res.url).toBe('');
    expect(res.error).toContain('UNAUTHORIZED: Calling PII and WhatsApp deep links are restricted');
  });

  it('handles invalid phone numbers cleanly', () => {
    const res = generateWhatsAppDeepLink({
      phone: '123',
    });

    expect(res.isAuthorized).toBe(false);
    expect(res.error).toBe('Invalid phone number format for WhatsApp link.');
  });
});
