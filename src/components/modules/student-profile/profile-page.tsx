"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ProfileCapabilities {
  canView: boolean;
  canManage: boolean;
  canViewSensitive: boolean;
  canManageSensitive: boolean;
}

// ─── Sensitive field toggle ──────────────────────────────────────────

type ProfileData = Record<string, string | null | undefined>;
type DropoutStatus = {
  state: string;
  dropoutAt: string | null;
  dropoutReason: string | null;
  dropoutSource: string | null;
};

const SENSITIVE_FIELDS = new Set([
  "financialStatus", "deenBackground", "badHabits",
  "disability", "specialNeed", "moralCharacter", "namaz",
]);

// ─── Field renderer ──────────────────────────────────────────────────

function ProfileField({
  label,
  value,
  fieldKey,
  editMode,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  fieldKey: string;
  editMode: boolean;
  onChange: (key: string, val: string) => void;
}) {
  const isLongText = (value?.length ?? 0) > 200 || fieldKey.match(/results|achievements|goals|vision|mission|strengths|weaknesses|habits|background|character/i);

  if (!editMode) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <p className="text-sm">{value || "—"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {isLongText ? (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="min-h-[60px] text-sm"
        />
      ) : (
        <Input
          value={value || ""}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="text-sm"
        />
      )}
    </div>
  );
}

// ─── Tab sections ────────────────────────────────────────────────────

const TABS = [
  { id: "education", label: "Education" },
  { id: "family", label: "Family & Background" },
  { id: "interests", label: "Interests & Skills" },
  { id: "goals", label: "Goals & Development" },
  { id: "wellbeing", label: "Support & Wellbeing" },
  { id: "personality", label: "Personality & Skills" },
];

// ─── Main component ──────────────────────────────────────────────────

