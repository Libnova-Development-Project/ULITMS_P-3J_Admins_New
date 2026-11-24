const { z } = require('zod');

const positiveInt = z.coerce.number().int().positive();

module.exports = {
  idParam: z.object({ id: positiveInt }),
  register: z.object({
    student_number: z.string().trim().min(3).max(20),
    first_name: z.string().trim().min(1).max(50),
    last_name: z.string().trim().min(1).max(50),
    email: z.string().trim().email().max(100),
    password: z.string().min(8).max(72),
    course: z.string().trim().max(100).optional(),
    year_level: z.coerce.number().int().min(1).max(6).optional(),
  }).strict(),
  login: z.object({ email: z.string().trim().email(), password: z.string().min(1).max(72) }).strict(),
  bookSearch: z.object({
    keyword: z.string().trim().max(200).optional().default(''),
    category_id: z.union([z.string().regex(/^\d+$/).transform(Number), z.number()]).optional(),
  }).strict(),
  bookCreate: z.object({
    isbn: z.string().trim().max(20).optional(),
    title: z.string().trim().min(1).max(200),
    author: z.string().trim().min(1).max(150),
    publisher: z.string().trim().max(100).optional(),
    publication_year: z.coerce.number().int().min(1400).max(2100).optional(),
    category_id: positiveInt.optional(),
    total_copies: z.coerce.number().int().min(0).max(100000).optional().default(1),
  }).strict(),
  bookUpdate: z.object({
    isbn: z.string().trim().max(20).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    author: z.string().trim().min(1).max(150).optional(),
    publisher: z.string().trim().max(100).optional(),
    publication_year: z.coerce.number().int().min(1400).max(2100).optional(),
    category_id: positiveInt.nullable().optional(),
    total_copies: z.coerce.number().int().min(0).max(100000).optional(),
  }).strict(),
  borrowCreate: z.object({ book_id: positiveInt }).strict(),
  decision: z.object({
    decision: z.enum(['approve', 'reject']),
    note: z.string().trim().max(500).nullish(),
    loan_days: z.coerce.number().int().min(1).max(30).default(7),
  }).strict(),
  sessionStart: z.object({
    unit_id: positiveInt,
    purpose: z.string().trim().max(200).optional(),
  }).strict(),
  damageCreate: z.object({
    unit_id: positiveInt.optional(),
    peripheral_id: positiveInt.optional(),
    damage_type: z.string().trim().min(1).max(50),
    description: z.string().trim().min(1),
    severity: z.enum(['minor', 'moderate', 'severe']).optional(),
  }).strict().refine((v) => v.unit_id || v.peripheral_id, { message: 'Select a unit or peripheral' }),
  damageResolve: z.object({
    status: z.enum(['resolved', 'closed']),
    notes: z.string().trim().max(1000).optional(),
    new_condition: z.enum(['good', 'damaged', 'repair_needed', 'missing']).optional(),
  }).strict(),
  userUpdate: z.object({
    first_name: z.string().trim().min(1).max(50).optional(),
    last_name: z.string().trim().min(1).max(50).optional(),
    email: z.string().trim().email().max(100).optional(),
    contact_number: z.string().trim().max(20).optional(),
    course: z.string().trim().max(100).optional(),
    year_level: z.coerce.number().int().min(1).max(6).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }).strict(),
  auditQuery: z.object({
    table: z.enum(['users', 'books', 'borrow_transactions', 'elibrary_sessions', 'damage_reports', 'notifications']).optional(),
    record_id: z.coerce.number().int().positive().optional(),
    operation: z.enum(['INSERT', 'UPDATE', 'DELETE']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }).strict(),
};
