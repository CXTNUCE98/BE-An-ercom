import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * Dịch vụ gửi email giao dịch qua Resend.
 * Nếu chưa cấu hình RESEND_API_KEY, chỉ log ra console (không chặn luồng nghiệp vụ).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = process.env.MAIL_FROM || 'An-ercom <onboarding@resend.dev>';
    this.appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY chưa cấu hình — email sẽ chỉ được log, không gửi thật.',
      );
    }
  }

  /** Gửi email chung; nuốt lỗi để không làm hỏng luồng đặt hàng / reset. */
  private async send(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
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
