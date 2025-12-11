import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Display all plans in a nice table format
async function displayPlans() {
    const plans = await prisma.membershipPlan.findMany({
        orderBy: { durationDays: 'asc' }
    });

    if (plans.length === 0) {
        console.log('\n⚠️  No membership plans found.\n');
        return plans;
    }

    console.log('\n📋 Current Membership Plans:\n');
    console.log('─'.repeat(120));
    console.log(
        'ID'.padEnd(5) +
        'Name'.padEnd(30) +
        'Duration'.padEnd(15) +
        'Price'.padEnd(15) +
        'Student Price'.padEnd(18) +
        'Active'.padEnd(10) +
        'Created'
    );
    console.log('─'.repeat(120));

    plans.forEach(plan => {
        console.log(
            String(plan.id).padEnd(5) +
            plan.name.padEnd(30) +
            `${plan.durationDays} days`.padEnd(15) +
            `₱${plan.price}`.padEnd(15) +
            (plan.studentPrice ? `₱${plan.studentPrice}` : 'N/A').padEnd(18) +
            (plan.isActive ? '✅ Yes' : '❌ No').padEnd(10) +
            plan.createdAt.toLocaleDateString()
        );
    });
    console.log('─'.repeat(120));
    console.log(`\nTotal Plans: ${plans.length}\n`);

    return plans;
}

// Create a new membership plan
async function createPlan() {
    console.log('\n--- Create New Membership Plan ---\n');

    const name = await question('Plan Name (e.g., "1 Month Membership"): ');
    if (!name) {
        console.log('❌ Plan name is required.');
        return;
    }

    // Check if plan with same name exists
    const existing = await prisma.membershipPlan.findFirst({
        where: { name }
    });

    if (existing) {
        console.log(`\n❌ A plan with the name "${name}" already exists.`);
        return;
    }

    const durationDaysStr = await question('Duration in Days (e.g., 30): ');
    const durationDays = parseInt(durationDaysStr);
    if (isNaN(durationDays) || durationDays <= 0) {
        console.log('❌ Duration must be a positive number.');
        return;
    }

    const priceStr = await question('Price (₱): ');
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
        console.log('❌ Price must be a positive number.');
        return;
    }

    const studentPriceStr = await question('Student Price (₱) [Press Enter to skip]: ');
    const studentPrice = studentPriceStr ? parseFloat(studentPriceStr) : null;
    if (studentPriceStr && (isNaN(studentPrice) || studentPrice <= 0)) {
        console.log('❌ Student price must be a positive number.');
        return;
    }

    const description = await question('Description [Optional]: ');

    const isActiveStr = await question('Is Active? (yes/no) [default: yes]: ');
    const isActive = isActiveStr.toLowerCase() === 'no' ? false : true;

    try {
        const plan = await prisma.membershipPlan.create({
            data: {
                name,
                durationDays,
                price,
                studentPrice,
                description: description || null,
                isActive
            }
        });

        console.log('\n✅ Membership plan created successfully!');
        console.log('\nPlan Details:');
        console.log(`   ID: ${plan.id}`);
        console.log(`   Name: ${plan.name}`);
        console.log(`   Duration: ${plan.durationDays} days`);
        console.log(`   Price: ₱${plan.price}`);
        console.log(`   Student Price: ${plan.studentPrice ? '₱' + plan.studentPrice : 'N/A'}`);
        console.log(`   Description: ${plan.description || 'N/A'}`);
        console.log(`   Active: ${plan.isActive ? 'Yes' : 'No'}`);
    } catch (error) {
        console.error('\n❌ Error creating plan:', error.message);
    }
}

