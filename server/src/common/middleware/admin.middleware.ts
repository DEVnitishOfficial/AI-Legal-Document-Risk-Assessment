import { Response, NextFunction } from "express";
import { prisma } from "../../config/db";
import { AppError } from "../errors/AppError";

// Use after authMiddleware. The role is re-read from the database on every
// call — never taken from the JWT, which lives 7 days — so demoting an admin
// takes effect immediately.
export const requireAdmin = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError("Unauthorized request", 401);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== "ADMIN") {
      throw new AppError("Admin access required", 403);
    }

    next();
  } catch (err) {
    next(err);
  }
};
