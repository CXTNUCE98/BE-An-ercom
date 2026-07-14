import { OrderStatus } from '@prisma/client';

/**
 * Bộ template email HTML cho An-ercom.
 * Dùng layout bảng (table) + inline style để tương thích mọi email client
 * (Gmail, Outlook, Apple Mail...). Mỗi hàm trả về { subject, html }.
 */

const C = {
  bg: '#f2efe8',
  card: '#ffffff',
  ink: '#14110d',
  gold: '#b8935a',
  text: '#2c2a27',
  muted: '#8b867e',
  line: '#e7e2d8',
};

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export interface OrderEmailData {
  id: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalPrice: number;
  shippingAddress: string;
  phone: string;
  paymentMethod: string;
  couponCode?: string | null;
}

export const vnd = (n: number): string => n.toLocaleString('vi-VN') + '₫';

const shortId = (id: string): string => id.slice(0, 8).toUpperCase();

const PAYMENT_LABEL: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  MOMO: 'Ví MoMo',
};

/** Khung layout chung: header thương hiệu + body + footer. */
function layout(bodyHtml: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};color:${C.text};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};">
        <tr>
          <td style="background:${C.ink};padding:26px 32px;text-align:center;">
            <div style="font-family:${SERIF};font-size:24px;letter-spacing:4px;color:#ffffff;font-weight:700;">AN·ERCOM</div>
            <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};margin-top:4px;">Phụ kiện quý ông</div>
          </td>
        </tr>
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <tr>
          <td style="background:#faf8f3;border-top:1px solid ${C.line};padding:22px 32px;text-align:center;">
            <div style="font-size:12px;color:${C.muted};line-height:1.7;">
              Email này được gửi tự động từ hệ thống An-ercom.<br>
              Cần hỗ trợ? Trả lời email hoặc liên hệ CSKH của chúng tôi.
            </div>
            <div style="font-size:11px;color:${C.muted};margin-top:12px;">© ${new Date().getFullYear()} An-ercom. All rights reserved.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Nút CTA. */
function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;"><tr>
    <td style="background:${C.ink};">
      <a href="${href}" style="display:inline-block;padding:13px 30px;font-family:${FONT};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;font-weight:600;">${label}</a>
    </td></tr></table>`;
}

function heading(text: string): string {
  return `<h1 style="font-family:${SERIF};font-size:22px;color:${C.ink};margin:0 0 16px;font-weight:700;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="font-size:15px;line-height:1.7;color:${C.text};margin:0 0 14px;">${text}</p>`;
}

/** Bảng liệt kê sản phẩm trong đơn. */
function itemsTable(items: OrderEmailData['items']): string {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;color:${C.text};">${i.name}</td>
        <td style="padding:10px 8px;border-bottom:1px solid ${C.line};font-size:14px;color:${C.muted};text-align:center;white-space:nowrap;">× ${i.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;color:${C.text};text-align:right;white-space:nowrap;font-weight:600;">${vnd(i.price * i.quantity)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">${rows}</table>`;
}

/** Bảng tổng tiền: tạm tính / giảm giá / ship / tổng. */
function totalsTable(o: OrderEmailData): string {
  const line = (label: string, value: string, strong = false, color = C.text) =>
    `<tr>
      <td style="padding:5px 0;font-size:14px;color:${strong ? C.ink : C.muted};${strong ? 'font-weight:700;' : ''}">${label}</td>
      <td style="padding:5px 0;font-size:${strong ? '17px' : '14px'};color:${color};text-align:right;${strong ? 'font-weight:700;' : ''}">${value}</td>
    </tr>`;
  const discountLine =
    o.discount > 0
      ? line(
          `Giảm giá${o.couponCode ? ` (${o.couponCode})` : ''}`,
          '- ' + vnd(o.discount),
          false,
          '#6f7d3f',
        )
      : '';
  const shipLine = line(
    'Phí vận chuyển',
    o.shippingFee > 0 ? vnd(o.shippingFee) : 'Miễn phí',
  );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:2px solid ${C.ink};padding-top:8px;">
    ${line('Tạm tính', vnd(o.subtotal))}
    ${discountLine}
    ${shipLine}
    <tr><td colspan="2" style="border-top:1px solid ${C.line};padding-top:4px;"></td></tr>
    ${line('Tổng cộng', vnd(o.totalPrice), true, C.gold)}
  </table>`;
}

/** Khối thông tin giao hàng. */
function shippingBlock(o: OrderEmailData): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#faf8f3;border:1px solid ${C.line};">
    <tr><td style="padding:16px 18px;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-bottom:8px;">Giao đến</div>
      <div style="font-size:14px;color:${C.text};line-height:1.6;">${o.shippingAddress}</div>
      <div style="font-size:14px;color:${C.muted};margin-top:4px;">SĐT: ${o.phone}</div>
      <div style="font-size:14px;color:${C.muted};margin-top:4px;">Thanh toán: ${PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</div>
    </td></tr>
  </table>`;
}

/** 1. Đặt lại mật khẩu. */
export function passwordResetTemplate(link: string): {
  subject: string;
  html: string;
} {
  const body = `
    ${heading('Đặt lại mật khẩu')}
    ${paragraph('Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản An-ercom. Nhấn nút bên dưới để tạo mật khẩu mới.')}
    ${button('Đặt lại mật khẩu', link)}
    ${paragraph(`<span style="font-size:13px;color:${C.muted};">Liên kết có hiệu lực trong <strong>1 giờ</strong>. Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu của bạn vẫn an toàn.</span>`)}
    <p style="font-size:12px;color:${C.muted};margin-top:18px;word-break:break-all;">Nút không hoạt động? Sao chép liên kết sau vào trình duyệt:<br><span style="color:${C.gold};">${link}</span></p>
  `;
  return {
    subject: 'Đặt lại mật khẩu — An-ercom',
    html: layout(body, 'Yêu cầu đặt lại mật khẩu An-ercom (hiệu lực 1 giờ)'),
  };
}

/** 2. Xác nhận đặt hàng thành công. */
export function orderConfirmationTemplate(o: OrderEmailData): {
  subject: string;
  html: string;
} {
  const body = `
    ${heading('Cảm ơn bạn đã đặt hàng!')}
    ${paragraph(`Đơn hàng <strong>#${shortId(o.id)}</strong> đã được ghi nhận. Chúng tôi sẽ sớm liên hệ xác nhận và chuẩn bị giao trong <strong>2–3 ngày làm việc</strong>.`)}
    ${itemsTable(o.items)}
    ${totalsTable(o)}
    ${shippingBlock(o)}
  `;
  return {
    subject: `Xác nhận đơn hàng #${shortId(o.id)} — An-ercom`,
    html: layout(body, `Đơn #${shortId(o.id)} đã được ghi nhận — tổng ${vnd(o.totalPrice)}`),
  };
}

