import { sqliteTable, text, integer, index, unique } from "drizzle-orm/sqlite-core";

/**
 * Clients table - Clienti che acquistano l'abbonamento al gestionale
 */
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contactPerson"),
  phone: text("phone"),
  plan: text("plan", { enum: ["trial", "basic", "pro", "enterprise"] }).default("trial").notNull(),
  subscriptionStatus: text("subscriptionStatus", { enum: ["active", "suspended", "expired", "trial"] }).default("trial").notNull(),
  subscriptionExpiresAt: text("subscriptionExpiresAt"),
  maxUsers: integer("maxUsers").default(5).notNull(),
  lastLoginAt: text("lastLoginAt"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});

/**
 * Users table - Utenti (dipendenti) del cliente
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "user", "readonly"] }).default("user").notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  lastLoginAt: text("lastLoginAt"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("user_clientId_idx").on(table.clientId),
  uniqueEmailPerClient: unique().on(table.clientId, table.email),
}));

/**
 * Agents table - Agenti commerciali
 */
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("agent_clientId_idx").on(table.clientId),
}));

/**
 * Companies table - Aziende clienti
 */
export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  vatNumber: text("vatNumber"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  cap: text("cap"),
  contactPerson: text("contactPerson"),
  atecoCode: text("atecoCode"),
  agentId: integer("agentId").references(() => agents.id, { onDelete: "set null" }),
  uniqueCode: text("uniqueCode"), // Codice univoco fatturazione
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("company_clientId_idx").on(table.clientId),
  uniqueVatPerClient: unique().on(table.clientId, table.vatNumber),
}));

/**
 * Instructors table - Docenti
 */
export const instructors = sqliteTable("instructors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  email: text("email"),
  phone: text("phone"),
  hourlyRate: integer("hourlyRate"),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("instructor_clientId_idx").on(table.clientId),
}));

/**
 * Students table - Studenti
 */
export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  fiscalCode: text("fiscalCode").notNull(),
  email: text("email"),
  phone: text("phone"),
  birthDate: text("birthDate"),
  birthPlace: text("birthPlace"),
  gender: text("gender"),
  address: text("address"),
  companyId: integer("companyId").references(() => companies.id, { onDelete: "set null" }),
  jobTitle: text("jobTitle"),
  atecoCode: text("atecoCode"),
  agentId: integer("agentId").references(() => agents.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("student_clientId_idx").on(table.clientId),
  uniqueFiscalCodePerClient: unique().on(table.clientId, table.fiscalCode),
}));

/**
 * Services/Courses table - Catalogo corsi
 */
export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  code: text("code").notNull(),
  type: text("type"),
  durationHours: integer("durationHours").notNull(),
  defaultPrice: integer("defaultPrice").notNull(),
  certificateValidityMonths: integer("certificateValidityMonths").notNull(),
  description: text("description"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("course_clientId_idx").on(table.clientId),
}));

/**
 * Course Editions table - Edizioni corsi
 */
export const courseEditions = sqliteTable("courseEditions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  courseId: integer("courseId").notNull().references(() => courses.id, { onDelete: "cascade" }),
  startDate: text("startDate").notNull(),
  endDate: text("endDate").notNull(),
  location: text("location").notNull(),
  instructorId: integer("instructorId").references(() => instructors.id, { onDelete: "set null" }),
  maxParticipants: integer("maxParticipants").notNull(),
  minParticipants: integer("minParticipants").default(1),
  price: integer("price").notNull(),
  status: text("status", { enum: ["scheduled", "ongoing", "completed", "cancelled"] }).default("scheduled").notNull(),
  isDedicated: integer("isDedicated", { mode: "boolean" }).default(false),
  dedicatedCompanyId: integer("dedicatedCompanyId").references(() => companies.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("edition_clientId_idx").on(table.clientId),
}));

/**
 * Registrations table - Iscrizioni
 */
export const registrations = sqliteTable("registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  studentId: integer("studentId").notNull().references(() => students.id, { onDelete: "cascade" }),
  courseEditionId: integer("courseEditionId").notNull().references(() => courseEditions.id, { onDelete: "cascade" }),
  companyId: integer("companyId").references(() => companies.id, { onDelete: "set null" }),
  registrationDate: text("registrationDate").notNull().$defaultFn(() => new Date().toISOString()),
  status: text("status", { enum: ["pending", "confirmed", "completed", "cancelled"] }).default("pending").notNull(),
  priceApplied: integer("priceApplied").notNull(),
  notes: text("notes"),
  invoiceId: text("invoiceId"),
  invoiceStatus: text("invoiceStatus", { enum: ["none", "draft", "sent", "paid", "partial"] }).default("none"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("reg_clientId_idx").on(table.clientId),
  uniqueReg: unique().on(table.studentId, table.courseEditionId),
}));

/**
 * Attendance table - Presenze
 */
export const attendances = sqliteTable("attendances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  registrationId: integer("registrationId").notNull().references(() => registrations.id, { onDelete: "cascade" }),
  attendanceDate: text("attendanceDate").notNull(),
  status: text("status", { enum: ["present", "absent", "late", "justified"] }).default("present").notNull(),
  hoursAttended: integer("hoursAttended").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("att_clientId_idx").on(table.clientId),
}));

/**
 * Email Settings
 */
export const emailSettings = sqliteTable("emailSettings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  host: text("host"),
  port: integer("port"),
  username: text("username"),
  password: text("password"),
  fromEmail: text("fromEmail"),
  fromName: text("fromName"),
  useSsl: integer("useSsl", { mode: "boolean" }).default(true),
  resendApiKey: text("resendApiKey"),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});
