import { verifyUserToken } from "@whop/api";
import { whopApi } from "@/lib/whop-api";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    console.log('🚀 Starting file upload process...');
    
    // Verify user authentication
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    console.log('🔑 Auth header present:', !!authHeader, 'First 10 chars:', authHeader?.slice(0, 10));

    const userToken = await verifyUserToken(headersList);
    console.log('👤 User token verification result:', {
      isValid: !!userToken,
      userId: userToken?.userId,
      timestamp: new Date().toISOString()
    });





    if (!userToken) {
      console.error('❌ Authentication failed - No valid user token');
      return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
    }

    // Get the file from the request
    console.log('📦 Attempting to parse form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('❌ No file found in form data');
      return NextResponse.json({ error: "No file provided in request" }, { status: 400 });
    }

    console.log('📁 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Log the API configuration
    console.log('🔧 API Configuration:', {
      userIdForRequest: userToken.userId,
      timestamp: new Date().toISOString()
    });

	 const { userId } = await verifyUserToken(headersList);


    console.log('📤 Initiating file upload to Whop...');
    const response = await whopApi
      .withUser(userId)
      .uploadAttachment({
        file: file,
        record: "forum_post",
      });

    console.log('✅ File upload successful:', {
      directUploadId: response.directUploadId,
      hasUrl: !!response.attachment?.source?.url,
      urlPrefix: response.attachment?.source?.url?.slice(0, 20),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      attachmentId: response.directUploadId,
      url: response.attachment.source.url
    });

  } catch (error) {
    console.error('❌ File upload failed:', {
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // If it's an API error, it might have additional details
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('📡 API Error Details:', {
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText,
        data: (error as any).response?.data,
        headers: (error as any).response?.headers
      });
    }

    return NextResponse.json(
      { 
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 