// Update an existing plan
async function updatePlan() {
    const plans = await displayPlans();
    if (plans.length === 0) return;

    const idStr = await question('\nEnter Plan ID to update: ');
    const id = parseInt(idStr);

    const plan = await prisma.membershipPlan.findUnique({
        where: { id }
    });

    if (!plan) {
        console.log('\n❌ Plan not found.');
        return;
    }

    console.log('\n📝 Current Plan Details:');
    console.log(`   Name: ${plan.name}`);
    console.log(`   Duration: ${plan.durationDays} days`);
    console.log(`   Price: ₱${plan.price}`);
    console.log(`   Student Price: ${plan.studentPrice ? '₱' + plan.studentPrice : 'N/A'}`);
    console.log(`   Description: ${plan.description || 'N/A'}`);
    console.log(`   Active: ${plan.isActive ? 'Yes' : 'No'}`);

    console.log('\n💡 Press Enter to keep current value\n');

    const name = await question(`Name [${plan.name}]: `);
    const durationDaysStr = await question(`Duration in Days [${plan.durationDays}]: `);
    const priceStr = await question(`Price [₱${plan.price}]: `);
    const studentPriceStr = await question(`Student Price [${plan.studentPrice ? '₱' + plan.studentPrice : 'N/A'}]: `);
    const description = await question(`Description [${plan.description || 'N/A'}]: `);
    const isActiveStr = await question(`Is Active? (yes/no) [${plan.isActive ? 'yes' : 'no'}]: `);

    const updateData = {
        name: name || plan.name,
        durationDays: durationDaysStr ? parseInt(durationDaysStr) : plan.durationDays,
        price: priceStr ? parseFloat(priceStr) : plan.price,
        studentPrice: studentPriceStr ? (studentPriceStr.toLowerCase() === 'null' ? null : parseFloat(studentPriceStr)) : plan.studentPrice,
        description: description || plan.description,
        isActive: isActiveStr ? (isActiveStr.toLowerCase() === 'yes') : plan.isActive
    };

    try {
        const updated = await prisma.membershipPlan.update({
            where: { id },
            data: updateData
        });

        console.log('\n✅ Plan updated successfully!');
        console.log('\nUpdated Plan Details:');
        console.log(`   ID: ${updated.id}`);
        console.log(`   Name: ${updated.name}`);
        console.log(`   Duration: ${updated.durationDays} days`);
        console.log(`   Price: ₱${updated.price}`);
        console.log(`   Student Price: ${updated.studentPrice ? '₱' + updated.studentPrice : 'N/A'}`);
        console.log(`   Description: ${updated.description || 'N/A'}`);
        console.log(`   Active: ${updated.isActive ? 'Yes' : 'No'}`);
    } catch (error) {
        console.error('\n❌ Error updating plan:', error.message);
    }
}

// Delete a plan
async function deletePlan() {
    const plans = await displayPlans();
    if (plans.length === 0) return;

    const idStr = await question('\nEnter Plan ID to delete: ');
    const id = parseInt(idStr);

    const plan = await prisma.membershipPlan.findUnique({
        where: { id },
        include: {
            payments: true
        }
    });

    if (!plan) {
        console.log('\n❌ Plan not found.');
        return;
    }

    console.log(`\n⚠️  You are about to delete: ${plan.name}`);
    if (plan.payments.length > 0) {
        console.log(`   ⚠️  WARNING: This plan has ${plan.payments.length} associated payment(s).`);
        console.log('   Deleting this plan may affect payment records.');
    }

    const confirm = await question('\nAre you sure? Type "DELETE" to confirm: ');

    if (confirm !== 'DELETE') {
        console.log('\n❌ Deletion cancelled.');
        return;
    }

    try {
        await prisma.membershipPlan.delete({
            where: { id }
        });

        console.log('\n✅ Plan deleted successfully!');
    } catch (error) {
        console.error('\n❌ Error deleting plan:', error.message);
        console.log('💡 Tip: If there are related records, consider deactivating the plan instead of deleting it.');
    }
}

