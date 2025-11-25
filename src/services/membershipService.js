import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const checkExpiringMemberships = async () => {
    try {
        const today = new Date();
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const oneDayFromNow = new Date(today);
        oneDayFromNow.setDate(today.getDate() + 1);

        // Find users expiring in exactly 7 days (range for safety)
        const expiringIn7Days = await prisma.user.findMany({
            where: {
                status: 'active',
                expiryDate: {
                    gte: new Date(sevenDaysFromNow.setHours(0, 0, 0, 0)),
                    lt: new Date(sevenDaysFromNow.setHours(23, 59, 59, 999))
                }
            }
        });

        // Find users expiring in exactly 1 day
        const expiringIn1Day = await prisma.user.findMany({
            where: {
                status: 'active',
                expiryDate: {
                    gte: new Date(oneDayFromNow.setHours(0, 0, 0, 0)),
                    lt: new Date(oneDayFromNow.setHours(23, 59, 59, 999))
                }
            }
        });

        // Create notifications
        const notifications = [];

        // 7 Days Reminder
        for (const user of expiringIn7Days) {
            notifications.push({
                userId: user.id,
                title: 'Membership Expiring Soon',
                message: `Your ${user.membershipType} membership expires in 7 days. Please renew to avoid interruption.`,
                type: 'warning'
            });

            // Notify Admin (Assign to first admin found or a system user - for now, let's just create a notification for the user. 
            // Admin usually checks a report, but we can add an admin notification if we had an admin ID. 
            // For now, let's focus on user notification.)
        }

        // 1 Day Reminder
        for (const user of expiringIn1Day) {
            notifications.push({
                userId: user.id,
                title: 'Membership Expires Tomorrow',
                message: `URGENT: Your ${user.membershipType} membership expires tomorrow! Renew now.`,
                type: 'error' // Red alert
            });
        }

        if (notifications.length > 0) {
            await prisma.notification.createMany({
                data: notifications
            });
            console.log(`Generated ${notifications.length} expiry notifications.`);
        }

    } catch (error) {
        console.error('Error checking expiring memberships:', error);
    }
};
