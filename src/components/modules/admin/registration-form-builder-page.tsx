"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { ArrowLeft, Plus, Trash2, Save, Globe, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import type { FormField, FormSettings } from "@/lib/registration-forms/definition";
import { publicationError } from "@/lib/registration-forms/definition";

interface FormDraftPayload {
  version: number;
  title: string;
  intro: string;
  fields: FormField[];
  settings: FormSettings;
}

export function RegistrationFormBuilderPage({ onBack, mobile = false }: { onBack?: () => void; mobile?: boolean } = {}) {
  const queryClient = useQueryClient();
  const selectedFormId = useAppStore((s) => s.selectedFormId);
  const storeGoBack = useAppStore((s) => s.goBack);
  const goBack = onBack ?? storeGoBack;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-registration-forms", selectedFormId],
    queryFn: async () => {
      if (!selectedFormId) throw new Error("No form selected");
      const res = await fetch(`/api/admin/registration-forms/${selectedFormId}`);
      if (!res.ok) throw new Error("Failed to load form");
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedFormId,
  });

  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState<FormSettings>({
    successText: "",
    eligibilityText: "",
    feeText: "",
    privacyNotice: "",
    contactConsentText: "",
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loadedVersion, setLoadedVersion] = useState<{ id: string; version: number } | null>(null);
  const stateRef = useRef({ title, intro, fields, settings });
  useEffect(() => {
    stateRef.current = { title, intro, fields, settings };
  }, [title, intro, fields, settings]);
  const submittedSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      data &&
      (loadedVersion?.id !== data.id || (!hasUnsavedChanges && loadedVersion?.version !== data.version))
    ) {
      setTitle(data.title || "");
      setIntro(data.intro || "");
      setFields(data.fields || []);
      setSettings(data.settings || {
        successText: "",
        eligibilityText: "",
        feeText: "",
        privacyNotice: "",
        contactConsentText: "",
      });
      setHasUnsavedChanges(false);
      setLoadedVersion({ id: data.id, version: data.version });
    }
  }, [data, loadedVersion, hasUnsavedChanges]);

  const patchMutation = useMutation({
    mutationFn: async (payload: FormDraftPayload) => {
      const res = await fetch(`/api/admin/registration-forms/${selectedFormId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Form was updated by someone else. Please backup your changes and reload.");
          throw new Error("Conflict: Server version is newer");
        }
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save changes");
      }
      return res.json();
    },
    onSuccess: () => {
        toast.success("Draft saved successfully");
        setHasUnsavedChanges((prev) => {
          const currentSnapshot = JSON.stringify({
            title: stateRef.current.title,
            intro: stateRef.current.intro,
            fields: stateRef.current.fields,
            settings: stateRef.current.settings,
          });
          return currentSnapshot !== submittedSnapshotRef.current;
        });
        queryClient.invalidateQueries({ queryKey: ["admin-registration-forms", selectedFormId] });
      },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: async (version: number) => {
      const res = await fetch(`/api/admin/registration-forms/${selectedFormId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) throw new Error("Failed to publish form");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Form published successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-registration-forms", selectedFormId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: async (version: number) => {
      const res = await fetch(`/api/admin/registration-forms/${selectedFormId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) throw new Error("Failed to close form");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Form closed to new submissions");
      queryClient.invalidateQueries({ queryKey: ["admin-registration-forms", selectedFormId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <AlertTriangle className="size-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold">Error Loading Form</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={goBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) return <div className="p-8 text-center">Loading...</div>;

  const handleSave = () => {
    const trimmedFields = fields.map((field) => {
      const trimmed = { ...field };
      if (trimmed.options) {
        trimmed.options = trimmed.options.map((option) => option.trim()).filter(Boolean);
      }
      return trimmed;
    });

    const trimmedSettings = { ...settings };
    if (trimmedSettings.allowedGenderValues) {
      trimmedSettings.allowedGenderValues = trimmedSettings.allowedGenderValues
        .map((value) => value.trim())
        .filter(Boolean);
    }

    setFields(trimmedFields);
    setSettings(trimmedSettings);
    submittedSnapshotRef.current = JSON.stringify({
      title,
      intro,
      fields: trimmedFields,
      settings: trimmedSettings,
    });
    patchMutation.mutate({ version: data.version, title, intro, fields: trimmedFields, settings: trimmedSettings });
  };

  const handlePublish = () => {
    if (hasUnsavedChanges) {
      toast.error("Please save your draft changes before publishing.");
      return;
    }

    const error = publicationError(fields, settings);
    if (error) return toast.error(error);

    if (confirm("Are you sure you want to publish this version? This will update the live form.")) {
      publishMutation.mutate(data.version);
    }
  };

  const addField = () => {
    const key = "q_" + Math.random().toString(36).substr(2, 6);
    setFields([...fields, { key, label: "New Question", type: "short_text", required: false }]);
    setHasUnsavedChanges(true);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    const newField: FormField = { ...newFields[index], ...updates };

    // Clear incompatible options on type change
    if (updates.type && updates.type !== newFields[index].type) {
      if (updates.type !== "single_select" && updates.type !== "city") {
        delete newField.options;
        delete newField.allowOther;
      } else if (!newField.options) {
        newField.options = ["Option 1", "Option 2"];
      }
      if (updates.type !== "number") {
        delete newField.minNumber;
        delete newField.maxNumber;
      }
    }

    newFields[index] = newField;
    setFields(newFields);
    setHasUnsavedChanges(true);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
    setHasUnsavedChanges(true);
  };

  const moveField = (index: number, dir: -1 | 1) => {
    if (index + dir < 0 || index + dir >= fields.length) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[index + dir];
    newFields[index + dir] = temp;
    setFields(newFields);
    setHasUnsavedChanges(true);
  };

  const updateSetting = <K extends keyof FormSettings>(key: K, value: FormSettings[K]) => {
    setSettings({ ...settings, [key]: value });
    setHasUnsavedChanges(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-background">
      <div className={mobile ? "border-b bg-background px-4 py-4" : "flex items-center gap-4 px-6 py-4 border-b bg-background"}>
        <div className={mobile ? "flex items-start gap-2" : "contents"}>
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className={mobile ? "break-words text-lg font-bold leading-6" : "text-xl font-semibold"}>{data.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            Status: <span className="font-medium text-foreground">{data.status}</span>
            {data.publishedVersion && <span>(Live Version: {data.publishedVersion})</span>}
          </div>
        </div>
        </div>
        <div className={mobile ? "mt-3 grid grid-cols-2 gap-2" : "ml-auto flex items-center gap-2"}>

          <Button size={mobile ? "sm" : "default"} className={mobile ? "min-w-0 text-xs" : undefined} variant={hasUnsavedChanges ? "default" : "outline"} onClick={handleSave} disabled={patchMutation.isPending || (!hasUnsavedChanges && data.status !== "draft")}>
            <Save className="mr-1.5 h-4 w-4" /> {mobile ? "Save" : "Save Draft"} {hasUnsavedChanges && "*"}
          </Button>
          <Button size={mobile ? "sm" : "default"} className={mobile ? "min-w-0 text-xs" : undefined} onClick={handlePublish} disabled={publishMutation.isPending}>
            <Globe className="mr-1.5 h-4 w-4" /> Publish
          </Button>
          {data.status === "published" && (
            <Button size={mobile ? "sm" : "default"} className={mobile ? "col-span-2 text-xs" : undefined} variant="destructive" onClick={() => confirm("Close this form?") && closeMutation.mutate(data.version)}>
              Close Form
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className={mobile ? "flex-1 p-4" : "flex-1 p-6"}>
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className={mobile ? "grid h-auto w-full grid-cols-2 gap-1 p-1" : "grid w-full grid-cols-4"}>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="rules">Rules & Fees</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="consent">Consent</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-6">
              <Card>
                <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Form Title</Label>
                    <Input value={title} onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Introduction Text</Label>
                    <Textarea rows={4} value={intro} onChange={(e) => { setIntro(e.target.value); setHasUnsavedChanges(true); }} placeholder="Welcome text shown at the start of the form..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Success Text</Label>
                    <Textarea rows={2} value={settings.successText} onChange={(e) => updateSetting("successText", e.target.value)} placeholder="Message shown after successful submission..." />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Registration Window</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date/Time (Optional)</Label>
                    <Input type="datetime-local" value={settings.registrationStart ? new Date(settings.registrationStart).toISOString().slice(0,16) : ""} onChange={(e) => updateSetting("registrationStart", e.target.value ? new Date(e.target.value).toISOString() : null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date/Time (Optional)</Label>
                    <Input type="datetime-local" value={settings.registrationEnd ? new Date(settings.registrationEnd).toISOString().slice(0,16) : ""} onChange={(e) => updateSetting("registrationEnd", e.target.value ? new Date(e.target.value).toISOString() : null)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="space-y-6 mt-6">
              <Card>
                <CardHeader><CardTitle>Policy Copy</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Eligibility Text</Label>
                    <Textarea rows={3} value={settings.eligibilityText} onChange={(e) => updateSetting("eligibilityText", e.target.value)} placeholder="Explain who can apply..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Fee Text</Label>
                    <Textarea rows={3} value={settings.feeText} onChange={(e) => updateSetting("feeText", e.target.value)} placeholder="Explain the cost and payment method..." />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Validation Rules</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum Age limit</Label>
                      <Input type="number" value={settings.minimumAge ?? ""} onChange={(e) => updateSetting("minimumAge", e.target.value ? Number(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Linked Number Field (Key)</Label>
                      <Input value={settings.ageFieldKey || ""} onChange={(e) => updateSetting("ageFieldKey", e.target.value)} placeholder="e.g. age" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Allowed Genders (Comma separated)</Label>
                      <Input value={settings.allowedGenderValues?.join(",") || ""} onChange={(e) => updateSetting("allowedGenderValues", e.target.value ? e.target.value.split(",") : undefined)} placeholder="e.g. Male,Female" />
                    </div>
                    <div className="space-y-2">
                      <Label>Linked Choice Field (Key)</Label>
                      <Input value={settings.genderFieldKey || ""} onChange={(e) => updateSetting("genderFieldKey", e.target.value)} placeholder="e.g. gender" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Form Fields</h2>
                <Button variant="outline" size="sm" onClick={addField}>
                  <Plus className="size-4 mr-2" /> Add Question
                </Button>
              </div>

              {fields.map((field, idx) => (
                <Card key={field.key} className="relative border-l-4 border-l-primary/50">
                  <CardContent className="p-4 sm:p-6 flex gap-4">
                    <div className="flex flex-col gap-1 pt-2">
                      <Button variant="ghost" size="icon" className="size-6 h-6" disabled={idx === 0} onClick={() => moveField(idx, -1)}><ArrowUp className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-6 h-6" disabled={idx === fields.length - 1} onClick={() => moveField(idx, 1)}><ArrowDown className="size-4" /></Button>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                          <Label>Label *</Label>
                          <Input value={field.label} onChange={(e) => updateField(idx, { label: e.target.value })} />
                        </div>
                        <div className="w-full sm:w-1/3 space-y-2">
                          <Label>Type</Label>
                          <Select value={field.type} onValueChange={(v) => updateField(idx, { type: v as FormField["type"] })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short_text">Short Text</SelectItem>
                              <SelectItem value="long_text">Long Text</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="single_select">Dropdown Choice</SelectItem>
                              <SelectItem value="city">City Selection</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={field.required} onCheckedChange={(v) => updateField(idx, { required: v })} />
                          <Label className="text-sm">Required</Label>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <Input className="h-8 text-sm" placeholder="Optional help text..." value={field.helpText || ""} onChange={(e) => updateField(idx, { helpText: e.target.value })} />
                        </div>
                        <div className="w-full sm:w-32">
                          <Input className="h-8 text-sm font-mono" placeholder="Internal Key" value={field.key} onChange={(e) => updateField(idx, { key: e.target.value })} />
                        </div>
                      </div>

                      {field.type === "number" && (
                        <div className="flex gap-4 p-3 bg-muted/50 rounded-md">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs">Min Number</Label>
                            <Input type="number" className="h-8 text-sm" value={field.minNumber ?? ""} onChange={(e) => updateField(idx, { minNumber: e.target.value ? Number(e.target.value) : undefined })} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs">Max Number</Label>
                            <Input type="number" className="h-8 text-sm" value={field.maxNumber ?? ""} onChange={(e) => updateField(idx, { maxNumber: e.target.value ? Number(e.target.value) : undefined })} />
                          </div>
                        </div>
                      )}

                      {(field.type === "single_select" || field.type === "city") && (
                        <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                          <Label className="text-xs text-muted-foreground">Options (Comma separated)</Label>
                          <Input className="h-8 text-sm" value={field.options?.join(",") || ""} onChange={(e) => updateField(idx, { options: e.target.value.split(",") })} placeholder="Option 1,Option 2" />
                          {field.type === "city" && (
                            <div className="flex items-center gap-2 mt-2">
                              <Switch checked={field.allowOther} onCheckedChange={(v) => updateField(idx, { allowOther: v })} />
                              <Label className="text-xs">Allow "Other City" free text</Label>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid gap-3 rounded-md bg-muted/50 p-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Show this question when</Label>
                          <Select
                            value={field.visibleWhen?.fieldKey ?? "always"}
                            onValueChange={(value) => updateField(idx, {
                              visibleWhen: value === "always" ? undefined : { fieldKey: value, equals: fields.find((candidate) => candidate.key === value)?.options?.[0] ?? "" },
                            })}
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="always">Always</SelectItem>
                              {fields.slice(0, idx).filter((candidate) => candidate.type === "single_select").map((candidate) => (
                                <SelectItem key={candidate.key} value={candidate.key}>{candidate.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {field.visibleWhen && (
                          <div className="space-y-2">
                            <Label className="text-xs">Answer equals</Label>
                            <Select value={field.visibleWhen.equals} onValueChange={(equals) => updateField(idx, { visibleWhen: { ...field.visibleWhen!, equals } })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {fields.find((candidate) => candidate.key === field.visibleWhen?.fieldKey)?.options?.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeField(idx)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {fields.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">No questions added yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="consent" className="space-y-6 mt-6">
              <Card>
                <CardHeader><CardTitle>Consent & Privacy</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Privacy Notice *</Label>
                    <Textarea rows={4} value={settings.privacyNotice} onChange={(e) => updateSetting("privacyNotice", e.target.value)} placeholder="Required privacy explanation..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Consent Text *</Label>
                    <Textarea rows={3} value={settings.contactConsentText} onChange={(e) => updateSetting("contactConsentText", e.target.value)} placeholder="Required contact acknowledgment..." />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}




