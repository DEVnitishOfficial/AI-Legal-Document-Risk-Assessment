import * as userRepo from "./user.repository";
import { AppError } from "../../common/errors/AppError";

export const registerUser = async (data: any) => {
  const existing = await userRepo.findUserByEmail(data.email);

  if (existing) {
    throw new AppError("User already exists", 400);
  }

  return userRepo.createUser(data.name, data.email, data.password);
};