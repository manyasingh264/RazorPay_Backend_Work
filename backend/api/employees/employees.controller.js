import { db } from '../../db/index.js';
import { employees, rms, apes } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * listEmployeeController
 * Role-filtered employee listing:
 *   - RM  : only their own EMPs (rm_id = curr user)
 *   - APE : all EMPs and RMs
 *   - CFO : all EMPs, RMs, and APEs
 */
export const listEmployeeController = async (req, res) => {
  const { userId, role } = req.user;

  try {
    let users = [];

    if (role === 'RM') {
      const emps = await db
        .select()
        .from(employees)
        .where(eq(employees.rm_id, userId));

      users = emps.map((e) => ({
        userId: e.emp_id,
        name: e.name,
        email: e.email,
        role: 'EMP',
      }));
    } else if (role === 'APE') {
      const [empList, rmList] = await Promise.all([
        db.select().from(employees),
        db.select().from(rms),
      ]);

      users = [
        ...empList.map((e) => ({ userId: e.emp_id, name: e.name, email: e.email, role: 'EMP' })),
        ...rmList.map((r) => ({ userId: r.rm_id, name: r.name, email: r.email, role: 'RM' })),
      ];
    } else if (role === 'CFO') {
      const [empList, rmList, apeList] = await Promise.all([
        db.select().from(employees),
        db.select().from(rms),
        db.select().from(apes),
      ]);

      users = [
        ...empList.map((e) => ({ userId: e.emp_id, name: e.name, email: e.email, role: 'EMP' })),
        ...rmList.map((r) => ({ userId: r.rm_id, name: r.name, email: r.email, role: 'RM' })),
        ...apeList.map((a) => ({ userId: a.ape_id, name: a.name, email: a.email, role: 'APE' })),
      ];
    }

    return res.status(200).json({ status: 'success', data: { users } });
  } catch (err) {
    console.error('listEmployeeController error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * assignController
 * CFO assigns an EMP to an RM by setting employees.rm_id = userID_RM.
 */
export const assignController = async (req, res) => {
  const { userID_EMP, userID_RM } = req.body;

  try {
    const [emp] = await db.select().from(employees).where(eq(employees.emp_id, userID_EMP));
    if (!emp) {
      return res.status(404).json({ status: 'error', message: 'Employee not found' });
    }

    const [rm] = await db.select().from(rms).where(eq(rms.rm_id, userID_RM));
    if (!rm) {
      return res.status(404).json({ status: 'error', message: 'Reporting Manager not found' });
    }

    await db
      .update(employees)
      .set({ rm_id: userID_RM })
      .where(eq(employees.emp_id, userID_EMP));

    return res.status(200).json({
      status: 'success',
      message: 'Employee successfully assigned to Reporting Manager',
    });
  } catch (err) {
    console.error('assignController error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * deleteController
 * CFO removes the assignment between an EMP and RM (sets employees.rm_id = null).
 */
export const deleteController = async (req, res) => {
  const { userID_EMP, userID_RM } = req.body;

  try {
    const [emp] = await db.select().from(employees).where(eq(employees.emp_id, userID_EMP));
    if (!emp) {
      return res.status(404).json({ status: 'error', message: 'Employee not found' });
    }

    if (emp.rm_id !== userID_RM) {
      return res.status(400).json({
        status: 'error',
        message: 'No assignment exists between this Employee and Reporting Manager',
      });
    }

    await db
      .update(employees)
      .set({ rm_id: null })
      .where(eq(employees.emp_id, userID_EMP));

    return res.status(200).json({
      status: 'success',
      message: 'Assignment removed successfully',
    });
  } catch (err) {
    console.error('deleteController error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
