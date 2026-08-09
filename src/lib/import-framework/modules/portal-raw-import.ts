/**
 * Shabab 360 - Raw Portal Registration Export Parser & Pipeline Engine
 * Parses raw portal export sheets (e.g. RegistrationRequests-06-08-2026.xls / .xlsx)
 * and feeds all 5 core modules: Admissions, Calling, Interview, Fees, and Park/Group Attendance.
 */

import { ImportTemplateSpec, ProcessedRowResult } from '../types';

export interface PortalRawRegistrationRow {
  serialNo?: string;
  registeredDate?: string;
  fullName: string;
  email?: string;
  cnicNumber?: string;
  mobileNumber: string;
  whatsappNumber?: string;
  eventName?: string;
  callResponseStatus?: string;
  callResponseText?: string;
  paymentMethod?: string;
  paymentOn?: string;
  paymentAmount?: number;
  dob?: string;
  age?: number;
  gender?: string;
  batch?: string;
  group?: string;
  interests?: string;
  skills?: string;
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  requestStatus?: 'Pending' | 'Approved' | 'Rejected';
  requestStatusRemarks?: string;
  gradeClass?: string;
  fatherName?: string;
  fatherOccupation?: string;
  medicalIssueDetail?: string;
  studentPhone?: string;
  studentWhatsapp?: string;
  parentPhone?: string;
  parentWhatsapp?: string;
  campus?: string;
  eventLocation?: string;
}

export const PORTAL_RAW_IMPORT_TEMPLATE: ImportTemplateSpec<PortalRawRegistrationRow> = {
  moduleCode: 'portal_raw_registration',
  version: '2.0.0',
  columns: [
    {
      key: 'serialNo',
      header: 'Sr.',
      aliases: ['Sr', 'Serial', 'S.No', 'SNo'],
      required: false,
    },
    {
      key: 'registeredDate',
      header: 'Registered Date',
      aliases: ['Registration Date', 'Submitted At', 'Date'],
      required: false,
    },
    {
      key: 'fullName',
      header: 'Full Name',
      aliases: ['Applicant Name', 'Student Name', 'Candidate Name', 'Name'],
      required: true,
    },
    {
      key: 'email',
      header: 'Email',
      aliases: ['Email Address'],
      required: false,
    },
    {
      key: 'cnicNumber',
      header: 'CNIC Number',
      aliases: ['CNIC', 'B-Form', 'BForm Number', 'National ID'],
      required: false,
    },
    {
      key: 'mobileNumber',
      header: 'Mobile Number',
      aliases: ['Mobile', 'Phone', 'Cell', 'Contact Number', 'Phone Number'],
      required: true,
      validate: (val) => {
        const str = String(val || '').trim();
        if (!str || str.length < 7) {
          return { valid: false, error: 'Mobile number is required and must be valid.' };
        }
        return { valid: true, value: str };
      },
    },
    {
      key: 'whatsappNumber',
      header: 'Whatsapp Number',
      aliases: ['WhatsApp', 'WhatsApp Phone', 'WA Number'],
      required: false,
    },
    {
      key: 'eventName',
      header: 'Event Name',
      aliases: ['Campaign', 'Program Name'],
      required: false,
    },
    {
      key: 'callResponseStatus',
      header: 'Call Response Status',
      aliases: ['Call Status', 'Caller Status'],
      required: false,
    },
    {
      key: 'callResponseText',
      header: 'Call Response Text',
      aliases: ['Call Notes', 'Caller Feedback'],
      required: false,
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      aliases: ['Payment Mode', 'Fee Method'],
      required: false,
    },
    {
      key: 'paymentOn',
      header: 'Payment On',
      aliases: ['Payment Date', 'Fee Date'],
      required: false,
    },
    {
      key: 'paymentAmount',
      header: 'Payment Amount',
      aliases: ['Fee Amount', 'Amount Paid', 'Amount'],
      required: false,
      validate: (val) => {
        if (!val) return { valid: true, value: 0 };
        const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        return { valid: true, value: isNaN(num) ? 0 : num };
      },
    },
    {
      key: 'dob',
      header: 'Date of Birth',
      aliases: ['DOB', 'Birth Date'],
      required: false,
    },
    {
      key: 'age',
      header: 'Age',
      aliases: ['Student Age'],
      required: false,
      validate: (val) => {
        if (!val) return { valid: true, value: 0 };
        const num = parseInt(String(val), 10);
        return { valid: true, value: isNaN(num) ? 0 : num };
      },
    },
    {
      key: 'gender',
      header: 'Gender',
      aliases: ['Sex'],
      required: false,
    },
    {
      key: 'batch',
      header: 'Batch',
      aliases: ['Batch Name', 'Cohort'],
      required: false,
    },
    {
      key: 'group',
      header: 'Group',
      aliases: ['Sub-Group', 'Group Name'],
      required: false,
    },
    {
      key: 'interests',
      header: 'Interests',
      aliases: ['Hobbies', 'Student Interests'],
      required: false,
    },
    {
      key: 'skills',
      header: 'Skills',
      aliases: ['Special Skills'],
      required: false,
    },
    {
      key: 'city',
      header: 'City',
      aliases: ['City Name', 'District'],
      required: false,
    },
    {
      key: 'address',
      header: 'Address',
      aliases: ['Residential Address', 'Home Address', 'Location Address'],
      required: false,
    },
    {
      key: 'requestStatus',
      header: 'Request Status',
      aliases: ['Status', 'Admission Status', 'Approval Status'],
      required: false,
    },
    {
      key: 'requestStatusRemarks',
      header: 'Request Status Remarks',
      aliases: ['Remarks', 'Status Notes', 'Token'],
      required: false,
    },
    {
      key: 'gradeClass',
      header: 'Grade/Class',
      aliases: ['Grade', 'Class', 'Education Level', 'School Grade'],
      required: false,
    },
    {
      key: 'fatherName',
      header: 'Father Name',
      aliases: ['Parent Name', 'Guardian Name'],
      required: false,
    },
    {
      key: 'fatherOccupation',
      header: 'Father Occupation',
      aliases: ['Parent Occupation'],
      required: false,
    },
    {
      key: 'medicalIssueDetail',
      header: 'Medical Issue Detail',
      aliases: ['Medical Info', 'Health Issues'],
      required: false,
    },
    {
      key: 'parentPhone',
      header: 'Parent Phone Number',
      aliases: ['Guardian Phone', 'Emergency Phone'],
      required: false,
    },
    {
      key: 'parentWhatsapp',
      header: 'Parent Whatsapp Number',
      aliases: ['Guardian Whatsapp'],
      required: false,
    },
    {
      key: 'campus',
      header: 'Campus',
      aliases: ['Park Name', 'Park', 'Event Location'],
      required: false,
    },
  ],
};

