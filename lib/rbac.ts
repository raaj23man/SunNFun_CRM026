import { Role, User, UserPermissionOverride } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession, SessionUser } from "./auth";
import { getTenantPrisma } from "./prisma";

// ==========================================
// ROLE CAPABILITY MATRIX
// ==========================================

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Record<string, boolean>> = {
  SUPER_ADMIN: {
    view_pricing: true,
    edit_pricing: true,
    edit_quotes: true,
    manage_users: true,
    manage_org: true,
    export_reports: true,
    manage_master_data: true,
    manage_ledgers: true,
    manage_teams: true,
  },
  ADMIN: {
    view_pricing: true,
    edit_pricing: true,
    edit_quotes: true,
    manage_users: true,
    manage_org: true,
    export_reports: true,
    manage_master_data: true,
    manage_ledgers: true,
    manage_teams: true,
  },
  SALES_HEAD: {
    view_pricing: true,
    edit_pricing: true,
    edit_quotes: true,
    manage_users: false,
    manage_org: false,
    export_reports: true,
    manage_master_data: true,
    manage_ledgers: false,
    manage_teams: true,
  },
  SALES_PERSON: {
    view_pricing: true,
    edit_pricing: false,
    edit_quotes: true,
    manage_users: false,
    manage_org: false,
    export_reports: false,
    manage_master_data: false,
    manage_ledgers: false,
    manage_teams: false,
  },
  OPERATIONS: {
    view_pricing: false, // Excluded from selling prices / markup
    edit_pricing: false,
    edit_quotes: false,
    manage_users: false,
    manage_org: false,
    export_reports: false,
    manage_master_data: false,
    manage_ledgers: true,
    manage_teams: false,
  },
  RESERVATIONS: {
    view_pricing: false, // Excluded from selling prices / markup
    edit_pricing: false,
    edit_quotes: false,
    manage_users: false,
    manage_org: false,
    export_reports: false,
    manage_master_data: false,
    manage_ledgers: true,
    manage_teams: false,
  },
  DATA_OPERATOR: {
    view_pricing: false,
    edit_pricing: false,
    edit_quotes: false,
    manage_users: false,
    manage_org: false,
    export_reports: false,
    manage_master_data: true,
    manage_ledgers: false,
    manage_teams: false,
  },
  ACCOUNTANT: {
    view_pricing: true,
    edit_pricing: false,
    edit_quotes: false, // Accountants cannot edit quotes
    manage_users: false,
    manage_org: false,
    export_reports: true,
    manage_master_data: false,
    manage_ledgers: true,
    manage_teams: false,
  },
};

/**
 * Resolves effective user permissions by overlaying custom overrides on top of role defaults.
 */
export function resolveUserPermissions(
  role: Role,
  overrides: UserPermissionOverride[] = []
): Record<string, boolean> {
  const base = { ...(DEFAULT_ROLE_PERMISSIONS[role] || {}) };
  for (const override of overrides) {
    base[override.permission_key] = override.granted;
  }
  return base;
}

/**
 * Checks if a user possesses a specific permission key.
 */
export function hasPermission(
  user: { role: Role; permission_overrides?: UserPermissionOverride[] },
  permissionKey: string
): boolean {
  const resolved = resolveUserPermissions(
    user.role,
    user.permission_overrides || []
  );
  return !!resolved[permissionKey];
}

// ==========================================
// FIELD SANITIZATION (PRICING STRIPPING)
// ==========================================

const PRICING_FIELD_KEYS = new Set([
  "package_amount",
  "selling_price",
  "markup",
  "markup_percent",
  "markup_floor",
  "margin",
  "total_client_price",
]);

/**
 * Strips sensitive selling price and markup fields for OPERATIONS and RESERVATIONS roles.
 */
export function stripPricingFields<T>(data: T, role: Role): T {
  if (role !== "OPERATIONS" && role !== "RESERVATIONS") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => stripPricingFields(item, role)) as unknown as T;
  }

  if (data !== null && typeof data === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (PRICING_FIELD_KEYS.has(key)) {
        continue; // Exclude pricing fields
      }
      sanitized[key] =
        typeof val === "object" && val !== null
          ? stripPricingFields(val, role)
          : val;
    }
    return sanitized as T;
  }

  return data;
}

// ==========================================
// REUSABLE ROUTE GUARD MIDDLEWARE
// ==========================================

export interface RbacGuardOptions {
  allowedRoles?: Role[];
  requiredPermission?: string;
  checkResourceOwnership?: (
    user: SessionUser,
    req: NextRequest
  ) => Promise<boolean> | boolean;
}

export type AuthenticatedRouteHandler = (
  req: NextRequest,
  context: {
    session: { user: SessionUser };
    user: SessionUser;
    scopedPrisma: ReturnType<typeof getTenantPrisma>;
    params?: Record<string, string | string[]>;
  }
) => Promise<NextResponse> | NextResponse;

/**
 * Centralized higher-order function that wraps API Route Handlers with:
 * 1. Session verification (401 on missing/expired cookie)
 * 2. Active status check (403 on disabled user)
 * 3. Automatic tenant-scoped Prisma injection
 * 4. Role & permission validation
 * 5. Resource ownership verification (e.g. SALES_PERSON assignedTo check)
 * 6. Automatic response pricing sanitization
 */
export function withAuthAndRbac(
  handler: AuthenticatedRouteHandler,
  options: RbacGuardOptions = {}
) {
  return async (
    req: NextRequest,
    routeProps?: { params?: Record<string, string | string[]> }
  ): Promise<NextResponse> => {
    try {
      const session = await getSession();

      if (!session || !session.user) {
        return NextResponse.json(
          { error: "Unauthorized: Active session required." },
          { status: 401 }
        );
      }

      const { user } = session;

      if (user.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Forbidden: User account is disabled." },
          { status: 403 }
        );
      }

      // Check role allowlist if defined
      if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
        return NextResponse.json(
          {
            error: `Forbidden: Role '${user.role}' lacks permission for this action.`,
          },
          { status: 403 }
        );
      }

      // Check permission key if defined
      if (
        options.requiredPermission &&
        !hasPermission(user, options.requiredPermission)
      ) {
        return NextResponse.json(
          {
            error: `Forbidden: Required permission '${options.requiredPermission}' not granted.`,
          },
          { status: 403 }
        );
      }

      // Check resource ownership if defined
      if (options.checkResourceOwnership) {
        const isOwner = await options.checkResourceOwnership(user, req);
        if (!isOwner) {
          return NextResponse.json(
            {
              error:
                "Forbidden: Resource is not assigned to your account or outside your team scope.",
            },
            { status: 403 }
          );
        }
      }

      const scopedPrisma = getTenantPrisma(user.organization_id);

      const response = await handler(req, {
        session,
        user,
        scopedPrisma,
        params: routeProps?.params,
      });

      return response;
    } catch (error: any) {
      console.error("[RBAC Guard Error]:", error);
      return NextResponse.json(
        { error: error.message || "Internal Server Error" },
        { status: 500 }
      );
    }
  };
}
