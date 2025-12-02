import { pool } from "./db.js";

async function resetDatabase() {
  console.log("🔄 Starting database reset...\n");

  try {
    // Disable foreign key checks to allow dropping tables with dependencies
    await pool.execute("SET FOREIGN_KEY_CHECKS = 0");
    console.log("✓ Disabled foreign key checks");

    // Drop all tables in reverse dependency order
    const tables = [
      "DCREventStates",
      "DCRInstances",
      "ReportResults",
      "PurchaseOrders",
      "Inventory",
      "MaintainanceWorks",
      "TurbinesTable",
    ];

    for (const table of tables) {
      try {
        await pool.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✓ Dropped table: ${table}`);
      } catch (error) {
        console.error(`⚠️  Error dropping table ${table}:`, error.message);
      }
    }

    // Re-enable foreign key checks
    await pool.execute("SET FOREIGN_KEY_CHECKS = 1");
    console.log("✓ Re-enabled foreign key checks\n");

    console.log("🏗️  Recreating database schema...\n");

    // Create the TurbinesTable
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS TurbinesTable (
        turbine_id VARCHAR(255) PRIMARY KEY,
        status VARCHAR(100) NOT NULL,
        maintainance_status VARCHAR(100),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ TurbinesTable created");

    // Create the MaintainanceWorks table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS MaintainanceWorks (
        work_order_id VARCHAR(255) PRIMARY KEY,
        turbine_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (turbine_id) REFERENCES TurbinesTable(turbine_id)
      )
    `);
    console.log("✓ MaintainanceWorks table created");

    // Create the Inventory table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Inventory (
        part_id INT AUTO_INCREMENT PRIMARY KEY,
        part_name VARCHAR(255) UNIQUE NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Inventory table created");

    // Create the PurchaseOrders table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS PurchaseOrders (
        purchase_order_id VARCHAR(255) PRIMARY KEY,
        turbine_id VARCHAR(255) NOT NULL,
        parts_ordered TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (turbine_id) REFERENCES TurbinesTable(turbine_id)
      )
    `);
    console.log("✓ PurchaseOrders table created");

    // Create the ReportResults table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ReportResults (
        report_id INT AUTO_INCREMENT PRIMARY KEY,
        turbine_id VARCHAR(255) NOT NULL,
        vib_min DECIMAL(10, 3),
        vib_max DECIMAL(10, 3),
        vib_avg DECIMAL(10, 3),
        vib_count INT,
        temp_min DECIMAL(10, 3),
        temp_max DECIMAL(10, 3),
        temp_avg DECIMAL(10, 3),
        temp_count INT,
        ttf_score INT,
        has_failed BOOLEAN,
        report_timestamp BIGINT,
        created_at BIGINT,
        FOREIGN KEY (turbine_id) REFERENCES TurbinesTable(turbine_id)
      )
    `);
    console.log("✓ ReportResults table created");

    // Create the DCRInstances table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS DCRInstances (
        instance_id VARCHAR(255) PRIMARY KEY,
        process_type VARCHAR(100) NOT NULL,
        turbine_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (turbine_id) REFERENCES TurbinesTable(turbine_id)
      )
    `);
    console.log("✓ DCRInstances table created");

    // Create the DCREventStates table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS DCREventStates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instance_id VARCHAR(255) NOT NULL,
        event_id VARCHAR(50) NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        included BOOLEAN NOT NULL,
        executed BOOLEAN NOT NULL,
        pending BOOLEAN NOT NULL,
        enabled BOOLEAN NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES DCRInstances(instance_id) ON DELETE CASCADE,
        UNIQUE KEY unique_instance_event (instance_id, event_id)
      )
    `);
    console.log("✓ DCREventStates table created\n");

    console.log("📊 Populating initial data...\n");

    // Insert sample turbine data
    await pool.execute(`
      INSERT INTO TurbinesTable (turbine_id, status, last_updated)
      VALUES 
        ('T-1001', 'Normal', NOW()),
        ('T-1002', 'Normal', NOW()),
        ('T-1003', 'Normal', NOW())
    `);
    console.log("✓ Sample turbine data inserted");

    // Populate inventory with predefined parts
    await pool.execute(`
      INSERT INTO Inventory (part_name, quantity)
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
    console.log("✓ Inventory parts populated\n");

    console.log(
      "✅ Database reset complete! All tables recreated with initial data.\n"
    );
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetDatabase();
