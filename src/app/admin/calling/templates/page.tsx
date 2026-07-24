"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Loader2, CheckCircle2, XCircle, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  title: string;
  body: string;
  status: string;
  version: number;
  city?: { name: string };
  campaign?: { name: string } | null;
};

export default function TemplatesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const canManageTemplates = ["super_admin", "program_admin", "city_head"].includes(userRole || "");
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["calling-templates"],
    queryFn: () => fetch("/api/calling/templates").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calling/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Template created");
      setShowCreate(false);
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["calling-templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calling/templates/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error("Failed to approve template");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Template approved");
      queryClient.invalidateQueries({ queryKey: ["calling-templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const STATUS_STYLES: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-emerald-100 text-emerald-700",
    retired: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calling Templates</h1>
          <p className="text-sm text-muted-foreground">Manage message templates and approvals</p>
        </div>
        {canManageTemplates && (
          <Button onClick={() => setShowCreate(true)}><Plus className="size-4 mr-1.5" /> New Template</Button>
        )}
      </div>

      {isLoading && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>}

      {templates?.length === 0 && !isLoading && (
        <div className="py-16 text-center">
          <FileText className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No templates yet.</p>
        </div>
      )}

      {templates?.map((tpl) => (
        <Card key={tpl.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{tpl.title}</p>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[tpl.status])}>{tpl.status}</Badge>
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                    <Hash className="size-3" />v{tpl.version}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.body}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {canManageTemplates && tpl.status === "draft" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600" onClick={() => approveMutation.mutate(tpl.id)}>
                    <CheckCircle2 className="size-3 mr-1" /> Approve
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={showCreate} onOpenChange={(v) => !v && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Template title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="space-y-1">
              <Label>Message body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Enter template text with {{variable}} placeholders..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title || !body || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
