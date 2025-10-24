import { waitUntil } from "@vercel/functions";
import { makeWebhookValidator } from "@whop/api";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
	buildCompanyUpdatePayload,
	fetchWhopCompany,
	normalizeCompanyDetails,
	type WhopCompanyDetails,
} from "@/lib/whop-company";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

const CREDITS_PER_PURCHASE = Number(process.env.WHOP_CREDITS_PER_PURCHASE ?? 5);

type WebhookCompanySummary = {
	id: string;
	title?: string | null;
	route?: string | null;
};

export async function POST(request: NextRequest): Promise<Response> {
	// Validate the webhook to ensure it's from Whop
	const webhookData = await validateWebhook(request);

	const actionableEvents = new Set([
		"payment.succeeded",
		"purchase.completed",
	]);

	if (actionableEvents.has(webhookData.action)) {
		const userId =
			webhookData.data?.user_id ??
			webhookData.data?.buyer?.id ??
			webhookData.data?.access_pass?.user_id ??
			null;

		if (!userId) {
			console.warn(
				`Webhook ${webhookData.action} received without a user id`,
				webhookData.data,
			);
		} else {
			const amount =
				Number(webhookData.data?.final_amount ?? 0) ||
				Number(webhookData.data?.amount ?? 0) ||
				0;

			console.log(
				`Processing ${webhookData.action} for ${userId}. Purchase amount: ${amount}.`,
			);

			const companySummary = extractCompanySummary(
				webhookData.data?.company ?? null,
			);

			waitUntil(handleCreditGrant(userId, companySummary));
		}
	}

	// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
	return new Response("OK", { status: 200 });
}

async function handleCreditGrant(
	userId: string,
	companySummary: WebhookCompanySummary | null,
) {
	if (Number.isNaN(CREDITS_PER_PURCHASE) || CREDITS_PER_PURCHASE <= 0) {
		console.warn(
			"WHOP_CREDITS_PER_PURCHASE is not set to a positive number. Skipping credit grant.",
		);
		return;
	}

	try {
		const supabase = getSupabaseServerClient();
		const companyDetails = await resolveCompanyDetails(companySummary);
		const { error } = await supabase.rpc("add_credits", {
			p_whop_user_id: userId,
			p_amount: CREDITS_PER_PURCHASE,
		});

		if (error) {
			console.error("Failed to add credits from webhook", error);
		} else {
			console.log(
				`Granted ${CREDITS_PER_PURCHASE} credits to ${userId} after purchase.`,
			);
		}

		if (companyDetails) {
			await persistCompanyDetails(supabase, userId, companyDetails);
		}
	} catch (error) {
		console.error("Unexpected error granting credits", error);
	}
}

function extractCompanySummary(
	input: unknown,
): WebhookCompanySummary | null {
	if (!input || typeof input !== "object") {
		return null;
	}

	const candidate = input as Record<string, unknown>;
	const id = typeof candidate.id === "string" ? candidate.id : null;
	if (!id) {
		return null;
	}

	const summary: WebhookCompanySummary = { id };

	if (typeof candidate.title === "string") {
		summary.title = candidate.title;
	} else if (candidate.title === null) {
		summary.title = null;
	}

	if (typeof candidate.route === "string") {
		summary.route = candidate.route;
	} else if (candidate.route === null) {
		summary.route = null;
	}

	return summary;
}

async function resolveCompanyDetails(
	summary: WebhookCompanySummary | null,
): Promise<WhopCompanyDetails | null> {
	if (!summary) {
		return null;
	}

	let fetched: WhopCompanyDetails | null = null;

	try {
		fetched = await fetchWhopCompany(summary.id);
	} catch (error) {
		console.warn("Failed to fetch company details from Whop", error);
	}

	if (fetched) {
		return fetched;
	}

	const fallbackSource: Record<string, unknown> = { id: summary.id };

	if (summary.title !== undefined) {
		fallbackSource.title = summary.title;
	}

	if (summary.route !== undefined) {
		fallbackSource.route = summary.route;
	}

	return normalizeCompanyDetails(fallbackSource, summary.id);
}

async function persistCompanyDetails(
	supabase: ReturnType<typeof getSupabaseServerClient>,
	userId: string,
	company: WhopCompanyDetails,
) {
	const updatePayload = buildCompanyUpdatePayload(company);

	const { error } = await supabase
		.from("users")
		.update(updatePayload)
		.eq("whop_user_id", userId);

	if (error) {
		console.error("Failed to persist company details for user", {
			userId,
			error,
		});
	} else {
		console.log("Persisted company details for user", {
			userId,
			companyId: company.id,
		});
	}
}
