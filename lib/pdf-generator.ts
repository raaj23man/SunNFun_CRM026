/**
 * Server-Side Puppeteer PDF Generator (PRD Part 4)
 * Generates branded/non-branded A4 PDF quotation documents.
 * Never uses client-side jspdf/html2canvas per strict spec constraints.
 */

import puppeteer from "puppeteer";
import { formatEmailHtml, ShareQuoteData, ShareToggles } from "./share-formatter";

export interface PdfGeneratorOptions {
  quoteData: ShareQuoteData;
  toggles?: ShareToggles;
  brandName?: string;
  isBranded?: boolean;
}

/**
 * Generates a PDF buffer from quote data using Puppeteer.
 */
export async function generateQuotePdfBuffer(
  options: PdfGeneratorOptions
): Promise<Buffer> {
  const { quoteData, toggles = {}, brandName = "SunNFun Holidays", isBranded = true } = options;

  const htmlContent = formatEmailHtml(
    quoteData,
    toggles,
    isBranded ? brandName : "Travel Destination Management"
  );

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: "domcontentloaded",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
