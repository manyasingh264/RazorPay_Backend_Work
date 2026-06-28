import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import onboardingRouter from './api/onboarding/onboarding.router.js';
import employeesRouter from './api/employees/employees.router.js';
import reimbursementRouter from './api/reimbursement/reimbursement.router.js';
import rolesRouter from './api/roles/roles.router.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7002;

// Middleware
// Allowed CORS origins — cookies require explicit origin, NOT '*'
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,            // production frontend (set on Render)
  'http://localhost:3000',             // npx serve local dev
  'http://localhost:5500',             // VS Code Live Server
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
].filter(Boolean); // remove undefined if FRONTEND_URL not set

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,   // REQUIRED for cookie-based auth
}));
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
