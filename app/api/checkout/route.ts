import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyUserToken } from '@whop/api';

const PLAN_ID = process.env.NEXT_PUBLIC_WHOP_PLAN_ID ?? process.env.WHOP_PLAN_ID;

export async function POST() {
  if (!PLAN_ID) {
    return NextResponse.json(
      { error: 'Whop plan ID is not configured.' },
      { status: 500 },
    );
  }

  try {
    const headersList = await headers();
    const { userId } = await verifyUserToken(headersList);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      checkoutUrl: `https://whop.com/checkout/${PLAN_ID}`,
      sessionId: null,
    });
  } catch (error) {
    console.error('Failed to create checkout session', error);
    return NextResponse.json(
      { error: 'Failed to start checkout.' },
      { status: 500 },
    );
  }
}