// Toggle plan active status
async function togglePlanStatus() {
    const plans = await displayPlans();
    if (plans.length === 0) return;

    const idStr = await question('\nEnter Plan ID to toggle active status: ');
    const id = parseInt(idStr);

    const plan = await prisma.membershipPlan.findUnique({
        where: { id }
    });

    if (!plan) {
        console.log('\n❌ Plan not found.');
        return;
    }

    try {
        const updated = await prisma.membershipPlan.update({
            where: { id },
            data: { isActive: !plan.isActive }
        });

        console.log(`\n✅ Plan "${updated.name}" is now ${updated.isActive ? 'ACTIVE ✅' : 'INACTIVE ❌'}`);
    } catch (error) {
        console.error('\n❌ Error toggling plan status:', error.message);
    }
}

// Seed default plans
async function seedDefaultPlans() {
    console.log('\n--- Seed Default Membership Plans ---\n');
    console.log('This will create/update the following plans:\n');

    const defaultPlans = [
        { name: 'Walk-In / Daily', durationDays: 1, price: 60, studentPrice: 55, description: 'One day access to gym facilities' },
        { name: '1 Week Membership', durationDays: 7, price: 300, studentPrice: 250, description: 'Access for 7 days' },
        { name: 'Half Month Membership', durationDays: 15, price: 500, studentPrice: 400, description: 'Access for 15 days' },
        { name: '1 Month Membership', durationDays: 30, price: 750, studentPrice: 650, description: 'Access for 30 days' },
        { name: '3 Months Membership', durationDays: 90, price: 2000, studentPrice: null, description: 'Access for 90 days' },
        { name: '6 Months Membership', durationDays: 180, price: 3000, studentPrice: null, description: 'Access for 180 days' },
        { name: '1 Year Membership', durationDays: 365, price: 5000, studentPrice: null, description: 'Access for 365 days' },
    ];

    defaultPlans.forEach((plan, index) => {
        console.log(`${index + 1}. ${plan.name} - ${plan.durationDays} days - ₱${plan.price}${plan.studentPrice ? ` (Student: ₱${plan.studentPrice})` : ''}`);
    });

    const confirm = await question('\nProceed with seeding? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('\n❌ Seeding cancelled.');
        return;
    }

    let created = 0;
    let updated = 0;

    for (const plan of defaultPlans) {
        const existingPlan = await prisma.membershipPlan.findFirst({
            where: { name: plan.name }
        });

        if (!existingPlan) {
            await prisma.membershipPlan.create({ data: plan });
            console.log(`✅ Created: ${plan.name}`);
            created++;
        } else {
            await prisma.membershipPlan.update({
                where: { id: existingPlan.id },
                data: plan
            });
            console.log(`🔄 Updated: ${plan.name}`);
            updated++;
        }
    }

    console.log(`\n✅ Seeding completed! Created: ${created}, Updated: ${updated}`);
}

// Main menu
async function main() {
    try {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║   Membership Plan Management Tool     ║');
        console.log('╚════════════════════════════════════════╝\n');

        while (true) {
            console.log('What would you like to do?\n');
            console.log('1. View all plans');
            console.log('2. Create new plan');
            console.log('3. Update existing plan');
            console.log('4. Delete plan');
            console.log('5. Toggle plan active/inactive');
            console.log('6. Seed default plans');
            console.log('7. Exit\n');

            const choice = await question('Choice (1-7): ');

            switch (choice) {
                case '1':
                    await displayPlans();
                    break;
                case '2':
                    await createPlan();
                    break;
                case '3':
                    await updatePlan();
                    break;
                case '4':
                    await deletePlan();
                    break;
                case '5':
                    await togglePlanStatus();
                    break;
                case '6':
                    await seedDefaultPlans();
                    break;
                case '7':
                    console.log('\n👋 Goodbye!\n');
                    rl.close();
                    await prisma.$disconnect();
                    process.exit(0);
                default:
                    console.log('\n❌ Invalid choice. Please select 1-7.\n');
            }

            console.log('\n' + '─'.repeat(80) + '\n');
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        rl.close();
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();
