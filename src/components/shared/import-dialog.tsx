"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";
import {
  parseCSV,
  validateImportData,
  generateTemplateCSV,
  generateErrorCSV,
  type ImportField,
  type ValidationError,
} from "@/lib/csv-parser";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ImportType = "participants" | "guardians" | "users";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
  title: string;
  description: string;
  fields: ImportField[];
  exampleRows: Record<string, string>[];
  apiEndpoint: string;
  onSuccess?: () => void;
}

interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
  total: number;
  generatedPasswords?: {
    row: number;
    name: string;
    email: string;
    password: string;
  }[];
}

// ─── Field Configs ───────────────────────────────────────────────────────────

export const PARTICIPANT_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, type: "string" },
  { key: "email", label: "Email", required: false, type: "email" },
  { key: "phone", label: "Phone", required: false, type: "string" },
  { key: "gender", label: "Gender", required: false, type: "string" },
  { key: "dateOfBirth", label: "DateOfBirth", required: false, type: "date" },
  { key: "age", label: "Age", required: false, type: "number" },
  { key: "gradeClass", label: "GradeClass", required: false, type: "string" },
  { key: "group", label: "Group", required: true, type: "string" },
  { key: "city", label: "City", required: false, type: "string" },
  { key: "park", label: "Park", required: false, type: "string" },
  { key: "batch", label: "Batch", required: false, type: "string" },
  { key: "guardianName", label: "Guardian Name", required: false, type: "string" },
  { key: "guardianPhone", label: "Guardian Phone", required: false, type: "string" },
  { key: "guardianCNIC", label: "Guardian CNIC", required: false, type: "string" },
];

export const GUARDIAN_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, type: "string" },
  { key: "phone", label: "Phone", required: true, type: "string" },
  { key: "cnic", label: "CNIC", required: false, type: "string" },
  { key: "address", label: "Address", required: false, type: "string" },
];

export const USER_FIELDS: ImportField[] = [
  { key: "name", label: "Name", required: true, type: "string" },
  { key: "email", label: "Email", required: true, type: "email" },
  { key: "role", label: "Role", required: true, type: "string" },
  { key: "phone", label: "Phone", required: false, type: "string" },
  { key: "city", label: "City", required: false, type: "string" },
  { key: "park", label: "Park", required: false, type: "string" },
  { key: "group", label: "Group", required: false, type: "string" },
];

export const EXAMPLE_ROWS: Record<ImportType, Record<string, string>[]> = {
  participants: [
    {
      Name: "Ahmed Khan",
      Email: "ahmed@example.com",
      Phone: "03001234567",
      Gender: "Male",
      DateOfBirth: "2010-05-15",
      Age: "16",
      GradeClass: "10th",
      Group: "Group A",
      City: "Karachi",
      Park: "Park North",
      Batch: "Batch 2024",
      "Guardian Name": "Muhammad Khan",
      "Guardian Phone": "03009876543",
      "Guardian CNIC": "12345-6789012-3",
    },
    {
      Name: "Sara Ali",
      Email: "",
      Phone: "03009876543",
      Gender: "Female",
      DateOfBirth: "2011-03-22",
      Age: "15",
      GradeClass: "9th",
      Group: "Group A",
      City: "",
      Park: "",
      Batch: "",
      "Guardian Name": "",
      "Guardian Phone": "",
      "Guardian CNIC": "",
    },
  ],
  guardians: [
    {
      Name: "Muhammad Khan",
      Phone: "03001234567",
      CNIC: "12345-6789012-3",
      Address: "House 12, Block 5, Karachi",
    },
    {
      Name: "Fatima Bibi",
      Phone: "03009876543",
      CNIC: "",
      Address: "House 34, Block 2, Lahore",
    },
  ],
  users: [
    {
      Name: "Usman Tariq",
      Email: "usman@shabab.org",
      Role: "murabbi",
      Phone: "03001112222",
      City: "Karachi",
      Park: "Park North",
      Group: "Group A",
    },
    {
      Name: "Aisha Siddiqui",
      Email: "aisha@shabab.org",
      Role: "park_admin",
      Phone: "03003334444",
      City: "Karachi",
      Park: "",
      Group: "",
    },
  ],
};

// ─── Step Labels ─────────────────────────────────────────────────────────────

