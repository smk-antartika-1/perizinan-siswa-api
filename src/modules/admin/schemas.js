import { z } from "zod";

const roleEnum = z.enum(["siswa", "wali_kelas", "guru_piket", "security", "admin"]);
const optionalString = z.string().trim().optional().nullable();

export const listUsersSchema = z.object({
  body: z.any(),
  query: z.object({
    role: z.union([roleEnum, z.literal("all")]).optional(),
    classId: z.string().uuid().optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(["name", "username", "role", "created_at"]).default("role"),
    order: z.enum(["asc", "desc"]).default("asc"),
  }),
  params: z.any(),
});

export const userStatsSchema = z.object({
  body: z.any(),
  query: z.object({
    classId: z.string().uuid().optional(),
  }),
  params: z.any(),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    username: z.string().trim().min(1),
    password: z.string().min(6),
    role: roleEnum,
    email: optionalString,
    nis: optionalString,
    nip: optionalString,
    classId: z.string().uuid().optional().nullable(),
    kelas: optionalString,
    className: optionalString,
  }),
  query: z.any(),
  params: z.any(),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
    password: z.string().min(6).optional(),
    role: roleEnum.optional(),
    email: optionalString,
    nis: optionalString,
    nip: optionalString,
    classId: z.string().uuid().optional().nullable(),
    kelas: optionalString,
    className: optionalString,
    isActive: z.boolean().optional(),
  }),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});

export const deleteUserSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});

export const templateSchema = z.object({
  body: z.any(),
  query: z.object({ role: roleEnum.default("siswa") }),
  params: z.any(),
});

export const exportUsersSchema = z.object({
  body: z.any(),
  query: z.object({ role: z.union([roleEnum, z.literal("all")]).default("all") }),
  params: z.any(),
});

export const importUsersSchema = z.object({
  body: z.any(),
  query: z.object({ role: roleEnum.default("siswa") }),
  params: z.any(),
});