/** 3. Báo thanh toán thành công. */
export function paymentSuccessTemplate(o: OrderEmailData): {
  subject: string;
  html: string;
} {
  const body = `
    <div style="text-align:center;margin-bottom:8px;">
      <div style="display:inline-block;width:52px;height:52px;line-height:52px;border-radius:50%;background:#eef3e2;color:#6f7d3f;font-size:26px;">✓</div>
    </div>
    ${heading('Thanh toán thành công')}
    ${paragraph(`Chúng tôi đã nhận được thanh toán <strong>${vnd(o.totalPrice)}</strong> cho đơn hàng <strong>#${shortId(o.id)}</strong>. Đơn hàng của bạn đang được xử lý.`)}
    ${itemsTable(o.items)}
    ${totalsTable(o)}
    ${shippingBlock(o)}
  `;
  return {
    subject: `Đã nhận thanh toán đơn #${shortId(o.id)} — An-ercom`,
    html: layout(body, `Thanh toán ${vnd(o.totalPrice)} cho đơn #${shortId(o.id)} đã thành công`),
  };
}

/** Nội dung theo từng trạng thái đơn. */
const STATUS_CONTENT: Record<
  OrderStatus,
  { subject: string; title: string; message: string; accent: string; badge: string }
> = {
  PENDING: {
    subject: 'Đơn hàng đang chờ xác nhận',
    title: 'Đơn hàng đang chờ xác nhận',
    message: 'Đơn hàng của bạn đã được tạo và đang chờ chúng tôi xác nhận.',
    accent: '#c08a2d',
    badge: 'Chờ xác nhận',
  },
  CONFIRMED: {
    subject: 'Đơn hàng đã được xác nhận',
    title: 'Đơn hàng đã được xác nhận',
    message: 'Chúng tôi đã xác nhận đơn hàng và đang chuẩn bị hàng để giao cho bạn.',
    accent: '#2f6fb0',
    badge: 'Đã xác nhận',
  },
  SHIPPING: {
    subject: 'Đơn hàng đang được giao',
    title: 'Đơn hàng đang trên đường giao',
    message: 'Đơn hàng của bạn đã được bàn giao cho đơn vị vận chuyển và đang trên đường đến bạn.',
    accent: '#b8935a',
    badge: 'Đang giao',
  },
  DELIVERED: {
    subject: 'Đơn hàng đã giao thành công',
    title: 'Đã giao hàng thành công',
    message: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã tin tưởng An-ercom — rất mong được phục vụ bạn lần nữa!',
    accent: '#6f7d3f',
    badge: 'Đã giao',
  },
  CANCELLED: {
    subject: 'Đơn hàng đã được huỷ',
    title: 'Đơn hàng đã được huỷ',
    message: 'Đơn hàng của bạn đã được huỷ. Nếu đây là nhầm lẫn hoặc bạn cần hỗ trợ, vui lòng liên hệ chúng tôi.',
    accent: '#9c3b3b',
    badge: 'Đã huỷ',
  },
};

/** 4. Báo thay đổi trạng thái đơn hàng. */
export function orderStatusTemplate(
  o: OrderEmailData,
  status: OrderStatus,
): { subject: string; html: string } {
  const s = STATUS_CONTENT[status];
  const body = `
    <div style="margin-bottom:14px;">
      <span style="display:inline-block;padding:6px 14px;background:${s.accent};color:#ffffff;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">${s.badge}</span>
    </div>
    ${heading(s.title)}
    ${paragraph(`Đơn hàng <strong>#${shortId(o.id)}</strong>: ${s.message}`)}
    ${itemsTable(o.items)}
    ${totalsTable(o)}
    ${shippingBlock(o)}
  `;
  return {
    subject: `${s.subject} — Đơn #${shortId(o.id)}`,
    html: layout(body, `${s.title} — đơn #${shortId(o.id)}`),
  };
}
