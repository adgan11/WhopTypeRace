import { whopApi } from "@/lib/whop-api";
import { verifyUserToken } from "@whop/api";
import { headers } from "next/headers";
import TypingTest from "@/components/typing-test";

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
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <div className="rounded-2xl bg-[#0f1016] p-8 text-center shadow-xl shadow-black/40 ring-1 ring-rose-900/30">
          <h1 className="mb-3 text-2xl font-bold text-rose-300">Access Denied</h1>
          <p className="text-sm text-zinc-400">
            You do not currently have access to this experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <TypingTest />
      </div>
    </div>
  );
}
