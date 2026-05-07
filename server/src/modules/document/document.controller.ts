import { Request, Response, NextFunction } from "express";
import { createTextDoc, uploadDocument } from "./document.service";
import { User } from "../../types/userType";

interface AuthRequest extends Request {
  user?: User;
}

export const uploadDoc = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const authReq = req as AuthRequest;

    if(!authReq.user || !authReq?.user?.id) {
      throw new Error("User not authenticated");
    }

    const userId: number = authReq.user?.id;

    if (!authReq.file) {
      throw new Error("No file uploaded");
    }

    const result = await uploadDocument(userId, authReq.file.path);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error in uploadDoc controller:", err);
    next(err);
  }
};

  export const createTextDocumentController = async (req: Request, res:Response, next:NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq?.user?.id;
    const { content } = req.body;

    const result = await createTextDoc(userId!, content);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};