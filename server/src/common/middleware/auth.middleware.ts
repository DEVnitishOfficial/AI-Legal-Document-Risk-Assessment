import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../errors/AppError";
import { User } from "../../types/userType";

interface AuthRequest extends Request {
  user?: User; 
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Unauthorized request", 401);
    }

    const token = authHeader.split(" ")[1];

    const decodedToken = jwt.verify(token, env.JWT_SECRET);

    req.user = decodedToken as User;

    next();
  } catch (err) {
    next(new AppError("Invalid token", 401));
  }
};