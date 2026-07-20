import { z } from "zod";

import {
  ADMISSION_FIELD_LIMITS,
  ADMISSION_PHONE_MIN_LENGTH,
} from "@/lib/admissions/fields";

function optionalTrimmedText(label: string, maxLength: number) {
  return z
    .union([
      z.string().trim().max(maxLength, `${label} must be ${maxLength} characters or fewer`),
      z.null(),
    ])
    .optional()
    .transform((value) => (value === "" ? null : value));
}

const optionalEmergencyPhone = z
  .union([
    z
      .string()
      .trim()
      .max(
        ADMISSION_FIELD_LIMITS.emergencyPhone,
        `Emergency phone must be ${ADMISSION_FIELD_LIMITS.emergencyPhone} characters or fewer`
      )
      .refine(
        (value) => value.length === 0 || value.length >= ADMISSION_PHONE_MIN_LENGTH,
        `Emergency phone must be at least ${ADMISSION_PHONE_MIN_LENGTH} characters`
      ),
    z.null(),
  ])
  .optional()
  .transform((value) => (value === "" ? null : value));

export const admissionAdditionalFieldsShape = {
  emergencyContact: optionalTrimmedText(
    "Emergency contact",
    ADMISSION_FIELD_LIMITS.emergencyContact
  ),
  emergencyPhone: optionalEmergencyPhone,
  previousEducation: optionalTrimmedText(
    "Previous education",
    ADMISSION_FIELD_LIMITS.previousEducation
  ),
  reference: optionalTrimmedText("Reference", ADMISSION_FIELD_LIMITS.reference),
};
