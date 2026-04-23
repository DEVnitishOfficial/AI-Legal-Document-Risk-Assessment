import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../errors/AppError";
import { User } from "../../types/userType";

interface AuthRequest extends Request {
  user?: User; 
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log("Auth middleware invoked");
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Unauthorized request", 401);
    }

    const token = authHeader.split(" ")[1];

    console.log('coming token', token)

    const decodedToken = jwt.verify(token, env.JWT_SECRET);
    console.log('decoded token>>>>', decodedToken)

    req.user = decodedToken as User;
    console.log('User attached to request:', req.user);
    console.log('Auth middleware completed successfully');
    next();
  } catch (err) {
    console.log('Error in auth middleware:', err);
    next(new AppError("Invalid token", 401));
  }
};