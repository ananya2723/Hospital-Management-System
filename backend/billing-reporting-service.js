// Role 4: Invoicing, Idempotent Payments, CQRS Reporting, CSV & Notifications
// Extracted from server/server.js

const crypto = require('node:crypto');

function registerBillingAndReportingRoutes(app, db, authenticateToken, requireRole, sendRfc7807) {
  // Invoicing Endpoints
  app.get('/api/v1/bills', authenticateToken, requireRole('ADMIN', 'BILLING'), (req, res) => {
    res.json(db.bills);
  });

  app.post('/api/v1/bills', authenticateToken, requireRole('ADMIN', 'BILLING'), (req, res) => {
    const { appointmentId, patientId, patientName, items, branchId } = req.body;
    if (!patientId || !items || !items.length) {
      return sendRfc7807(res, 400, 'Validation Failed', 'patientId and at least one bill item required', req);
    }
    const totalAmount = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const newBill = {
      id: 'bill-' + crypto.randomUUID().slice(0, 8),
      appointmentId: appointmentId || null,
      patientId,
      patientName: patientName || 'Patient',
      items,
      totalAmount,
      paidAmount: 0,
      status: 'UNPAID',
      branchId: branchId || 101,
      createdAt: new Date().toISOString()
    };
    db.bills.unshift(newBill);
    res.status(201).json(newBill);
  });

  // Idempotent Payment Processing
  app.post('/api/v1/bills/:id/pay', authenticateToken, requireRole('ADMIN', 'BILLING'), (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      return sendRfc7807(res, 400, 'Bad Request', 'Header Idempotency-Key is required for payment processing', req);
    }

    const bill = db.bills.find(b => b.id === req.params.id);
    if (!bill) return sendRfc7807(res, 404, 'Not Found', 'Bill not found', req);

    // 1. Idempotency Cache Replay Check
    const existingPayment = db.payments.find(p => p.idempotencyKey === idempotencyKey);
    if (existingPayment) {
      return res.status(200).json({
        message: 'Idempotent replay: Payment already processed with this key',
        isDuplicateReplay: true,
        payment: existingPayment,
        bill
      });
    }

    // 2. Overpayment Bounds Guard
    const { amount = bill.totalAmount, paymentMethod = 'Card' } = req.body;
    const parsedAmount = Number(amount);
    const outstandingAmount = bill.totalAmount - bill.paidAmount;

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return sendRfc7807(res, 400, 'Validation Failed', 'amount must be a positive number', req);
    }
    if (parsedAmount > outstandingAmount) {
      return sendRfc7807(res, 400, 'Validation Failed', `amount exceeds the outstanding balance of ${outstandingAmount}`, req);
    }

    // 3. Process Payment & State Transition
    const payment = {
      id: 'pay-' + crypto.randomUUID().slice(0, 8),
      billId: bill.id,
      idempotencyKey,
      amount: parsedAmount,
      paymentMethod,
      status: 'SUCCESS',
      paidAt: new Date().toISOString()
    };

    db.payments.push(payment);
    bill.paidAmount += payment.amount;
    bill.status = (bill.paidAmount >= bill.totalAmount) ? 'PAID' : 'PARTIAL';

    // 4. Asynchronous Event Dispatch -> Notification Mailbox
    db.notifications.unshift({
      id: crypto.randomUUID(),
      recipientEmail: 'billing@hospital.com',
      notificationType: 'BILL_RECEIPT',
      subject: `Payment Receipt: ₹${payment.amount} Paid (Bill ${bill.id})`,
      body: `Payment of ₹${payment.amount} processed via ${paymentMethod}. Ref: ${payment.id}. Key: ${idempotencyKey}`,
      status: 'SENT',
      sentAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Payment processed successfully',
      isDuplicateReplay: false,
      payment,
      bill
    });
  });

  // Reporting & Analytics
  app.get('/api/v1/reports/kpis', authenticateToken, requireRole('ADMIN'), (req, res) => {
    const totalRevenue = db.payments.reduce((acc, p) => acc + p.amount, 0);
    const totalPatients = db.patients.filter(p => !p.deletedAt).length;
    const totalAppointments = db.appointments.length;
    const completedAppts = db.appointments.filter(a => a.status === 'COMPLETED').length;
    const noShowAppts = db.appointments.filter(a => a.status === 'NO_SHOW').length;

    const noShowRate = (completedAppts + noShowAppts > 0)
      ? ((noShowAppts / (completedAppts + noShowAppts)) * 100).toFixed(1)
      : '0.0';

    res.json({
      totalRevenue,
      totalPatients,
      totalAppointments,
      completedAppointments: completedAppts,
      noShowRatePercent: parseFloat(noShowRate),
      activeDoctors: db.doctors.length
    });
  });

  // Direct Streaming CSV Export
  app.get('/api/v1/reports/export.csv', authenticateToken, requireRole('ADMIN'), (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hms_enterprise_report.csv"');

    let csv = 'Report_Type,Entity_ID,Date,Actor,Amount,Status\n';
    db.payments.forEach(p => {
      csv += `Payment,${p.id},${p.paidAt},${p.paymentMethod},${p.amount},${p.status}\n`;
    });
    db.appointments.forEach(a => {
      csv += `Appointment,${a.id},${a.appointmentDate || a.bookedAt},${a.doctorName || 'Doctor'},${a.feeAtBooking || 500},${a.status}\n`;
    });

    res.send(csv);
  });

  // Notifications Outbox
  app.get('/api/v1/notifications', authenticateToken, (req, res) => {
    res.json(db.notifications);
  });
}

module.exports = {
  registerBillingAndReportingRoutes
};
