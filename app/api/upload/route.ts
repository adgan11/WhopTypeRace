import { verifyUserToken } from "@whop/api";
import { whopApi } from "@/lib/whop-api";
import { NextResponse } from "next/server";
import { WhopAPI } from "@whop-apps/sdk";

export async function POST(request: Request) {
  try {
    // Get the Whop user token from cookies
    const cookieHeader = request.headers.get('cookie');
    const whopUserToken = cookieHeader?.split(';')
      .find(c => c.trim().startsWith('whop_user_token='))
      ?.split('=')[1];

    // Verify user authentication - try cookie first, then fallback to headers
    let userId: string | undefined;
    
    if (whopUserToken) {
      // When running as an installed Whop app
      const response = await WhopAPI.me({ token: whopUserToken }).GET("/me", {});
      userId = response.data?.id;
    } else {
      // Fallback for local development
      const verifiedUser = await verifyUserToken(request.headers);
      userId = verifiedUser?.userId;
    }

    if (!userId) {
      console.error('❌ Authentication failed:', { 
        hasWhopToken: !!whopUserToken,
        userId 
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log('📁 Uploading file:', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      userId: userId.slice(0, 8) // Log partial ID for debugging
    });
    
    // Upload to Whop with the user ID
    const response = await whopApi
      .withUser(userId)
      .uploadAttachment({
        file: file,
        record: "forum_post",
      });

    console.log('✅ File uploaded successfully:', response);

    // The response includes the directUploadId and URL
    return NextResponse.json({
      success: true,
      attachmentId: response.directUploadId,
      url: response.attachment.source.url
    });
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
} 