import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function checkAdminExists(email) {
    const admin = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true
        }
    });
    return admin;
}

async function createAdmin() {
    try {
        console.log('\n=== Admin User Management ===\n');

        // Check for existing admins
        const existingAdmins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                createdAt: true
            }
        });

        if (existingAdmins.length > 0) {
            console.log('📋 Existing Admin Users:');
            existingAdmins.forEach((admin, index) => {
                console.log(`\n${index + 1}. Admin ID: ${admin.id}`);
                console.log(`   Email: ${admin.email}`);
                console.log(`   Username: ${admin.username}`);
                console.log(`   Name: ${admin.firstName || 'N/A'} ${admin.lastName || ''}`);
                console.log(`   Created: ${admin.createdAt.toLocaleDateString()}`);
            });
            console.log('\n');
        } else {
            console.log('⚠️  No admin users found in the database.\n');
        }

        const action = await question('What would you like to do?\n1. Create new admin\n2. Check admin by email\n3. Exit\nChoice (1-3): ');

        if (action === '3') {
            console.log('Exiting...');
            rl.close();
            await prisma.$disconnect();
            process.exit(0);
        }

        if (action === '2') {
            const emailToCheck = await question('\nEnter admin email to check: ');
            const admin = await checkAdminExists(emailToCheck);

            if (admin) {
                console.log('\n✅ Admin found:');
                console.log(`   ID: ${admin.id}`);
                console.log(`   Email: ${admin.email}`);
                console.log(`   Username: ${admin.username}`);
                console.log(`   Name: ${admin.firstName || 'N/A'} ${admin.lastName || ''}`);
                console.log(`   Role: ${admin.role}`);
                console.log(`   Created: ${admin.createdAt.toLocaleDateString()}`);
            } else {
                console.log('\n❌ No admin found with that email.');
            }

            rl.close();
            await prisma.$disconnect();
            process.exit(0);
        }

        if (action === '1') {
            console.log('\n--- Create New Admin ---\n');

            const email = await question('Email: ');

            // Check if email already exists
            const existing = await prisma.user.findUnique({
                where: { email }
            });

            if (existing) {
                console.log(`\n❌ Error: A user with email "${email}" already exists.`);
                if (existing.role === 'admin') {
                    console.log('   This user is already an admin.');
                } else {
                    console.log(`   This user has role: ${existing.role}`);
                    const upgrade = await question('\nWould you like to upgrade this user to admin? (yes/no): ');

                    if (upgrade.toLowerCase() === 'yes' || upgrade.toLowerCase() === 'y') {
                        await prisma.user.update({
                            where: { email },
                            data: { role: 'admin' }
                        });
                        console.log('\n✅ User upgraded to admin successfully!');
                    }
                }
                rl.close();
                await prisma.$disconnect();
                process.exit(0);
            }

            const username = await question('Username: ');
            const firstName = await question('First Name: ');
            const lastName = await question('Last Name: ');
            const password = await question('Password: ');

            if (!email || !username || !password) {
                console.log('\n❌ Error: Email, username, and password are required.');
                rl.close();
                await prisma.$disconnect();
                process.exit(1);
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create admin user
            const admin = await prisma.user.create({
                data: {
                    email,
                    username,
                    password: hashedPassword,
                    firstName: firstName || null,
                    lastName: lastName || null,
                    role: 'admin',
                    isVerified: true
                }
            });

            console.log('\n✅ Admin user created successfully!');
            console.log('\nAdmin Details:');
            console.log(`   ID: ${admin.id}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Username: ${admin.username}`);
            console.log(`   Name: ${admin.firstName || 'N/A'} ${admin.lastName || ''}`);
            console.log('\n⚠️  Please save these credentials securely!');
        } else {
            console.log('\n❌ Invalid choice.');
        }

        rl.close();
        await prisma.$disconnect();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        rl.close();
        await prisma.$disconnect();
        process.exit(1);
    }
}

createAdmin();
