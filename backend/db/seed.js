import { db } from './index.js';
import { cfos } from './schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

const CFO_EMAIL = 'cfo@org.com';
const CFO_PASSWORD = 'CFO#ORG@April2026';
const CFO_NAME = 'CFO';

async function seed() {
  try {
    // Check if CFO already exists to prevent duplicate seeding
    const [existing] = await db
      .select()
      .from(cfos)
      .where(eq(cfos.email, CFO_EMAIL));

    if (existing) {
      console.log('CFO account already exists. Skipping seed.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(CFO_PASSWORD, 10);

    await db.insert(cfos).values({
      name: CFO_NAME,
      email: CFO_EMAIL,
      password: hashedPassword,
    });

    console.log('CFO account seeded successfully.');
    console.log(`  Email   : ${CFO_EMAIL}`);
    console.log(`  Password: ${CFO_PASSWORD}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

seed();
