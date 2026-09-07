"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Users, UserPlus } from "lucide-react";

export function StructureTab({ parkId }: { parkId: string }) {
  const { data: roster } = useQuery({
    queryKey: ["park-structure", parkId],
    queryFn: async () => {
      return {
        headMurabbi: { name: "Ahmed Khan", studentsCount: 0, phone: "07700900000" },
        parkAdmin: { name: "Salman Ali", studentsCount: 0, phone: "07700900001" },
        murabbis: [
          { id: "1", name: "Hassan Safi", studentsCount: 12, phone: "07700900002" },
          { id: "2", name: "Zaid Omar", studentsCount: 10, phone: "07700900003" },
        ],
        students: [
          { id: "s1", name: "Ali Ahmed", murabbi: "Hassan Safi", year: "1st Year" },
          { id: "s2", name: "Omar Tariq", murabbi: "Zaid Omar", year: "2nd Year" },
        ]
      };
    },
    initialData: {
      headMurabbi: { name: "Ahmed Khan", studentsCount: 0, phone: "07700900000" },
      parkAdmin: { name: "Salman Ali", studentsCount: 0, phone: "07700900001" },
      murabbis: [
        { id: "1", name: "Hassan Safi", studentsCount: 12, phone: "07700900002" },
        { id: "2", name: "Zaid Omar", studentsCount: 10, phone: "07700900003" },
      ],
      students: [
        { id: "s1", name: "Ali Ahmed", murabbi: "Hassan Safi", year: "1st Year" },
        { id: "s2", name: "Omar Tariq", murabbi: "Zaid Omar", year: "2nd Year" },
      ]
    },
  });

  return (
    <div className="space-y-6 pb-24">
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gray-50 border-gray-100 shadow-none">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-gray-400 tracking-wider">HEAD MURABBI</p>
            <p className="font-semibold">{roster.headMurabbi.name}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{roster.headMurabbi.studentsCount} students</span>
              <button className="text-[#4B0A8F] font-medium underline">edit</button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-100 shadow-none">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-gray-400 tracking-wider">PARK ADMIN</p>
            <p className="font-semibold">{roster.parkAdmin.name}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{roster.parkAdmin.studentsCount} students</span>
              <button className="text-[#4B0A8F] font-medium underline">edit</button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 tracking-wider">MURABBIS ({roster.murabbis.length})</h3>
        <div className="space-y-3">
          {roster.murabbis.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-[#1F0860] text-white">
                    {m.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.studentsCount} students · {m.phone}</p>
                </div>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#4B0A8F]">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Edit Murabbi</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input defaultValue={m.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select defaultValue="Murabbi">
                        <SelectTrigger>
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
                    <div className="space-y-2">
                      <Label>Contact</Label>
                      <Input defaultValue={m.phone} />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="destructive" className="flex-1">
                        Delete
                      </Button>
                      <Button className="flex-1 bg-[#4B0A8F]">
                        Save
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="flex-1 bg-gradient-to-r from-[#1F0860] to-[#4B0A8F] text-white">
              <UserPlus className="w-4 h-4 mr-2" /> Add murabbi
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Add Murabbi</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="E.g. Hassan Safi" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="hassan@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select defaultValue="Murabbi">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Murabbi">Murabbi</SelectItem>
                    <SelectItem value="Muawin">Muawin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input placeholder="07..." />
              </div>
              <Button className="w-full bg-[#4B0A8F] mt-2">Save Murabbi</Button>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 text-[#4B0A8F] border-[#4B0A8F]">
              <Users className="w-4 h-4 mr-2" /> Students
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl h-[90vh] overflow-hidden flex flex-col">
            <SheetHeader className="mb-4 shrink-0">
              <SheetTitle>Students (69)</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto space-y-4">
              {roster.students.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {s.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.murabbi} · {s.year}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t flex gap-3 shrink-0">
              <Button variant="outline" className="flex-1">
                Import .xlsx
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="flex-1 bg-[#4B0A8F]">
                    + Add student
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Add Student</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Student name</Label>
                      <Input placeholder="Full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Murabbi (halqa)</Label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Assign murabbi" /></SelectTrigger>
                        <SelectContent>
                          {roster.murabbis.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>School/class</Label>
                      <Input />
                    </div>
                    <div className="space-y-2">
                      <Label>Guardian contact</Label>
                      <Input />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input />
                    </div>
                    <Button className="w-full bg-[#4B0A8F] mt-4">Save Student</Button>
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
