/**
 * Seed danh mục + sản phẩm vào DB từ seed-data.json (xuất từ FE constants).
 * Chạy: npm run prisma:seed
 * Idempotent: dùng upsert theo slug nên chạy lại nhiều lần vẫn an toàn.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
// Nạp .env trước khi dùng process.env (script standalone không qua @nestjs/config).
config({ path: resolve(__dirname, '../.env') });

import { readFileSync } from 'node:fs';
import { PrismaClient, ProductStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

interface SeedCategory {
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
}

interface SeedProduct {
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  price: number;
  salePrice: number | null;
  description: string | null;
  images: string[];
  specs: Array<{ label: string; value: string }>;
  tags: string[];
  highlights: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  isNew: boolean;
  isBestSeller: boolean;
  isLuxury: boolean;
  videoUrl: string | null;
  videoPoster: string | null;
}

async function main() {
  const dataPath = resolve(__dirname, 'seed-data.json');
  const { categories, products } = JSON.parse(
    readFileSync(dataPath, 'utf-8'),
  ) as { categories: SeedCategory[]; products: SeedProduct[] };

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`Seeding ${categories.length} danh mục...`);
  const categoryIdBySlug = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.productCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, image: c.image },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        image: c.image,
      },
    });
    categoryIdBySlug.set(c.slug, cat.id);
  }

  console.log(`Seeding ${products.length} sản phẩm...`);
  for (const p of products) {
    const categoryId = categoryIdBySlug.get(p.categorySlug) ?? null;
    const data = {
      name: p.name,
      brand: p.brand,
      price: p.price,
      salePrice: p.salePrice,
      description: p.description,
      images: p.images,
      specs: p.specs,
      tags: p.tags,
      highlights: p.highlights,
      rating: p.rating,
      reviewCount: p.reviewCount,
      stock: p.stock,
      status: p.stock > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK,
      isNew: p.isNew,
      isBestSeller: p.isBestSeller,
      isLuxury: p.isLuxury,
      videoUrl: p.videoUrl,
      videoPoster: p.videoPoster,
      categoryId,
    };
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });
  }

  await prisma.$disconnect();
  await pool.end();
  console.log('Seed hoàn tất.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
