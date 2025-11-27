import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedCoaching() {
    console.log('🏋️ Seeding coaching data...');

    try {
        // Create coach users
        const hashedPassword = await bcrypt.hash('coach123', 10);

        // Coach 1: Strength Training Specialist
        const coach1User = await prisma.user.upsert({
            where: { email: 'john.smith@gym.com' },
            update: {},
            create: {
                email: 'john.smith@gym.com',
                password: hashedPassword,
                firstName: 'John',
                lastName: 'Smith',
                role: 'coach',
                phone: '+1234567890',
                isVerified: true,
            },
        });

        const coach1 = await prisma.coach.upsert({
            where: { userId: coach1User.id },
            update: {},
            create: {
                userId: coach1User.id,
                specializations: JSON.stringify(['Strength Training', 'Powerlifting', 'Bodybuilding']),
                bio: 'Certified strength and conditioning specialist with 10+ years of experience. Former competitive powerlifter with multiple national records.',
                certifications: JSON.stringify([
                    { name: 'NSCA-CSCS', year: 2014 },
                    { name: 'USA Powerlifting Coach', year: 2016 },
                ]),
                hourlyRate: 75.0,
                isActive: true,
                availableSlots: JSON.stringify({
                    monday: ['06:00-12:00', '16:00-20:00'],
                    tuesday: ['06:00-12:00', '16:00-20:00'],
                    wednesday: ['06:00-12:00', '16:00-20:00'],
                    thursday: ['06:00-12:00', '16:00-20:00'],
                    friday: ['06:00-12:00', '16:00-20:00'],
                    saturday: ['08:00-14:00'],
                }),
            },
        });

        // Coach 2: Yoga & Flexibility
        const coach2User = await prisma.user.upsert({
            where: { email: 'sarah.johnson@gym.com' },
            update: {},
            create: {
                email: 'sarah.johnson@gym.com',
                password: hashedPassword,
                firstName: 'Sarah',
                lastName: 'Johnson',
                role: 'coach',
                phone: '+1234567891',
                isVerified: true,
            },
        });

        const coach2 = await prisma.coach.upsert({
            where: { userId: coach2User.id },
            update: {},
            create: {
                userId: coach2User.id,
                specializations: JSON.stringify(['Yoga', 'Pilates', 'Flexibility', 'Mindfulness']),
                bio: 'Registered Yoga Teacher (RYT-500) specializing in Vinyasa and Restorative Yoga. Passionate about helping clients improve flexibility and mental wellness.',
                certifications: JSON.stringify([
                    { name: 'RYT-500 Yoga Alliance', year: 2015 },
                    { name: 'Pilates Instructor Certification', year: 2017 },
                ]),
                hourlyRate: 60.0,
                isActive: true,
                availableSlots: JSON.stringify({
                    monday: ['07:00-11:00', '17:00-20:00'],
                    wednesday: ['07:00-11:00', '17:00-20:00'],
                    friday: ['07:00-11:00', '17:00-20:00'],
                    saturday: ['09:00-15:00'],
                    sunday: ['09:00-13:00'],
                }),
            },
        });

        // Coach 3: CrossFit & HIIT
        const coach3User = await prisma.user.upsert({
            where: { email: 'mike.rodriguez@gym.com' },
            update: {},
            create: {
                email: 'mike.rodriguez@gym.com',
                password: hashedPassword,
                firstName: 'Mike',
                lastName: 'Rodriguez',
                role: 'coach',
                phone: '+1234567892',
                isVerified: true,
            },
        });

        const coach3 = await prisma.coach.upsert({
            where: { userId: coach3User.id },
            update: {},
            create: {
                userId: coach3User.id,
                specializations: JSON.stringify(['CrossFit', 'HIIT', 'Functional Training', 'Weight Loss']),
                bio: 'CrossFit Level 2 Trainer with expertise in high-intensity functional movements. Specializes in helping clients achieve their weight loss and conditioning goals.',
                certifications: JSON.stringify([
                    { name: 'CrossFit Level 2 Trainer', year: 2018 },
                    { name: 'NASM-CPT', year: 2016 },
                ]),
                hourlyRate: 70.0,
                isActive: true,
                availableSlots: JSON.stringify({
                    monday: ['05:00-10:00', '17:00-21:00'],
                    tuesday: ['05:00-10:00', '17:00-21:00'],
                    wednesday: ['05:00-10:00', '17:00-21:00'],
                    thursday: ['05:00-10:00', '17:00-21:00'],
                    friday: ['05:00-10:00', '17:00-21:00'],
                }),
            },
        });

        // Coach 4: Nutrition & Wellness
        const coach4User = await prisma.user.upsert({
            where: { email: 'emily.chen@gym.com' },
            update: {},
            create: {
                email: 'emily.chen@gym.com',
                password: hashedPassword,
                firstName: 'Emily',
                lastName: 'Chen',
                role: 'coach',
                phone: '+1234567893',
                isVerified: true,
            },
        });

        const coach4 = await prisma.coach.upsert({
            where: { userId: coach4User.id },
            update: {},
            create: {
                userId: coach4User.id,
                specializations: JSON.stringify(['Nutrition', 'Weight Management', 'Sports Nutrition', 'Wellness Coaching']),
                bio: 'Registered Dietitian and Certified Nutrition Specialist. Helps clients optimize their nutrition for performance, health, and body composition goals.',
                certifications: JSON.stringify([
                    { name: 'Registered Dietitian (RD)', year: 2013 },
                    { name: 'Certified Nutrition Specialist (CNS)', year: 2015 },
                ]),
                hourlyRate: 80.0,
                isActive: true,
                availableSlots: JSON.stringify({
                    tuesday: ['09:00-17:00'],
                    thursday: ['09:00-17:00'],
                    saturday: ['10:00-14:00'],
                }),
            },
        });

        console.log('✅ Created 4 coaches');

        // Create coaching packages
        const packages = [
            // 1-on-1 Personal Training Packages
            {
                name: '1-on-1 Personal Training - Single Session',
                description: 'One personalized training session with a certified coach. Perfect for trying out personal training or occasional guidance.',
                packageType: 'one_on_one',
                sessionsIncluded: 1,
                sessionDuration: 60,
                validityDays: 30,
                maxParticipants: 1,
                price: 75.0,
                studentPrice: 60.0,
                coachId: null,
                isCoachSpecific: false,
                isActive: true,
            },
            {
                name: '1-on-1 Personal Training - 5 Sessions',
                description: 'Five personalized training sessions. Great for building a foundation and seeing real progress.',
                packageType: 'one_on_one',
                sessionsIncluded: 5,
                sessionDuration: 60,
                validityDays: 60,
                maxParticipants: 1,
                price: 350.0,
                studentPrice: 280.0,
                coachId: null,
                isCoachSpecific: false,
                isActive: true,
            },
            {
                name: '1-on-1 Personal Training - 10 Sessions',
                description: 'Ten personalized training sessions. Best value for committed clients looking for transformation.',
                packageType: 'one_on_one',
                sessionsIncluded: 10,
                sessionDuration: 60,
                validityDays: 90,
                maxParticipants: 1,
                price: 650.0,
                studentPrice: 520.0,
                coachId: null,
                isCoachSpecific: false,
                isActive: true,
            },

            // Strength Training with John Smith
            {
                name: 'Strength Training with John Smith - 8 Sessions',
                description: 'Specialized strength training program with our powerlifting expert. Includes personalized programming and form coaching.',
                packageType: 'one_on_one',
                sessionsIncluded: 8,
                sessionDuration: 60,
                validityDays: 60,
                maxParticipants: 1,
                price: 600.0,
                studentPrice: 480.0,
                coachId: coach1.id,
                isCoachSpecific: true,
                isActive: true,
            },

            // Yoga with Sarah Johnson
            {
                name: 'Yoga & Flexibility - 4 Sessions',
                description: 'Four yoga sessions with Sarah Johnson. Improve flexibility, reduce stress, and enhance mind-body connection.',
                packageType: 'one_on_one',
                sessionsIncluded: 4,
                sessionDuration: 60,
                validityDays: 45,
                maxParticipants: 1,
                price: 240.0,
                studentPrice: 200.0,
                coachId: coach2.id,
                isCoachSpecific: true,
                isActive: true,
            },

            // Group Fitness Classes
            {
                name: 'Group HIIT Class - 10 Sessions',
                description: 'High-intensity interval training in a motivating group setting. Max 8 participants per class.',
                packageType: 'group',
                sessionsIncluded: 10,
                sessionDuration: 45,
                validityDays: 60,
                maxParticipants: 8,
                price: 200.0,
                studentPrice: 160.0,
                coachId: coach3.id,
                isCoachSpecific: true,
                isActive: true,
            },

            // Nutrition Consultation
            {
                name: 'Nutrition Consultation - 3 Sessions',
                description: 'Three comprehensive nutrition consultations including meal planning, macro tracking, and ongoing support.',
                packageType: 'one_on_one',
                sessionsIncluded: 3,
                sessionDuration: 60,
                validityDays: 90,
                maxParticipants: 1,
                price: 240.0,
                studentPrice: 200.0,
                coachId: coach4.id,
                isCoachSpecific: true,
                isActive: true,
            },

            // Monthly Plans
            {
                name: 'Monthly Unlimited Personal Training',
                description: 'Unlimited 1-on-1 sessions for one month. Book as many sessions as you want with any available coach.',
                packageType: 'monthly_plan',
                sessionsIncluded: 999, // Unlimited represented as high number
                sessionDuration: 60,
                validityDays: 30,
                maxParticipants: 1,
                price: 1200.0,
                studentPrice: 960.0,
                coachId: null,
                isCoachSpecific: false,
                isActive: true,
            },
        ];

        for (const pkg of packages) {
            await prisma.coachingPackage.create({
                data: pkg,
            });
        }

        console.log(`✅ Created ${packages.length} coaching packages`);
        console.log('🎉 Coaching seed data completed!');
    } catch (error) {
        console.error('❌ Error seeding coaching data:', error);
        throw error;
    }
}

// Run if called directly
seedCoaching()
    .then(() => {
        console.log('✅ Seeding completed successfully');
        prisma.$disconnect();
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        prisma.$disconnect();
        process.exit(1);
    });

export { seedCoaching };
