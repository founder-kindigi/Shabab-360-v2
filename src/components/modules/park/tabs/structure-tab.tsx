"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Users, UserPlus, Search, GraduationCap } from "lucide-react";

interface StructureTabProps {
  parkId: string;
  onSelectStudent?: (studentId: string, studentName?: string) => void;
}

interface MurabbiItem {
  id: string;
  name: string;
  studentsCount: number;
  phone: string;
}

interface StudentItem {
  id: string;
  name: string;
  murabbi: string;
  year: string;
  groupId?: string;
  phone?: string | null;
  address?: string | null;
}

export function StructureTab({ parkId, onSelectStudent }: StructureTabProps) {
  const queryClient = useQueryClient();
  const [studentSearch, setStudentSearch] = useState("");
  const [isAddMurabbiOpen, setIsAddMurabbiOpen] = useState(false);
  const [isStudentsOpen, setIsStudentsOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingMurabbi, setEditingMurabbi] = useState<MurabbiItem | null>(null);

  // Form states for Add Murabbi
  const [newMurabbiName, setNewMurabbiName] = useState("");
  const [newMurabbiEmail, setNewMurabbiEmail] = useState("");
  const [newMurabbiRole, setNewMurabbiRole] = useState("Murabbi");
  const [newMurabbiContact, setNewMurabbiContact] = useState("");

  // Form states for Add Student
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentGroupId, setNewStudentGroupId] = useState("");
  const [newStudentClass, setNewStudentClass] = useState("");
  const [newStudentContact, setNewStudentContact] = useState("");
  const [newStudentAddress, setNewStudentAddress] = useState("");

  const { data: structure, isLoading } = useQuery({
    queryKey: ["park-structure", parkId],
    queryFn: async () => {
      const res = await fetch(`/api/park/structure?parkId=${encodeURIComponent(parkId)}`);
      if (!res.ok) {
        throw new Error("Failed to load park structure");
      }
      return res.json() as Promise<{
        headMurabbi: { name: string; studentsCount: number; phone: string };
        parkAdmin: { name: string; studentsCount: number; phone: string };
        murabbis: MurabbiItem[];
        students: StudentItem[];
        groups: Array<{ id: string; name: string }>;
        totalStudents: number;
        totalMurabbis: number;
      }>;
    },
  });

  const addMurabbiMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/park/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_murabbi",
          parkId,
          name: newMurabbiName,
          email: newMurabbiEmail,
          role: newMurabbiRole,
          phone: newMurabbiContact,
        }),
      });
      if (!res.ok) throw new Error("Failed to add murabbi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-structure", parkId] });
      setIsAddMurabbiOpen(false);
      setNewMurabbiName("");
      setNewMurabbiEmail("");
      setNewMurabbiContact("");
    },
  });

  const addStudentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/park/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_student",
          parkId,
          name: newStudentName,
          groupId: newStudentGroupId || undefined,
          schoolClass: newStudentClass,
          guardianContact: newStudentContact,
          address: newStudentAddress,
        }),
      });
      if (!res.ok) throw new Error("Failed to add student");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-structure", parkId] });
      setIsAddStudentOpen(false);
      setNewStudentName("");
      setNewStudentClass("");
      setNewStudentContact("");
      setNewStudentAddress("");
    },
  });

  const headMurabbi = structure?.headMurabbi || { name: "Ahmed Khan", studentsCount: 0, phone: "0300-1234567" };
  const parkAdmin = structure?.parkAdmin || { name: "Salman Ali", studentsCount: 0, phone: "0300-7654321" };
  const murabbis = structure?.murabbis || [];
  const students = structure?.students || [];
  const groups = structure?.groups || [];

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.murabbi.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-28">
      {/* Leadership Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-slate-50 border-slate-100 rounded-2xl shadow-none">
          <CardContent className="p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">HEAD MURABBI</p>
            <p className="font-bold text-slate-900 text-sm">{headMurabbi.name}</p>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>{headMurabbi.studentsCount} students</span>
              <button
                onClick={() =>
                  setEditingMurabbi({
                    id: "head",
                    name: headMurabbi.name,
                    studentsCount: headMurabbi.studentsCount,
                    phone: headMurabbi.phone,
                  })
                }
                className="text-[#4B0A8F] font-semibold text-xs hover:underline"
              >
                edit
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 rounded-2xl shadow-none">
          <CardContent className="p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">PARK ADMIN</p>
            <p className="font-bold text-slate-900 text-sm">{parkAdmin.name}</p>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>{parkAdmin.studentsCount} students</span>
              <button
                onClick={() =>
                  setEditingMurabbi({
                    id: "admin",
                    name: parkAdmin.name,
                    studentsCount: parkAdmin.studentsCount,
                    phone: parkAdmin.phone,
                  })
                }
                className="text-[#4B0A8F] font-semibold text-xs hover:underline"
              >
                edit
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Murabbis Roster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            MURABBIS ({murabbis.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {murabbis.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-slate-100">
                    <AvatarFallback className="bg-gradient-to-br from-[#1F0860] to-[#4B0A8F] text-white font-bold text-xs">
                      {m.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm leading-tight">{m.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {m.studentsCount} students · {m.phone}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingMurabbi(m)}
                  className="text-slate-400 hover:text-[#4B0A8F] h-8 w-8 rounded-full"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Murabbi Sheet */}
      {editingMurabbi && (
        <Sheet open={!!editingMurabbi} onOpenChange={(open) => !open && setEditingMurabbi(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto max-w-[460px] mx-auto p-6">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left font-bold text-lg text-slate-900 dark:text-white">Edit Murabbi</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Name</Label>
                <Input defaultValue={editingMurabbi.name} className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</Label>
                <Input type="email" placeholder="murabbi@shabab.pk" className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Role</Label>
                <Select defaultValue="Murabbi">
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Murabbi">Murabbi</SelectItem>
                    <SelectItem value="Muawin">Muawin</SelectItem>
                    <SelectItem value="Head Murabbi">Head Murabbi</SelectItem>
                    <SelectItem value="Park Admin">Park Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Assists</Label>
                <Select defaultValue="none">
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                    <SelectValue placeholder="Select murabbi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {murabbis.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Contact</Label>
                <Input defaultValue={editingMurabbi.phone} className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
              </div>
              <div className="flex gap-3 pt-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingMurabbi(null)}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 h-11 rounded-xl font-semibold"
                >
                  Delete
                </Button>
                <Button
                  onClick={() => setEditingMurabbi(null)}
                  className="flex-1 bg-[#4B0A8F] hover:bg-[#3d0874] text-white h-11 rounded-xl font-bold"
                >
                  Save
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Bottom Centered Action Bar (Locked to max-w-[460px] frame on desktop) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] bg-white border-t border-slate-100 p-4 flex items-center gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-30">
        {/* Add Murabbi Button */}
        <Sheet open={isAddMurabbiOpen} onOpenChange={setIsAddMurabbiOpen}>
          <SheetTrigger asChild>
            <Button className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#1F0860] via-[#4B0A8F] to-[#D90429] text-white font-bold text-sm shadow-md">
              <UserPlus className="w-4 h-4 mr-2" /> + Add murabbi
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto max-w-[460px] mx-auto p-6">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left font-bold text-lg text-slate-900 dark:text-white">Add Murabbi</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Name</Label>
                <Input
                  value={newMurabbiName}
                  onChange={(e) => setNewMurabbiName(e.target.value)}
                  placeholder="E.g. Hassan Safi"
                  className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</Label>
                <Input
                  type="email"
                  value={newMurabbiEmail}
                  onChange={(e) => setNewMurabbiEmail(e.target.value)}
                  placeholder="hassan@shabab.pk"
                  className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Role</Label>
                <Select value={newMurabbiRole} onValueChange={setNewMurabbiRole}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Murabbi">Murabbi</SelectItem>
                    <SelectItem value="Muawin">Muawin</SelectItem>
                    <SelectItem value="Head Murabbi">Head Murabbi</SelectItem>
                    <SelectItem value="Park Admin">Park Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Contact</Label>
                <Input
                  value={newMurabbiContact}
                  onChange={(e) => setNewMurabbiContact(e.target.value)}
                  placeholder="0300-1234567"
                  className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                />
              </div>
              <Button
                onClick={() => addMurabbiMutation.mutate()}
                disabled={!newMurabbiName || !newMurabbiEmail || addMurabbiMutation.isPending}
                className="w-full h-11 bg-[#4B0A8F] hover:bg-[#3d0874] text-white font-bold rounded-xl mt-3"
              >
                {addMurabbiMutation.isPending ? "Saving..." : "Save Murabbi"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Students Roster Button */}
        <Sheet open={isStudentsOpen} onOpenChange={setIsStudentsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl text-[#4B0A8F] border-purple-200 bg-purple-50/50 hover:bg-purple-100 font-bold text-sm"
            >
              <GraduationCap className="w-4 h-4 mr-2 text-[#4B0A8F]" /> Students ({students.length})
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl h-[90vh] overflow-hidden flex flex-col max-w-[460px] mx-auto p-0">
            <div className="p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <SheetTitle className="text-left font-bold text-lg">
                  Students ({students.length})
                </SheetTitle>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="pl-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3 divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No students found.
                </div>
              ) : (
                filteredStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (onSelectStudent) {
                        setIsStudentsOpen(false);
                        onSelectStudent(s.id, s.name);
                      }
                    }}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-purple-50/50 dark:hover:bg-white/5 cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-9 h-9 border border-slate-100">
                        <AvatarFallback className="bg-purple-100 text-[#4B0A8F] font-bold text-xs">
                          {s.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{s.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {s.murabbi} · {s.year}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#4B0A8F] bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full shrink-0">
                      Profile →
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
              <Button
                variant="outline"
                onClick={() => alert("Upload xlsx feature")}
                className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 text-sm font-semibold"
              >
                Import .xlsx
              </Button>

              <Sheet open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                <SheetTrigger asChild>
                  <Button className="flex-1 h-11 rounded-xl bg-[#4B0A8F] hover:bg-[#3d0874] text-white font-bold text-sm">
                    + Add student
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto p-6">
                  <SheetHeader className="mb-4">
                    <SheetTitle className="text-left font-bold text-lg text-slate-900 dark:text-white">Add Student to Park</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Student name</Label>
                      <Input
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="Full name"
                        className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Murabbi (Group)</Label>
                      <Select value={newStudentGroupId} onValueChange={setNewStudentGroupId}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                          <SelectValue placeholder="Assign group / murabbi" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">School/class</Label>
                      <Input
                        value={newStudentClass}
                        onChange={(e) => setNewStudentClass(e.target.value)}
                        placeholder="Grade 9 / O-Levels"
                        className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Guardian contact</Label>
                      <Input
                        value={newStudentContact}
                        onChange={(e) => setNewStudentContact(e.target.value)}
                        placeholder="0300-1234567"
                        className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Address</Label>
                      <Input
                        value={newStudentAddress}
                        onChange={(e) => setNewStudentAddress(e.target.value)}
                        placeholder="Residential area / street"
                        className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                      />
                    </div>
                    <Button
                      onClick={() => addStudentMutation.mutate()}
                      disabled={!newStudentName || addStudentMutation.isPending}
                      className="w-full h-11 bg-[#4B0A8F] hover:bg-[#3d0874] text-white font-bold rounded-xl mt-3"
                    >
                      {addStudentMutation.isPending ? "Saving..." : "Save Student"}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
