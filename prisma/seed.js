import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create Admin User
    const adminEmail = 'admin@campusone.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                email: adminEmail,
                username: 'admin',
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin',
                isVerified: true,
            },
        });
        console.log('Admin user created');
    }

    // Create Membership Plans
    const plans = [
        { name: 'Walk-In / Daily', durationDays: 1, price: 60, studentPrice: 55, description: 'One day access to gym facilities' },
        { name: '1 Week Membership', durationDays: 7, price: 300, studentPrice: 250, description: 'Access for 7 days' },
        { name: 'Half Month Membership', durationDays: 15, price: 500, studentPrice: 400, description: 'Access for 15 days' },
        { name: '1 Month Membership', durationDays: 30, price: 750, studentPrice: 650, description: 'Access for 30 days' },
        { name: '3 Months Membership', durationDays: 90, price: 2000, studentPrice: null, description: 'Access for 90 days' },
        { name: '6 Months Membership', durationDays: 180, price: 3000, studentPrice: null, description: 'Access for 180 days' },
        { name: '1 Year Membership', durationDays: 365, price: 5000, studentPrice: null, description: 'Access for 365 days' },
    ];

    for (const plan of plans) {
        const existingPlan = await prisma.membershipPlan.findFirst({
            where: { name: plan.name }
        });

        if (!existingPlan) {
            await prisma.membershipPlan.create({
                data: plan
            });
            console.log(`Created plan: ${plan.name}`);
        } else {
            // Update price if needed
            await prisma.membershipPlan.update({
                where: { id: existingPlan.id },
                data: plan
            });
            console.log(`Updated plan: ${plan.name}`);
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
