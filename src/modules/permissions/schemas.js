import { z } from "zod";

export const createPermissionSchema = z.object({
  body: z.object({
    reason: z.string().min(5),
    departureTime: z.string().datetime(),
    estimatedReturnTime: z.string().datetime().nullable().optional(),
    type: z
      .enum(["keluar_masuk", "pulang_tidak_kembali"])
      .default("keluar_masuk"),
    category: z
      .enum(["sakit", "keperluan", "dispensasi", "lainnya"])
      .default("keperluan"),
    nomorPolisi: z.string().trim().max(32).optional().nullable(),
  }),
  query: z.any(),
  params: z.any(),
});

export const actionSchema = z.object({
  body: z.object({
    note: z.string().max(255).optional(),
    reason: z.string().max(255).optional(),
    nomorPolisi: z.string().trim().max(32).optional().nullable(),
  }),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});

export const commentSchema = z.object({
  body: z.object({ text: z.string().trim().min(1).max(1000) }),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});

export const idParamSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});
