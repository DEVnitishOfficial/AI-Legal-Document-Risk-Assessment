import { pool } from "../../config/db";

export const createAnalysis = async (
    documentId: number,
    summary: string,
    riskLevel: string
) => {
    const query = `
    INSERT INTO analyses (document_id, summary, risk_level)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

    const result = await pool.query(query, [
        documentId,
        summary,
        riskLevel,
    ]);

    return result.rows[0];
};

export const getDocumentById = async (documentId: number) => {
    const query = `
     SELECT * FROM documents WHERE id = $1;
  `;

  const result = await pool.query(query, [documentId]);
  return result.rows[0];
};