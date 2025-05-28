import { verifyUserToken } from "@whop/api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get the current user from the headers
    const headersList = await headers();
    const { userId } = await verifyUserToken(headersList);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ userId });
  } catch (error) {
    console.error("❌ Error getting current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user" },
      { status: 500 }
    );
  }
} 