import { z } from "zod";

const cuidSchema = z.string().trim().min(1, "Identifier required");

export const createResponsibilitySchema = z
  .object({
    eventId: cuidSchema.optional().nullable(),
    mashwaraId: cuidSchema.optional().nullable(),
    mashwaraOccurrenceId: cuidSchema.optional().nullable(),
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
    description: z.string().trim().max(500, "Description is too long").optional().nullable(),
    assignedToStaffMetaId: cuidSchema,
    startDate: z.string().datetime({ message: "Invalid startDate" }),
    endDate: z.string().datetime({ message: "Invalid endDate — mandatory expiry required" }),
  })
  .strict()
  .refine(
    (data) => {
      const hasEvent = Boolean(data.eventId);
      const hasMashwara = Boolean(data.mashwaraId);
      return (hasEvent || hasMashwara) && !(hasEvent && hasMashwara);
    },
    {
      message: "Responsibility must specify exactly one parent: eventId XOR mashwaraId",
      path: ["eventId"],
    }
  )
  .refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    {
      message: "endDate must be strictly after startDate",
      path: ["endDate"],
    }
  );

export const createEventResponsibilityBodySchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
    description: z.string().trim().max(500, "Description is too long").optional().nullable(),
    assignedToStaffMetaId: cuidSchema,
    startDate: z.string().datetime({ message: "Invalid startDate" }),
    endDate: z.string().datetime({ message: "Invalid endDate — mandatory expiry required" }),
  })
  .strict()
  .refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    {
      message: "endDate must be strictly after startDate",
      path: ["endDate"],
    }
  );

export const revokeResponsibilitySchema = z
  .object({
    revokedReason: z.string().trim().min(3, "Revocation reason is required").max(300, "Reason is too long"),
  })
  .strict();
