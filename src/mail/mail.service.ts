import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { OrderStatus } from '@prisma/client';
import {
  passwordResetTemplate,
  orderConfirmationTemplate,
  paymentSuccessTemplate,
  orderStatusTemplate,
  type OrderEmailData,
} from './mail.templates';

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
    const { subject, html } = passwordResetTemplate(link);
    await this.send(to, subject, html);
  }

  /** Email xác nhận đặt hàng thành công. */
  async sendOrderConfirmation(to: string, order: OrderEmailData) {
    const { subject, html } = orderConfirmationTemplate(order);
    await this.send(to, subject, html);
  }

  /** Email báo thanh toán thành công. */
  async sendPaymentSuccess(to: string, order: OrderEmailData) {
    const { subject, html } = paymentSuccessTemplate(order);
    await this.send(to, subject, html);
  }

  /** Email báo thay đổi trạng thái đơn hàng. */
  async sendOrderStatus(to: string, order: OrderEmailData, status: OrderStatus) {
    const { subject, html } = orderStatusTemplate(order, status);
    await this.send(to, subject, html);
  }
}
