"use client";

import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export interface CertificateData {
  participantId?: string;
  participant: string;
  group: string;
  batch: string;
  batchStartDate: string;
  batchEndDate: string | null;
  park: string;
  city: string;
  joinDate: string;
  completionDate: string;
  attendanceRate: number;
  totalEvents: number;
  certificateNo: string;
}

interface CompletionCertificateProps {
  data: CertificateData;
  onClose?: () => void;
  showActions?: boolean;
}

export function CompletionCertificate({
  data,
  onClose,
  showActions = true,
}: CompletionCertificateProps) {
  function handlePrint() {
    window.print();
  }

  const durationText = data.batchEndDate
    ? `${data.batchStartDate} – ${data.batchEndDate}`
    : `Started ${data.batchStartDate}`;

  return (
    <>
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .certificate-print-area,
          .certificate-print-area * {
            visibility: visible !important;
          }
          .certificate-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* Action buttons */}
      {showActions && (
        <div className="no-print flex items-center gap-3 mb-4">
          <Button
            onClick={handlePrint}
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
          >
            <Printer className="size-4 mr-2" />
            Print Certificate
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X className="size-4 mr-2" />
              Close
            </Button>
          )}
        </div>
      )}

      {/* Certificate */}
      <div className="certificate-print-area">
        <div
          className="relative bg-white w-full aspect-[297/210] max-w-[1120px] mx-auto rounded-sm overflow-hidden"
          style={{
            boxShadow:
              "0 0 0 3px #4B0A8F, 0 0 0 6px #F3ECF6, 0 0 0 8px #4B0A8F",
          }}
        >
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-16 h-16">
            <div
              className="absolute top-2 left-2 w-10 h-10 rounded-sm"
              style={{ border: "3px solid #A0006B" }}
            />
            <div
              className="absolute top-5 left-5 w-4 h-4 rotate-45"
              style={{ backgroundColor: "#A0006B" }}
            />
          </div>
          <div className="absolute top-0 right-0 w-16 h-16">
            <div
              className="absolute top-2 right-2 w-10 h-10 rounded-sm"
              style={{ border: "3px solid #A0006B" }}
            />
            <div
              className="absolute top-5 right-5 w-4 h-4 rotate-45"
              style={{ backgroundColor: "#A0006B" }}
            />
          </div>
          <div className="absolute bottom-0 left-0 w-16 h-16">
            <div
              className="absolute bottom-2 left-2 w-10 h-10 rounded-sm"
              style={{ border: "3px solid #A0006B" }}
            />
            <div
              className="absolute bottom-5 left-5 w-4 h-4 rotate-45"
              style={{ backgroundColor: "#A0006B" }}
            />
          </div>
          <div className="absolute bottom-0 right-0 w-16 h-16">
            <div
              className="absolute bottom-2 right-2 w-10 h-10 rounded-sm"
              style={{ border: "3px solid #A0006B" }}
            />
            <div
              className="absolute bottom-5 right-5 w-4 h-4 rotate-45"
              style={{ backgroundColor: "#A0006B" }}
            />
          </div>

          {/* Inner decorative line */}
          <div
            className="absolute inset-6 pointer-events-none"
            style={{
              border: "1px solid #D4B8E3",
              borderRadius: "4px",
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-between h-full px-16 py-8">
            {/* Header */}
            <div className="text-center space-y-1 pt-4">
              <h1
                className="text-3xl font-extrabold tracking-[0.25em] uppercase"
                style={{ color: "#4B0A8F", fontFamily: "Georgia, serif" }}
              >
                SHABAB360
              </h1>
              <div
                className="w-40 h-0.5 mx-auto"
                style={{ backgroundColor: "#A0006B" }}
              />
              <p
                className="text-lg font-semibold tracking-wider mt-1"
                style={{ color: "#A0006B", fontFamily: "Georgia, serif" }}
              >
                Certificate of Completion
              </p>
              <p
                className="text-base font-semibold tracking-wide"
                style={{ color: "#4B0A8F", fontFamily: "Georgia, serif" }}
              >
                تکمیل کا سرٹیفکیٹ
              </p>
            </div>

            {/* Main body */}
            <div className="text-center space-y-4 flex-1 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-500 uppercase tracking-widest">
                This is to certify that
              </p>

              <h2
                className="text-4xl font-bold text-gray-800 mt-1"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {data.participant}
              </h2>

              <p className="text-sm text-gray-600 max-w-lg leading-relaxed">
                Has successfully completed the{" "}
                <span className="font-semibold" style={{ color: "#4B0A8F" }}>
                  {data.batch}
                </span>{" "}
                program at{" "}
                <span className="font-semibold" style={{ color: "#4B0A8F" }}>
                  {data.park}
                </span>
                ,{" "}
                <span className="font-semibold" style={{ color: "#4B0A8F" }}>
                  {data.city}
                </span>
                .
              </p>

              <div className="flex items-center gap-8 text-sm text-gray-500">
                <span>
                  <span className="font-medium text-gray-600">Duration:</span>{" "}
                  {durationText}
                </span>
                <span
                  className="w-px h-4"
                  style={{ backgroundColor: "#D4B8E3" }}
                />
                <span>
                  <span className="font-medium text-gray-600">
                    Attendance:
                  </span>{" "}
                  <span
                    className="font-bold"
                    style={{ color: "#4B0A8F" }}
                  >
                    {data.attendanceRate}%
                  </span>{" "}
                  ({data.totalEvents} sessions)
                </span>
              </div>

              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-600">
                  Date of Completion:
                </span>{" "}
                {data.completionDate}
              </p>
            </div>

            {/* Footer with signatures */}
            <div className="w-full flex items-end justify-between pb-4">
              {/* Certificate number */}
              <p className="text-xs text-gray-400">
                {data.certificateNo}
              </p>

              {/* Signature lines */}
              <div className="flex gap-16">
                <div className="text-center">
                  <div
                    className="w-36 h-px mb-2"
                    style={{ backgroundColor: "#4B0A8F" }}
                  />
                  <p className="text-xs font-semibold text-gray-700">
                    Program Director
                  </p>
                  <p className="text-[10px] text-gray-400">Shabab360</p>
                </div>
                <div className="text-center">
                  <div
                    className="w-36 h-px mb-2"
                    style={{ backgroundColor: "#4B0A8F" }}
                  />
                  <p className="text-xs font-semibold text-gray-700">
                    Park Admin
                  </p>
                  <p className="text-[10px] text-gray-400">{data.park}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}