import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Dịch vụ gửi email giao dịch qua SMTP (nodemailer).
 * Cấu hình qua env — đổi nhà cung cấp (Gmail/Brevo/Mailjet...) chỉ cần sửa env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, FRONTEND_URL
 * Nếu thiếu cấu hình SMTP, chỉ log ra console (không chặn luồng nghiệp vụ).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT ?? 587);

    this.from = process.env.MAIL_FROM || 'An-ercom <no-reply@an-ercom.local>';
    this.appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = SSL; 587 = STARTTLS
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP chưa cấu hình đủ (SMTP_HOST/USER/PASS) — email sẽ chỉ được log, không gửi thật.',
      );
    }
  }

  /** Gửi email chung; nuốt lỗi để không làm hỏng luồng đặt hàng / reset. */
  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
      this.logger.log(`Đã gửi email tới ${to} (id: ${info.messageId})`);
    } catch (err) {
      this.logger.error(`Gửi email thất bại tới ${to}: ${String(err)}`);
    }
  }

  /** Email đặt lại mật khẩu — kèm link chứa token. */
  async sendPasswordReset(to: string, token: string) {
    const link = `${this.appUrl}/reset-password?token=${token}`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Đặt lại mật khẩu</h2>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản An-ercom.</p>
        <p>Nhấn vào nút bên dưới để đặt mật khẩu mới (link có hiệu lực 1 giờ):</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Đặt lại mật khẩu</a></p>
        <p style="color:#666;font-size:13px">Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
      </div>`;
    await this.send(to, 'Đặt lại mật khẩu An-ercom', html);
  }

  /** Email xác nhận đơn hàng. */
  async sendOrderConfirmation(
    to: string,
    order: {
      id: string;
      totalPrice: number;
      items: { name: string; quantity: number; price: number }[];
      shippingAddress: string;
    },
  ) {
    const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';
    const rows = order.items
      .map(
        (i) =>
          `<tr><td style="padding:4px 8px">${i.name}</td><td style="padding:4px 8px;text-align:center">x${i.quantity}</td><td style="padding:4px 8px;text-align:right">${vnd(i.price * i.quantity)}</td></tr>`,
      )
      .join('');
    const shortId = order.id.slice(0, 8).toUpperCase();
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2>Cảm ơn bạn đã đặt hàng!</h2>
        <p>Đơn hàng <strong>#${shortId}</strong> đã được ghi nhận.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead><tr style="border-bottom:1px solid #ddd"><th style="text-align:left;padding:4px 8px">Sản phẩm</th><th style="padding:4px 8px">SL</th><th style="text-align:right;padding:4px 8px">Thành tiền</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="text-align:right;font-size:16px"><strong>Tổng cộng: ${vnd(order.totalPrice)}</strong></p>
        <p><strong>Giao đến:</strong> ${order.shippingAddress}</p>
        <p style="color:#666;font-size:13px">Chúng tôi sẽ liên hệ để xác nhận và giao hàng trong 2-3 ngày làm việc.</p>
      </div>`;
    await this.send(to, `Xác nhận đơn hàng #${shortId} — An-ercom`, html);
  }
}