type Step = "upload" | "preview" | "importing" | "results";

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload File",
  preview: "Review Data",
  importing: "Importing…",
  results: "Results",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  exampleRows,
  apiEndpoint,
  type,
  onSuccess,
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validData, setValidData] = useState<Record<string, string>[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (!val) {
        // Reset on close
        setStep("upload");
        setFile(null);
        setParsedData([]);
        setValidationErrors([]);
        setValidData([]);
        setIsDragOver(false);
        setParseError(null);
        setImportResult(null);
        setImportProgress(0);
      }
      onOpenChange(val);
    },
    [onOpenChange]
  );

  // Handle file selection
  const handleFile = useCallback(
    async (selectedFile: File) => {
      setParseError(null);
      setFile(selectedFile);

      try {
        const data = await parseCSV(selectedFile);
        if (data.length === 0) {
          setParseError("The CSV file is empty or has no data rows.");
          return;
        }

        setParsedData(data);
        const result = validateImportData(data, fields);
        setValidData(result.valid);
        setValidationErrors(result.errors);

        if (data.length > 0) {
          setStep("preview");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to parse file";
        setParseError(msg);
      }
    },
    [fields]
  );

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        handleFile(selected);
      }
    },
    [handleFile]
  );

  // Download template
  const handleDownloadTemplate = useCallback(() => {
    generateTemplateCSV(fields, exampleRows, `${type}-import`);
  }, [fields, exampleRows, type]);

  // Upload and import
  const handleImport = useCallback(async () => {
    if (!file) return;

    setStep("importing");
    setImportProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress while waiting
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg =
          (errData as { error?: string }).error ||
          `Server error (${response.status})`;
        setImportResult({
          success: 0,
          errors: [{ row: 0, message: errMsg }],
          total: parsedData.length,
        });
        setStep("results");
        return;
      }

      const result = (await response.json()) as ImportResult;
      setImportResult(result);
      setStep("results");

      if (result.success > 0 && onSuccess) {
        onSuccess();
      }
    } catch {
      setImportResult({
        success: 0,
        errors: [{ row: 0, message: "Network error — please try again" }],
        total: parsedData.length,
      });
      setStep("results");
    }
  }, [file, apiEndpoint, parsedData.length, onSuccess]);

  // Download errors
  const handleDownloadErrors = useCallback(() => {
    if (!importResult) return;
    const errors: ValidationError[] = importResult.errors.map((e) => ({
      row: e.row,
      field: "Import Error",
      message: e.message,
    }));
    generateErrorCSV(errors);
  }, [importResult]);

  // Download credentials shown only in the current import result.
  const handleDownloadPasswords = useCallback(() => {
    if (!importResult?.generatedPasswords) return;
    const pwds = importResult.generatedPasswords;
    const headers = "Row,Name,Email,Password";
    const rows = pwds
      .map(
        (p) =>
          `${p.row},"${p.name}","${p.email}","${p.password}"`
      )
      .join("\n");
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "imported-account-passwords.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [importResult]);

  // Step indicator
  const steps: Step[] = ["upload", "preview", "importing", "results"];
  const currentStepIndex = steps.indexOf(step);

  // Preview columns (first 5 rows)
  const previewRows = parsedData.slice(0, 5);
  const previewHeaders = fields.map((f) => f.label);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* ─── Header ─── */}
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Upload className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    idx < currentStepIndex
                      ? "bg-[#4B0A8F]/10 text-[#4B0A8F] dark:bg-[#8A40B0]/20 dark:text-[#8A40B0]"
                      : idx === currentStepIndex
                        ? "bg-[#4B0A8F] text-white dark:bg-[#8A40B0]"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx < currentStepIndex ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <span className="size-3 rounded-full border border-current flex-none" />
                  )}
                  {STEP_LABELS[s]}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-px w-6 transition-colors ${
                      idx < currentStepIndex
                        ? "bg-[#4B0A8F] dark:bg-[#8A40B0]"
                        : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          <AnimatePresence mode="wait">
            {/* STEP: Upload */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Drop Zone */}
                <div
                  className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
                    isDragOver
                      ? "border-[#4B0A8F] bg-[#4B0A8F]/5 dark:border-[#8A40B0] dark:bg-[#8A40B0]/10"
                      : "border-border hover:border-[#4B0A8F]/50 hover:bg-muted/50 dark:hover:border-[#8A40B0]/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="rounded-full bg-[#4B0A8F]/10 p-3 dark:bg-[#8A40B0]/20">
                    <FileSpreadsheet className="size-8 text-[#4B0A8F] dark:text-[#8A40B0]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Drag & drop your CSV file here
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or click to browse
                    </p>
                  </div>
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="size-4" />
                      {file.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>

                {/* Parse Error */}
                {parseError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
                    <AlertCircle className="size-4 text-red-600 dark:text-red-400 flex-none mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{parseError}</p>
                  </div>
                )}

                {/* Template Download */}
                <div className="flex items-center justify-between rounded-lg border border-[#D4B8E3] bg-[#F3ECF6] p-3 dark:border-[#2A0C8F] dark:bg-[#1F086080]">
                  <div>
                    <p className="text-sm font-medium">Need a template?</p>
                    <p className="text-xs text-muted-foreground">
                      Download a sample CSV with correct column headers
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="border-[#4B0A8F]/30 text-[#4B0A8F] hover:bg-[#4B0A8F]/10 dark:border-[#8A40B0]/30 dark:text-[#8A40B0] dark:hover:bg-[#8A40B0]/10"
                  >
                    <Download className="size-3.5 mr-1.5" />
                    Template
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP: Preview */}
            {step === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Summary badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-[#4B0A8F]/30 text-[#4B0A8F] dark:border-[#8A40B0]/30 dark:text-[#8A40B0]"
                  >
                    {parsedData.length} total rows
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                  >
                    {validData.length} valid
                  </Badge>
                  {validationErrors.length > 0 && (
                    <Badge variant="destructive">
                      {validationErrors.length} errors
                    </Badge>
                  )}
                  {parsedData.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      Showing first 5 of {parsedData.length} rows
                    </span>
                  )}
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
                    <div className="flex items-center gap-2 p-3 border-b border-red-200 dark:border-red-900">
                      <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Validation Errors
                      </span>
                    </div>
                    <ScrollArea className="max-h-40">
                      <div className="p-2 space-y-1">
                        {validationErrors.map((err, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="text-muted-foreground flex-none">
                              Row {err.row}:
                            </span>
                            <span className="text-red-700 dark:text-red-300">
                              {err.field} — {err.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Preview Table */}
                {previewRows.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <ScrollArea className="max-h-60">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold w-10">
                              #
                            </TableHead>
                            {previewHeaders.map((h) => (
                              <TableHead
                                key={h}
                                className="text-xs font-semibold whitespace-nowrap"
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewRows.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs text-muted-foreground">
                                {idx + 2}
                              </TableCell>
                              {fields.map((f) => (
                                <TableCell
                                  key={f.key}
                                  className="text-xs max-w-[150px] truncate"
                                >
                                  {row[f.label] || row[f.key] || (
                                    <span className="text-muted-foreground italic">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP: Importing */}
            {step === "importing" && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center gap-4 py-8"
              >
                <div className="rounded-full bg-[#4B0A8F]/10 p-4 dark:bg-[#8A40B0]/20">
                  <Upload className="size-8 text-[#4B0A8F] dark:text-[#8A40B0] animate-bounce" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Importing data…</p>
                  <p className="text-xs text-muted-foreground">
                    Please wait while we process {parsedData.length} rows
                  </p>
                </div>
                <Progress value={importProgress} className="w-64 h-2" />
                <p className="text-xs text-muted-foreground">
                  {importProgress}%
                </p>
              </motion.div>
            )}

            {/* STEP: Results */}
            {step === "results" && importResult && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Success Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <p className="text-2xl font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                      {importResult.total}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {importResult.success}
                    </p>
                    <p className="text-xs text-muted-foreground">Imported</p>
                  </div>
                  <div className={`rounded-lg border p-3 text-center ${importResult.errors.length > 0 ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : ""}`}>
                    <p className={`text-2xl font-bold ${importResult.errors.length > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                      {importResult.errors.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>

                {/* Success message */}
                {importResult.success > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/50">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 flex-none" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      Successfully imported {importResult.success} record
                      {importResult.success !== 1 ? "s" : ""}!
                    </p>
                  </div>
                )}

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
                    <div className="flex items-center justify-between p-3 border-b border-red-200 dark:border-red-900">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          Import Errors ({importResult.errors.length})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadErrors}
                        className="text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
                      >
                        <Download className="size-3.5 mr-1" />
                        Export Errors
                      </Button>
                    </div>
                    <ScrollArea className="max-h-40">
                      <div className="p-2 space-y-1">
                        {importResult.errors.map((err, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="text-muted-foreground flex-none">
                              Row {err.row}:
                            </span>
                            <span className="text-red-700 dark:text-red-300">
                              {err.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Generated passwords are available only in the current import result. */}
                {importResult.generatedPasswords &&
                  importResult.generatedPasswords.length > 0 && (
                    <div className="rounded-lg border border-[#D4B8E3] bg-[#F3ECF6] p-3 dark:border-[#2A0C8F] dark:bg-[#1F086080]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Generated Passwords
                          </span>
                          <Badge
                            variant="outline"
                            className="border-[#A0006B]/30 text-[#A0006B] dark:border-[#A0006B]/50 dark:text-[#A0006B]"
                          >
                            {importResult.generatedPasswords.length}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadPasswords}
                          className="border-[#4B0A8F]/30 text-[#4B0A8F] hover:bg-[#4B0A8F]/10 dark:border-[#8A40B0]/30 dark:text-[#8A40B0] dark:hover:bg-[#8A40B0]/10"
                        >
                          <Download className="size-3.5 mr-1" />
                          Download CSV
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These passwords must be distributed securely and are only shown in this result.
                        All users will be required to reset their password on
                        first login.
                      </p>
                    </div>
                  )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Footer ─── */}
        <div className="border-t p-4 pt-3 flex items-center justify-between gap-3">
          <div>
            {step === "preview" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setParsedData([]);
                  setValidationErrors([]);
                  setValidData([]);
                  setParseError(null);
                }}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === "results" && (
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            )}

            {step === "preview" && validData.length > 0 && (
              <Button
                onClick={handleImport}
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                disabled={validData.length === 0}
              >
                <Upload className="size-4 mr-2" />
                Import {validData.length} Record
                {validData.length !== 1 ? "s" : ""}
              </Button>
            )}

            {step === "upload" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="size-3.5 mr-1.5" />
                Template
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
