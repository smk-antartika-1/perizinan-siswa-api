import { ZodError } from "zod";

export function validate(schema) {
  return async (req, _res, next) => {
    try {
      req.validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next({ status: 400, message: err.issues[0]?.message || "Validation error" });
      }
      return next(err);
    }
  };
}
