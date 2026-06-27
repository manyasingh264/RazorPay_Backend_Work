import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../backend/db/index.js';
import { employees, rms, apes, cfos } from '../../backend/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * registerController
 * Creates a new user in the `employees` table (default role: EMP).
 * Only org.com emails are accepted (enforced by the DTO).
 */
export const registerController = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check for duplicate email across all role tables
    const [existingEmp] = await db.select().from(employees).where(eq(employees.email, email));
    const [existingRM] = await db.select().from(rms).where(eq(rms.email, email));
    const [existingAPE] = await db.select().from(apes).where(eq(apes.email, email));
    const [existingCFO] = await db.select().from(cfos).where(eq(cfos.email, email));

    if (existingEmp || existingRM || existingAPE || existingCFO) {
      return res.status(409).json({
        status: 'error',
        message: 'Email is already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newEmployee] = await db
      .insert(employees)
      .values({ name, email, password: hashedPassword })
      .returning();

    return res.status(201).json({
      status: 'success',
      data: { userId: newEmployee.emp_id, role: 'EMP' },
    });
  } catch (err) {
    console.error('registerController error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * loginController
 * Searches all role tables to find the user, validates password,
 * then sets a signed JWT in an httpOnly cookie containing { userId, role }.
 */
export const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    let userId = null;
    let role = null;
    let hashedPassword = null;

    // Search employees table
    const [emp] = await db.select().from(employees).where(eq(employees.email, email));
    if (emp) {
      userId = emp.emp_id;
      role = 'EMP';
      hashedPassword = emp.password;
    }

    // Search rms table
    if (!userId) {
      const [rm] = await db.select().from(rms).where(eq(rms.email, email));
      if (rm) {
        userId = rm.rm_id;
        role = 'RM';
        hashedPassword = rm.password;
      }
    }

    // Search apes table
    if (!userId) {
      const [ape] = await db.select().from(apes).where(eq(apes.email, email));
      if (ape) {
        userId = ape.ape_id;
        role = 'APE';
        hashedPassword = ape.password;
      }
    }

    // Search cfos table
    if (!userId) {
      const [cfo] = await db.select().from(cfos).where(eq(cfos.email, email));
      if (cfo) {
        userId = cfo.cfo_id;
        role = 'CFO';
        hashedPassword = cfo.password;
      }
    }

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    // Sign JWT with userId and role
    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Set httpOnly cookie — protected endpoints read this automatically
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      status: 'success',
      data: { userId, role },
    });
  } catch (err) {
    console.error('loginController error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * logoutController
 * Clears the auth_token cookie.
 */
export const logoutController = (req, res) => {
  res.clearCookie('auth_token');
  return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};
