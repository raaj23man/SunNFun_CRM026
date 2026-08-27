import { PrismaClient, Role, UserStatus, ThemePreference } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Sun & Fun Travel CRM database...");

  // 1. Create or update Default Organization
  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      company_name: "Sun & Fun Holidays DMC",
      brand_short_name: "SunNFun",
      support_contact_number: "+977-1-4412345",
      brand_color_theme: "#2563eb",
      trip_prefix: "SBC-",
      default_timezone: "Asia/Kathmandu",
      force_2fa: false,
    },
  });

  console.log(`🏢 Created Organization: ${org.company_name} (${org.id})`);

  // 2. Create Default Brand
  const brand = await prisma.brand.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      organization_id: org.id,
      name: "Sun & Fun Holidays B2B",
      is_default: true,
      color_theme: "#2563eb",
    },
  });

  // 3. Create Billing Address
  await prisma.billingAddress.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      organization_id: org.id,
      label: "Head Office Kathmandu",
      address_text: "Thamel Marg, Ward 26, Kathmandu, Nepal",
      contact_number: "+977-1-4412345",
      billing_details: "PAN: 601234567 • Reg: 12345/078/079",
      is_primary: true,
    },
  });

  // 4. Create Bank Account
  await prisma.bankAccount.upsert({
    where: { id: "00000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000004",
      organization_id: org.id,
      bank_name: "Standard Chartered Bank Nepal",
      account_number: "01-2345678-01",
      swift_code: "SCBLNPKA",
      currency: "USD",
    },
  });

  // 5. Create Teams
  const inboundTeam = await prisma.team.upsert({
    where: { id: "00000000-0000-0000-0000-000000000005" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000005",
      organization_id: org.id,
      name: "Inbound Nepal Team",
      destination_scope: ["dest-nepal-ktm", "dest-nepal-pkr"],
    },
  });

  const defaultPasswordHash = await bcrypt.hash("Password123!", 12);

  // 6. Create Seeded Users for all key roles
  const usersToSeed = [
    {
      id: "00000000-0000-0000-0000-000000000010",
      email: "admin@sunnfunholidays.com",
      first_name: "Rajesh",
      last_name: "Bhandari",
      role: Role.SUPER_ADMIN,
      two_factor_enabled: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000011",
      email: "saleshead@sunnfunholidays.com",
      first_name: "Sunil",
      last_name: "Shrestha",
      role: Role.SALES_HEAD,
      two_factor_enabled: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000012",
      email: "agent@sunnfunholidays.com",
      first_name: "Aayush",
      last_name: "Adhikari",
      role: Role.SALES_PERSON,
      team_id: inboundTeam.id,
      two_factor_enabled: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000013",
      email: "ops@sunnfunholidays.com",
      first_name: "Pooja",
      last_name: "Gurung",
      role: Role.OPERATIONS,
      two_factor_enabled: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000014",
      email: "accounts@sunnfunholidays.com",
      first_name: "Kiran",
      last_name: "Tamang",
      role: Role.ACCOUNTANT,
      two_factor_enabled: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000015",
      email: "secure@sunnfunholidays.com",
      first_name: "Security",
      last_name: "Admin",
      role: Role.ADMIN,
      two_factor_enabled: true,
      two_factor_secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", // Standard 32-char Base32 secret
    },
  ];

  for (const u of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password_hash: defaultPasswordHash,
        role: u.role,
        status: UserStatus.ACTIVE,
        two_factor_enabled: u.two_factor_enabled,
        two_factor_secret: (u as any).two_factor_secret || null,
      },
      create: {
        id: u.id,
        organization_id: org.id,
        team_id: (u as any).team_id || null,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        password_hash: defaultPasswordHash,
        role: u.role,
        status: UserStatus.ACTIVE,
        two_factor_enabled: u.two_factor_enabled,
        two_factor_secret: (u as any).two_factor_secret || null,
        theme_preference: ThemePreference.LIGHT,
      },
    });

    console.log(`👤 Seeded User: ${user.first_name} ${user.last_name} (${user.email}) - [${user.role}]`);
  }

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
