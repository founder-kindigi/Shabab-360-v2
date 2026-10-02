"use client";
import { CertificatesPage } from "./certificates-page";
export function MobileCertificatesPage({ onBack }: { onBack?: () => void }) { return <CertificatesPage mobile onBack={onBack} />; }
