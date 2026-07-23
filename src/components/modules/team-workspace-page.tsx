"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type TeamMember = {
  id: string;
  title: string | null;
  startedAt: string;
  isActive: boolean;
  staffMeta: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
};

type ActivityItem = {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  scheduledFor: string | null;
  createdAt: string;
  assignedStaff: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  } | null;
};

type ChatMessage = {
  id: string;
  teamId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
};

type DocumentLink = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  createdAt: string;
  createdBy: {
    user: {
      name: string | null;
      email: string;
    };
  };
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const json = await response.json();
  if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : "Request failed");
  return json.data;
}

export function TeamWorkspacePage({ teamId, teamName }: { teamId: string; teamName: string }) {
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityAssigneeId, setActivityAssigneeId] = useState("");
  const [activitySchedule, setActivitySchedule] = useState("");

  const [chatInput, setChatInput] = useState("");

  // Queries
  const members = useQuery<TeamMember[]>({
    queryKey: ["team-members", teamId],
    queryFn: () => request<TeamMember[]>(`/api/admin/collaboration-teams/${teamId}/members`),
    staleTime: 30000,
  });

  const activities = useQuery<ActivityItem[]>({
    queryKey: ["team-activities", teamId],
    queryFn: () => request<ActivityItem[]>(`/api/teams/${teamId}/activities`),
    staleTime: 10000,
  });

  const chatMessages = useQuery<ChatMessage[]>({
    queryKey: ["team-chat", teamId],
    queryFn: () => request<ChatMessage[]>(`/api/teams/${teamId}/chat`),
    refetchInterval: 3000,
  });

  const documentLinks = useQuery<DocumentLink[]>({
    queryKey: ["team-documents", teamId],
    queryFn: () => request<DocumentLink[]>(`/api/teams/${teamId}/documents`),
    staleTime: 30000,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.data]);

  // Activity Mutations
  const createActivity = useMutation({
    mutationFn: () =>
      request(`/api/teams/${teamId}/activities`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: activityTitle.trim(),
          description: activityDescription.trim() || undefined,
          assignedStaffMetaId: activityAssigneeId,
          scheduledFor: activitySchedule ? new Date(activitySchedule).toISOString() : undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] });
      setActivityTitle("");
      setActivityDescription("");
      setActivityAssigneeId("");
      setActivitySchedule("");
      toast.success("Activity plan item created.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateActivityStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      request(`/api/teams/${teamId}/activities/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] });
      toast.success("Activity status updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Chat Mutations
  const sendMessage = useMutation({
    mutationFn: () =>
      request(`/api/teams/${teamId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: chatInput.trim() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-chat", teamId] });
      setChatInput("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) =>
      request(`/api/teams/${teamId}/chat/${messageId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-chat", teamId] });
      toast.success("Message deleted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Document Link Registration (Disabled policy trigger test)
  const registerDocumentLink = useMutation({
    mutationFn: () =>
      request(`/api/teams/${teamId}/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Sample Doc",
          url: "https://example.com/doc",
        }),
      }),
    onError: (error: Error) => toast.error(error.message),
  });

  const activeMembers = (members.data || []).filter((m) => m.isActive);

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={`${teamName} Workspace`}
        description="Collaboration workspace for team planning, active assignments, team chat, and operational documents."
      />

      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid">
          <TabsTrigger value="activities" className="gap-2">
            <Calendar className="size-4" />
            <span className="hidden sm:inline">Activities</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="size-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        {/* ACTIVITIES TAB */}
        <TabsContent value="activities" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Team Activity Plan</CardTitle>
                <CardDescription>Track operational activities and assignments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activities.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading activity plan...</p>
                ) : activities.data?.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No planned activities for this team yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.data?.map((item) => (
                      <div key={item.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{item.title}</span>
                            <Badge
                              variant={
                                item.status === "completed"
                                  ? "default"
                                  : item.status === "in_progress"
                                  ? "secondary"
                                  : item.status === "cancelled"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {item.status.replace("_", " ")}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Assignee: {item.assignedStaff?.user.name || item.assignedStaff?.user.email || "Unassigned"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === "planned" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateActivityStatus.mutate({ id: item.id, status: "in_progress" })}
                            >
                              Start
                            </Button>
                          )}
                          {item.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateActivityStatus.mutate({ id: item.id, status: "completed" })}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Activity Item</CardTitle>
                <CardDescription>Assign operational tasks to active team members.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="act-title">Title</Label>
                  <Input
                    id="act-title"
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    placeholder="e.g. Prepare curriculum material"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="act-desc">Description (optional)</Label>
                  <Textarea
                    id="act-desc"
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    placeholder="Additional context or deliverables..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Assignee</Label>
                  <Select value={activityAssigneeId} onValueChange={setActivityAssigneeId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select active team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMembers.map((m) => (
                        <SelectItem key={m.staffMeta.id} value={m.staffMeta.id}>
                          {m.staffMeta.user.name || m.staffMeta.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="act-date">Scheduled Date (optional)</Label>
                  <Input
                    id="act-date"
                    type="datetime-local"
                    value={activitySchedule}
                    onChange={(e) => setActivitySchedule(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!activityTitle.trim() || !activityAssigneeId || createActivity.isPending}
                  onClick={() => createActivity.mutate()}
                >
                  <Plus className="mr-2 size-4" />
                  {createActivity.isPending ? "Creating..." : "Create Activity"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CHAT TAB */}
        <TabsContent value="chat" className="mt-6">
          <Card className="flex flex-col h-[500px]">
            <CardHeader className="border-b">
              <CardTitle className="text-base">Team Chat Stream</CardTitle>
              <CardDescription>Real-time team chat stream with 3-second polling.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading chat stream...</p>
              ) : chatMessages.data?.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No messages yet. Send a message to start team conversation.
                </div>
              ) : (
                chatMessages.data?.map((msg) => (
                  <div key={msg.id} className="flex flex-col rounded-lg border p-3 bg-card space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {msg.author.user.name || msg.author.user.email}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMessage.mutate(msg.id)}
                          title="Delete message"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </CardContent>
            <div className="border-t p-3 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a team message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) {
                    e.preventDefault();
                    sendMessage.mutate();
                  }
                }}
              />
              <Button disabled={!chatInput.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate()}>
                <Send className="size-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Team Members</CardTitle>
              <CardDescription>Staff members assigned to this collaboration team.</CardDescription>
            </CardHeader>
            <CardContent>
              {members.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading members...</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.data?.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border p-4">
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <Users className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{m.staffMeta.user.name || m.staffMeta.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.staffMeta.role.replace("_", " ")}
                          {m.title ? ` · ${m.title}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="size-4 text-amber-500" />
                Document Link Registry
              </CardTitle>
              <CardDescription>
                Document link registration is fail-closed by policy pending domain allowlist approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
                <Lock className="size-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Security Governance Notice</p>
                  <p className="mt-1 text-xs">
                    Link registration is currently disabled across all team workspaces pending security domain allowlist and open-redirect policy approval.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label>Document Title</Label>
                  <Input disabled placeholder="e.g. Master Training Deck" />
                </div>
                <div className="grid gap-2">
                  <Label>Document URL</Label>
                  <Input disabled placeholder="https://..." />
                </div>
                <Button disabled onClick={() => registerDocumentLink.mutate()} className="w-full">
                  Register Document Link (Disabled)
                </Button>
              </div>

              {documentLinks.data && documentLinks.data.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-semibold">Registered Documents</h4>
                  {documentLinks.data.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.url}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
