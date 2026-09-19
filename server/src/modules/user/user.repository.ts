import { prisma } from "../../config/db";

interface CreateUserInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
}

export const createUser = async ({ name, email, phone, password }: CreateUserInput) => {
  return prisma.user.create({
    data: { name, email, phone, password },
  });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserByPhone = async (phone: string) => {
  return prisma.user.findUnique({ where: { phone } });
};

export const findUserById = async (id: number) => {
  return prisma.user.findUnique({ where: { id } });
};