"use client";
import { CustomReportBuilderPage } from "./custom-report-builder-page";
export function MobileReportsBuilderPage({ onBack }: { onBack?: () => void }) { return <section className="p-4 pb-28"><button onClick={onBack}>Back</button><CustomReportBuilderPage /></section>; }
