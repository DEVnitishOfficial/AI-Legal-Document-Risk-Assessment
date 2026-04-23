import { pool } from "../../config/db";

export const createDocument = async (
  userId: number,
  filePath: string
) => {
  const query = `
    INSERT INTO documents (user_id, file_path)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const result = await pool.query(query, [userId, filePath]);
  return result.rows[0];
};