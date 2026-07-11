// ---------------------------------------------------------------------------
// Fee Receipt PDF Generation (Browser Print Approach)
// Uses a hidden iframe + window.print() so the user can "Save as PDF".
// No external PDF libraries needed.
// ---------------------------------------------------------------------------

export interface ReceiptData {
  receiptNo: string;
  date: string;
  studentName: string;
  groupName: string;
  batchName: string;
  parkName: string;
  feeTitle: string;
  amount: number;
  method: string;
  recordedBy: string;
  notes?: string;
}

function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildReceiptHTML(data: ReceiptData): string {
  const notesBlock = data.notes
    ? `
      <tr>
        <td class="label">Notes</td>
        <td class="value" style="word-break:break-word;">${escapeHtml(data.notes)}</td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt ${escapeHtml(data.receiptNo)}</title>
<style>
  @page {
    size: 80mm auto;
    margin: 0;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 80mm;
    margin: 0 auto;
    padding: 6mm 4mm;
    color: #1F1638;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .receipt-container {
    border: 2px solid #4B0A8F;
    border-radius: 6px;
    overflow: hidden;
  }

  /* ── Header ── */
  .header {
    background: #4B0A8F;
    color: #fff;
    text-align: center;
    padding: 10px 8px 8px;
  }

  .header h1 {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 3px;
    margin-bottom: 2px;
  }

  .header p {
    font-size: 10px;
    font-weight: 400;
    opacity: 0.9;
    letter-spacing: 1px;
  }

  /* ── Divider ── */
  .divider {
    height: 1.5px;
    background: repeating-linear-gradient(
      90deg,
      #4B0A8F 0px,
      #4B0A8F 4px,
      transparent 4px,
      transparent 8px
    );
    margin: 0;
  }

  /* ── Body ── */
  .body {
    padding: 10px 10px 6px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #6B5A7A;
    margin-bottom: 8px;
  }

  .meta-row strong {
    color: #1F1638;
  }

  /* ── Info Table ── */
  table.info {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-bottom: 8px;
  }

  table.info td {
    padding: 4px 0;
    vertical-align: top;
  }

  table.info td.label {
    color: #6B5A7A;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-right: 8px;
    white-space: nowrap;
    width: 30%;
  }

  table.info td.value {
    color: #1F1638;
    font-weight: 600;
    word-break: break-word;
  }

  /* ── Fee Section ── */
  .fee-section {
    background: #F3ECF6;
    border-radius: 4px;
    padding: 8px 10px;
    margin: 8px 0;
  }

  .fee-section .fee-title {
    font-size: 10px;
    color: #4B0A8F;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .fee-amount {
    font-size: 20px;
    font-weight: 800;
    color: #4B0A8F;
    font-family: 'Courier New', Courier, monospace;
    text-align: center;
    padding: 4px 0;
  }

  /* ── Footer ── */
  .footer {
    text-align: center;
    padding: 10px 10px 14px;
  }

  .footer .thank-you {
    font-size: 11px;
    color: #4B0A8F;
    font-weight: 600;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }

  .footer .system-name {
    font-size: 8px;
    color: #6B5A7A;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header -->
    <div class="header">
      <h1>SHABAB 360</h1>
      <p>Fee Payment Receipt</p>
    </div>

    <div class="divider"></div>

    <!-- Body -->
    <div class="body">
      <!-- Meta: Receipt No & Date -->
      <div class="meta-row">
        <span><strong>Receipt:</strong> ${escapeHtml(data.receiptNo)}</span>
        <span><strong>Date:</strong> ${escapeHtml(data.date)}</span>
      </div>

      <!-- Student Info Table -->
      <table class="info">
        <tr>
          <td class="label">Student</td>
          <td class="value">${escapeHtml(data.studentName)}</td>
        </tr>
        <tr>
          <td class="label">Group</td>
          <td class="value">${escapeHtml(data.groupName)}</td>
        </tr>
        <tr>
          <td class="label">Batch</td>
          <td class="value">${escapeHtml(data.batchName)}</td>
        </tr>
        <tr>
          <td class="label">Park</td>
          <td class="value">${escapeHtml(data.parkName)}</td>
        </tr>
        ${notesBlock}
      </table>

      <div class="divider"></div>

      <!-- Fee Section -->
      <div class="fee-section">
        <div class="fee-title">${escapeHtml(data.feeTitle)}</div>
        <div class="fee-amount">${formatPKR(data.amount)}</div>
      </div>

      <div class="divider"></div>

      <!-- Method & Recorder -->
      <table class="info">
        <tr>
          <td class="label">Method</td>
          <td class="value">${capitalize(data.method)}</td>
        </tr>
        <tr>
          <td class="label">Recorded By</td>
          <td class="value">${escapeHtml(data.recordedBy)}</td>
        </tr>
      </table>
    </div>

    <div class="divider"></div>

    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">&#x2500;&#x2500; Thank you &#x2500;&#x2500;</div>
      <div class="system-name">Shabab360 Management System</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Opens the browser's print dialog with a professional receipt layout.
 * The user can choose "Save as PDF" from the print dialog.
 *
 * This function is client-side only (uses `document` and `window`).
 */
export function generateReceipt(data: ReceiptData): void {
  if (typeof document === "undefined") return;

  const html = buildReceiptHTML(data);

  // Create a hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to render, then print
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // fallback: try after short delay
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // silently fail
        }
      }, 500);
    }
  };

  // Clean up iframe after print dialog closes
  // Use both afterprint event and a timeout as fallback
  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
      window.removeEventListener("afterprint", cleanup);
    }, 1000);
  };

  // For browsers that fire afterprint (Chrome, Edge, Firefox)
  if (typeof window !== "undefined") {
    window.addEventListener("afterprint", cleanup, { once: true });
  }

  // Fallback cleanup in case afterprint never fires
  setTimeout(() => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }, 60000);
}