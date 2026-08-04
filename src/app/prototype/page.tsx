import type { Metadata, Viewport } from "next";
import { PrototypeApp } from "@/components/prototype/prototype-app";

export const metadata: Metadata = {
  title: "Shabab 360 — Full System Prototype",
  description: "Complete interactive prototype of Shabab 360 system across all 8 user roles",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1F0860",
};

export default function PrototypePage() {
  return <PrototypeApp />;
}
