"use client";
import { CertificatesPage } from "./certificates-page";
export function MobileCertificatesPage({ onBack }: { onBack?: () => void }) { return <section className="p-4 pb-28"><button onClick={onBack}>Back</button><CertificatesPage /></section>; }
