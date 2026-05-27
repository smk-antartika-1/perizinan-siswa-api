import { z } from "zod";

export const createClassSchema = z.object({
  body: z.object({ name: z.string().trim().min(1).max(100) }),
  query: z.any(),
  params: z.any(),
});

export const updateClassSchema = z.object({
  body: z.object({ name: z.string().trim().min(1).max(100) }),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});

export const deleteClassSchema = z.object({
  body: z.any(),
  query: z.any(),
  params: z.object({ id: z.string().uuid() }),
});
