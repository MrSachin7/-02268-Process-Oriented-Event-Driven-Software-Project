import { pool } from "./db.js";

async function initDatabase() {
  try {
    // Create the TurbinesTable if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS TurbinesTable (
        turbine_id VARCHAR(255) PRIMARY KEY,
        status VARCHAR(100) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ TurbinesTable created or already exists");

    // Optional: Insert some sample data for testing
    await pool.execute(`
      INSERT IGNORE INTO TurbinesTable (turbine_id, status, last_updated)
      VALUES 
        ('T-1001', 'Normal', NOW()),
        ('T-1002', 'Normal', NOW()),
        ('T-1003', 'Normal', NOW())
    `);

    console.log("✓ Sample data inserted (if not already present)");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

initDatabase();
