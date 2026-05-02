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

export const createTextDocument = async (
  userId: number,
  content: string
) => {
  const query = `
    INSERT INTO documents (user_id, content, status)
    VALUES ($1, $2, 'pending')
    RETURNING *;
  `;

  const result = await pool.query(query, [userId, content]);
  return result.rows[0];
};