import type {
  AdmissionInterviewLookupService,
  InterviewMatchResult,
} from "./types";
import { normalizePakistanPhone } from "./phone";

/**
 * Mock implementation of AdmissionInterviewLookupService for synthetic testing
 * and offline CLI execution without active database connection.
 */
export class MockInterviewLookupService
  implements AdmissionInterviewLookupService
{
  private mockInterviews: Array<{
    cityId: string;
    interviewId: string;
    applicationId: string;
    applicantName?: string;
    guardianPhone?: string;
    applicantPhone?: string;
  }> = [];

  private mockParks: Array<{ id: string; name: string; cityId: string }> = [];

  public addMockPark(id: string, name: string, cityId: string): void {
    this.mockParks.push({ id, name, cityId });
  }

  public addMockInterview(record: {
    cityId: string;
    interviewId: string;
    applicationId: string;
    applicantName?: string;
    guardianPhone?: string;
    applicantPhone?: string;
  }): void {
    this.mockInterviews.push({
      ...record,
      guardianPhone: normalizePakistanPhone(record.guardianPhone) || record.guardianPhone,
      applicantPhone: normalizePakistanPhone(record.applicantPhone) || record.applicantPhone,
    });
  }

  public async getCityParks(cityId: string): Promise<Array<{ id: string; name: string }>> {
    return this.mockParks
      .filter((p) => p.cityId === cityId)
      .map((p) => ({ id: p.id, name: p.name }));
  }

  public async findMatchingInterview(params: {
    cityId: string;
    phone?: string;
    guardianPhone?: string;
    applicantName?: string;
  }): Promise<InterviewMatchResult> {
    const targetPhone = normalizePakistanPhone(params.phone || params.guardianPhone);
    const targetName = params.applicantName?.trim().toLowerCase();

    for (const record of this.mockInterviews) {
      if (record.cityId !== params.cityId) {
        continue;
      }

      if (targetPhone) {
        if (
          record.guardianPhone === targetPhone ||
          record.applicantPhone === targetPhone
        ) {
          return {
            matched: true,
            interviewId: record.interviewId,
            applicationId: record.applicationId,
          };
        }
      }

      if (
        targetName &&
        record.applicantName &&
        record.applicantName.trim().toLowerCase() === targetName
      ) {
        return {
          matched: true,
          interviewId: record.interviewId,
          applicationId: record.applicationId,
        };
      }
    }

    return { matched: false };
  }
}

/**
 * Prisma-backed read-only implementation of AdmissionInterviewLookupService.
 * Executes SELECT-only queries to match AdmissionInterview records.
 */
export class PrismaInterviewLookupService
  implements AdmissionInterviewLookupService
{
  constructor(private prisma: any) {}

  public async getCityParks(cityId: string): Promise<Array<{ id: string; name: string }>> {
    if (!this.prisma?.park) {
      return [];
    }
    try {
      const parks = await this.prisma.park.findMany({
        where: { cityId, isActive: true },
        select: { id: true, name: true },
      });
      return parks;
    } catch {
      return [];
    }
  }

  public async findMatchingInterview(params: {
    cityId: string;
    phone?: string;
    guardianPhone?: string;
    applicantName?: string;
  }): Promise<InterviewMatchResult> {
    if (!this.prisma?.admissionInterview) {
      return { matched: false };
    }

    const normPhone = normalizePakistanPhone(params.phone || params.guardianPhone);

    try {
      const interview = await this.prisma.admissionInterview.findFirst({
        where: {
          application: {
            cityId: params.cityId,
            OR: [
              ...(normPhone ? [{ guardianPhone: { contains: normPhone } }] : []),
              ...(params.applicantName
                ? [{ applicantName: { equals: params.applicantName, mode: "insensitive" } }]
                : []),
            ],
          },
        },
        select: {
          id: true,
          applicationId: true,
        },
      });

      if (interview) {
        return {
          matched: true,
          interviewId: interview.id,
          applicationId: interview.applicationId,
        };
      }
    } catch {
      return { matched: false };
    }

    return { matched: false };
  }
}
