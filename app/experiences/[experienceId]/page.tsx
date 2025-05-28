import { whopApi } from "@/lib/whop-api";
import { verifyUserToken } from "@whop/api";
import { headers } from "next/headers";
import CarModifier from "./CarModifier";

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  // The headers contains the user token
  const headersList = await headers();
  const { experienceId } = await params;
  const { userId } = await verifyUserToken(headersList);

  const result = await whopApi.checkIfUserHasAccessToExperience({
    userId,
    experienceId,
  });

  if (!result.hasAccessToExperience.hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have access to this experience.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <CarModifier experienceId={experienceId} />
      </div>
    </div>
  );
}
