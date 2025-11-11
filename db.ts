import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "siddhi_user",
  password: "siddhi_pass",
  database: "siddhi_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log("✓ Database connection pool created");
