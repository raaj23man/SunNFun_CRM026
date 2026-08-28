/**
 * Quote Share Formatter (PRD Part 4)
 * Generates client-facing WhatsApp markdown text and Email HTML
 * strictly applying the 4 Sembark toggle flags.
 */

export interface ShareQuoteData {
  tripDisplayId: string;
  guestName: string;
  destinationName: string;
  durationNights: number;
  durationDays: number;
  startDate: string;
  paxAdults: number;
  paxChildren: number;
  currency: string;
  totalSellingPrice: number;
  pricingStrategy: string;
  options: Array<{
    optionLabel: string;
    isDefault: boolean;
    totalSellingPrice: number;
    days: Array<{
      dayNumber: number;
      title: string;
      description: string;
      items: Array<{
        itemType: string;
        name: string;
        isFoc?: boolean;
      }>;
    }>;
  }>;
  flightSegments?: Array<{
    airline: string;
    flightNumber: string;
    originAirport: string;
    destinationAirport: string;
    departureTime: string;
    arrivalTime: string;
  }>;
}

export interface ShareToggles {
  hideTotalPrice?: boolean;
  includeItinerary?: boolean;
  removeTerms?: boolean;
  useSimilarHotelWording?: boolean;
}

/**
 * Formats quote into WhatsApp text with *bold* formatting and clickable wa.me payload.
 */
export function formatWhatsAppShareText(
  data: ShareQuoteData,
  toggles: ShareToggles = {}
): string {
  const lines: string[] = [];

  // Header
  lines.push(`🌟 *Tour Proposal: ${data.destinationName} (${data.tripDisplayId})*`);
  lines.push(`Dear ${data.guestName},`);
  lines.push(
    `We are delighted to share your customized itinerary for *${data.destinationName}* (${data.durationNights} Nights / ${data.durationDays} Days).`
  );
  lines.push(
    `📅 *Travel Date:* ${new Date(data.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  );
  lines.push(`👥 *Travelers:* ${data.paxAdults} Adults${data.paxChildren > 0 ? `, ${data.paxChildren} Children` : ""}`);
  lines.push("");

  // Flight Details (if any)
  if (data.flightSegments && data.flightSegments.length > 0) {
    lines.push(`✈️ *Flight Schedule:*`);
    for (const f of data.flightSegments) {
      lines.push(`• ${f.airline} (${f.flightNumber}): ${f.originAirport} ➔ ${f.destinationAirport}`);
    }
    lines.push("");
  }

  // Options & Itinerary
  for (const opt of data.options) {
    if (data.options.length > 1) {
      lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`🏷️ *Option: ${opt.optionLabel.toUpperCase()}*`);
    }

    if (toggles.includeItinerary !== false) {
      lines.push(`📍 *Day-wise Itinerary:*`);
      for (const d of opt.days) {
        lines.push(`*Day ${d.dayNumber}: ${d.title}*`);
        if (d.description) {
          lines.push(`${d.description}`);
        }

        // Services list
        if (d.items && d.items.length > 0) {
          for (const item of d.items) {
            let itemName = item.name;
            if (item.itemType === "HOTEL" && toggles.useSimilarHotelWording) {
              itemName = `${itemName} or similar`;
            }
            if (item.isFoc) {
              itemName = `${itemName} (Complimentary)`;
            }
            lines.push(`  ▫️ [${item.itemType}] ${itemName}`);
          }
        }
        lines.push("");
      }
    }

    // Pricing for this option
    if (!toggles.hideTotalPrice) {
      lines.push(
        `💰 *Package Investment (${opt.optionLabel}):* ${data.currency} ${opt.totalSellingPrice.toLocaleString()}`
      );
      lines.push("");
    }
  }

  // Terms & Conditions
  if (!toggles.removeTerms) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📋 *Booking & Payment Terms:*`);
    lines.push(`• 50% advance payment required to confirm reservations.`);
    lines.push(`• Balance 50% due 7 days prior to arrival.`);
    lines.push(`• Cancellation penalties apply per hotel & transport policies.`);
    lines.push("");
  }

  lines.push(`Please let us know if you would like any adjustments. Looking forward to hosting you! ✨`);
  return lines.join("\n");
}

/**
 * Formats quote into a clean, modern responsive Email HTML.
 */
export function formatEmailHtml(
  data: ShareQuoteData,
  toggles: ShareToggles = {},
  brandName = "SunNFun Holidays"
): string {
  const formattedDate = new Date(data.startDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tour Proposal - ${data.destinationName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 24px; }
    .badge { display: inline-block; background: #ecfdf5; color: #065f46; font-weight: 600; font-size: 11px; padding: 4px 8px; border-radius: 6px; }
    .meta-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 12px; }
    .day-card { border-left: 3px solid #0f172a; padding-left: 12px; margin-bottom: 20px; }
    .day-title { font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 4px; }
    .day-desc { font-size: 12px; color: #475569; line-height: 1.5; margin-bottom: 8px; }
    .item-tag { font-size: 11px; background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-right: 4px; margin-bottom: 4px; }
    .price-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }
    .price-amount { font-size: 24px; font-weight: 800; color: #166534; font-family: monospace; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.destinationName} Itinerary</h1>
      <p>Reference: ${data.tripDisplayId} • Prepared for ${data.guestName}</p>
    </div>

    <div class="content">
      <div class="meta-box">
        <div><strong>Travel Date:</strong> ${formattedDate}</div>
        <div><strong>Duration:</strong> ${data.durationNights}N / ${data.durationDays}D</div>
        <div><strong>Travelers:</strong> ${data.paxAdults} Adults${data.paxChildren > 0 ? `, ${data.paxChildren} Children` : ""}</div>
        <div><strong>Destination:</strong> ${data.destinationName}</div>
      </div>

      ${
        toggles.includeItinerary !== false
          ? `
        <h3 style="font-size: 15px; margin: 20px 0 12px 0; color: #0f172a;">Day-by-Day Experience</h3>
        ${data.options
          .map(
            (opt) => `
          ${data.options.length > 1 ? `<h4 style="color: #475569; margin: 16px 0 8px 0;">Tier: ${opt.optionLabel}</h4>` : ""}
          ${opt.days
            .map(
              (d) => `
            <div class="day-card">
              <div class="day-title">Day ${d.dayNumber}: ${d.title}</div>
              ${d.description ? `<div class="day-desc">${d.description}</div>` : ""}
              <div>
                ${d.items
                  .map((item) => {
                    let name = item.name;
                    if (item.itemType === "HOTEL" && toggles.useSimilarHotelWording) {
                      name = `${name} or similar`;
                    }
                    return `<span class="item-tag">[${item.itemType}] ${name}</span>`;
                  })
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        `
          )
          .join("")}
      `
          : ""
      }

      ${
        !toggles.hideTotalPrice
          ? `
        <div class="price-box">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #166534; margin-bottom: 4px;">Total Package Price</div>
          <div class="price-amount">${data.currency} ${data.totalSellingPrice.toLocaleString()}</div>
        </div>
      `
          : ""
      }

      ${
        !toggles.removeTerms
          ? `
        <div style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
          <strong>Terms & Conditions:</strong> 50% deposit required at confirmation. Full balance due 7 days before departure. Standard cancellation charges apply.
        </div>
      `
          : ""
      }
    </div>

    <div class="footer">
      <p style="margin: 0;">${brandName} • Travel CRM Platform</p>
    </div>
  </div>
</body>
</html>
`;
}
