import { pool } from "./db.js";

async function initDatabase() {
  try {
    // Create the TurbinesTable if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS TurbinesTable (
        turbine_id VARCHAR(255) PRIMARY KEY,
        status VARCHAR(100) NOT NULL,
        maintainance_status VARCHAR(100),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ TurbinesTable created or already exists");

    // Add maintainance_status column if it doesn't exist (for existing tables)
    try {
      await pool.execute(`
        ALTER TABLE TurbinesTable 
        ADD COLUMN IF NOT EXISTS maintainance_status VARCHAR(100)
      `);
      console.log("✓ maintainance_status column verified");
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Create the MaintainanceWorks table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS MaintainanceWorks (
        work_order_id VARCHAR(255) PRIMARY KEY,
        turbine_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (turbine_id) REFERENCES TurbinesTable(turbine_id)
      )
    `);

    console.log("✓ MaintainanceWorks table created or already exists");

    // Create the Inventory table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Inventory (
        part_id INT AUTO_INCREMENT PRIMARY KEY,
        part_name VARCHAR(255) UNIQUE NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ Inventory table created or already exists");

    // Optional: Insert some sample data for testing
    await pool.execute(`
      INSERT IGNORE INTO TurbinesTable (turbine_id, status, last_updated)
      VALUES 
        ('T-1001', 'Normal', NOW()),
        ('T-1002', 'Normal', NOW()),
        ('T-1003', 'Normal', NOW())
    `);

    console.log("✓ Sample turbine data inserted (if not already present)");

    // Populate inventory with predefined parts
    await pool.execute(`
      INSERT IGNORE INTO Inventory (part_name, quantity)
      VALUES 
        ('Main shaft Bearing Set', 5),
        ('Planetary Gear Set (Stage 1)', 3),
        ('Oil Filter Element (High Flow)', 10),
        ('Gearbox Seal Kit (Full)', 7),
        ('Cooling System Pump Assembly', 4),
        ('Hydraulic Pitch Cylinder Actuator', 6),
        ('Temperature Sensor (PT100) Replacement', 15),
        ('Vibration Sensor (Accelerometer) Replacement', 12)
    `);

    console.log("✓ Inventory parts populated (if not already present)");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

initDatabase();
