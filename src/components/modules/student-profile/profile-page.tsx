"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Sensitive field toggle ──────────────────────────────────────────

type ProfileData = Record<string, string | null | undefined>;

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
  { id: "overview", label: "Overview" },
  { id: "education", label: "Education" },
  { id: "family", label: "Family & Background" },
  { id: "interests", label: "Interests & Skills" },
  { id: "goals", label: "Goals & Development" },
  { id: "wellbeing", label: "Support & Wellbeing" },
  { id: "personality", label: "Personality & Skills" },
];

// ─── Main component ──────────────────────────────────────────────────

export function StudentProfilePage({ participantId }: { participantId: string }) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [draft, setDraft] = useState<ProfileData>({});
  const [hasFetched, setHasFetched] = useState(false);

  const isStaff = ["super_admin", "program_admin", "city_head", "park_lead", "murabbi", "park_admin"].includes(userRole || "");
  const canEdit = ["super_admin", "program_admin", "city_head"].includes(userRole || "");

  // ── Fetch ──────────────────────────────────────────────────────────

  const { data: profile, isLoading } = useQuery<ProfileData | null>({
    queryKey: ["student-profile", participantId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showSensitive) params.set("includeSensitive", "true");
      const res = await fetch(`/api/admin/students/${participantId}/profile?${params}`);
      if (res.status === 403 && showSensitive) {
        setShowSensitive(false);
        toast.error("You do not have permission to view sensitive fields.");
        return null;
      }
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      return data;
    },
    enabled: true,
  });

  // ── Mutation ───────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const params = new URLSearchParams();
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

  // ── Handlers ──────────────────────────────────────────────────────

  const handleFieldChange = useCallback((key: string, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: val || null }));
  }, []);

  const handleSave = () => {
    saveMutation.mutate(draft);
  };

  // Sync fetched data to draft when entering edit mode
  if (profile && !hasFetched) {
    setDraft(profile as unknown as ProfileData);
    setHasFetched(true);
  }

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
    overview: ["fatherName"],
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
          {isStaff && !editMode && canEdit && (
            <Button size="sm" onClick={() => { setHasFetched(false); setEditMode(true); }}>
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

      {/* Sensitive toggle (staff only) */}
      {isStaff && !editMode && (
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
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          {TABS.map((tab) => {
            // Hide wellbeing tab for non-staff or when sensitive is off for non-sensitive-reader
            if (tab.id === "wellbeing" && (!isStaff || (!showSensitive && !editMode))) return null;
            return <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>;
          })}
        </TabsList>

        {TABS.map((tab) => {
          const fields = tabFields[tab.id] || [];
          // Skip rendering wellbeing tab for non-staff
          if (tab.id === "wellbeing" && (!isStaff || (!showSensitive && !editMode))) return null;
          // Skip overview tab if no fields
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
                    // In read mode, hide sensitive fields unless showSensitive is on and user has access
                    if (!editMode && isSensitive && !showSensitive) return null;
                    if (isSensitive && editMode && !canEdit) return null;

                    return (
                      <ProfileField
                        key={fieldKey}
                        label={fieldLabels[fieldKey] || fieldKey}
                        value={displayData[fieldKey] as string | null | undefined}
                        fieldKey={fieldKey}
                        editMode={editMode && canEdit}
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
