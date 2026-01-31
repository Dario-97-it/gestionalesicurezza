import { sqliteTable, text, integer, index, unique } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

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
  riskCategory: text("riskCategory", { enum: ["low", "medium", "high"] }).default("low").notNull(), // Nuovo campo per 81/08
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
  specialization: text("specialization"),
  hourlyRate: integer("hourlyRate"),
  bio: text("bio"),
  notes: text("notes"),
  isActive: integer("isActive").default(1),
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
  jobRole: text("jobRole", { enum: ["operaio", "impiegato", "dirigente", "preposto", "altro"] }).default("altro"), // Mansione: Operaio, Impiegato, Dirigente, ecc.
  riskLevel: text("riskLevel", { enum: ["low", "medium", "high"] }).default("low"), // Livello Rischio per 81/08
  atecoCode: text("atecoCode"),
  agentId: integer("agentId").references(() => agents.id, { onDelete: "set null" }),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(), // Nuovo campo per disattivare studenti
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
  certificateValidityMonths: integer("certificateValidityMonths"), // Validità corso in mesi (facoltativo)

  hasPrerequisite: integer("hasPrerequisite", { mode: "boolean" }).default(false), // Se richiede corso prerequisito
  prerequisiteCourseId: integer("prerequisiteCourseId").references(() => courses.id, { onDelete: "set null" }), // Corso prerequisito
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
  location: text("location"), // Reso nullable - può essere 'Da definire'
  instructorId: integer("instructorId").references(() => instructors.id, { onDelete: "set null" }),
  instructor: text("instructor"), // Nome docente testuale (alternativo a instructorId)
  maxParticipants: integer("maxParticipants").notNull(),
  minParticipants: integer("minParticipants").default(1),
  price: integer("price").notNull(),
  customPrice: integer("customPrice"), // Prezzo personalizzato
  status: text("status", { enum: ["scheduled", "ongoing", "completed", "cancelled"] }).default("scheduled").notNull(),
  isDedicated: integer("isDedicated", { mode: "boolean" }).default(false),
  dedicatedCompanyId: integer("dedicatedCompanyId").references(() => companies.id, { onDelete: "set null" }),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(), // Nuovo campo per disattivare edizioni
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("edition_clientId_idx").on(table.clientId),
}));

export const courseEditionsRelations = relations(courseEditions, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseEditions.courseId],
    references: [courses.id],
  }),
  instructor: one(instructors, {
    fields: [courseEditions.instructorId],
    references: [instructors.id],
  }),
  sessions: many(editionSessions),
  registrations: many(registrations),
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
  status: text("status", { enum: ["pending", "confirmed", "completed", "failed", "cancelled"] }).default("pending").notNull(), // Aggiunto 'failed'
  priceApplied: integer("priceApplied").notNull(),
  certificateDate: text("certificateDate"), // Data rilascio attestato
  attendancePercent: integer("attendancePercent"), // Percentuale di presenze
  notes: text("notes"),
  invoiceId: text("invoiceId"),
  invoiceStatus: text("invoiceStatus", { enum: ["none", "draft", "sent", "paid", "partial"] }).default("none"),
  recommendedNextEditionId: integer("recommendedNextEditionId").references(() => courseEditions.id, { onDelete: "set null" }), // Prossimo corso consigliato (se bocciato)
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
  registrationId: integer("registrationId").references(() => registrations.id, { onDelete: "cascade" }),
  studentId: integer("studentId").references(() => students.id, { onDelete: "cascade" }),
  courseEditionId: integer("courseEditionId").references(() => courseEditions.id, { onDelete: "cascade" }),
  attendanceDate: text("attendanceDate").notNull(),
  signInTime: text("signInTime"), // Timestamp di entrata con firma
  signOutTime: text("signOutTime"), // Timestamp di uscita con firma
  signatureHash: text("signatureHash"), // Hash della firma digitale (es. OTP)
  signatureMethod: text("signatureMethod", { enum: ["manual", "otp", "qr_code"] }).default("manual"),
  status: text("status", { enum: ["present", "absent", "late", "justified"] }).default("present").notNull(), // Mantenuto per compatibilità
  hoursAttended: integer("hoursAttended"), // Mantenuto per compatibilità
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("att_clientId_idx").on(table.clientId),
}));

/**
 * Edition Sessions table - Sessioni giornaliere di un'edizione
 */
export const editionSessions = sqliteTable("editionSessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  editionId: integer("editionId").notNull().references(() => courseEditions.id, { onDelete: "cascade" }),
  sessionDate: text("sessionDate").notNull(),
  startTime: text("startTime").notNull(),
  endTime: text("endTime").notNull(),
  hours: integer("hours").notNull(),
  location: text("location"),
  notes: text("notes"),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("session_clientId_idx").on(table.clientId),
  editionIdIdx: index("session_editionId_idx").on(table.editionId),
}));

export const editionSessionsRelations = relations(editionSessions, ({ one }) => ({
  edition: one(courseEditions, {
    fields: [editionSessions.editionId],
    references: [courseEditions.id],
  }),
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

/**
 * Edition Company Prices table - Prezzi specifici per azienda in edizioni multi-aziendali
 */
export const editionCompanyPrices = sqliteTable("editionCompanyPrices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  editionId: integer("editionId").notNull().references(() => courseEditions.id, { onDelete: "cascade" }),
  companyId: integer("companyId").notNull().references(() => companies.id, { onDelete: "cascade" }),
  price: integer("price").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  clientIdIdx: index("edition_price_clientId_idx").on(table.clientId),
  uniquePrice: unique().on(table.editionId, table.companyId),
}));

export const editionCompanyPricesRelations = relations(editionCompanyPrices, ({ one }) => ({
  edition: one(courseEditions, {
    fields: [editionCompanyPrices.editionId],
    references: [courseEditions.id],
  }),
  company: one(companies, {
    fields: [editionCompanyPrices.companyId],
    references: [companies.id],
  }),
}));


/**
 * Edition Agent Prices table - Prezzi per agente nelle edizioni multi-aziendali
 */
export const editionAgentPrices = sqliteTable("edition_agent_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseEditionId: integer("course_edition_id").notNull().references(() => courseEditions.id, { onDelete: "cascade" }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  price: integer("price").notNull().default(0), // Prezzo in centesimi
  clientId: integer("clientId").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updatedAt").notNull().$defaultFn(() => new Date().toISOString()),
});
