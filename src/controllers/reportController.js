import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

/**
 * Generate Income Report PDF
 */
export const generateIncomeReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query; // type: daily, weekly, monthly, yearly

        let where = { status: 'approved' };
        let title = 'Income Report';

        const now = new Date();
        let start = startDate ? new Date(startDate) : new Date();
        let end = endDate ? new Date(endDate) : new Date();

        if (type === 'daily') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            title = `Daily Income Report (${start.toLocaleDateString()})`;
        } else if (type === 'weekly') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            title = `Weekly Income Report (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
        } else if (type === 'monthly') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            title = `Monthly Income Report (${start.toLocaleString('default', { month: 'long', year: 'numeric' })})`;
        } else if (type === 'yearly') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
            title = `Yearly Income Report (${start.getFullYear()})`;
        }

        if (type) {
            where.updatedAt = {
                gte: start,
                lte: end
            };
        }

        const payments = await prisma.payment.findMany({
            where,
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Calculate totals
        const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
        const cashIncome = payments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amount, 0);
        const gcashIncome = payments.filter(p => p.paymentMethod === 'gcash').reduce((sum, p) => sum + p.amount, 0);

        // Create PDF
        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report-${type || 'custom'}-${Date.now()}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Campus One Gym', { align: 'center' });
        doc.fontSize(16).text(title, { align: 'center' });
        doc.moveDown();

        // Summary
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
        doc.text(`Total Income: PHP ${totalIncome.toFixed(2)}`);
        doc.text(`Cash: PHP ${cashIncome.toFixed(2)}`);
        doc.text(`GCash: PHP ${gcashIncome.toFixed(2)}`);
        doc.moveDown();

        // Table Header
        const tableTop = 250;
        const itemX = 50;
        const amountX = 300;
        const methodX = 400;
        const dateX = 480;

        doc.font('Helvetica-Bold');
        doc.text('Member', itemX, tableTop);
        doc.text('Plan', itemX + 100, tableTop);
        doc.text('Amount', amountX, tableTop);
        doc.text('Method', methodX, tableTop);
        doc.text('Date', dateX, tableTop);
        doc.moveDown();
        doc.font('Helvetica');

        let y = tableTop + 25;

        // Table Rows
        payments.forEach(payment => {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }

            const memberName = `${payment.user.firstName} ${payment.user.lastName}`;
            doc.text(memberName, itemX, y, { width: 90, ellipsis: true });
            doc.text(payment.planName, itemX + 100, y, { width: 140, ellipsis: true });
            doc.text(payment.amount.toFixed(2), amountX, y);
            doc.text(payment.paymentMethod, methodX, y);
            doc.text(new Date(payment.updatedAt).toLocaleDateString(), dateX, y);

            y += 20;
        });

        doc.end();

    } catch (error) {
        console.error('Error generating report:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate report',
                error: error.message
            });
        }
    }
};
