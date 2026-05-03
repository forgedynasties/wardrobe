package email

import (
	"fmt"

	"github.com/resend/resend-go/v2"
)

const logoURL = "https://pub-c8868aca4a704d6f85ab7475f0b22e7a.r2.dev/assets/icon.png"

type Sender struct {
	client *resend.Client
	from   string
}

func NewSender(apiKey, from string) *Sender {
	return &Sender{client: resend.NewClient(apiKey), from: from}
}

func emailTemplate(title, bodyHTML string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:24px">
          <img src="%s" width="52" height="52" alt="Hangur" style="display:block;border-radius:12px" />
          <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#111;letter-spacing:-0.3px">Hangur</p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;padding:36px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          %s
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px">
          <p style="margin:0;font-size:12px;color:#aaa">
            You're receiving this email because an action was taken on your Hangur account.<br>
            If you didn't request this, you can safely ignore it.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`, logoURL, title, bodyHTML)
}

func (s *Sender) SendOTP(toEmail, code string) error {
	body := fmt.Sprintf(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111">Verify your email</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.5">
      Enter this code to complete your sign-up. It expires in <strong>10 minutes</strong>.
    </p>

    <div style="background:#f4f4f5;border-radius:12px;padding:24px 16px;text-align:center;margin-bottom:28px">
      <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#111;font-variant-numeric:tabular-nums">%s</span>
    </div>

    <p style="margin:0;font-size:13px;color:#999;text-align:center">
      This code is single-use and expires in 10 minutes.
    </p>`, code)

	html := emailTemplate("Verify your email", body)

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("%s is your Hangur verification code", code),
		Html:    html,
	})
	return err
}

func (s *Sender) SendPasswordReset(toEmail, code string) error {
	body := fmt.Sprintf(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111">Reset your password</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.5">
      Use this code to reset your Hangur password. It expires in <strong>10 minutes</strong>.
    </p>

    <div style="background:#f4f4f5;border-radius:12px;padding:24px 16px;text-align:center;margin-bottom:28px">
      <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#111;font-variant-numeric:tabular-nums">%s</span>
    </div>

    <p style="margin:0;font-size:13px;color:#999;text-align:center">
      If you didn't request a password reset, your account is safe — just ignore this email.
    </p>`, code)

	html := emailTemplate("Reset your password", body)

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("%s is your Hangur reset code", code),
		Html:    html,
	})
	return err
}
