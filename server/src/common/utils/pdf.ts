import fs from "fs";
const pdfParse = require("pdf-parse");

export const extractTextFromPDF = async (filePath: string) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};