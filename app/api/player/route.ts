import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyUserToken } from '@whop/api';
import { whopApi } from '@/lib/whop-api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  buildCompanyUpdatePayload,
  fetchWhopCompany,
} from '@/lib/whop-company';

const DEFAULT_INITIAL_CREDITS = Number(process.env.SUPABASE_INITIAL_CREDITS ?? 0);
const DEFAULT_COMPANY_ID =
  process.env.WHOP_COMPANY_ID ?? process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ?? null;

type SupabaseUserRow = {
  id: string;
  whop_user_id: string;
  username: string;
  credits: number;
  company_id?: string | null;
  company_title?: string | null;
  company_route?: string | null;
  company_owner_user_id?: string | null;
  company_owner_username?: string | null;
  company_owner_name?: string | null;
};

async function ensureUserRecord(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  whopUserId: string,
  username: string | null,
): Promise<SupabaseUserRow> {
  const finalUsername =
    username ?? `whop-${whopUserId.slice(0, Math.max(0, Math.min(8, whopUserId.length)))}`;

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('whop_user_id', whopUserId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    if (username && existing.username !== username) {
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ username })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      return updated as SupabaseUserRow;
    }

    return existing as SupabaseUserRow;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert({
      whop_user_id: whopUserId,
      username: finalUsername,
      credits: DEFAULT_INITIAL_CREDITS,
    })
    .select('*')
    .single();

  if (insertError) {
    if (typeof insertError.code === 'string' && insertError.code === '23505') {
      const { data: conflictRow, error: conflictSelectError } = await supabase
        .from('users')
        .select('*')
        .eq('whop_user_id', whopUserId)
        .single();

      if (conflictSelectError) {
        throw conflictSelectError;
      }

      return conflictRow as SupabaseUserRow;
    }

    throw insertError;
  }

  return inserted as SupabaseUserRow;
}

export async function GET() {
  try {
    const headersList = await headers();
    const { userId } = await verifyUserToken(headersList);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    let username: string | null = null;

    try {
      const userResponse = await whopApi.getUser({
        userId,
      });
      const publicUser = userResponse?.publicUser ?? null;
      console.log('Fetched Whop user', {
        whopUserId: userId,
        username: publicUser?.username ?? null,
        displayName: publicUser?.name ?? null,
        publicUsername: publicUser?.username ?? null,
        publicName: publicUser?.name ?? null,
        raw: userResponse,
      });
      username =
        publicUser?.username ??
        publicUser?.name ??
        null;
    } catch (error) {
      console.warn('Unable to fetch Whop username for user', userId, error);
    }

    let userRecord: SupabaseUserRow;
    try {
      userRecord = await ensureUserRecord(supabase, userId, username);
    } catch (error) {
      console.error('Failed to ensure user in Supabase', error);
      return NextResponse.json(
        { error: 'Failed to ensure user record' },
        { status: 500 }
      );
    }

    const needsCompanySync =
      DEFAULT_COMPANY_ID !== null &&
      (userRecord.company_id !== DEFAULT_COMPANY_ID ||
        userRecord.company_title == null ||
        userRecord.company_route == null ||
        userRecord.company_owner_user_id == null ||
        userRecord.company_owner_username == null ||
        userRecord.company_owner_name == null);

    if (needsCompanySync && DEFAULT_COMPANY_ID) {
      const companyDetails = await fetchWhopCompany(DEFAULT_COMPANY_ID);
      console.log('Fetched company details from Whop', {
        companyId: DEFAULT_COMPANY_ID,
        details: companyDetails,
      });
      if (companyDetails) {
        const updatePayload = buildCompanyUpdatePayload(
          companyDetails,
          DEFAULT_COMPANY_ID,
        );

        if (Object.keys(updatePayload).length > 0) {
          const { data: updatedRow, error: companyUpdateError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', userRecord.id)
            .select('*')
            .single();

          if (companyUpdateError) {
            console.error('Failed to update company information for user', {
              userId: userRecord.id,
              companyId: DEFAULT_COMPANY_ID,
              error: companyUpdateError,
            });
          } else if (updatedRow) {
            userRecord = updatedRow as SupabaseUserRow;
          }
        }
      }
    }

    const { data: rewardsData, error: rewardsError } = await supabase
      .from('rewards')
      .select('reward_key, amount, result_id')
      .eq('user_id', userRecord.id);

    if (rewardsError) {
      console.error('Failed to load rewards for user', rewardsError);
    }

    const earnedRewards = new Map<string, number>();
    let totalEarned = 0;

    (rewardsData ?? []).forEach((reward) => {
      const amount = Number(reward.amount ?? 0);
      if (!Number.isFinite(amount)) {
        return;
      }
      totalEarned += amount;
      if (reward.reward_key) {
        const existingAmount = earnedRewards.get(reward.reward_key) ?? 0;
        earnedRewards.set(reward.reward_key, existingAmount + amount);
      }
    });

    return NextResponse.json({
      whopUserId: userRecord.whop_user_id,
      username: userRecord.username,
      credits: userRecord.credits,
      supabaseUserId: userRecord.id,
      totalEarnings: totalEarned,
      earnedRewardKeys: Object.fromEntries(earnedRewards),
      company: {
        id: userRecord.company_id ?? DEFAULT_COMPANY_ID,
        title: userRecord.company_title ?? null,
        route: userRecord.company_route ?? null,
        ownerUserId: userRecord.company_owner_user_id ?? null,
        ownerUsername: userRecord.company_owner_username ?? null,
        ownerName: userRecord.company_owner_name ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to load player data', error);
    return NextResponse.json(
      { error: 'Failed to load player data' },
      { status: 500 }
    );
  }
}
