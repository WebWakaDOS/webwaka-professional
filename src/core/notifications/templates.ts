/**
 * WebWaka Professional — Notification Templates
 * Blueprint Reference: Part 9.1 — "Nigeria First / Africa First"
 *
 * All SMS messages are kept under 160 characters per segment.
 * All email HTML uses minimal inline styles (no external CSS dependencies).
 * Language: English (default). Yoruba/Igbo/Hausa extensions planned for Phase 3.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SMS TEMPLATES — Legal Practice
// ─────────────────────────────────────────────────────────────────────────────

export function smsInvoiceSent(clientName: string, invoiceNumber: string, amountFormatted: string): string {
  return `Dear ${clientName}, Invoice ${invoiceNumber} for ${amountFormatted} has been sent to you. Log in to WebWaka to make payment. - WebWaka`;
}

export function smsInvoicePaid(clientName: string, invoiceNumber: string, amountFormatted: string): string {
  return `Dear ${clientName}, payment of ${amountFormatted} for Invoice ${invoiceNumber} has been confirmed. Thank you. - WebWaka`;
}

export function smsHearingScheduled(clientName: string, hearingDate: string, courtName: string): string {
  return `Dear ${clientName}, a court hearing has been scheduled on ${hearingDate} at ${courtName}. Please make necessary arrangements. - WebWaka`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS TEMPLATES — Event Management
// ─────────────────────────────────────────────────────────────────────────────

export function smsRegistrationConfirmed(attendeeName: string, eventTitle: string, ticketRef: string): string {
  return `Dear ${attendeeName}, your registration for "${eventTitle}" is confirmed! Ticket: ${ticketRef}. See you there! - WebWaka`;
}

export function smsPaymentConfirmed(attendeeName: string, eventTitle: string, ticketRef: string): string {
  return `Dear ${attendeeName}, payment for "${eventTitle}" confirmed! Your ticket: ${ticketRef}. We look forward to seeing you! - WebWaka`;
}

export function smsCheckedIn(attendeeName: string, eventTitle: string): string {
  return `Welcome, ${attendeeName}! You are now checked in for "${eventTitle}". Enjoy the event! - WebWaka`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES — Legal Practice
// ─────────────────────────────────────────────────────────────────────────────

const emailBase = (title: string, content: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: #1B4F72; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">WebWaka Professional</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px;">
        <h2 style="color: #1B4F72; margin-top: 0;">${title}</h2>
        ${content}
      </td>
    </tr>
    <tr>
      <td style="background: #f8f9fa; padding: 16px 24px; text-align: center; color: #6c757d; font-size: 12px;">
        <p style="margin: 0;">WebWaka Professional Services Suite · Nigeria · Africa</p>
        <p style="margin: 4px 0 0;">This is an automated message — please do not reply.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function emailInvoiceSent(params: {
  clientName: string;
  invoiceNumber: string;
  amountFormatted: string;
  dueDate: string;
  firmName?: string;
}): { subject: string; html: string } {
  return {
    subject: `Invoice ${params.invoiceNumber} — ${params.amountFormatted}`,
    html: emailBase(
      `Invoice ${params.invoiceNumber}`,
      `<p>Dear ${params.clientName},</p>
       <p>Please find your invoice from ${params.firmName ?? 'your legal team'} below:</p>
       <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Invoice Number</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.invoiceNumber}</td>
         </tr>
         <tr>
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Amount Due</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6; color: #1B4F72; font-weight: bold;">${params.amountFormatted}</td>
         </tr>
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Due Date</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.dueDate}</td>
         </tr>
       </table>
       <p>Please log in to your WebWaka portal to view and make payment.</p>
       <p>Thank you for choosing us.</p>`
    )
  };
}

export function emailInvoicePaid(params: {
  clientName: string;
  invoiceNumber: string;
  amountFormatted: string;
  paymentReference: string;
}): { subject: string; html: string } {
  return {
    subject: `Payment Confirmed — Invoice ${params.invoiceNumber}`,
    html: emailBase(
      'Payment Confirmed',
      `<p>Dear ${params.clientName},</p>
       <p>We have received your payment. Thank you!</p>
       <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Invoice Number</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.invoiceNumber}</td>
         </tr>
         <tr>
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Amount Paid</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6; color: #27ae60; font-weight: bold;">${params.amountFormatted}</td>
         </tr>
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Reference</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.paymentReference}</td>
         </tr>
       </table>
       <p>Your payment receipt is available in your WebWaka portal.</p>`
    )
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES — Event Management
// ─────────────────────────────────────────────────────────────────────────────

export function emailRegistrationConfirmed(params: {
  attendeeName: string;
  eventTitle: string;
  ticketRef: string;
  eventDate: string;
  venue: string;
  amountFormatted: string;
}): { subject: string; html: string } {
  return {
    subject: `Registration Confirmed — ${params.eventTitle}`,
    html: emailBase(
      'Registration Confirmed!',
      `<p>Dear ${params.attendeeName},</p>
       <p>Your registration for <strong>${params.eventTitle}</strong> has been confirmed.</p>
       <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Ticket Reference</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6; font-family: monospace; font-size: 16px; color: #1B4F72;">${params.ticketRef}</td>
         </tr>
         <tr>
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Event</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.eventTitle}</td>
         </tr>
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Date</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.eventDate}</td>
         </tr>
         <tr>
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Venue</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.venue}</td>
         </tr>
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Amount Paid</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.amountFormatted}</td>
         </tr>
       </table>
       <p>Please bring your ticket reference for check-in. We look forward to seeing you!</p>`
    )
  };
}

export function emailPaymentConfirmed(params: {
  attendeeName: string;
  eventTitle: string;
  ticketRef: string;
  amountFormatted: string;
  paymentReference: string;
}): { subject: string; html: string } {
  return {
    subject: `Payment Confirmed — ${params.eventTitle}`,
    html: emailBase(
      'Payment Confirmed!',
      `<p>Dear ${params.attendeeName},</p>
       <p>Your payment for <strong>${params.eventTitle}</strong> has been received and your registration is now confirmed.</p>
       <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Ticket Reference</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6; font-family: monospace; font-size: 16px; color: #1B4F72;">${params.ticketRef}</td>
         </tr>
         <tr>
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Amount Paid</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6; color: #27ae60; font-weight: bold;">${params.amountFormatted}</td>
         </tr>
         <tr style="background: #f8f9fa;">
           <td style="padding: 12px; border: 1px solid #dee2e6;"><strong>Payment Reference</strong></td>
           <td style="padding: 12px; border: 1px solid #dee2e6;">${params.paymentReference}</td>
         </tr>
       </table>
       <p>Bring your ticket reference for check-in. See you at the event!</p>`
    )
  };
}
