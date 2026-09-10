"use client";
import { ProcurementPage } from "./procurement-page";
import { Button } from "@/components/ui/button";
export function MobileProcurementPage({ onBack }: { onBack?: () => void }) { return <div>{onBack && <Button variant="ghost" onClick={onBack}>Back</Button>}<ProcurementPage /></div>; }
