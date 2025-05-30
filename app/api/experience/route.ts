import { NextRequest, NextResponse } from 'next/server';
import { whopApi } from '@/lib/whop-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get('experienceId');

    if (!experienceId) {
      return NextResponse.json(
        { error: 'Missing experienceId parameter' },
        { status: 400 }
      );
    }

    const experienceResult = await whopApi.getExperience({ experienceId });

    return NextResponse.json(experienceResult);
  } catch (error) {
    console.error('Error fetching experience:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experience data' },
      { status: 500 }
    );
  }
} 