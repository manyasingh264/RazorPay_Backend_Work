import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import onboardingRouter from './backend/api/onboarding/onboarding.router.js';
import employeesRouter from './backend/api/employees/employees.router.js';
import reimbursementRouter from './backend/api/reimbursement/reimbursement.router.js';
import rolesRouter from './backend/api/roles/roles.router.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7002;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/rest/onboardings', onboardingRouter);
app.use('/rest/employees', employeesRouter);
app.use('/rest/reimbursements', reimbursementRouter);
app.use('/rest/roles', rolesRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
