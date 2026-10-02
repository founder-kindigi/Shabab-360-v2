"use client";
import { ProcurementPage } from "./procurement-page";
export function MobileProcurementPage({ onBack }: { onBack?: () => void }) { return <ProcurementPage mobile onBack={onBack} />; }
