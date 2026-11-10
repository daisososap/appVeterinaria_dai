import mysql from "mysql2/promise";
import "dotenv/config";

export const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "Itzelsosa12",
  database: "veterinaria_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

export async function probarConexion(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.ping();
    console.log("Conexión con MySQL establecida");
  } finally {
    connection.release();
  }
}