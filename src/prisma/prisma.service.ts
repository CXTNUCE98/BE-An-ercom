import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Dịch vụ kết nối cơ sở dữ liệu sử dụng Prisma 7 với Adapter PG
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private client: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    this.pool = new Pool({ connectionString });
    const adapter = new PrismaPg(this.pool);
    this.client = new PrismaClient({ adapter });
  }

  get user() { return this.client.user; }
  get product() { return this.client.product; }
  get productCategory() { return this.client.productCategory; }
  get order() { return this.client.order; }
  get orderItem() { return this.client.orderItem; }
  get review() { return this.client.review; }

  $transaction: PrismaClient['$transaction'] = (...args: any[]) =>
    (this.client.$transaction as any)(...args);

  $connect() { return this.client.$connect(); }
  $disconnect() { return this.client.$disconnect(); }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    await this.pool.end();
  }
}
