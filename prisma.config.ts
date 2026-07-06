import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

dotenv.config();

// Config này chỉ dùng cho Prisma CLI (generate / db push / migrate).
// Runtime dùng pg adapter trong PrismaService, KHÔNG đọc file này.
// Ưu tiên DIRECT_URL (kết nối unpooled) cho lệnh DDL; fallback DATABASE_URL.
// Fallback dummy URL cho build time trên Vercel (prisma generate).
const databaseUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  'postgresql://dummy:dummy@localhost:5432/dummy';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});
