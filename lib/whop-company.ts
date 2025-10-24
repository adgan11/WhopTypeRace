const DEFAULT_WHOP_API_BASE_URL = 'https://api.whop.com/api/v2';
let companyFetchDisabled = false;
let companyFetchWarningPrinted = false;

export type WhopCompanyDetails = {
  id: string;
  title?: string | null;
  route?: string | null;
  ownerUserId?: string | null;
  ownerUsername?: string | null;
  ownerName?: string | null;
};

const resolveWhopApiBaseUrl = () =>
  process.env.WHOP_API_BASE_URL ?? DEFAULT_WHOP_API_BASE_URL;

export async function fetchWhopCompany(
  companyId: string,
): Promise<WhopCompanyDetails | null> {
  if (!companyId) {
    return null;
  }

  if (companyFetchDisabled) {
    return { id: companyId };
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    console.warn(
      'WHOP_API_KEY is not configured. Unable to fetch company details.',
    );
    return { id: companyId };
  }

  try {
    const response = await fetch(
      `${resolveWhopApiBaseUrl()}/companies/${companyId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      if (response.status === 403) {
        if (!companyFetchWarningPrinted) {
          console.warn(
            'Missing permissions to retrieve company details from Whop (company:basic:read required). Falling back to stored values.',
          );
          companyFetchWarningPrinted = true;
        }
        companyFetchDisabled = true;
        return { id: companyId };
      }

      console.warn(
        'Failed to retrieve company details from Whop',
        response.status,
        response.statusText,
      );
      return { id: companyId };
    }

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return { id: companyId };
    }

    const company =
      typeof (payload as Record<string, unknown>).data === 'object' &&
      (payload as Record<string, unknown>).data !== null
        ? ((payload as Record<string, unknown>).data as Record<string, unknown>)
        : (payload as Record<string, unknown>);

    return normalizeCompanyDetails(company, companyId);
  } catch (error) {
    console.warn('Failed to fetch company details from Whop', error);
    return { id: companyId };
  }
}

export function normalizeCompanyDetails(
  company: Record<string, unknown>,
  fallbackId: string,
): WhopCompanyDetails {
  const ownerCandidate =
    company.owner_user && typeof company.owner_user === 'object'
      ? ((company.owner_user as Record<string, unknown>) ?? null)
      : null;

  const details: WhopCompanyDetails = {
    id:
      typeof company.id === 'string' && company.id.length > 0
        ? company.id
        : fallbackId,
  };

  if (Object.prototype.hasOwnProperty.call(company, 'title')) {
    details.title =
      typeof company.title === 'string' ? company.title : null;
  }

  if (Object.prototype.hasOwnProperty.call(company, 'route')) {
    details.route =
      typeof company.route === 'string' ? company.route : null;
  }

  if (ownerCandidate) {
    if (Object.prototype.hasOwnProperty.call(ownerCandidate, 'id')) {
      details.ownerUserId =
        typeof ownerCandidate.id === 'string' ? ownerCandidate.id : null;
    }
    if (Object.prototype.hasOwnProperty.call(ownerCandidate, 'username')) {
      details.ownerUsername =
        typeof ownerCandidate.username === 'string'
          ? ownerCandidate.username
          : null;
    }
    if (Object.prototype.hasOwnProperty.call(ownerCandidate, 'name')) {
      details.ownerName =
        typeof ownerCandidate.name === 'string'
          ? ownerCandidate.name
          : null;
    }
  }

  return details;
}

export function buildCompanyUpdatePayload(
  details: WhopCompanyDetails,
  overrideId?: string,
): Record<string, string | null> {
  const payload: Record<string, string | null> = {};
  const resolvedId = overrideId ?? details.id;

  if (resolvedId) {
    payload.company_id = resolvedId;
  }

  if (details.title !== undefined) {
    payload.company_title = details.title;
  }

  if (details.route !== undefined) {
    payload.company_route = details.route;
  }

  if (details.ownerUserId !== undefined) {
    payload.company_owner_user_id = details.ownerUserId;
  }

  if (details.ownerUsername !== undefined) {
    payload.company_owner_username = details.ownerUsername;
  }

  if (details.ownerName !== undefined) {
    payload.company_owner_name = details.ownerName;
  }

  return payload;
}
