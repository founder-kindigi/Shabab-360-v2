import { ContentPlannerPage } from "./content-planner-page";

type MobileContentPlannerPageProps = {
  onBack?: () => void;
};

/**
 * The PWA uses the same live, scope-aware workspace as the desktop shell.
 * Keeping one implementation prevents mobile curriculum data from drifting.
 */
export function MobileContentPlannerPage(_props: MobileContentPlannerPageProps) {
  return <ContentPlannerPage />;
}
