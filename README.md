# An-ercom Backend API

Backend API cho hệ thống thương mại điện tử An-ercom, xây dựng bằng NestJS + Prisma + PostgreSQL.

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (Passport)
- **Upload ảnh**: Cloudinary
- **Docs**: Swagger UI

## Modules

| Module | Endpoint | Mô tả |
|--------|----------|-------|
| Auth | `/auth` | Đăng ký, đăng nhập, lấy profile |
| Users | `/users` | Quản lý khách hàng, cập nhật profile |
| Products | `/products` | CRUD sản phẩm + upload ảnh Cloudinary |
| Product Categories | `/product-categories` | Quản lý danh mục sản phẩm |
| Orders | `/orders` | Đặt hàng, theo dõi đơn hàng |
| Dashboard | `/dashboard` | Thống kê doanh thu, sản phẩm bán chạy |

## Cài đặt

```bash
# Cài dependencies
npm install

# Copy file env
cp .env.example .env
# Điền thông tin vào .env

# Generate Prisma client
npm run prisma:generate

# Tạo bảng trong database
npm run prisma:migrate

# Chạy development
npm run dev
```

## API Docs

Sau khi chạy server, truy cập: `http://localhost:3001/api`
