import * as nodemailer from 'nodemailer'
import { appendFileSync } from 'fs'
import { join } from 'path'

interface EmailOptions {
  subject: string
  html: string
  to?: string
}

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try {
    appendFileSync(join(process.cwd(), 'app.log'), line)
  } catch {
    console.error(line)
  }
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_TO } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_TO) {
    log('[email] SMTP chưa được cấu hình trong .env — bỏ qua gửi email')
    return
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? '587'),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  try {
    await transporter.sendMail({
      from: `"Schedule Assistant" <${SMTP_USER}>`,
      to: options.to ?? NOTIFY_TO,
      subject: options.subject,
      html: options.html,
    })
    log(`[email] Đã gửi: ${options.subject}`)
  } catch (err: any) {
    log(`[email] Lỗi gửi mail: ${err.message}`)
  }
}
