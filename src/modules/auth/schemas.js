import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    password: z.string().min(3),
  }),
  query: z.any(),
  params: z.any(),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(3),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6),
  }).refine((v) => v.newPassword === v.confirmPassword, "Konfirmasi password tidak cocok"),
  query: z.any(),
  params: z.any(),
});
