export interface RawSourceRow {
  rowNumber: number;
  sheetName: string;
  prospectName?: string;
  contactPhone?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianCnic?: string;
  allocatedPark?: string;
  callOutcome?: string;
  prospectStatus?: string;
  callNotes?: string;
  preferredDate?: string | Date;
}

export interface NormalizedCallingRow {
  rowNumber: number;
  sheetName: string;
  prospectName: string;
  prospectNameMasked: string;
  prospectNameFingerprint: string;
  normalizedContactPhone?: string;
  normalizedGuardianPhone?: string;
  primaryPhoneNormalized?: string;
  primaryPhoneMasked?: string;
  primaryPhoneFingerprint?: string;
  guardianName?: string;
  guardianCnicClean?: string;
  allocatedParkName?: string;
  callOutcome?: string;
  prospectStatus?: string;
  callNotes?: string;
  preferredDateRaw?: string;
}

export interface CallingImportOptions {
  cityId: string;
  campaignId: string;
  dryRun?: boolean;
  hmacSecret: string;
}

export interface InvalidRowReport {
  rowNumber: number;
  sheetName: string;
  prospectNameMasked: string;
  prospectNameFingerprint: string;
  reason: string;
}

export interface UnresolvedParkReport {
  rowNumber: number;
  providedParkNameMasked: string;
  providedParkNameFingerprint: string;
  resolvedParkId: null;
  status: "UNRESOLVED_PARK";
}

export interface UnresolvedInterviewReport {
  rowNumber: number;
  sheetName: string;
  prospectNameMasked: string;
  prospectNameFingerprint: string;
  reason: string;
  status: "unresolvedInterviewLink";
}

export interface DuplicateMatchingRow {
  rowNumber: number;
  sheetName: string;
}

export interface DuplicateClusterReport {
  maskedPhone: string;
  phoneFingerprint: string;
  matchingRows: DuplicateMatchingRow[];
  resolution: "MERGE_HISTORIC_TIMELINE";
}

export interface CallingReconciliationSummary {
  totalRowsProcessed: number;
  validLeadsCount: number;
  invalidLeadsCount: number;
  duplicateClustersCount: number;
  unresolvedParksCount: number;
  unresolvedInterviewLinksCount: number;
}

export interface CallingReconciliationReport {
  summary: CallingReconciliationSummary;
  invalidRows: InvalidRowReport[];
  unresolvedParks: UnresolvedParkReport[];
  unresolvedInterviewLinks: UnresolvedInterviewReport[];
  duplicates: DuplicateClusterReport[];
}

export interface InterviewMatchResult {
  matched: boolean;
  interviewId?: string;
  applicationId?: string;
}

export interface AdmissionInterviewLookupService {
  findMatchingInterview(params: {
    cityId: string;
    phone?: string;
    guardianPhone?: string;
    applicantName?: string;
  }): Promise<InterviewMatchResult>;

  getCityParks(cityId: string): Promise<Array<{ id: string; name: string }>>;
}
