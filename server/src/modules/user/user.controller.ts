import { Request, Response, NextFunction } from "express";
import * as userService from "./user.service";
import { loginUser } from "./user.service";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("Register endpoint hit with data:", req.body);
  try {
    const user = await userService.registerUser(req.body);
    console.log("Registered user:", user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  } catch (err) {
    console.error("Registration Error:", err); // ADD THIS LINE
    res.status(500).json({
      success: false,
      message: "Error registering user",
      data: null,
    });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loginUser(req.body.email, req.body.password);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};