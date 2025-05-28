import { NextRequest, NextResponse } from 'next/server';
import { whopApi } from '@/lib/whop-api';

interface ForumResponse {
  createForum: {
    id: string;
    link: string;
  };
}

interface PostResponse {
  createForumPost: {
    id: string;
    content: string;
  };
}

interface ExperienceResponse {
  experience: {
    company: {
      id: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message, experienceId: targetExperienceId, attachments } = await request.json();
    console.log('📝 Forum post request received:', { 
      message: message.slice(0, 50) + '...', 
      targetExperienceId, 
      attachments: attachments?.length || 0 
    });

    if (!message || !targetExperienceId) {
      console.error('❌ Missing required parameters:', { message: !!message, targetExperienceId: !!targetExperienceId });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const userAgentId = process.env.WHOP_AGENT_USER_ID;
    if (!userAgentId) {
      console.error('❌ Missing WHOP_AGENT_USER_ID in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get business information for forum post
    console.log('🔍 Fetching experience information...');
    const experienceResult = await whopApi.getExperience({ experienceId: targetExperienceId }) as ExperienceResponse;
    const companyId = experienceResult.experience.company.id;
    
    if (!companyId) {
      console.error('❌ Failed to get company ID from experience');
      return NextResponse.json(
        { error: 'Failed to get company information' },
        { status: 500 }
      );
    }

    console.log('✅ Got company ID:', companyId);

    // Log environment variables (without exposing full values)
    console.log('🔑 Environment check:', {
      hasAccessPassId: !!process.env.ACCESS_PASS_ID,
      hasUserAgentId: !!userAgentId,
      accessPassIdPrefix: process.env.ACCESS_PASS_ID?.slice(0, 4),
      userAgentIdPrefix: userAgentId.slice(0, 4),
      companyIdPrefix: companyId.slice(0, 4)
    });

    // First, find or create the forum for this experience
    console.log('🔍 Finding or creating forum...');
    const forumResult = await whopApi
      .withUser(userAgentId)
      .withCompany(companyId)
      .findOrCreateForum({
        input: {
          accessPassId: process.env.ACCESS_PASS_ID!,
          name: "Car asncoasoi Forum",
          whoCanPost: "everyone",
        },
      }) as ForumResponse;

    console.log('📦 Forum result:', JSON.stringify(forumResult, null, 2));

    // Extract the forum ID from the response
    const forumId = forumResult.createForum?.id;
    if (!forumId) {
      console.error('❌ Failed to get forum ID from response:', forumResult);
      throw new Error('Failed to create or find forum');
    }

    console.log('✅ Forum found/created with ID:', forumId);

    // Create the forum post with a poll
    console.log('📝 Creating forum post with poll...');
    const postInput: any = {
      forumExperienceId: forumId,
      content: message,
      isMention: false
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      console.log('📎 Adding attachments:', attachments);
      postInput.attachments = attachments.map((id: string) => ({
        directUploadId: id,
      }));
    }

    const postResult = await whopApi
      .withUser(userAgentId)
      .withCompany(companyId)
      .createForumPost({
        input: postInput,
      }) as PostResponse;

    console.log('📦 Post result:', JSON.stringify(postResult, null, 2));

    // Get the created post from the response
    const post = postResult.createForumPost;
    if (!post?.id) {
      console.error('❌ Failed to get post ID from response:', postResult);
      throw new Error('Failed to create forum post');
    }

    console.log('✅ Post created successfully with ID:', post.id);

    return NextResponse.json({
      success: true,
      postId: post.id,
      forumLink: forumResult.createForum.link,
    });

  } catch (error) {
    console.error('❌ Error posting to forum:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post to forum' },
      { status: 500 }
    );
  }
} 