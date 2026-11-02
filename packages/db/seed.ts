import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // ── Users ────────────────────────────────────────────────────────────────
    const password = await bcrypt.hash("password123", 10);

    const alice = await prisma.user.upsert({
        where: { number: "9999999001" },
        update: {},
        create: {
            number: "9999999001",
            name: "Alice Sharma",
            email: "alice@example.com",
            password,
        },
    });

    const bob = await prisma.user.upsert({
        where: { number: "9999999002" },
        update: {},
        create: {
            number: "9999999002",
            name: "Bob Verma",
            email: "bob@example.com",
            password,
        },
    });

    const charlie = await prisma.user.upsert({
        where: { number: "9999999003" },
        update: {},
        create: {
            number: "9999999003",
            name: "Charlie Patel",
            email: "charlie@example.com",
            password,
        },
    });

    console.log(`✅ Created users: ${alice.name}, ${bob.name}, ${charlie.name}`);

    // ── Balances ─────────────────────────────────────────────────────────────
    await prisma.balance.upsert({
        where: { userId: alice.id },
        update: {},
        create: { userId: alice.id, amount: 500000, locked: 0 }, // ₹5,000
    });

    await prisma.balance.upsert({
        where: { userId: bob.id },
        update: {},
        create: { userId: bob.id, amount: 250000, locked: 10000 }, // ₹2,500 + ₹100 locked
    });

    await prisma.balance.upsert({
        where: { userId: charlie.id },
        update: {},
        create: { userId: charlie.id, amount: 100000, locked: 0 }, // ₹1,000
    });

    console.log("✅ Created balances");

    // ── OnRamp Transactions ───────────────────────────────────────────────────
    const txns = [
        {
            userId: alice.id,
            token: "token-alice-001",
            provider: "HDFC Bank",
            amount: 200000,
            status: "Success" as const,
            startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
            userId: alice.id,
            token: "token-alice-002",
            provider: "Axis Bank",
            amount: 300000,
            status: "Success" as const,
            startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
            userId: alice.id,
            token: "token-alice-003",
            provider: "HDFC Bank",
            amount: 50000,
            status: "Processing" as const,
            startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
        {
            userId: bob.id,
            token: "token-bob-001",
            provider: "SBI",
            amount: 250000,
            status: "Success" as const,
            startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
            userId: bob.id,
            token: "token-bob-002",
            provider: "ICICI Bank",
            amount: 100000,
            status: "Failure" as const,
            startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
            userId: charlie.id,
            token: "token-charlie-001",
            provider: "HDFC Bank",
            amount: 100000,
            status: "Success" as const,
            startTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
    ];

    for (const txn of txns) {
        await prisma.onRampTransaction.upsert({
            where: { token: txn.token },
            update: {},
            create: txn,
        });
    }

    console.log(`✅ Created ${txns.length} on-ramp transactions`);
    console.log("\n🎉 Seed complete!");
    console.log("\n📋 Test credentials:");
    console.log("   Phone: 9999999001  Password: password123  (Alice - ₹5,000)");
    console.log("   Phone: 9999999002  Password: password123  (Bob   - ₹2,500)");
    console.log("   Phone: 9999999003  Password: password123  (Charlie - ₹1,000)");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
