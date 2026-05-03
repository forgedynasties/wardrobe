package email

import (
	"fmt"

	"github.com/resend/resend-go/v2"
)

type Sender struct {
	client *resend.Client
	from   string
}

func NewSender(apiKey, from string) *Sender {
	return &Sender{client: resend.NewClient(apiKey), from: from}
}

func (s *Sender) SendOTP(toEmail, code string) error {
	html := fmt.Sprintf(`
<div style="font-family:sans-serif;max-width:400px;margin:0 auto">
  <h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Hangur</h2>
  <p style="color:#666;margin-bottom:24px">Your verification code:</p>
  <div style="font-size:36px;font-weight:700;letter-spacing:8px;padding:16px;background:#f4f4f5;border-radius:8px;text-align:center">%s</div>
  <p style="color:#999;font-size:13px;margin-top:16px">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
</div>`, code)

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("%s is your Hangur code", code),
		Html:    html,
	})
	return err
}
