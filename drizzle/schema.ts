import { sqliteTable, text, integer, index, unique } from "drizzle-orm/sqlite-core";

/**
 * Clients table - Clienti che acquistano l'abbonamento al gestionale
 * Questi sono i TUOI clienti che pagano per usare il software
 */
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name").notNull(), // Nome azienda cliente
  contactPerson: text("contactPerson"), // Referente
  phone: text("phone"),
  plan: text("plan", { enum: ["trial", "basic", "pro", "enterprise"] }).default("trial").notNull(),
  subscriptionStatus: text("subscriptionStatus", { enum: ["active", "suspended", "expired", "trial"] }).default("trial").notNull(),
  subscriptionExpiresAt: text("subscriptionExpiresAt"), // ISO date string
  maxUsers: integer("maxUsers").default(5).notNull(),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
  lastLoginAt: text("lastLoginAt"),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Users table - Utenti del gestionale (dipendenti del cliente)
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "user", "readonly"] }).default("user").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
  lastLoginAt: text("lastLoginAt"),
}, (table) => ({
  clientIdIdx: index("user_clientId_idx").on(table.clientId),
  uniqueEmailPerClient: unique().on(table.clientId, table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Companies table - Aziende clienti che inviano dipendenti ai corsi
 * Queste sono le aziende gestite DAL cliente nel suo gestionale
 */
export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  vatNumber: text("vatNumber"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  contactPerson: text("contactPerson"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("company_clientId_idx").on(table.clientId),
  uniqueVatPerClient: unique().on(table.clientId, table.vatNumber),
}));

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Instructors table - Docenti che tengono i corsi
 */
export const instructors = sqliteTable("instructors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  email: text("email"),
  phone: text("phone"),
  specialization: text("specialization"),
  hourlyRate: integer("hourlyRate"), // in centesimi
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("instructor_clientId_idx").on(table.clientId),
}));

export type Instructor = typeof instructors.$inferSelect;
export type InsertInstructor = typeof instructors.$inferInsert;

/**
 * Students table - Studenti iscritti ai corsi
 */
export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  fiscalCode: text("fiscalCode"),
  email: text("email"),
  phone: text("phone"),
  birthDate: text("birthDate"), // YYYY-MM-DD format
  birthPlace: text("birthPlace"),
  address: text("address"),
  companyId: integer("companyId").references(() => companies.id, { onDelete: "set null" }),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("student_clientId_idx").on(table.clientId),
  companyIdIdx: index("student_companyId_idx").on(table.companyId),
  uniqueFiscalCodePerClient: unique().on(table.clientId, table.fiscalCode),
}));

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * Courses table - Catalogo corsi disponibili (template)
 */
export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(),
  durationHours: integer("durationHours").notNull(),
  defaultPrice: integer("defaultPrice").notNull(), // in centesimi
  description: text("description"),
  certificateValidityMonths: integer("certificateValidityMonths"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("course_clientId_idx").on(table.clientId),
  uniqueCodePerClient: unique().on(table.clientId, table.code),
}));

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

/**
 * Course Editions table - Edizioni specifiche dei corsi (aule programmate)
 */
export const courseEditions = sqliteTable("courseEditions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  courseId: integer("courseId").notNull().references(() => courses.id, { onDelete: "cascade" }),
  startDate: text("startDate").notNull(), // YYYY-MM-DD
  endDate: text("endDate").notNull(), // YYYY-MM-DD
  location: text("location").notNull(),
  instructorId: integer("instructorId").references(() => instructors.id, { onDelete: "set null" }),
  maxParticipants: integer("maxParticipants").notNull(),
  price: integer("price").notNull(), // in centesimi
  customPrice: integer("customPrice"),
  dedicatedCompanyId: integer("dedicatedCompanyId").references(() => companies.id, { onDelete: "set null" }),
  instructor: text("instructor"), // Nome docente (legacy)
  status: text("status", { enum: ["scheduled", "ongoing", "completed", "cancelled"] }).default("scheduled").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("edition_clientId_idx").on(table.clientId),
  courseIdIdx: index("edition_courseId_idx").on(table.courseId),
  startDateIdx: index("edition_startDate_idx").on(table.startDate),
  statusIdx: index("edition_status_idx").on(table.status),
}));

