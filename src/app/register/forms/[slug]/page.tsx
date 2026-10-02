"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, Loader2, Info } from "lucide-react";
import type { FormField, FormSettings } from "@/lib/registration-forms/definition";
import { isFieldVisible } from "@/lib/registration-forms/definition";

interface FormResponse {
  slug: string;
  title: string;
  intro: string;
  fields: FormField[];
  settings: FormSettings;
  publishedVersion: number;
  isOpen: boolean;
}

const SECTION_NUMERALS = ["I", "II", "III"];

function groupFields(fields: FormField[]) {
  const firstPhone = fields.findIndex((field) => field.type === "phone");
  const firstCity = fields.findIndex((field) => field.type === "city");

  if (firstPhone < 0 && firstCity < 0) {
    return [{ title: "Registration details", fields }];
  }

  const personalEnd = firstPhone >= 0 ? firstPhone : firstCity;
  const contactEnd = firstCity >= 0 ? firstCity : fields.length;
  return [
    { title: "Personal details", fields: fields.slice(0, personalEnd) },
    { title: "Contact details", fields: fields.slice(personalEnd, contactEnd) },
    { title: "Location", fields: fields.slice(contactEnd) },
  ].filter((section) => section.fields.length > 0);
}

export default function PublicRegistrationFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [requestKey] = useState(() => uuidv4());
  const [step, setStep] = useState<"loading" | "error" | "closed" | "intro" | "form" | "review" | "success">("loading");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [consent, setConsent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [receipt, setReceipt] = useState("");

  const { data, isLoading, error } = useQuery<FormResponse>({
    queryKey: ["public-registration-form", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/forms/${slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Form not found. Please check the link and try again.");
        throw new Error("Form is temporarily unavailable.");
      }
      return res.json();
    },
    retry: 1,
  });

  useEffect(() => {
    if (isLoading) return;
    if (error) {
      setErrorMessage(error.message);
      setStep((current) => current === "success" ? current : "error");
    } else if (data) {
      if (!data.isOpen) {
        setStep((current) => current === "success" ? current : "closed");
      } else {
        setStep((current) => current === "loading" || current === "error" || current === "closed" ? "intro" : current);
      }
    }
  }, [isLoading, error, data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        requestKey,
        publishedVersion: data!.publishedVersion,
        consent: true,
        answers,
      };

      const res = await fetch(`/api/public/forms/${slug}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("This form has been updated or your submission conflicts. Please refresh the page or try again.");
        }
        if (res.status === 429) {
          throw new Error("Too many attempts. Please try again later.");
        }
        const err = await res.json().catch(() => ({ error: "Submission failed" }));
        throw new Error(err.error || "Submission failed");
      }
      return res.json();
    },
    onSuccess: (resData) => {
      setReceipt(resData.reference);
      setStep("success");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    // Comprehensive client-side validation
    for (const field of data.fields) {
      if (!isFieldVisible(field, answers)) continue;
      const ans = answers[field.key];

      if (field.required && (ans === undefined || ans === "" || ans === null)) {
        toast.error(`Please answer: ${field.label}`);
        return;
      }

      if (ans !== undefined && ans !== "" && ans !== null) {
        if (field.type === "number") {
          const num = Number(ans);
          if (field.minNumber !== undefined && num < field.minNumber) {
            toast.error(`${field.label} must be at least ${field.minNumber}`);
            return;
          }
          if (field.maxNumber !== undefined && num > field.maxNumber) {
            toast.error(`${field.label} must be at most ${field.maxNumber}`);
            return;
          }
        }

        if (field.type === "city" && typeof ans === "object") {
          if (!ans.other || ans.other.trim().length < 2) {
            toast.error(`Please specify the city for: ${field.label}`);
            return;
          }
        }
      }
    }

    // Check eligibility
    if (data.settings.minimumAge !== undefined && data.settings.ageFieldKey) {
      const ageAns = answers[data.settings.ageFieldKey];
      if (ageAns !== undefined && Number(ageAns) < data.settings.minimumAge) {
        toast.error(`You must be at least ${data.settings.minimumAge} years old to register.`);
        return;
      }
    }

    if (data.settings.allowedGenderValues && data.settings.genderFieldKey) {
      const genderAns = answers[data.settings.genderFieldKey];
      if (genderAns !== undefined && !data.settings.allowedGenderValues.includes(String(genderAns))) {
        toast.error(`This program is only open to: ${data.settings.allowedGenderValues.join(", ")}`);
        return;
      }
    }

    setStep("review");
  };

  const handleFieldChange = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EA] text-[#1F1638] [color-scheme:light]">
        <Loader2 className="size-8 animate-spin text-[#4B0A8F]" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EA] p-4 text-[#1F1638] [color-scheme:light]">
        <Card className="w-full max-w-md rounded-none border-[#D8CBE5] bg-white text-[#1F1638] shadow-xl">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <AlertTriangle className="size-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold text-red-700 mb-2">{errorMessage}</h2>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "closed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EA] p-4 text-[#1F1638] [color-scheme:light]">
        <Card className="w-full max-w-md rounded-none border-[#D8CBE5] bg-white text-[#1F1638] shadow-xl">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Info className="size-12 text-[#4B0A8F] mb-4" />
            <h2 className="text-xl font-bold text-[#1F0860] mb-2">{data?.title || "Form Closed"}</h2>
            <p className="text-muted-foreground">
              This registration form is no longer accepting submissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F2EA] p-4 text-[#1F1638] [color-scheme:light]">
        <Card className="w-full max-w-md rounded-none border-[#D8CBE5] bg-white text-[#1F1638] shadow-xl">
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
            <CheckCircle2 className="size-16 text-[#4B0A8F] mb-4" />
            <h2 className="text-2xl font-bold text-[#1F0860] mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6">{data?.settings.successText}</p>

            <div className="w-full p-4 bg-[#F3ECF6] rounded-xl border border-[#D8CBE5] mb-4">
              <p className="text-sm text-muted-foreground mb-1">Your Submission Receipt</p>
              <p className="font-mono text-lg font-semibold tracking-wide">{receipt}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              Please save this receipt reference for your records.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "intro") {
    const featuredOptions = data?.fields
      .filter((field) => field.type === "single_select" && (field.options?.length || 0) >= 3)
      .flatMap((field) => field.options || [])
      .slice(0, 6) || [];

    return (
      <div className="min-h-screen bg-[#F7F2EA] px-4 py-6 text-[#1F1638] [color-scheme:light] sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <main className="mx-auto max-w-3xl border border-[#D8CBE5] bg-white px-6 py-10 shadow-[0_24px_70px_rgba(31,8,96,0.10)] sm:px-12 sm:py-14">
            <div className="relative">
              <span className="absolute -left-3 -top-5 h-7 w-7 border-l border-t border-[#A0006B]" aria-hidden="true" />
              <span className="absolute -right-3 -top-5 h-7 w-7 border-r border-t border-[#A0006B]" aria-hidden="true" />
              <span className="absolute -bottom-8 -left-3 h-7 w-7 border-b border-l border-[#A0006B]" aria-hidden="true" />
              <span className="absolute -bottom-8 -right-3 h-7 w-7 border-b border-r border-[#A0006B]" aria-hidden="true" />

              <div className="text-center">
                <Image src="/logo-color.png" alt="Shabab Alburhan" width={132} height={48} className="mx-auto h-12 w-auto object-contain sm:h-14" priority />
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-[#A0006B]">Training programme · New cohort</p>
                <h1 className="mt-5 text-4xl font-bold leading-tight text-[#1F0860] sm:text-6xl">
                  Join <span className="text-[#A0006B]">{data?.title}</span>
                </h1>
                {data?.intro && <p className="mx-auto mt-6 max-w-2xl whitespace-pre-wrap text-base leading-7 text-[#51455E]">{data.intro}</p>}
              </div>

              {featuredOptions.length > 0 && (
                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {featuredOptions.map((option) => (
                    <div key={option} className="rounded-xl border border-[#D8CBE5] bg-[#FCFAFD] px-4 py-3 text-center text-sm font-semibold text-[#1F1638]">
                      {option}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-[#51455E]">
                {data?.settings.eligibilityText && <p>Eligibility — <strong className="text-[#1F1638]">{data.settings.eligibilityText}</strong></p>}
                {data?.settings.feeText && <p>Registration fee — <strong className="text-[#1F1638]">{data.settings.feeText}</strong></p>}
              </div>

              <div className="mt-9 flex flex-col items-center">
                <Button onClick={() => setStep("form")} className="h-13 rounded-lg bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] px-9 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg hover:from-[#3A0870] hover:to-[#87005A]">
                  Let&apos;s get started <ArrowRight className="ml-2 size-4" />
                </Button>
                <p className="mt-5 text-xs text-[#766A80]">{data?.fields.length || 0} quick {(data?.fields.length || 0) === 1 ? "question" : "questions"} · about 2 minutes · no account needed</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EA] text-[#1F1638] [color-scheme:light] flex flex-col">
      <header className="px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Image src="/logo-color.png" alt="Shabab Alburhan" width={132} height={48} className="h-10 w-auto object-contain" priority />
          <Button
            variant="ghost"
            className="font-semibold text-[#1F0860] hover:bg-[#F3ECF6] hover:text-[#4B0A8F]"
            onClick={() => setStep(step === "review" ? "form" : "intro")}
          >
            <ChevronLeft className="mr-1 size-4" /> Back
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 pb-10 sm:px-8">
        <div className="mx-auto max-w-3xl border border-[#D8CBE5] bg-white px-5 py-8 shadow-[0_20px_60px_rgba(31,8,96,0.08)] sm:px-9 sm:py-10">

          <AnimatePresence mode="wait">
            {step === "form" && (
              <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <form id="public-form" onSubmit={handleReview} className="space-y-10">
                  {groupFields((data?.fields || []).filter((field) => isFieldVisible(field, answers))).map((section, sectionIndex) => (
                    <section key={section.title} className="space-y-6">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#A0006B]">{SECTION_NUMERALS[sectionIndex] || sectionIndex + 1}</span>
                        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#1F0860]">{section.title}</h2>
                        <span className="h-px flex-1 bg-[#D8CBE5]" />
                      </div>

                      {section.fields.map((field) => (
                        <div key={field.key} className="space-y-3">
                        <Label htmlFor={field.type === "single_select" ? undefined : field.key} id={`${field.key}-label`} className="flex items-start gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#332641]">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        {field.helpText && <p className="text-sm text-[#766A80]">{field.helpText}</p>}

                        {field.type === "short_text" && (
                          <Input
                            id={field.key}
                            className="h-12 rounded-xl border-[#D8CBE5] !bg-[#FCFAFD] !text-[#1F1638] placeholder:!text-[#8B8094] focus-visible:ring-[#A0006B]"
                            value={answers[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            required={field.required}
                          />
                        )}

                        {field.type === "long_text" && (
                          <Textarea
                            id={field.key}
                            rows={4}
                            className="rounded-xl border-[#D8CBE5] !bg-[#FCFAFD] !text-[#1F1638] placeholder:!text-[#8B8094] focus-visible:ring-[#A0006B]"
                            value={answers[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            required={field.required}
                          />
                        )}

                        {field.type === "phone" && (
                          <Input
                            id={field.key}
                            type="tel"
                            placeholder="e.g. 03001234567"
                            className="h-12 rounded-xl border-[#D8CBE5] !bg-[#FCFAFD] !text-[#1F1638] placeholder:!text-[#8B8094] focus-visible:ring-[#A0006B]"
                            value={answers[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            required={field.required}
                          />
                        )}

                        {field.type === "number" && (
                          <Input
                            id={field.key}
                            type="number"
                            className="h-12 rounded-xl border-[#D8CBE5] !bg-[#FCFAFD] !text-[#1F1638] placeholder:!text-[#8B8094] focus-visible:ring-[#A0006B]"
                            min={field.minNumber}
                            max={field.maxNumber}
                            value={answers[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value ? Number(e.target.value) : "")}
                            required={field.required}
                          />
                        )}

                        {field.type === "single_select" && (
                          <RadioGroup
                            aria-labelledby={`${field.key}-label`}
                            value={answers[field.key] || ""}
                            onValueChange={(v) => handleFieldChange(field.key, v)}
                            className="flex flex-wrap gap-3 pt-1"
                          >
                            {field.options?.map((opt) => (
                              <div key={opt} className="flex min-w-28 items-center space-x-3 rounded-full border border-[#D8CBE5] bg-[#FCFAFD] px-4 py-2.5 transition-colors has-[[data-state=checked]]:border-[#4B0A8F] has-[[data-state=checked]]:bg-[#F3ECF6]">
                                <RadioGroupItem value={opt} id={`${field.key}-${opt}`} className="border-[#A89AB8] bg-white text-[#4B0A8F] data-[state=checked]:border-[#4B0A8F]" />
                                <Label htmlFor={`${field.key}-${opt}`} className="flex-1 cursor-pointer text-sm font-semibold text-[#332641]">{opt}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}

                        {field.type === "city" && (
                          <div className="space-y-3">
                            <Select
                              value={typeof answers[field.key] === "object" ? "Other City" : (answers[field.key] || "")}
                              onValueChange={(v) => {
                                if (v === "Other City" && field.allowOther) {
                                  handleFieldChange(field.key, { choice: "Other City", other: "" });
                                } else {
                                  handleFieldChange(field.key, v);
                                }
                              }}
                            >
                              <SelectTrigger id={field.key} className="h-12 rounded-xl border-[#D8CBE5] !bg-[#FCFAFD] !text-[#1F1638] data-[placeholder]:!text-[#8B8094]">
                                <SelectValue placeholder="Select a city" />
                              </SelectTrigger>
                              <SelectContent className="border-[#D8CBE5] bg-white text-[#1F1638] [color-scheme:light]">
                                {field.options?.map((opt) => (
                                  <SelectItem key={opt} value={opt} className="text-[#1F1638] focus:bg-[#F3ECF6] focus:text-[#1F0860]">{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {typeof answers[field.key] === "object" && answers[field.key]?.choice === "Other City" && (
                              <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor={`${field.key}-other`}>Please specify your city <span className="text-red-500">*</span></Label>
                                <Input
                                  id={`${field.key}-other`}
                                  className="h-12 rounded-xl border-[#D8CBE5] !bg-[#FCFAFD] !text-[#1F1638] placeholder:!text-[#8B8094]"
                                  value={answers[field.key].other || ""}
                                  onChange={(e) => handleFieldChange(field.key, { choice: "Other City", other: e.target.value })}
                                  autoFocus
                                />
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      ))}
                    </section>
                  ))}

                  <div className="pt-2">
                    <Button type="submit" className="h-13 w-full rounded-lg bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] text-sm font-bold uppercase tracking-[0.1em] text-white shadow-lg hover:from-[#3A0870] hover:to-[#87005A]">
                      Review & Continue
                    </Button>
                    <p className="mt-4 text-center text-xs text-[#766A80]">Your information is only used for this registration.</p>
                  </div>
                </form>
              </motion.div>
            )}

            {step === "review" && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <Card className="border-[#D8CBE5] bg-white text-[#1F1638] shadow-sm">
                  <CardHeader>
                    <CardTitle>Review your application</CardTitle>
                    <CardDescription className="text-[#766A80]">Please ensure all details are correct before submitting.</CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y divide-[#E7DDED] space-y-0 p-0">
                    {data?.fields.filter((field) => isFieldVisible(field, answers)).map((field) => {
                      const ans = answers[field.key];
                      const displayAns = typeof ans === "object" && ans?.choice === "Other City" ? ans.other : String(ans || "");

                      return (
                        <div key={field.key} className="flex flex-col justify-between gap-2 p-4 hover:bg-[#FCFAFD] sm:flex-row sm:items-start">
                          <div className="space-y-1">
                            <p className="text-sm text-[#766A80]">{field.label}</p>
                            <p className="font-medium text-base text-[#1F1638]">{displayAns || <span className="text-[#766A80] italic">Not provided</span>}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setStep("form")} className="shrink-0 self-start text-[#4B0A8F] hover:bg-[#F3ECF6] hover:text-[#1F0860]">Edit</Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="border-[#D8CBE5] bg-white text-[#1F1638] shadow-sm">
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-3 rounded-lg bg-[#F8F4FA] p-4 text-sm text-[#51455E]">
                      <h4 className="font-semibold text-[#1F1638]">Privacy Notice</h4>
                      <p className="whitespace-pre-wrap">{data?.settings.privacyNotice}</p>
                    </div>

                    <div className="flex items-start space-x-3 pt-2">
                      <Checkbox
                        id="consent"
                        checked={consent}
                        onCheckedChange={(c) => setConsent(c === true)}
                        className="mt-1 size-5 border-[#A89AB8] bg-white text-white data-[state=checked]:border-[#4B0A8F] data-[state=checked]:bg-[#4B0A8F]"
                      />
                      <Label htmlFor="consent" className="cursor-pointer text-sm font-normal leading-relaxed text-[#332641]">
                        {data?.settings.contactConsentText} <span className="text-red-500">*</span>
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-2 sticky bottom-4 z-10">
                  <Button
                    className="h-14 w-full bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] text-lg text-white shadow-lg hover:from-[#3A0870] hover:to-[#87005A] disabled:from-[#D8CBE5] disabled:to-[#D8CBE5] disabled:text-[#766A80]"
                    onClick={() => submitMutation.mutate()}
                    disabled={!consent || submitMutation.isPending}
                  >
                    {submitMutation.isPending ? <><Loader2 className="mr-2 size-5 animate-spin" /> Submitting...</> : "Submit Application"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

