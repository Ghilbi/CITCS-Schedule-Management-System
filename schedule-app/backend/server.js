const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

// Add JSON Web Token and bcrypt for authentication
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Serve index.html at root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Initialize (or create) PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
console.log('→ DATABASE_URL:', process.env.DATABASE_URL);
pool.connect(async (err, client, release) => {
  if (err) {
    console.error("Error connecting to Postgres database", err);
    return;
  }
  console.log("Connected to Postgres database.");
  try {
    await client.query('SET search_path TO public');
    console.log("Default schema set to public.");
  } catch (dbErr) {
    console.error("Error setting search_path", dbErr);
  } finally {
    if (client) release();
  }
});

// Create tables if they do not exist
async function createTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    unit_category TEXT NOT NULL,
    units TEXT NOT NULL,
    year_level TEXT NOT NULL,
    degree TEXT NOT NULL,
    trimester TEXT NOT NULL,
    description TEXT,
    curriculum TEXT
  )`)
  
  // Add curriculum column to existing courses table if it doesn't exist
  try {
    await pool.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS curriculum TEXT`);
    // Update existing courses without curriculum to have the most recent curriculum year
    await pool.query(`
      UPDATE courses 
      SET curriculum = (
        SELECT year FROM curricula 
        ORDER BY year DESC 
        LIMIT 1
      ) 
      WHERE curriculum IS NULL AND EXISTS (SELECT 1 FROM curricula)
    `);
  } catch (err) {
    console.log('Curriculum column already exists or error adding it:', err.message);
  };
  await pool.query(`CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    dayType TEXT NOT NULL,
    time TEXT NOT NULL,
    col INTEGER NOT NULL,
    roomId INTEGER,
    courseId INTEGER,
    color TEXT,
    unitType TEXT,
    section TEXT,
    section2 TEXT,
    FOREIGN KEY(roomId) REFERENCES rooms(id),
    FOREIGN KEY(courseId) REFERENCES courses(id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS course_offerings (
    id SERIAL PRIMARY KEY,
    courseId INTEGER NOT NULL,
    section TEXT NOT NULL,
    type TEXT NOT NULL,
    units INTEGER NOT NULL,
    trimester TEXT NOT NULL,
    degree TEXT,
    FOREIGN KEY(courseId) REFERENCES courses(id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS curricula (
    id SERIAL PRIMARY KEY
  )`);
  // Ensure 'year' column exists and unique for curricula (handles pre-existing table without column)
  try {
    await pool.query(`ALTER TABLE curricula ADD COLUMN IF NOT EXISTS year TEXT`);
    // Handle legacy schemas where a NOT NULL name column exists
    try {
      await pool.query(`ALTER TABLE curricula ALTER COLUMN name DROP NOT NULL`);
    } catch (e) {
      // ignore if name column doesn't exist
    }
    // Backfill year from legacy name column if present
    try {
      await pool.query(`UPDATE curricula SET year = name WHERE year IS NULL AND name IS NOT NULL`);
    } catch (e) {
      // ignore if name column doesn't exist
    }
    // Drop legacy 'name' column if it exists to avoid future conflicts
    try {
      await pool.query(`ALTER TABLE curricula DROP COLUMN IF EXISTS name`);
    } catch (e) {
      // ignore if name column doesn't exist
    }
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_curricula_year ON curricula(year)`);
  } catch (err) {
    console.log('Ensuring curricula.year column/index:', err.message);
  }
}
createTables().catch(err => console.error("Error creating tables", err));

// Only allow valid table names
const validTables = ['rooms', 'courses', 'schedules', 'course_offerings', 'curricula'];
function isValidTable(table) {
  return validTables.includes(table);
}

// Helper: map Postgres row fields to camelCase keys
function mapRow(table, row) {
  if (table === 'course_offerings') {
    // fallback in case driver uses different casing
    const cid = row.courseid ?? row.course_id ?? row.courseId;
    return {
      id: row.id,
      courseId: cid,
      section: row.section,
      type: row.type,
      units: row.units,
      trimester: row.trimester,
      degree: row.degree
    };
  } else if (table === 'schedules') {
    // fallback for courseId in schedules
    const sid = row.courseid ?? row.course_id ?? row.courseId;
    const rid = row.roomid ?? row.room_id ?? row.roomId;
    return {
      id: row.id,
      dayType: row.daytype,
      time: row.time,
      col: row.col,
      roomId: rid,
      courseId: sid,
      color: row.color,
      unitType: row.unittype,
      section: row.section,
      section2: row.section2
    };
  }
  // other tables have matching keys
  return row;
}

// ===== Authentication Helpers =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Protect write operations (POST/PUT/DELETE) on the courses table only
function protectCoursesWrite(req, res, next) {
  if (req.params.table === 'courses' && req.method !== 'GET') {
    return authenticateToken(req, res, next);
  }
  next();
}

// Login route that issues a JWT if credentials are valid
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username !== process.env.ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  console.log(
    '[LOGIN] env ADMIN_USERNAME =', process.env.ADMIN_USERNAME,
    '| env ADMIN_PASSWORD_HASH length =', process.env.ADMIN_PASSWORD_HASH?.length
  );
  try {
    const match = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Authentication error' });
  }
});

// Apply the protection middleware before the generic CRUD handlers
app.use('/api/:table', protectCoursesWrite);

// GET all items from a table
app.get('/api/:table', async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ error: 'Invalid table name' });
  
  // Add cache-busting headers to prevent browser caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    let result;
    if (table === 'course_offerings') {
      // Explicitly alias courseid to courseId
      result = await pool.query(
        `SELECT id,
                courseid AS "courseId",
                section,
                type,
                units,
                trimester,
                degree
         FROM course_offerings`
      );
    } else if (table === 'schedules') {
      // Alias fields for schedules to camelCase
      result = await pool.query(
        `SELECT id,
                daytype AS "dayType",
                time,
                col,
                roomid AS "roomId",
                courseid AS "courseId",
                color,
                unittype AS "unitType",
                section,
                section2
         FROM schedules`
      );
    } else {
      result = await pool.query(`SELECT * FROM ${table}`);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new item into a table
app.post('/api/:table', async (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ error: 'Invalid table name' });
  const data = req.body;
  let query = '', params = [];

  switch (table) {
    case 'rooms':
      // Check for existing room with same name first
      try {
        const checkResult = await pool.query('SELECT id FROM rooms WHERE LOWER(name) = LOWER($1)', [data.name]);
        if (checkResult.rows.length > 0) {
          return res.status(400).json({ error: 'Room name already exists' });
        }
      } catch (checkErr) {
        console.error("Error checking for duplicate room:", checkErr);
      }
      query = 'INSERT INTO rooms (name) VALUES ($1)';
      params = [data.name];
      break;
    case 'courses':
      // Ensure curriculum is not NULL/missing and normalize before duplicate check
      // Use provided curriculum or keep as null to let database handle default
      const curriculumValuePost = (data.curriculum && String(data.curriculum).trim()) ? String(data.curriculum).trim() : null;
      // Check for existing course with same subject, curriculum, and degree first
      try {
        let checkQuery, checkParams;
        if (curriculumValuePost === null) {
          checkQuery = 'SELECT id FROM courses WHERE LOWER(subject) = LOWER($1) AND curriculum IS NULL AND degree = $2';
          checkParams = [data.subject, data.degree];
        } else {
          checkQuery = 'SELECT id FROM courses WHERE LOWER(subject) = LOWER($1) AND curriculum = $2 AND degree = $3';
          checkParams = [data.subject, curriculumValuePost, data.degree];
        }
        const checkResult = await pool.query(checkQuery, checkParams);
        if (checkResult.rows.length > 0) {
          return res.status(400).json({ error: 'Course with this subject already exists in the selected curriculum and degree program' });
        }
      } catch (checkErr) {
        console.error("Error checking for duplicate course:", checkErr);
      }
      query = 'INSERT INTO courses (subject, unit_category, units, year_level, degree, trimester, description, curriculum) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
      params = [data.subject, data.unitCategory, data.units, data.yearLevel, data.degree, data.trimester, data.description, curriculumValuePost];
      break;
    case 'schedules':
      query = 'INSERT INTO schedules (dayType, time, col, roomId, courseId, color, unitType, section, section2) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
      params = [data.dayType, data.time, data.col, data.roomId, data.courseId, data.color, data.unitType, data.section, data.section2];
      break;
    case 'course_offerings':
      query = 'INSERT INTO course_offerings (courseId, section, type, units, trimester, degree) VALUES ($1, $2, $3, $4, $5, $6)';
      params = [data.courseId, data.section, data.type, data.units, data.trimester, data.degree];
      break;
    case 'curricula':
      query = 'INSERT INTO curricula (year) VALUES ($1)';
      params = [data.year];
      break;
    default:
      return res.status(400).json({ error: 'Invalid table' });
  }
  
  try {
    const result = await pool.query(query + ' RETURNING *', params);
    const row = result.rows[0];
    res.json(mapRow(table, row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT (update) an item in a table
app.put('/api/:table/:id', async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ error: 'Invalid table name' });
  const data = req.body;
  let query = '', params = [];
  
  switch (table) {
    case 'rooms':
      query = 'UPDATE rooms SET name = $1 WHERE id = $2';
      params = [data.name, id];
      break;
    case 'courses':
      // Ensure curriculum is not NULL/missing and normalize before duplicate check
      // Use provided curriculum or keep as null to let database handle default
      const curriculumValuePut = (data.curriculum && String(data.curriculum).trim()) ? String(data.curriculum).trim() : null;
      // Check for duplicate course with same subject and curriculum (excluding current course)
      try {
        let checkQuery, checkParams;
        if (curriculumValuePut === null) {
          checkQuery = 'SELECT id FROM courses WHERE LOWER(subject) = LOWER($1) AND curriculum IS NULL AND id != $2';
          checkParams = [data.subject, id];
        } else {
          checkQuery = 'SELECT id FROM courses WHERE LOWER(subject) = LOWER($1) AND curriculum = $2 AND id != $3';
          checkParams = [data.subject, curriculumValuePut, id];
        }
        const checkResult = await pool.query(checkQuery, checkParams);
        if (checkResult.rows.length > 0) {
          return res.status(400).json({ error: 'Another course with this subject already exists in the selected curriculum' });
        }
      } catch (checkErr) {
        console.error("Error checking for duplicate course during update:", checkErr);
      }
      query = 'UPDATE courses SET subject = $1, unit_category = $2, units = $3, year_level = $4, degree = $5, trimester = $6, description = $7, curriculum = $8 WHERE id = $9';
      params = [data.subject, data.unitCategory, data.units, data.yearLevel, data.degree, data.trimester, data.description, curriculumValuePut, id];
      break;
    case 'schedules':
      query = 'UPDATE schedules SET dayType = $1, time = $2, col = $3, roomId = $4, courseId = $5, color = $6, unitType = $7, section = $8, section2 = $9 WHERE id = $10';
      params = [data.dayType, data.time, data.col, data.roomId, data.courseId, data.color, data.unitType, data.section, data.section2, id];
      break;
    case 'course_offerings':
      query = 'UPDATE course_offerings SET courseId = $1, section = $2, type = $3, units = $4, trimester = $5, degree = $6 WHERE id = $7';
      params = [data.courseId, data.section, data.type, data.units, data.trimester, data.degree, id];
      break;
    case 'curricula':
      query = 'UPDATE curricula SET year = $1 WHERE id = $2';
      params = [data.year, id];
      break;
    default:
      return res.status(400).json({ error: 'Invalid table' });
  }
  
  try {
    const result = await pool.query(query + ' RETURNING *', params);
    const row = result.rows[0];
    res.json(mapRow(table, row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an item from a table
app.delete('/api/:table/:id', async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ error: 'Invalid table name' });
  try {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});