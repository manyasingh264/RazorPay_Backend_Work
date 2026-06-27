import { pgTable, uuid, text, boolean, numeric, pgEnum } from 'drizzle-orm/pg-core';

// Status enum for reimbursements
export const reimbursementStatusEnum = pgEnum('reimbursement_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

// RM table must be defined before employees (employees FK references rms)
export const rms = pgTable('rms', {
  rm_id: uuid('rm_id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
});

export const apes = pgTable('apes', {
  ape_id: uuid('ape_id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
});

export const cfos = pgTable('cfos', {
  cfo_id: uuid('cfo_id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
});

export const employees = pgTable('employees', {
  emp_id: uuid('emp_id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  rm_id: uuid('rm_id').references(() => rms.rm_id), // NULL by default
});

export const reimbursements = pgTable('reimbursements', {
  id: uuid('id').defaultRandom().primaryKey(),
  emp_id: uuid('emp_id')
    .notNull()
    .references(() => employees.emp_id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount').notNull(),
  approved_by_rm: boolean('approved_by_rm').default(false),
  approved_by_ape: boolean('approved_by_ape').default(false),
  approved_by_cfo: boolean('approved_by_cfo').default(false),
  status: reimbursementStatusEnum('status').default('PENDING'),
});
