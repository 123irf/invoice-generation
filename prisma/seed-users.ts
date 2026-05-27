import dotenv from 'dotenv';
import path from 'path';

// Load .env.local so DATABASE_URL is available outside Next.js
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import bcrypt from 'bcryptjs';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'irfan@ultrakeyit.com' },
    update: { passwordHash: adminHash, role: 'SUPER_ADMIN', name: 'Irfan' },
    create: { email: 'irfan@ultrakeyit.com', passwordHash: adminHash, role: 'SUPER_ADMIN', name: 'Irfan' },
  });
  console.log('Super Admin user:', admin.id, admin.email, admin.role);

  const clientHash = await bcrypt.hash('client123', 12);
  const client = await prisma.user.upsert({
    where: { email: 'client@test.com' },
    update: { passwordHash: clientHash, role: 'CLIENT', name: 'Test Client' },
    create: { email: 'client@test.com', passwordHash: clientHash, role: 'CLIENT', name: 'Test Client' },
  });
  console.log('Client user:', client.id, client.email, client.role);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
