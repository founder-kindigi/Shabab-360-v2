import runningBatchDataset from "./running-batch-dataset.json";

export interface RunningSyllabusItem {
  week: string;
  day: string;
  sports: string;
  skills: string;
  tadreeb: string;
  focus: string;
}

export interface RunningAttendanceGroup {
  groupName: string;
  count: number;
  students: Array<{
    id: string;
    name: string;
    phone: string;
    age: number;
    grade: string;
    groupName: string;
  }>;
}

export interface RunningCallingLead {
  id: string;
  name: string;
  phone: string;
  address: string;
  caller: string;
  callStatus: string;
  response: string;
  interviewSlot?: string;
  age: number;
  grade: string;
  remarks?: string;
  campaignName: string;
}

/**
 * Returns extracted 93 syllabus items from `B4_ Shabab Content Plan (1).xlsx`
 */
export function getRunningBatchSyllabus(): RunningSyllabusItem[] {
  return (runningBatchDataset.contentMatrix as RunningSyllabusItem[]) || [];
}

/**
 * Returns age & class based attendance groups from `Shabab_Batch_4_Attendance (1).xlsx`
 */
export function getRunningBatchGroups(): RunningAttendanceGroup[] {
  return (runningBatchDataset.attendanceGroups as RunningAttendanceGroup[]) || [];
}

/**
 * Returns calling campaign leads from `Calls for Phase 2 (1).xlsx`
 */
export function getRunningBatchCallingLeads(): RunningCallingLead[] {
  return (runningBatchDataset.callingLeadsSummary?.sampleLeads as RunningCallingLead[]) || [];
}

/**
 * Automatic placement engine: Determines target Park & Group for an admitted candidate
 * based on candidate's Age and Class/Grade.
 */
export function autoAssignParkAndGroup(age: number, grade: string, preferredPark?: string) {
  const normGrade = (grade || "").toLowerCase();
  const targetPark = preferredPark && preferredPark.length > 2 ? preferredPark : "Gulberg Park";

  let groupName = "Group 1 | Murabbi: Ikram";

  if (age <= 13 || normGrade.includes("8th") || normGrade.includes("7th")) {
    groupName = "Group 1 | Murabbi: Ikram";
  } else if (age === 14 || normGrade.includes("9th") || normGrade.includes("hafiz")) {
    groupName = "Group 2 | Murabbi: Hanzala Tauseef";
  } else if (age === 15 || normGrade.includes("10th") || normGrade.includes("o-level")) {
    groupName = "Group 3 | Murabbi: Hasnain bhai";
  } else if (targetPark.includes("Johar Town")) {
    groupName = "Group 12 | Murabbi: Imran Amin";
  } else if (targetPark.includes("Gulshan Ravi")) {
    groupName = "Group 13 | Murabbi: Basit Ahsan";
  } else if (targetPark.includes("State Life")) {
    groupName = "Group 11 | Murabbi: Abdul Kabeer";
  } else if (targetPark.includes("Gulshan Iqbal")) {
    groupName = "Group 4 | Murabbi: Hammad Raza";
  } else if (targetPark.includes("Griffin")) {
    groupName = "Group 5 | Murabbi: Haseeb Ahmad";
  }

  return {
    allocatedPark: targetPark,
    allocatedGroup: groupName,
    placementReason: `Placed into ${groupName} at ${targetPark} based on Age ${age} and Grade ${grade}.`,
  };
}
