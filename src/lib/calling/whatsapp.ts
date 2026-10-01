/**
 * Shabab 360 - Safe WhatsApp Deep Link Generator (V2-301)
 * Generates safe WhatsApp deep links for assigned callers without exposing raw PII outside scope.
 */

export interface WhatsAppDeepLinkOptions {
  phone: string;
  templateMessage?: string;
  applicantName?: string;
  cityScopeId?: string;
  callerScopeId?: string;
  assignedCallerId?: string;
}

export function generateWhatsAppDeepLink(options: WhatsAppDeepLinkOptions): {
  url: string;
  formattedPhone: string;
  isAuthorized: boolean;
  error?: string;
} {
  const { phone, templateMessage, callerScopeId, assignedCallerId } = options;

  // Caller Authorization Guard: Verify requesting caller is assigned
  if (callerScopeId && assignedCallerId && callerScopeId !== assignedCallerId) {
    return {
      url: '',
      formattedPhone: '',
      isAuthorized: false,
      error: 'UNAUTHORIZED: Calling PII and WhatsApp deep links are restricted to the assigned caller.',
    };
  }

  // Normalize Pakistani mobile format (convert 03XX... to 923XX...)
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.substring(1);
  } else if (cleaned.startsWith('3')) {
    cleaned = '92' + cleaned;
  }

  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      url: '',
      formattedPhone: cleaned,
      isAuthorized: false,
      error: 'Invalid phone number format for WhatsApp link.',
    };
  }

  const encodedText = templateMessage ? encodeURIComponent(templateMessage.trim()) : '';
  const url = `https://wa.me/${cleaned}${encodedText ? `?text=${encodedText}` : ''}`;

  return {
    url,
    formattedPhone: `+${cleaned}`,
    isAuthorized: true,
  };
}
