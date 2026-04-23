import { Request, Response, NextFunction } from "express";
import { uploadDocument } from "./document.service";
import { User } from "../../types/userType";

interface docRequest extends Request {
  user?: User; 
}

export const uploadDoc = async (req: docRequest, res: Response, next: NextFunction) => {
  console.log("Upload document controller invoked");
  try {
    console.log('Request user:', req.user);
    console.log('Request file:', req.file);

    if(!req.user || !req.user.id) {
      throw new Error("User not authenticated");
    }

    const userId: number = req.user.id;
    console.log('User ID from token:', userId);

    if (!req.file) {
      throw new Error("No file uploaded");
    }

    const result = await uploadDocument(userId, req.file.path);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error in uploadDoc controller:", err);
    next(err);
  }
};