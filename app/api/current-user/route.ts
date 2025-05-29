import { verifyUserToken } from "@whop/api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { WhopAPI } from "@whop-apps/sdk";

export async function GET() {
  try {
    // Get the current user from the headers
    const headersList = await headers();
    const { userId } = await verifyUserToken(headersList);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load the user's profile information using the me endpoint
    const response = await WhopAPI.me({ headers: headersList }).GET("/me", {});
    const userResponse = response.data;

    if (!userResponse) {
      throw new Error('Failed to get user data');
    }

    return NextResponse.json({
      user: {
        id: userId,
        username: userResponse.username || 'User',
        // Add any other user fields you need from userResponse
      }
    });
  } catch (error) {
    console.error("❌ Error getting current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user" },
      { status: 500 }
    );
  }
} 