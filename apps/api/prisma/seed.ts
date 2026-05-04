/**
 * Seed script.
 *
 * Idempotent — safe to run repeatedly. Creates:
 *   - A small NEPSE symbol catalog (current top tickers; full list ships in
 *     Phase 4 when the stocks module goes live)
 *   - Optional demo user with sample categories + accounts (gated by env)
 *
 * Run via: pnpm db:seed
 */

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const NEPSE_SEED: Array<{
  symbol: string;
  companyName: string;
  sector: string;
}> = [
  // Commercial Banks
  { symbol: 'NABIL', companyName: 'Nabil Bank Limited', sector: 'Commercial Banks' },
  { symbol: 'NICA', companyName: 'NIC Asia Bank Limited', sector: 'Commercial Banks' },
  { symbol: 'GBIME', companyName: 'Global IME Bank Limited', sector: 'Commercial Banks' },
  { symbol: 'NBL', companyName: 'Nepal Bank Limited', sector: 'Commercial Banks' },
  { symbol: 'SCB', companyName: 'Standard Chartered Bank Nepal Limited', sector: 'Commercial Banks' },
  { symbol: 'ADBL', companyName: 'Agricultural Development Bank Limited', sector: 'Commercial Banks' },
  { symbol: 'EBL', companyName: 'Everest Bank Limited', sector: 'Commercial Banks' },
  { symbol: 'KBL', companyName: 'Kumari Bank Limited', sector: 'Commercial Banks' },
  { symbol: 'SBI', companyName: 'Nepal SBI Bank Limited', sector: 'Commercial Banks' },
  { symbol: 'NMB', companyName: 'NMB Bank Limited', sector: 'Commercial Banks' },
  // Hydropower
  { symbol: 'NHPC', companyName: 'National Hydro Power Company Limited', sector: 'Hydropower' },
  { symbol: 'CHCL', companyName: 'Chilime Hydropower Company Limited', sector: 'Hydropower' },
  { symbol: 'UPPER', companyName: 'Upper Tamakoshi Hydropower Limited', sector: 'Hydropower' },
  { symbol: 'API', companyName: 'Api Power Company Limited', sector: 'Hydropower' },
  { symbol: 'BPCL', companyName: 'Butwal Power Company Limited', sector: 'Hydropower' },
  // Insurance (Life)
  { symbol: 'NLIC', companyName: 'Nepal Life Insurance Company Limited', sector: 'Life Insurance' },
  { symbol: 'LICN', companyName: 'Life Insurance Corporation Nepal', sector: 'Life Insurance' },
  // Insurance (Non-life)
  { symbol: 'NICL', companyName: 'Nepal Insurance Company Limited', sector: 'Non Life Insurance' },
  { symbol: 'SICL', companyName: 'Sagarmatha Insurance Company Limited', sector: 'Non Life Insurance' },
  // Microfinance
  { symbol: 'CBBL', companyName: 'Chhimek Laghubitta Bittiya Sanstha Limited', sector: 'Microfinance' },
  { symbol: 'NMFBS', companyName: 'Nirdhan Utthan Laghubitta Bittiya Sanstha Limited', sector: 'Microfinance' },
  // Manufacturing
  { symbol: 'UNL', companyName: 'Unilever Nepal Limited', sector: 'Manufacturing & Processing' },
  { symbol: 'BNL', companyName: 'Bottlers Nepal Limited (Balaju)', sector: 'Manufacturing & Processing' },
  // Hotels
  { symbol: 'SHL', companyName: 'Soaltee Hotel Limited', sector: 'Hotels & Tourism' },
  { symbol: 'OHL', companyName: 'Oriental Hotels Limited', sector: 'Hotels & Tourism' },
  // Telecom
  { symbol: 'NTC', companyName: 'Nepal Telecom', sector: 'Others' },
  // Trading
  { symbol: 'STC', companyName: 'Salt Trading Corporation', sector: 'Trading' },
];

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // ---------------------------------------------------------------------------
  // NEPSE symbols
  // ---------------------------------------------------------------------------
  console.log(`  → ${NEPSE_SEED.length} NEPSE symbols`);
  for (const s of NEPSE_SEED) {
    await prisma.stockSymbol.upsert({
      where: { symbol: s.symbol },
      create: {
        symbol: s.symbol,
        companyName: s.companyName,
        sector: s.sector,
        exchange: 'NEPSE',
        currency: 'NPR',
        isActive: true,
      },
      update: {
        companyName: s.companyName,
        sector: s.sector,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Optional demo user
  // ---------------------------------------------------------------------------
  if (process.env.SEED_DEMO_USER === 'true' && process.env.NODE_ENV !== 'production') {
    const email = process.env.DEMO_USER_EMAIL ?? 'demo@finance-os.local';
    const password = process.env.DEMO_USER_PASSWORD ?? 'demo-password-12345';

    console.log(`  → demo user: ${email}`);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: 'Demo User',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      update: {
        passwordHash, // refresh password if env changed
      },
    });
  }

  console.log('✓ Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
