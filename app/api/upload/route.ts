import { verifyUserToken } from "@whop/api";
import { whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Verify user authentication
    const headersList = await headers();
    const { userId } = await verifyUserToken(headersList);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log('📁 Uploading file:', { name: file.name, size: file.size, type: file.type });
    
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
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
} 