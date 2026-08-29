import {
  TripStatus,
  ServiceBookingStatus,
  LedgerPaymentStatus,
  VoucherType,
  Role,
} from "@prisma/client";

export const MOCK_ORG_ID = "org_sunnfun_demo_001";

export interface MockTrip {
  id: string;
  organization_id: string;
  trip_display_id: string;
  title: string;
  status: TripStatus;
  start_date: string;
  end_date: string;
  duration_days: number;
  duration_nights: number;
  pax_adults: number;
  pax_children: number;
  is_locked: boolean;
  is_archived: boolean;
  total_selling_price: number;
  currency: string;
  guest: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
  };
  destination?: {
    id: string;
    name: string;
  };
  assigned_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  quotes?: any[];
  service_bookings?: any[];
  client_ledger?: any;
}

export const MOCK_TRIPS: MockTrip[] = [
  {
    id: "trip_demo_001",
    organization_id: MOCK_ORG_ID,
    trip_display_id: "SNF-10001",
    title: "7N/8D Everest View & Sherpa Heritage Trek",
    status: TripStatus.IN_PROGRESS,
    start_date: new Date(Date.now() + 86400000 * 5).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 13).toISOString(),
    duration_days: 8,
    duration_nights: 7,
    pax_adults: 2,
    pax_children: 0,
    is_locked: false,
    is_archived: false,
    total_selling_price: 2600,
    currency: "USD",
    guest: {
      id: "gst_demo_001",
      full_name: "Sarah Jenkins",
      phone_number: "+44 7911 123456",
      email: "sarah.j@example.co.uk",
    },
    destination: {
      id: "dest_everest",
      name: "Everest Region, Nepal",
    },
    assigned_user: {
      id: "usr_demo_sales_person",
      first_name: "Sales",
      last_name: "Agent",
      email: "salesperson@sunnfun.test",
    },
    client_ledger: {
      id: "cl_demo_001",
      total_billed_amount: 2600,
      total_paid_amount: 1000,
      status: LedgerPaymentStatus.PARTIAL,
      next_due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      currency: "USD",
    },
  },
  {
    id: "trip_demo_002",
    organization_id: MOCK_ORG_ID,
    trip_display_id: "SNF-10002",
    title: "5N/6D Kathmandu, Pokhara & Chitwan Luxury Safari",
    status: TripStatus.CONVERTED,
    start_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 8).toISOString(),
    duration_days: 6,
    duration_nights: 5,
    pax_adults: 2,
    pax_children: 1,
    is_locked: true,
    is_archived: false,
    total_selling_price: 1850,
    currency: "USD",
    guest: {
      id: "gst_demo_002",
      full_name: "David & Emma Miller",
      phone_number: "+1 415-555-8921",
      email: "david.miller@gmail.com",
    },
    destination: {
      id: "dest_golden_triangle",
      name: "Kathmandu - Pokhara - Chitwan",
    },
    assigned_user: {
      id: "usr_demo_sales_head",
      first_name: "Sales",
      last_name: "Head",
      email: "saleshead@sunnfun.test",
    },
    client_ledger: {
      id: "cl_demo_002",
      total_billed_amount: 1850,
      total_paid_amount: 1850,
      status: LedgerPaymentStatus.PAID_IN_FULL,
      next_due_date: null,
      currency: "USD",
    },
  },
  {
    id: "trip_demo_003",
    organization_id: MOCK_ORG_ID,
    trip_display_id: "SNF-10003",
    title: "12N/13D Annapurna Sanctuary & Hot Springs Trek",
    status: TripStatus.NEW_QUERY,
    start_date: new Date(Date.now() + 86400000 * 20).toISOString(),
    end_date: new Date(Date.now() + 86400000 * 33).toISOString(),
    duration_days: 13,
    duration_nights: 12,
    pax_adults: 4,
    pax_children: 0,
    is_locked: false,
    is_archived: false,
    total_selling_price: 4200,
    currency: "USD",
    guest: {
      id: "gst_demo_003",
      full_name: "Liam O'Connor",
      phone_number: "+61 400 123 456",
      email: "liam.oc@australia.travel",
    },
    destination: {
      id: "dest_annapurna",
      name: "Annapurna Region, Nepal",
    },
    assigned_user: {
      id: "usr_demo_sales_person",
      first_name: "Sales",
      last_name: "Agent",
      email: "salesperson@sunnfun.test",
    },
  },
  {
    id: "trip_demo_004",
    organization_id: MOCK_ORG_ID,
    trip_display_id: "SNF-10004",
    title: "4N/5D Bhutan Thunder Dragon & Tiger's Nest Excursion",
    status: TripStatus.COMPLETED,
    start_date: new Date(Date.now() - 86400000 * 30).toISOString(),
    end_date: new Date(Date.now() - 86400000 * 25).toISOString(),
    duration_days: 5,
    duration_nights: 4,
    pax_adults: 2,
    pax_children: 0,
    is_locked: true,
    is_archived: false,
    total_selling_price: 3100,
    currency: "USD",
    guest: {
      id: "gst_demo_004",
      full_name: "Klaus & Greta Becker",
      phone_number: "+49 170 9876543",
      email: "klaus.becker@berlin.de",
    },
    destination: {
      id: "dest_bhutan",
      name: "Paro & Thimphu, Bhutan",
    },
    assigned_user: {
      id: "usr_demo_super_admin",
      first_name: "Super",
      last_name: "Admin",
      email: "superadmin@sunnfun.test",
    },
  },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: "notif_001",
    type: "FOLLOW_UP_DUE",
    title: "Follow-up Due: Sarah Jenkins",
    message: "Everest View inquiry received 2 days ago. Client requested itinerary update.",
    link: "/trips/trip_demo_001",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_read: false,
  },
  {
    id: "notif_002",
    type: "PAYMENT_DUE",
    title: "Payment Due: $1,600 Balance Remaining",
    message: "Sarah Jenkins balance payment due in 48 hours for trip SNF-10001.",
    link: "/finance/incoming",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    is_read: false,
  },
  {
    id: "notif_003",
    type: "BOOKING_CONFIRMED",
    title: "Hotel Booking Confirmed",
    message: "Dwarika's Hotel Kathmandu confirmed check-in for David Miller (SNF-10002).",
    link: "/operations/calendar",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    is_read: true,
  },
];

