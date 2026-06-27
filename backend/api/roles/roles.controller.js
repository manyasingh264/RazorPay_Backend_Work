import { db } from '../../db/index.js';
import { employees, rms, apes } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * assignRoleController
 * CFO assigns a role (EMP | RM | APE) to a user identified by email.
 * Implementation: moves the user record into the target role table and
 * removes them from their current table.
 */
export const assignRoleController = async (req, res) => {
  const { user: email, role: targetRole } = req.body;

  try {
    // Locate user across all mutable role tables
    let userData = null;
    let currentRole = null;

    const [emp] = await db.select().from(employees).where(eq(employees.email, email));
    if (emp) { userData = emp; currentRole = 'EMP'; }

    if (!userData) {
      const [rm] = await db.select().from(rms).where(eq(rms.email, email));
      if (rm) { userData = rm; currentRole = 'RM'; }
    }

    if (!userData) {
      const [ape] = await db.select().from(apes).where(eq(apes.email, email));
      if (ape) { userData = ape; currentRole = 'APE'; }
    }

    if (!userData) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (currentRole === targetRole) {
      return res.status(400).json({
        status: 'error',
        message: `User already has the role ${targetRole}`,
      });
    }

    // Insert into target table
    if (targetRole === 'EMP') {
      await db.insert(employees).values({
        name: userData.name,
        email: userData.email,
        password: userData.password,
      });
    } else if (targetRole === 'RM') {
      await db.insert(rms).values({
        name: userData.name,
        email: userData.email,
        password: userData.password,
      });
    } else if (targetRole === 'APE') {
      await db.insert(apes).values({
        name: userData.name,
        email: userData.email,
        password: userData.password,
      });
    }

    // Remove from current table
    if (currentRole === 'EMP') {
      await db.delete(employees).where(eq(employees.email, email));
    } else if (currentRole === 'RM') {
      await db.delete(rms).where(eq(rms.email, email));
    } else if (currentRole === 'APE') {
      await db.delete(apes).where(eq(apes.email, email));
    }

    return res.status(200).json({
      status: 'success',
      message: `Role ${targetRole} assigned to ${email}`,
    });
  } catch (err) {
    console.error('assignRoleController error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
