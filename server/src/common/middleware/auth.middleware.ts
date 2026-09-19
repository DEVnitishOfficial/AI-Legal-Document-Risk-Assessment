import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../errors/AppError";

// Verifies the JWT and attaches its payload as req.user. Deliberately logs
// nothing about the request: the Authorization header and token are secrets.
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Unauthorized request", 401);
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, env.JWT_SECRET);

    req.user = decodedToken as unknown as Express.User;
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError("Invalid token", 401));
  }
};
