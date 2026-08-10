import { PortalImportPage } from "@/components/modules/admin/portal-import-page";

export const metadata = {
  title: "Portal Raw Import & Pipeline | Shabab 360",
  description: "Parse raw registration Excel sheets and inspect candidate 69 columns dataset",
};

export default function AdminPilotAppPage() {
  return <PortalImportPage />;
}