export const MOCK_HOTELS = [
  { id: "h_01", name: "Dwarika's Heritage Hotel", city: "Kathmandu", rating: 5, total_rooms: 40 },
  { id: "h_02", name: "Kathmandu Marriott Hotel", city: "Kathmandu", rating: 5, total_rooms: 120 },
  { id: "h_03", name: "Fishtail Lodge Resort", city: "Pokhara", rating: 4, total_rooms: 50 },
  { id: "h_04", name: "Barahi Jungle Lodge", city: "Chitwan", rating: 5, total_rooms: 35 },
];

export const MOCK_CALENDAR_BOOKINGS = [
  {
    id: "sb_01",
    trip_id: "trip_demo_001",
    trip_display_id: "SNF-10001",
    guest_name: "Sarah Jenkins",
    hotel_id: "h_01",
    hotel_name: "Dwarika's Heritage Hotel",
    service_type: "HOTEL",
    service_name: "Heritage Deluxe Room",
    check_in: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
    check_out: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
    pax: 2,
    status: ServiceBookingStatus.CONFIRMED,
    cost_price: 450,
    selling_price: 600,
  },
  {
    id: "sb_02",
    trip_id: "trip_demo_002",
    trip_display_id: "SNF-10002",
    guest_name: "David & Emma Miller",
    hotel_id: "h_03",
    hotel_name: "Fishtail Lodge Resort",
    service_type: "HOTEL",
    service_name: "Lakefront Cottage Room",
    check_in: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    check_out: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
    pax: 3,
    status: ServiceBookingStatus.CONFIRMED,
    cost_price: 360,
    selling_price: 520,
  },
  {
    id: "sb_03",
    trip_id: "trip_demo_002",
    trip_display_id: "SNF-10002",
    guest_name: "David & Emma Miller",
    hotel_id: "h_04",
    hotel_name: "Barahi Jungle Lodge",
    service_type: "HOTEL",
    service_name: "River View Suite",
    check_in: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
    check_out: new Date(Date.now() + 86400000 * 8).toISOString().split("T")[0],
    pax: 3,
    status: ServiceBookingStatus.CONFIRMED,
    cost_price: 550,
    selling_price: 780,
  },
];
