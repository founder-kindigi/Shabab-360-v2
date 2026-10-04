"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/useAppStore";
import { ArrowLeft, Users, AlertTriangle, Eye, Loader2 } from "lucide-react";
import type { FormField } from "@/lib/registration-forms/definition";

interface SubmissionListItem {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  revision: { version: number };
}

interface SubmissionDetail {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  answers: Record<string, string | number | { choice: string; other: string }>;
  formVersion: number;
  formTitle: string;
  fields: FormField[];
}

export function RegistrationFormSubmissionsPage({ onBack }: { onBack?: () => void } = {}) {
  const selectedFormId = useAppStore((s) => s.selectedFormId);
  const storeGoBack = useAppStore((s) => s.goBack);
  const goBack = onBack ?? storeGoBack;
  const [page, setPage] = useState(1);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ data: SubmissionListItem[]; total: number; pageSize: number }>({
    queryKey: ["admin-registration-forms-submissions", selectedFormId, page],
    queryFn: async () => {
      if (!selectedFormId) throw new Error("No form selected");
      const res = await fetch(`/api/admin/registration-forms/${selectedFormId}/submissions?page=${page}&pageSize=20`);
      if (!res.ok) throw new Error("Failed to load submissions");
      return res.json();
    },
    enabled: !!selectedFormId,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-background">
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Form Submissions</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            Review applicant submissions
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30">
              <AlertTriangle className="size-4 text-red-500" />
              <p className="text-sm text-red-700">Failed to load submissions. Please try again.</p>
            </div>
          )}

          {!isLoading && data?.data?.length === 0 && (
            <div className="py-16 text-center border rounded-lg bg-background">
              <Users className="size-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No submissions found.</p>
            </div>
          )}

          {data && data.data.length > 0 && (
            <div className="rounded-md border bg-background overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Form Version</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>{format(new Date(sub.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell className="font-mono text-sm">{sub.reference}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{sub.status}</Badge>
                      </TableCell>
                      <TableCell>v{sub.revision.version}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSubId(sub.id)}>
                          <Eye className="size-4 mr-2" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      <SubmissionDetailSheet formId={selectedFormId} subId={selectedSubId} onClose={() => setSelectedSubId(null)} />
    </div>
  );
}

function SubmissionDetailSheet({ formId, subId, onClose }: { formId: string | null; subId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ data: SubmissionDetail }>({
    queryKey: ["admin-registration-forms-submissions-detail", formId, subId],
    queryFn: async () => {
      if (!formId || !subId) throw new Error("Missing parameters");
      const res = await fetch(`/api/admin/registration-forms/${formId}/submissions/${subId}`);
      if (!res.ok) throw new Error("Failed to load submission");
      return res.json();
    },
    enabled: !!formId && !!subId,
  });

  return (
    <Sheet open={!!subId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md w-[90vw] overflow-y-auto p-0">
        <div className="p-6 border-b sticky top-0 bg-background z-10">
          <SheetHeader>
            <SheetTitle>Submission Details</SheetTitle>
            <SheetDescription>
              {data ? `Submitted for ${data.data.formTitle} (v${data.data.formVersion})` : "Loading..."}
            </SheetDescription>
          </SheetHeader>
        </div>
        <div className="p-6 space-y-6">
          {isLoading && (
            <div className="flex justify-center p-8"><Loader2 className="size-6 animate-spin text-primary" /></div>
          )}
          {data && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(data.data.createdAt), "MMM d, yyyy HH:mm")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Receipt</p>
                  <p className="font-mono font-medium">{data.data.reference}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium border-b pb-2">Applicant Answers</h3>
                {data.data.fields.map((field) => {
                  const answer = data.data.answers[field.key];
                  const displayValue = answer === undefined || answer === null ? "Not answered"
                    : typeof answer === "object" ? `${answer.choice}: ${answer.other}`
                    : String(answer);

                  return (
                    <div key={field.key} className="space-y-1">
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="text-sm text-muted-foreground bg-muted/20 p-2 rounded-md">
                        {displayValue}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