export interface PortalPipelineSummary {
  totalRowsParsed: number;
  admissionsReady: number;
  callingWorkloadsReady: number;
  interviewsReady: number;
  feePaymentsLogged: number;
  parkPlacementsReady: number;
  allocatedParks: Record<string, number>;
  allocatedStatuses: Record<string, number>;
}

export function analyzePortalRawPipeline(rows: ProcessedRowResult<PortalRawRegistrationRow>[]): PortalPipelineSummary {
  let admissionsReady = 0;
  let callingWorkloadsReady = 0;
  let interviewsReady = 0;
  let feePaymentsLogged = 0;
  let parkPlacementsReady = 0;

  const allocatedParks: Record<string, number> = {};
  const allocatedStatuses: Record<string, number> = {};

  rows.forEach((r) => {
    if (r.status === 'invalid' || !r.parsedData) return;
    const p = r.parsedData;

    admissionsReady++;

    if (p.mobileNumber || p.whatsappNumber) {
      callingWorkloadsReady++;
    }

    if (p.requestStatus === 'Pending' || p.requestStatus === 'Approved') {
      interviewsReady++;
    }

    if (p.paymentAmount && p.paymentAmount > 0) {
      feePaymentsLogged++;
    }

    const parkName = p.campus || p.eventLocation || p.city || 'Gulberg Park';
    allocatedParks[parkName] = (allocatedParks[parkName] || 0) + 1;

    const status = p.requestStatus || 'Pending';
    allocatedStatuses[status] = (allocatedStatuses[status] || 0) + 1;

    if (p.batch || p.group || p.campus) {
      parkPlacementsReady++;
    }
  });

  return {
    totalRowsParsed: rows.length,
    admissionsReady,
    callingWorkloadsReady,
    interviewsReady,
    feePaymentsLogged,
    parkPlacementsReady,
    allocatedParks,
    allocatedStatuses,
  };
}
