import { PalliativeDashboard } from "@/components/palliative-dashboard";
import { getDashboardSnapshot } from "@/lib/data-service";

export default async function Home() {
  const snapshot = await getDashboardSnapshot();

  return <PalliativeDashboard initialSnapshot={snapshot} />;
}
