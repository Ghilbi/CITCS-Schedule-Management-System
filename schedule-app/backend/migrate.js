require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// Connect to SQLite
const sqliteDb = new sqlite3.Database('./database.db', sqliteErr => {
  if (sqliteErr) console.error('Error opening SQLite database:', sqliteErr);
  else console.log('Connected to SQLite database.');
});

// Connect to Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateTable(selectSql, insertSql, transform) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(selectSql, async (err, rows) => {
      if (err) return reject(err);
      for (const row of rows) {
        const params = transform(row);
        try {
          await pool.query(insertSql, params);
        } catch (insertErr) {
          console.error('Insert error on row:', row, insertErr);
        }
      }
      resolve();
    });
  });
}

async function setSequence(table) {
  const seqSql = `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT COALESCE(MAX(id),0) FROM ${table}))`;
  await pool.query(seqSql);
}

async function migrate() {
  try {
    console.log('Starting migration...');

    // Migrate faculty
    await migrateTable(
      'SELECT * FROM faculty',
      'INSERT INTO faculty(id, name) VALUES($1, $2)',
      row => [row.id, row.name]
    );

    // Migrate rooms
    await migrateTable(
      'SELECT * FROM rooms',
      'INSERT INTO rooms(id, name) VALUES($1, $2)',
      row => [row.id, row.name]
    );

    // Migrate courses
    await migrateTable(
      'SELECT * FROM courses',
      'INSERT INTO courses(id, subject, unit_category, units, year_level, degree, trimester, description) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
      row => [row.id, row.subject, row.unit_category, row.units, row.year_level, row.degree, row.trimester, row.description]
    );

    // Migrate course_offerings
    await migrateTable(
      'SELECT * FROM course_offerings',
      'INSERT INTO course_offerings(id, courseId, section, type, units, trimester, degree) VALUES($1, $2, $3, $4, $5, $6, $7)',
      row => [row.id, row.courseId, row.section, row.type, row.units, row.trimester, row.degree]
    );

    // Migrate schedules
    await migrateTable(
      'SELECT * FROM schedules',
      'INSERT INTO schedules(id, dayType, time, col, facultyId, roomId, courseId, color, unitType, section, section2) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      row => [row.id, row.dayType, row.time, row.col, row.facultyId, row.roomId, row.courseId, row.color, row.unitType, row.section, row.section2]
    );

    // Update sequences
    for (const table of ['faculty', 'rooms', 'courses', 'course_offerings', 'schedules']) {
      await setSequence(table);
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

migrate(); 