export type CourseEdition = typeof courseEditions.$inferSelect;
export type InsertCourseEdition = typeof courseEditions.$inferInsert;

/**
 * Registrations table - Iscrizioni studenti alle edizioni corsi
 */
export const registrations = sqliteTable("registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  studentId: integer("studentId").notNull().references(() => students.id, { onDelete: "cascade" }),
  courseEditionId: integer("courseEditionId").notNull().references(() => courseEditions.id, { onDelete: "cascade" }),
  companyId: integer("companyId").references(() => companies.id, { onDelete: "set null" }),
  registrationDate: text("registrationDate").notNull().$defaultFn(() => new Date().toISOString()),
  status: text("status", { enum: ["confirmed", "pending", "cancelled"] }).default("confirmed").notNull(),
  priceApplied: integer("priceApplied").notNull(), // in centesimi
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("registration_clientId_idx").on(table.clientId),
  studentIdIdx: index("registration_studentId_idx").on(table.studentId),
  courseEditionIdIdx: index("registration_courseEditionId_idx").on(table.courseEditionId),
  uniqueRegistration: unique().on(table.studentId, table.courseEditionId),
}));

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

/**
 * Attendances table - Presenze giornaliere studenti alle lezioni
 */
export const attendances = sqliteTable("attendances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  registrationId: integer("registrationId").notNull().references(() => registrations.id, { onDelete: "cascade" }),
  studentId: integer("studentId").notNull().references(() => students.id, { onDelete: "cascade" }),
  courseEditionId: integer("courseEditionId").notNull().references(() => courseEditions.id, { onDelete: "cascade" }),
  attendanceDate: text("attendanceDate").notNull(), // YYYY-MM-DD
  status: text("status", { enum: ["present", "absent", "late", "justified"] }).default("present").notNull(),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("attendance_clientId_idx").on(table.clientId),
  registrationIdIdx: index("attendance_registrationId_idx").on(table.registrationId),
  attendanceDateIdx: index("attendance_attendanceDate_idx").on(table.attendanceDate),
  uniqueAttendance: unique().on(table.registrationId, table.attendanceDate),
}));

export type Attendance = typeof attendances.$inferSelect;
export type InsertAttendance = typeof attendances.$inferInsert;

/**
 * Invoices table - Log fatture generate
 */
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  courseEditionId: integer("courseEditionId").notNull().references(() => courseEditions.id, { onDelete: "cascade" }),
  companyId: integer("companyId").notNull().references(() => companies.id, { onDelete: "cascade" }),
  externalInvoiceId: text("externalInvoiceId"),
  invoiceNumber: text("invoiceNumber"),
  invoiceDate: text("invoiceDate").notNull(), // YYYY-MM-DD
  amount: integer("amount").notNull(), // in centesimi
  studentsCount: integer("studentsCount").notNull(),
  status: text("status", { enum: ["draft", "sent", "paid", "cancelled"] }).default("sent").notNull(),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("invoice_clientId_idx").on(table.clientId),
  courseEditionIdIdx: index("invoice_courseEditionId_idx").on(table.courseEditionId),
  companyIdIdx: index("invoice_companyId_idx").on(table.companyId),
}));

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Audit Log table - Log delle azioni per compliance e sicurezza
 */
export const auditLog = sqliteTable("auditLog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  userId: integer("userId").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
  resourceType: text("resourceType").notNull(), // 'student', 'course', 'registration', etc.
  resourceId: integer("resourceId"),
  details: text("details"), // JSON string with additional details
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("audit_clientId_idx").on(table.clientId),
  userIdIdx: index("audit_userId_idx").on(table.userId),
  actionIdx: index("audit_action_idx").on(table.action),
  createdAtIdx: index("audit_createdAt_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
