"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Search,
  Users,
  Building2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Share2,
  Heart,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// --- Mock Data Fallbacks ---
const mockKPIs = {
  totalCollected: 450000,
  pendingFees: 125,
  collectionRate: 78,
  donationsRecorded: 150000,
};

const mockStudents = Array.from({ length: 35 }).map((_, i) => ({
  id: `stu-${i}`,
  name: `Student Name ${i + 1}`,
  phone: `+92 300 12345${i.toString().padStart(2, '0')}`,
  park: "Iqbal Park",
  batch: "Lahore Batch 4",
  feeTitle: "Monthly Fee - Aug 2026",
  amount: 1500,
  status: i % 5 === 0 ? "overdue" : i % 4 === 0 ? "pending" : i % 7 === 0 ? "waived" : "paid",
  dueDate: "2026-08-10",
}));

const mockEvents = [
  { id: "e1", title: "Lahore Batch 4 Monthly Fee", amount: 1500, expected: 300000, collected: 250000, waived: 5 },
  { id: "e2", title: "Sports Gala Contribution", amount: 500, expected: 50000, collected: 45000, waived: 2 },
];

const mockDonations = [
  { id: "d1", donorName: "Ali Khan", phone: "03001112233", amount: 50000, purpose: "General Fund", receiptNo: "REC-DON-001", recordedBy: "Admin" },
  { id: "d2", donorName: "Ayesha Ahmed", phone: "03334445566", amount: 25000, purpose: "Sponsorship", receiptNo: "REC-DON-002", recordedBy: "Staff" },
];

