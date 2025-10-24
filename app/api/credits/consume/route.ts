import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyUserToken } from '@whop/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const headersList = await headers();
    const { userId } = await verifyUserToken(headersList);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.rpc('consume_credit', {
      p_whop_user_id: userId,
      p_amount: 1,
    });

    if (error) {
      if (error.message?.includes('INSUFFICIENT_CREDITS')) {
        return NextResponse.json(
          { error: 'Not enough credits' },
          { status: 400 }
        );
      }

      console.error('Failed to consume credit', error);
      return NextResponse.json(
        { error: 'Failed to consume credit' },
        { status: 500 }
      );
    }

    const updatedUser = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({ credits: updatedUser.credits });
  } catch (error) {
    console.error('Failed to consume credit', error);
    return NextResponse.json(
      { error: 'Failed to consume credit' },
      { status: 500 }
    );
  }
}
