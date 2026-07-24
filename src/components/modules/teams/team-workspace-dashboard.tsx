"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Send, Trash2, Users, Calendar, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type TeamData = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  _count: {
    memberships: number;
    chatMessages: number;
    documentLinks: number;
  };
};

type ActivityItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assignedStaff?: { user?: { name?: string } };
  contentBlock?: { title?: string } | null;
};

type ChatMessage = {
  id: string;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  author?: { user?: { name?: string } };
};

type DocumentLink = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  createdAt: string;
  createdBy?: { user?: { name?: string } };
};

export function TeamWorkspaceDashboard({ teamId }: { teamId: string }) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [chatInput, setChatInput] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDesc, setActivityDesc] = useState("");
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);

  const canManage = ["super_admin", "program_admin", "city_head", "park_lead"].includes(userRole || "");

  // ── Team metadata ────────────────────────────────────────────────

  const { data: team, isLoading: teamLoading } = useQuery<{ data: TeamData }>({
    queryKey: ["team", teamId],
    queryFn: () => fetch(`/api/teams/${teamId}`).then((r) => r.json()),
  });

  // ── Activities ───────────────────────────────────────────────────

  const { data: activities } = useQuery<{ data: ActivityItem[] }>({
    queryKey: ["team-activities", teamId],
    queryFn: () => fetch(`/api/teams/${teamId}/activities`).then((r) => r.json()),
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string }) => {
      const res = await fetch(`/api/teams/${teamId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Activity created");
      setActivityTitle("");
      setActivityDesc("");
      setIsCreatingActivity(false);
      queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/teams/${teamId}/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] }),
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Chat ─────────────────────────────────────────────────────────

  const { data: chatData } = useQuery<{ data: ChatMessage[] }>({
    queryKey: ["team-chat", teamId],
    queryFn: () => fetch(`/api/teams/${teamId}/chat`).then((r) => r.json()),
    refetchInterval: 10000,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/teams/${teamId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setChatInput("");
      queryClient.invalidateQueries({ queryKey: ["team-chat", teamId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/teams/${teamId}/chat/${messageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-chat", teamId] }),
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Documents ────────────────────────────────────────────────────

  const { data: documents } = useQuery<{ data: DocumentLink[] }>({
    queryKey: ["team-documents", teamId],
    queryFn: () => fetch(`/api/teams/${teamId}/documents`).then((r) => r.json()),
  });

  // ── Loading ──────────────────────────────────────────────────────

  if (teamLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold">{team?.data?.name || "Team Workspace"}</h2>
        {team?.data?.description && (
          <p className="text-sm text-muted-foreground">{team.data.description}</p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">
            <Users className="size-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activities">
            <Calendar className="size-4 mr-1.5" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="size-4 mr-1.5" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="size-4 mr-1.5" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{team?.data?._count?.memberships ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{team?.data?._count?.chatMessages ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{team?.data?._count?.documentLinks ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Activity Planner</CardTitle>
              {canManage && !isCreatingActivity && (
                <Button size="sm" onClick={() => setIsCreatingActivity(true)}>
                  New Activity
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {isCreatingActivity && (
                <div className="space-y-3 p-3 border rounded-lg">
                  <Input
                    placeholder="Activity title"
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={activityDesc}
                    onChange={(e) => setActivityDesc(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => createActivityMutation.mutate({ title: activityTitle, description: activityDesc })}
                      disabled={!activityTitle.trim() || createActivityMutation.isPending}
                    >
                      Create
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsCreatingActivity(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {activities?.data?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No activities yet.</p>
              )}
              {activities?.data?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                    {item.assignedStaff?.user?.name && (
                      <p className="text-xs text-muted-foreground">
                        Assigned to: {item.assignedStaff.user.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {item.status}
                    </Badge>
                    {canManage && item.status === "planned" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => updateActivityMutation.mutate({ id: item.id, status: "in_progress" })}
                      >
                        Start
                      </Button>
                    )}
                    {canManage && item.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-emerald-600"
                        onClick={() => updateActivityMutation.mutate({ id: item.id, status: "completed" })}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Messages */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {chatData?.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No messages yet. Start a conversation!
                  </p>
                )}
                {chatData?.data?.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start justify-between gap-2 p-2 rounded-lg",
                      msg.isDeleted && "opacity-50 italic text-xs"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {msg.author?.user?.name || "Unknown"}
                      </p>
                      <p className="text-sm">
                        {msg.isDeleted ? "This message was deleted" : msg.content}
                      </p>
                    </div>
                    {!msg.isDeleted && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => deleteMessageMutation.mutate(msg.id)}
                      >
                        <Trash2 className="size-3 text-muted-foreground hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (chatInput.trim()) sendMessageMutation.mutate(chatInput);
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={() => chatInput.trim() && sendMessageMutation.mutate(chatInput)}
                  disabled={!chatInput.trim() || sendMessageMutation.isPending}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shared Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed opacity-60">
                <Lock className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  File uploads are currently disabled. Please register a link to an external document below.
                </p>
              </div>
              {documents?.data?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No documents shared yet.</p>
              )}
              {documents?.data?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.url}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
