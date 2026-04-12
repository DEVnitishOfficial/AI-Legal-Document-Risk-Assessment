import { pool } from "../../config/db"

export const createUser = async (name: string, email: string, password: string) => {
  const query = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const values = [name, email, password];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const findUserByEmail = async (email: string) => {
  const query = `SELECT * FROM users WHERE email = $1`;

  const result = await pool.query(query, [email]);
  return result.rows[0];
};