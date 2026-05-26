import { sanitizeHTML } from '@/lib/sanitize';

interface EmailParams {
  greeting: string;
  bodyText: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText: string;
  businessName: string;
}

export function renderEmailHtml({ greeting, bodyText, buttonText, buttonUrl, footerText, businessName }: EmailParams): string {
  const buttonHtml = buttonUrl && buttonText
    ? `
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
        <tr>
          <td bgcolor="#2C5282" style="border-radius: 4px;">
            <a href="${buttonUrl}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold;">
              ${buttonText}
            </a>
          </td>
        </tr>
      </table>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F7FAFC;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding: 32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #2C5282; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">${businessName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="color: #1A202C; font-size: 16px; margin: 0 0 16px;">${greeting}</p>
              <div style="color: #1A202C; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${sanitizeHTML(bodyText)}</div>
              ${buttonHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #F7FAFC; border-top: 1px solid #E2E8F0; text-align: center; color: #718096; font-size: 12px;">
              ${sanitizeHTML(footerText)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
