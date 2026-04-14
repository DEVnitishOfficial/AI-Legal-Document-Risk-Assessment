import * as userRepo from "./user.repository";
import { AppError } from "../../common/errors/AppError";
import bcrypt from "bcrypt";
import { generateToken } from "../../common/utils/jwt";


export const registerUser = async (data: any) => {
  const existing = await userRepo.findUserByEmail(data.email);

  if (existing) {
    throw new AppError("User already exists", 400);
  }

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return userRepo.createUser(data.name, data.email, hashedPassword);
};


export const loginUser = async (email: string, password: string) => {
  const user = await userRepo.findUserByEmail(email);

  if (!user) {
    throw new AppError("User not registered, please register first", 404);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = generateToken({ id: user.id, email: user.email });

  return {
    user,
    token,
  };
};