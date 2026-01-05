"use server";

import nodemailer from "nodemailer";
import { formatCurrency } from "@/lib/format";

export type OrderEmailItem = {
  productName: string;
  variantName?: string;
  quantity: number;
  nabavnaCena: number;
  prodajnaCena: number;
  supplierName?: string;
};

export type OrderEmailPayload = {
  customerName: string;
  phone: string;
  address?: string;
  pickup?: boolean;
  note?: string;
  items: OrderEmailItem[];
};

type EmailSendResult = { ok: true } | { ok: false; error: string };
type SendOrderEmailOptions = { toEnvKey?: "CONTACT_EMAIL_TO" | "CONTACT_EMAIL_TO_2" };

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatItemName = (item: OrderEmailItem) =>
  item.variantName ? `${item.productName} (${item.variantName})` : item.productName;

export async function sendOrderEmail(payload: OrderEmailPayload): Promise<EmailSendResult> {
  return sendOrderEmailWithTo(payload, { toEnvKey: "CONTACT_EMAIL_TO" });
}

export async function sendOrderEmailWithTo(
  payload: OrderEmailPayload,
  options?: SendOrderEmailOptions,
): Promise<EmailSendResult> {
  const toEnvKey = options?.toEnvKey ?? "CONTACT_EMAIL_TO";
  const host = process.env.CONTACT_SMTP_HOST;
  const port = process.env.CONTACT_SMTP_PORT ? Number(process.env.CONTACT_SMTP_PORT) : undefined;
  const user = process.env.CONTACT_SMTP_USER;
  const pass = process.env.CONTACT_SMTP_PASS;
  const from = process.env.CONTACT_EMAIL_FROM;
  const to = process.env[toEnvKey];
  const fromName = process.env.CONTACT_EMAIL_FROM_NAME;

  if (!host || !port || !from || !to || !user || !pass) {
    return {
      ok: false,
      error: `Missing CONTACT_SMTP_HOST, CONTACT_SMTP_PORT, CONTACT_SMTP_USER, CONTACT_SMTP_PASS, CONTACT_EMAIL_FROM, or ${toEnvKey} env var.`,
    };
  }

  const recipients = to
    .split(/[;,]/g)
    .map((value) => value.trim())
    .filter(Boolean);

  const topText = (() => {
    const lines: string[] = [];
    lines.push(`Ime i prezime kupca: ${payload.customerName}`);
    lines.push(`Broj telefona: ${payload.phone}`);
    if (payload.pickup) {
      lines.push("Licno preuzimanje");
    } else {
      lines.push(`Adresa: ${payload.address?.trim() || "-"}`);
    }
    return lines.join("\n");
  })();

  const itemsText = payload.items
    .map((item, index) => {
      const supplier = item.supplierName?.trim() || "Nepoznat dobavljac";
      const lines = [
        `${index + 1}. ${formatItemName(item)}`,
        `Kolicina: ${item.quantity}`,
        `Nabavna cena: ${formatCurrency(item.nabavnaCena, "EUR")} (${supplier})`,
        `Prodajna cena: ${formatCurrency(item.prodajnaCena, "EUR")}`,
        `Napomena: ${payload.note?.trim() || "-"}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n");

  const subject = `Nova narudzbina: ${payload.customerName}`;
  const text = ["Nova narudzbina", "", topText, "", "Stavke:", itemsText || "-"].join("\n");

  const htmlItems = payload.items
    .map((item) => {
      const supplier = item.supplierName?.trim() || "Nepoznat dobavljac";
      const note = payload.note?.trim() || "-";
      return `
        <div style="margin: 0 0 12px 0;">
          <div><strong>${escapeHtml(formatItemName(item))}</strong></div>
          <div>Kolicina: ${escapeHtml(String(item.quantity))}</div>
          <div>Nabavna cena: ${escapeHtml(formatCurrency(item.nabavnaCena, "EUR"))} (${escapeHtml(supplier)})</div>
          <div>Prodajna cena: ${escapeHtml(formatCurrency(item.prodajnaCena, "EUR"))}</div>
          <div>Napomena: ${escapeHtml(note)}</div>
        </div>
      `;
    })
    .join("");

  const topHtml = (() => {
    const addressOrPickup = payload.pickup
      ? "<div><strong>Licno preuzimanje</strong></div>"
      : `<div><strong>Adresa:</strong> ${escapeHtml(payload.address?.trim() || "-")}</div>`;
    return `
      <div><strong>Ime i prezime kupca:</strong> ${escapeHtml(payload.customerName)}</div>
      <div><strong>Broj telefona:</strong> ${escapeHtml(payload.phone)}</div>
      ${addressOrPickup}
    `;
  })();

  const html = `
    <h2>Nova narudzbina</h2>
    ${topHtml}
    <h3>Stavke</h3>
    ${htmlItems || "<div>-</div>"}
  `;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  try {
    await transporter.sendMail({
      from: fromName ? `${fromName} <${from}>` : from,
      to: recipients.length > 0 ? recipients : to,
      subject,
      text,
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP email failed.";
    return { ok: false, error: message };
  }

  return { ok: true };
}
