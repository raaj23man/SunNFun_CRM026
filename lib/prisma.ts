import { PrismaClient } from "@prisma/client";

// Global base singleton
const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;

/**
 * List of Prisma models that contain an `organization_id` field and must be tenant-isolated.
 * Add downstream models here as new PRD phases are built (e.g. Trip, Guest, Quote, Hotel, etc.).
 */
export const TENANT_SCOPED_MODELS = [
  "Brand",
  "BillingAddress",
  "BankAccount",
  "User",
  "Team",
  "Guest",
  "TripPlanRequest",
  "Trip",
  "TripDestination",
  "TripSource",
  "Supplier",
  "Hotel",
  "RateSheet",
  "TransportService",
  "TravelActivity",
  "Itinerary",
  "Quote",
  "TaxType",
  "QuoteTemplate",
  "AuditLog",
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

function isTenantScopedModel(modelName: string): modelName is TenantScopedModel {
  return (TENANT_SCOPED_MODELS as readonly string[]).includes(modelName);
}

/**
 * Returns a Prisma Client instance extended with automatic multi-tenant scoping.
 * Enforces PRD Part 8 Section A: every query on tenant-scoped tables automatically
 * injects `where: { organization_id: orgId }` so cross-tenant leakage is structurally impossible.
 *
 * @param organizationId - The UUID of the authenticated user's organization.
 */
export function getTenantPrisma(organizationId: string) {
  if (!organizationId) {
    throw new Error("getTenantPrisma requires a non-empty organizationId.");
  }

  return prisma.$extends({
    name: "multi-tenant-org-scoping",
    query: {
      $allModels: {
        async findFirst({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || {}) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async findMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || {}) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async count({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || {}) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async aggregate({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || {}) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async groupBy({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || {}) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args as any);
        },

        async findUnique({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            // Translate findUnique on a tenant model to a scoped findFirst query
            // so an adversary cannot retrieve another tenant's record by guessing its UUID.
            const delegate = (prisma as Record<string, any>)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ];
            if (delegate && typeof delegate.findFirst === "function") {
              return delegate.findFirst({
                where: {
                  ...((args as any).where || {}),
                  organization_id: organizationId,
                },
              });
            }
          }
          return query(args);
        },

        async create({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || { data: {} }) as any;
            (args as any).data = {
              ...((args as any).data || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async createMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || { data: [] }) as any;
            if (Array.isArray((args as any).data)) {
              (args as any).data = (args as any).data.map((item: Record<string, any>) => ({
                ...item,
                organization_id: organizationId,
              }));
            } else if ((args as any).data) {
              (args as any).data = {
                ...((args as any).data || {}),
                organization_id: organizationId,
              };
            }
          }
          return query(args);
        },

        async update({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || { where: {}, data: {} }) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async updateMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || { where: {}, data: {} }) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async delete({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || { where: {} }) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async deleteMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || { where: {} }) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },

        async upsert({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args = (args || { where: {}, create: {}, update: {} }) as any;
            (args as any).where = {
              ...((args as any).where || {}),
              organization_id: organizationId,
            };
            (args as any).create = {
              ...((args as any).create || {}),
              organization_id: organizationId,
            };
            (args as any).update = {
              ...((args as any).update || {}),
              organization_id: organizationId,
            };
          }
          return query(args);
        },
      },
    },
  });
}
