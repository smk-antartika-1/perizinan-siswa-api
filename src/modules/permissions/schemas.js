import { z } from "zod";

export const createPermissionSchema = z.object({
  body: z.object({
    reason: z.string().min(5),
    departureTime: z.string().datetime(),
    estimatedReturnTime: z.string().datetime().nullable().optional(),
    type: z.enum(["keluar_masuk", "pulang_tidak_kembali"]).default("keluar_masuk"),
  }),
  query: z.any(),
  params: z.any(),
});

export const actionSchema = z.object({
  body: z.object({
    note: z.string().max(255).optional(),
    reason: z.string().max(255).optional(),
  }),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});
