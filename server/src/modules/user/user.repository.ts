import { prisma } from "../../config/db";

export const createUser = async (name: string, email: string, password: string) => {
  console.log("Creating user with values:", { name, email });

  return prisma.user.create({
    data: { name, email, password },
  });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserById = async (id: number) => {
  return prisma.user.findUnique({ where: { id } });
};