import { Request, Response, NextFunction } from "express";
import { createTextDoc, uploadDocument } from "./document.service";
import { User } from "../../types/userType";

interface docRequest extends Request {
  user?: User; 
}

export const uploadDoc = async (req: docRequest, res: Response, next: NextFunction) => {
  try {

    if(!req.user || !req.user.id) {
      throw new Error("User not authenticated");
    }

    const userId: number = req.user.id;

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

  export const createTextDocumentController = async (req: any, res:Response, next:NextFunction) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;

    const result = await createTextDoc(userId, content);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};