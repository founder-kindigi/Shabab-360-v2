export const ADMISSION_FIELD_LIMITS = {
  emergencyContact: 120,
  emergencyPhone: 30,
  previousEducation: 200,
  reference: 120,
} as const;

export const ADMISSION_PHONE_MIN_LENGTH = 5;

export interface AdmissionAdditionalFields {
  emergencyContact: string;
  emergencyPhone: string;
  previousEducation: string;
  reference: string;
}

export function validateAdmissionAdditionalFields(
  fields: AdmissionAdditionalFields
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (fields.emergencyContact.trim().length > ADMISSION_FIELD_LIMITS.emergencyContact) {
    errors.emergencyContact = `Emergency contact must be ${ADMISSION_FIELD_LIMITS.emergencyContact} characters or fewer`;
  }

  const emergencyPhone = fields.emergencyPhone.trim();
  if (emergencyPhone.length > ADMISSION_FIELD_LIMITS.emergencyPhone) {
    errors.emergencyPhone = `Emergency phone must be ${ADMISSION_FIELD_LIMITS.emergencyPhone} characters or fewer`;
  } else if (emergencyPhone.length > 0 && emergencyPhone.length < ADMISSION_PHONE_MIN_LENGTH) {
    errors.emergencyPhone = `Emergency phone must be at least ${ADMISSION_PHONE_MIN_LENGTH} characters`;
  }

  if (fields.previousEducation.trim().length > ADMISSION_FIELD_LIMITS.previousEducation) {
    errors.previousEducation = `Previous education must be ${ADMISSION_FIELD_LIMITS.previousEducation} characters or fewer`;
  }

  if (fields.reference.trim().length > ADMISSION_FIELD_LIMITS.reference) {
    errors.reference = `Reference must be ${ADMISSION_FIELD_LIMITS.reference} characters or fewer`;
  }

  return errors;
}
