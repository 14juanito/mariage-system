import { requireStaffPage } from "@/modules/auth/service";
import { CheckInScanner } from "@/components/shared/check-in-scanner";

export const metadata = { title: "Check-in — Mariage System" };

export default async function CheckInPage() {
  await requireStaffPage(); // accessible à ADMIN et CHECKIN

  return (
    <div className="max-w-md mx-auto py-4">
      <CheckInScanner />
    </div>
  );
}