export function FeesPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState("roster");
  
  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isReceiptDrawerOpen, setIsReceiptDrawerOpen] = useState(false);
  
  const [selectedStudentForReceipt, setSelectedStudentForReceipt] = useState<any>(null);

  // Filters State
  const [cityFilter, setCityFilter] = useState("all");
  const [parkFilter, setParkFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const recordsPerPage = 10;

  // Data fetching (Simulated with fallbacks)
  const { data: kpis, isLoading: isKpisLoading } = useQuery({
    queryKey: ["fees-kpis"],
    queryFn: async () => mockKPIs, // Replace with real API
    initialData: mockKPIs
  });

  // Filtered Roster Logic
  const filteredStudents = useMemo(() => {
    let filtered = mockStudents;
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery));
    }
    return filtered;
  }, [statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / recordsPerPage);
  const paginatedStudents = filteredStudents.slice((page - 1) * recordsPerPage, page * recordsPerPage);

  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setPage(1);
  };

  const openReceipt = (student: any) => {
    setSelectedStudentForReceipt(student);
    setIsReceiptDrawerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "paid": return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Paid</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"><AlertTriangle className="w-3 h-3 mr-1"/> Pending</Badge>;
      case "overdue": return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20"><XCircle className="w-3 h-3 mr-1"/> Overdue</Badge>;
      case "waived": return <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20">Waived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <PageHeader 
        title="Fees & Financial Management Desk" 
        description="Manage monthly fee collections, digital receipt generation, donor contributions, and park-level financial summaries."
      >
        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
          <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50" onClick={() => setIsEventModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Fee Event
          </Button>
          <Button variant="outline" className="border-rose-200 text-rose-700 bg-rose-50" onClick={() => setIsDonationModalOpen(true)}>
            <Heart className="w-4 h-4 mr-2" /> Record Donation
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsPaymentModalOpen(true)}>
            <Receipt className="w-4 h-4 mr-2" /> Record Student Payment
          </Button>
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Total Collected</p>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-3xl font-bold tracking-tight">
                PKR {kpis.totalCollected.toLocaleString()}
              </h2>
            </div>
            <p className="text-xs text-emerald-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" /> +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Pending Fees</p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-3xl font-bold tracking-tight">{kpis.pendingFees}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Overdue & pending payments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Collection Rate</p>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline space-x-2 mb-2">
              <h2 className="text-3xl font-bold tracking-tight">{kpis.collectionRate}%</h2>
            </div>
            <Progress value={kpis.collectionRate} className="h-2" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-600">Donations Recorded</p>
              <Heart className="h-4 w-4 text-rose-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-3xl font-bold tracking-tight">
                PKR {kpis.donationsRecorded.toLocaleString()}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Community contributions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/50 p-1">
          <TabsTrigger value="roster" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm">
            Fee Collections Roster
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm">
            Fee Events & Batches
          </TabsTrigger>
          <TabsTrigger value="donations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm">
            Donor Contributions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="mt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap gap-3 flex-1">
              <Select value={cityFilter} onValueChange={(v) => handleFilterChange(setCityFilter, v)}>
                <SelectTrigger className="w-[140px] bg-slate-50"><SelectValue placeholder="City" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  <SelectItem value="lahore">Lahore</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={parkFilter} onValueChange={(v) => handleFilterChange(setParkFilter, v)}>
                <SelectTrigger className="w-[160px] bg-slate-50"><SelectValue placeholder="Park" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parks</SelectItem>
                  <SelectItem value="iqbal">Iqbal Park</SelectItem>
                </SelectContent>
              </Select>

              <Select value={batchFilter} onValueChange={(v) => handleFilterChange(setBatchFilter, v)}>
                <SelectTrigger className="w-[160px] bg-slate-50"><SelectValue placeholder="Batch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  <SelectItem value="batch4">Batch 4</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => handleFilterChange(setStatusFilter, v)}>
                <SelectTrigger className="w-[140px] bg-slate-50"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search students..." 
                className="pl-9 bg-slate-50"
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Student Info</TableHead>
                  <TableHead className="font-semibold text-slate-700">Group / Park</TableHead>
                  <TableHead className="font-semibold text-slate-700">Fee Title</TableHead>
                  <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                      No students found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{student.name}</div>
                        <div className="text-sm text-slate-500">{student.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-slate-700">
                          <Building2 className="w-3 h-3 mr-1.5 text-slate-400"/>
                          {student.park}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{student.batch}</div>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {student.feeTitle}
                        <div className="text-xs text-slate-400 mt-0.5">Due: {student.dueDate}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        PKR {student.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(student.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setIsPaymentModalOpen(true)}>
                              <DollarSign className="w-4 h-4 mr-2" /> Record Payment
                            </DropdownMenuItem>
                            {student.status === "paid" && (
                              <>
                                <DropdownMenuItem onClick={() => openReceipt(student)}>
                                  <Receipt className="w-4 h-4 mr-2" /> View Digital Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Share2 className="w-4 h-4 mr-2 text-green-600" /> Share WhatsApp
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <div className="text-sm text-slate-500">
                  Showing {(page - 1) * recordsPerPage + 1} to {Math.min(page * recordsPerPage, filteredStudents.length)} of {filteredStudents.length} results
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockEvents.map(ev => (
              <Card key={ev.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-800">{ev.title}</CardTitle>
                      <CardDescription className="mt-1">PKR {ev.amount} per student</CardDescription>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Revenue Progress</span>
                        <span className="font-medium">{Math.round((ev.collected / ev.expected) * 100)}%</span>
                      </div>
                      <Progress value={(ev.collected / ev.expected) * 100} className="h-2 bg-slate-100" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm pt-2">
                      <div className="p-2 bg-slate-50 rounded-lg text-center">
                        <div className="text-slate-500 text-xs mb-1">Expected</div>
                        <div className="font-medium text-slate-800">PKR {(ev.expected/1000).toFixed(0)}k</div>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg text-center">
                        <div className="text-emerald-600 text-xs mb-1">Collected</div>
                        <div className="font-medium text-emerald-700">PKR {(ev.collected/1000).toFixed(0)}k</div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg text-center">
                        <div className="text-slate-500 text-xs mb-1">Waived</div>
                        <div className="font-medium text-slate-800">{ev.waived} std</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="donations" className="mt-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Donor Details</TableHead>
                  <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                  <TableHead className="font-semibold text-slate-700">Purpose</TableHead>
                  <TableHead className="font-semibold text-slate-700">Receipt No.</TableHead>
                  <TableHead className="font-semibold text-slate-700">Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDonations.map((donation) => (
                  <TableRow key={donation.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="font-medium text-slate-900">{donation.donorName}</div>
                      <div className="text-sm text-slate-500">{donation.phone}</div>
                    </TableCell>
                    <TableCell className="font-medium text-emerald-600">
                      PKR {donation.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                        {donation.purpose}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-sm">
                      {donation.receiptNo}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {donation.recordedBy}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Student Payment</DialogTitle>
            <DialogDescription>
              Register a fee payment and generate a digital receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Search student..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stu-1">Student Name 1 (0300...)</SelectItem>
                  <SelectItem value="stu-2">Student Name 2 (0333...)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee Event</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select event..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="e1">Lahore Batch 4 Monthly Fee</SelectItem>
                  <SelectItem value="e2">Sports Gala Contribution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (PKR)</Label>
              <Input type="number" placeholder="1500" />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select defaultValue="cash">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online Transfer</SelectItem>
                  <SelectItem value="bank">Bank Deposit</SelectItem>
                  <SelectItem value="waivure">Fee Waiver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input placeholder="Additional context..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Payment recorded successfully! Receipt REC-2026-0089 generated.");
              setIsPaymentModalOpen(false);
            }}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Fee Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Fee Event</DialogTitle>
            <DialogDescription>
              Create a new fee requirement for a specific batch.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Event Title</Label>
              <Input placeholder="e.g. September Monthly Fee" />
            </div>
            <div className="space-y-2">
              <Label>Target Batch</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select batch..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="b1">Lahore Batch 4</SelectItem>
                  <SelectItem value="b2">Islamabad Batch 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee Amount (PKR per student)</Label>
              <Input type="number" placeholder="1500" />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Fee event created successfully!");
              setIsEventModalOpen(false);
            }}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Donation Modal */}
      <Dialog open={isDonationModalOpen} onOpenChange={setIsDonationModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Donation</DialogTitle>
            <DialogDescription>
              Log a community contribution or sponsorship.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Donor Name</Label>
              <Input placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Donor Phone</Label>
              <Input placeholder="03XXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Amount (PKR)</Label>
              <Input type="number" placeholder="50000" />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input placeholder="e.g. General Fund, Sports Sponsorship" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDonationModalOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Donation recorded! Receipt generated.");
              setIsDonationModalOpen(false);
            }}>Save Donation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Receipt Drawer */}
      <Sheet open={isReceiptDrawerOpen} onOpenChange={setIsReceiptDrawerOpen}>
        <SheetContent className="sm:max-w-md w-full bg-slate-50 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Digital Receipt</SheetTitle>
            <SheetDescription>Official fee receipt for student.</SheetDescription>
          </SheetHeader>
          
          {selectedStudentForReceipt && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              {/* Receipt Decoration */}
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="font-bold text-xl text-slate-800 tracking-tight">SHABAB 360</div>
                  <div className="text-xs text-slate-500 mt-1">Youth Development Program</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-slate-500">RECEIPT NO</div>
                  <div className="font-semibold text-slate-800">REC-2026-8942</div>
                </div>
              </div>

              <div className="space-y-4 border-t border-b border-dashed border-slate-200 py-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Student Name</div>
                    <div className="font-medium text-slate-800">{selectedStudentForReceipt.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Date</div>
                    <div className="font-medium text-slate-800">Aug 10, 2026</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Batch / Park</div>
                    <div className="font-medium text-slate-800 text-sm">{selectedStudentForReceipt.batch}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Phone</div>
                    <div className="font-medium text-slate-800 text-sm">{selectedStudentForReceipt.phone}</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium text-slate-700">{selectedStudentForReceipt.feeTitle}</div>
                  <div className="font-medium text-slate-900">PKR {selectedStudentForReceipt.amount.toLocaleString()}</div>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg mt-4">
                  <div className="text-sm font-bold text-slate-800">Total Paid</div>
                  <div className="text-lg font-bold text-emerald-600">PKR {selectedStudentForReceipt.amount.toLocaleString()}</div>
                </div>
              </div>

              <div className="text-center text-xs text-slate-400 mt-8">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                This is a computer generated receipt and requires no signature.
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <Share2 className="w-4 h-4 mr-2" /> Share via WhatsApp
            </Button>
            <Button variant="outline" className="w-full">
              Download PDF
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}

export default FeesPage;
