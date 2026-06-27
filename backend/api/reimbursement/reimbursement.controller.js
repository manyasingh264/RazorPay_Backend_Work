import { db } from '../../backend/db/index.js';
import { employees, reimbursements } from '../../backend/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * getReimbursement — GET /rest/reimbursements/
 * Role-filtered view:
 *   EMP  → their own reimbursements
 *   RM   → PENDING reimbursements from their EMPs
 *   APE  → reimbursements approved by RM but not yet by APE (PENDING at APE level)
 *   CFO  → reimbursements approved by APE
 */
export const getReimbursement = async (req, res) => {
  const { userId, role } = req.user;

  try {
    let result = [];

    if (role === 'EMP') {
      result = await db
        .select()
        .from(reimbursements)
        .where(eq(reimbursements.emp_id, userId));
    } else if (role === 'RM') {
      // Fetch EMPs under this RM
      const emps = await db
        .select({ emp_id: employees.emp_id })
        .from(employees)
        .where(eq(employees.rm_id, userId));

      const empIds = emps.map((e) => e.emp_id);

      if (empIds.length > 0) {
        result = await db
          .select()
          .from(reimbursements)
          .where(
            and(
              inArray(reimbursements.emp_id, empIds),
              eq(reimbursements.status, 'PENDING')
            )
          );
      }
    } else if (role === 'APE') {
      // Approved by RM but not yet by APE, still PENDING
      result = await db
        .select()
        .from(reimbursements)
        .where(
          and(
            eq(reimbursements.approved_by_rm, true),
            eq(reimbursements.approved_by_ape, false),
            eq(reimbursements.status, 'PENDING')
          )
        );
    } else if (role === 'CFO') {
      // Approved by APE (RM + APE both approved → APPROVED, or still waiting for CFO)
      result = await db
        .select()
        .from(reimbursements)
        .where(eq(reimbursements.approved_by_ape, true));
    }

    const formatted = result.map((r) => ({
      title: r.title,
      description: r.description,
      amount: r.amount,
      status: r.status,
    }));

    return res.status(200).json({
      status: 'success',
      data: { reimbursements: formatted },
    });
  } catch (err) {
    console.error('getReimbursement error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * getUserReimbursement — GET /rest/reimbursements/:userId
 * Access rules:
 *   - requesting user === params userId (own records)
 *   - requesting user is RM who is the FK of the params userId (EMP)
 *   - requesting user role is APE or CFO
 */
export const getUserReimbursement = async (req, res) => {
  const { userId, role } = req.user;
  const paramsUserId = req.params.userId;

  try {
    let hasAccess = false;

    if (userId === paramsUserId) {
      hasAccess = true;
    } else if (role === 'APE' || role === 'CFO') {
      hasAccess = true;
    } else if (role === 'RM') {
      // Check if RM is the foreign key of the target EMP
      const [emp] = await db
        .select()
        .from(employees)
        .where(and(eq(employees.emp_id, paramsUserId), eq(employees.rm_id, userId)));
      hasAccess = !!emp;
    }

    if (!hasAccess) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    const result = await db
      .select()
      .from(reimbursements)
      .where(eq(reimbursements.emp_id, paramsUserId));

    const formatted = result.map((r) => ({
      title: r.title,
      description: r.description,
      amount: r.amount,
      status: r.status,
    }));

    return res.status(200).json({
      status: 'success',
      data: { reimbursements: formatted },
    });
  } catch (err) {
    console.error('getUserReimbursement error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * postReimbursement — POST /rest/reimbursements/
 * EMP only — creates a new reimbursement with PENDING status.
 */
export const postReimbursement = async (req, res) => {
  const { userId } = req.user;
  const { title, description, amount } = req.body;

  try {
    const [newReimbursement] = await db
      .insert(reimbursements)
      .values({
        emp_id: userId,
        title,
        description,
        amount: amount.toString(), // numeric type stored as string in PG
        status: 'PENDING',
      })
      .returning();

    return res.status(201).json({
      status: 'success',
      data: {
        reimbursement: {
          id: newReimbursement.id,
          title: newReimbursement.title,
          description: newReimbursement.description,
          amount: newReimbursement.amount,
          status: newReimbursement.status,
        },
      },
    });
  } catch (err) {
    console.error('postReimbursement error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

/**
 * approveReimbursement — PATCH /rest/reimbursements/
 * Body: { userID: <reimbursement_id>, status: 'APPROVED' | 'REJECTED' }
 *
 * Role logic:
 *   RM  → can only act on EMPs under their management; sets approved_by_rm
 *   APE → sets approved_by_ape
 *   CFO → sets approved_by_cfo
 *
 * Status auto-promotion:
 *   APPROVED when approved_by_rm = true AND approved_by_ape = true
 *   REJECTED when status = REJECTED (any role can reject)
 */
export const approveReimbursement = async (req, res) => {
  const { userId, role } = req.user;
  const { userID: reimbursementId, status } = req.body;

  try {
    const [reimbursement] = await db
      .select()
      .from(reimbursements)
      .where(eq(reimbursements.id, reimbursementId));

    if (!reimbursement) {
      return res.status(404).json({ status: 'error', message: 'Reimbursement not found' });
    }

    // Cannot act on an already-finalized reimbursement
    if (reimbursement.status === 'APPROVED' || reimbursement.status === 'REJECTED') {
      return res.status(400).json({
        status: 'error',
        message: `Reimbursement is already ${reimbursement.status}`,
      });
    }

    let updateData = {};

    if (status === 'REJECTED') {
      updateData.status = 'REJECTED';
    } else {
      // status === 'APPROVED'
      if (role === 'RM') {
        // RM can only approve EMPs that belong to them
        const [emp] = await db
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.emp_id, reimbursement.emp_id),
              eq(employees.rm_id, userId)
            )
          );

        if (!emp) {
          return res.status(403).json({
            status: 'error',
            message: 'Forbidden: this Employee is not under your management',
          });
        }

        updateData.approved_by_rm = true;
      } else if (role === 'APE') {
        updateData.approved_by_ape = true;
      } else if (role === 'CFO') {
        updateData.approved_by_cfo = true;
      }

      // Auto-promote to APPROVED when both RM and APE have approved
      const finalApprovedByRM = updateData.approved_by_rm ?? reimbursement.approved_by_rm;
      const finalApprovedByAPE = updateData.approved_by_ape ?? reimbursement.approved_by_ape;

      if (finalApprovedByRM && finalApprovedByAPE) {
        updateData.status = 'APPROVED';
      }
    }

    await db
      .update(reimbursements)
      .set(updateData)
      .where(eq(reimbursements.id, reimbursementId));

    return res.status(200).json({
      status: 'success',
      message: 'Reimbursement updated successfully',
    });
  } catch (err) {
    console.error('approveReimbursement error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