export function StudentProfilePage({
  participantId,
  capabilities,
  cityId,
}: {
  participantId: string;
  capabilities: ProfileCapabilities;
  cityId?: string;
}) {
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [draft, setDraft] = useState<ProfileData>({});
  const [dropoutReason, setDropoutReason] = useState("");

  const canEdit = capabilities.canManage;
  const canViewSensitive = capabilities.canViewSensitive;
  const { data: dropoutStatus } = useQuery<DropoutStatus>({
    queryKey: ["student-dropout-status", participantId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/students/${participantId}/dropout`);
      if (!response.ok) throw new Error("Failed to load attendance status");
      return response.json();
    },
    enabled: capabilities.canView,
  });

  // ── Fetch ──────────────────────────────────────────────────────────

  const { data: profile, isLoading, error } = useQuery<ProfileData | null>({
    queryKey: ["student-profile", participantId, cityId, showSensitive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showSensitive) params.set("includeSensitive", "true");
      if (cityId) params.set("cityId", cityId);
      const res = await fetch(`/api/admin/students/${participantId}/profile?${params}`);
      if (res.status === 403 && showSensitive) {
        throw new Error("SENSITIVE_FORBIDDEN");
      }
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      return data;
    },
    enabled: capabilities.canView,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (error instanceof Error && error.message === "SENSITIVE_FORBIDDEN") {
      // A server-side capability change can invalidate a previously allowed toggle.
      queueMicrotask(() => {
        setShowSensitive(false);
        toast.error("You do not have permission to view sensitive fields.");
      });
    }
  }, [error]);

  // ── Mutation ───────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const params = new URLSearchParams();
      if (cityId) params.set("cityId", cityId);
      const res = await fetch(`/api/admin/students/${participantId}/profile?${params}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error || "Save failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Profile saved");
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["student-profile", participantId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const dropoutMutation = useMutation({
    mutationFn: async (action: "dropout" | "reactivate") => {
      const response = await fetch(`/api/admin/students/${participantId}/dropout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: dropoutReason }),
      });
      const payload = await response.json().catch(() => ({ error: "Status update failed" }));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Status update failed");
      return payload;
    },
    onSuccess: (_data, action) => {
      toast.success(action === "dropout" ? "Attendance discontinued" : "Student reactivated");
      setDropoutReason("");
      queryClient.invalidateQueries({ queryKey: ["student-dropout-status", participantId] });
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  // ── Handlers ──────────────────────────────────────────────────────

  const handleFieldChange = useCallback((key: string, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: val || null }));
  }, []);

  const handleSave = () => {
    saveMutation.mutate(draft);
  };

  const handleStartEditing = () => {
    setDraft((profile ?? {}) as ProfileData);
    setEditMode(true);
  };

  // ── Loading ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Sensitive field names → labels ─────────────────────────────────

  const fieldLabels: Record<string, string> = {
    school: "School", college: "College", educationSystem: "Education System",
    previousResults: "Previous Results", awardsAchievements: "Awards & Achievements",
    averageGrade: "Average Grade", favouriteSubjects: "Favourite Subjects",
    fatherName: "Father Name", fatherOccupation: "Father Occupation",
    siblings: "Siblings", financialStatus: "Financial Status (Sensitive)",
    nativeArea: "Native Area", ethnicity: "Ethnicity", modeOfTransport: "Mode of Transport",
    subjectsOfInterest: "Subjects of Interest", extraCurricular: "Extra Curricular",
    hobbies: "Hobbies", sports: "Sports", learningStyle: "Learning Style",
    curiosity: "Curiosity", specialTalent: "Special Talent",
    currentSkills: "Current Skills", skillsWantToLearn: "Skills to Learn",
    generalGoals: "General Goals", vision: "Vision", mission: "Mission",
    deenBackground: "Deen Background (Sensitive)",
    careerAspirations: "Career Aspirations", academicInterests: "Academic Interests",
    collegePlans: "College Plans", futureCareerGoals: "Future Career Goals",
    strengths: "Strengths", weaknesses: "Weaknesses",
    goodHabits: "Good Habits", badHabits: "Bad Habits (Sensitive)",
    disability: "Disability (Sensitive)", specialNeed: "Special Need (Sensitive)",
    moralCharacter: "Moral Character (Sensitive)", namaz: "Namaz (Sensitive)",
    leadershipSkills: "Leadership Skills", personalityResponsibility: "Responsibility",
    communicationSkills: "Communication", teamworkSkills: "Teamwork",
    problemSolvingSkills: "Problem Solving", creativity: "Creativity",
    criticalThinking: "Critical Thinking", adaptability: "Adaptability",
    initiative: "Initiative", selfMotivation: "Self-Motivation",
    integrity: "Integrity", empathy: "Empathy", reading: "Reading",
    learningInterest: "Learning Interest",
  };

  const tabFields: Record<string, string[]> = {
    education: ["school", "college", "educationSystem", "previousResults", "awardsAchievements", "averageGrade", "favouriteSubjects"],
    family: ["fatherName", "fatherOccupation", "siblings", "nativeArea", "ethnicity", "modeOfTransport"],
    interests: ["subjectsOfInterest", "extraCurricular", "hobbies", "sports", "learningStyle", "curiosity", "specialTalent", "currentSkills", "skillsWantToLearn"],
    goals: ["generalGoals", "vision", "mission", "careerAspirations", "academicInterests", "collegePlans", "futureCareerGoals", "strengths", "weaknesses", "goodHabits"],
    wellbeing: ["disability", "specialNeed", "financialStatus", "deenBackground", "badHabits", "moralCharacter", "namaz"],
    personality: ["leadershipSkills", "personalityResponsibility", "communicationSkills", "teamworkSkills", "problemSolvingSkills", "creativity", "criticalThinking", "adaptability", "initiative", "selfMotivation", "integrity", "empathy", "reading", "learningInterest"],
  };

  const displayData = editMode ? draft : (profile as unknown as ProfileData) || {};

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Student Profile</h2>
        <div className="flex items-center gap-2">
          {!editMode && canEdit && (
            <Button size="sm" onClick={handleStartEditing}>
              Edit Profile
            </Button>
          )}
          {editMode && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {dropoutStatus && (
        <Card className={dropoutStatus.state === "dropout" ? "border-amber-300 bg-amber-50/60" : "border-emerald-200"}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Attendance eligibility</p>
                <p className="text-sm text-muted-foreground">
                  {dropoutStatus.state === "dropout"
                    ? `Discontinued${dropoutStatus.dropoutAt ? ` from ${new Date(dropoutStatus.dropoutAt).toLocaleDateString()}` : ""}`
                    : "Active for scheduled attendance"}
                </p>
              </div>
              {dropoutStatus.dropoutSource && (
                <span className="w-fit rounded-full bg-background px-3 py-1 text-xs font-medium capitalize">
                  {dropoutStatus.dropoutSource} decision
                </span>
              )}
            </div>
            {dropoutStatus.dropoutReason && <p className="text-sm">{dropoutStatus.dropoutReason}</p>}
            {canEdit && (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Textarea
                  value={dropoutReason}
                  onChange={(event) => setDropoutReason(event.target.value)}
                  placeholder={dropoutStatus.state === "dropout" ? "Reason for reactivation (minimum 10 characters)" : "Reason for discontinuing attendance (minimum 10 characters)"}
                  className="min-h-11"
                />
                <Button
                  variant={dropoutStatus.state === "dropout" ? "default" : "destructive"}
                  className="min-h-11"
                  disabled={dropoutReason.trim().length < 10 || dropoutMutation.isPending}
                  onClick={() => dropoutMutation.mutate(dropoutStatus.state === "dropout" ? "reactivate" : "dropout")}
                >
                  {dropoutStatus.state === "dropout" ? "Reactivate student" : "Mark as dropout"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sensitive toggle */}
      {canViewSensitive && !editMode && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showSensitive}
            onChange={() => setShowSensitive(!showSensitive)}
            className="rounded"
          />
          Include sensitive fields
        </label>
      )}

      {/* Tabs */}
      <Tabs defaultValue="education">
        <TabsList className="flex-wrap">
          {TABS.map((tab) => {
            // Hide wellbeing tab if user lacks both view and manage capabilities, or if read mode and showSensitive is off
            if (tab.id === "wellbeing") {
              const hasAccess = canViewSensitive || (editMode && capabilities.canManageSensitive);
              if (!hasAccess || (!editMode && !showSensitive)) return null;
            }
            return <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>;
          })}
        </TabsList>

        {TABS.map((tab) => {
          const fields = tabFields[tab.id] || [];
          // Skip rendering wellbeing tab if user lacks both view and manage capabilities, or if read mode and showSensitive is off
          if (tab.id === "wellbeing") {
            const hasAccess = canViewSensitive || (editMode && capabilities.canManageSensitive);
            if (!hasAccess || (!editMode && !showSensitive)) return null;
          }
          // Skip tab if no fields
          if (fields.length === 0) return null;

          return (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{tab.label}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {fields.map((fieldKey) => {
                    const isSensitive = SENSITIVE_FIELDS.has(fieldKey);
                    // Hide if read mode and showSensitive is off
                    if (!editMode && isSensitive && !showSensitive) return null;
                    // Hide if edit mode and they have neither view nor manage capabilities
                    if (editMode && isSensitive && !canViewSensitive && !capabilities.canManageSensitive) return null;

                    return (
                      <ProfileField
                        key={fieldKey}
                        label={fieldLabels[fieldKey] || fieldKey}
                        value={displayData[fieldKey] as string | null | undefined}
                        fieldKey={fieldKey}
                        editMode={editMode && (isSensitive ? capabilities.canManageSensitive : canEdit)}
                        onChange={handleFieldChange}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
