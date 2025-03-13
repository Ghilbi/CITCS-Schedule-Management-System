const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize (or create) SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Create tables if they do not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS faculty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    unit_category TEXT NOT NULL,
    units TEXT NOT NULL,
    year_level TEXT NOT NULL,
    degree TEXT NOT NULL,
    trimester TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dayType TEXT NOT NULL,
    time TEXT NOT NULL,
    col INTEGER NOT NULL,
    facultyId INTEGER,
    roomId INTEGER,
    courseId INTEGER,
    color TEXT,
    unitType TEXT,
    section TEXT,
    section2 TEXT,  -- Added second section field
    FOREIGN KEY(facultyId) REFERENCES faculty(id),
    FOREIGN KEY(roomId) REFERENCES rooms(id),
    FOREIGN KEY(courseId) REFERENCES courses(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS course_offerings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    courseId INTEGER NOT NULL,
    section TEXT NOT NULL,
    type TEXT NOT NULL,
    units INTEGER NOT NULL,
    trimester TEXT NOT NULL,
    FOREIGN KEY(courseId) REFERENCES courses(id)
  )`);
});

// Only allow valid table names
const validTables = ['faculty', 'rooms', 'courses', 'schedules', 'course_offerings'];
function isValidTable(table) {
  return validTables.includes(table);
}

// GET all items from a table
app.get('/api/:table', (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ error: 'Invalid table name' });
  db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

// POST a new item into a table
app.post('/api/:table', (req, res) => {
  const table = req.params.table;
  if (!isValidTable(table)) return res.status(400).json({ error: 'Invalid table name' });
  const data = req.body;
  let query = '', params = [];

  switch (table) {
    case 'faculty':
      query = 'INSERT INTO faculty (name) VALUES (?)';
      params = [data.name];
      break;
    case 'rooms':
      query = 'INSERT INTO rooms (name) VALUES (?)';
      params = [data.name];
      break;
    case 'courses':
      query = 'INSERT INTO courses (subject, unit_category, units, year_level, degree, trimester) VALUES (?, ?, ?, ?, ?, ?)';
      params = [data.subject, data.unitCategory, data.units, data.yearLevel, data.degree, data.trimester];
      break;
    case 'schedules':
      query = 'INSERT INTO schedules (dayType, time, col, facultyId, roomId, courseId, color, unitType, section, section2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      params = [data.dayType, data.time, data.col, data.facultyId, data.roomId, data.courseId, data.color, data.unitType, data.section, data.section2];
      break;
    case 'course_offerings':
      query = 'INSERT INTO course_offerings (courseId, section, type, units, trimester) VALUES (?, ?, ?, ?, ?)';
      params = [data.courseId, data.section, data.type, data.units, data.trimester];
      break;
    default:
      return res.status(400).json({ error: 'Invalid table' });
  }
  
  db.run(query, params, function(err) {
    if (err) res.status(500).json({ error: err.message });
    else {
      const newId = this.lastID;
      db.get(`SELECT * FROM ${table} WHERE id = ?`, [newId], (err, row) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(row);
      });
    }
  });
});

// PUT (update) an item in a table
app.put('/api/:table/:id', (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ error: 'Invalid table name' });
  const data = req.body;
  let query = '', params = [];
  
  switch (table) {
    case 'faculty':
      query = 'UPDATE faculty SET name = ? WHERE id = ?';
      params = [data.name, id];
      break;
    case 'rooms':
      query = 'UPDATE rooms SET name = ? WHERE id = ?';
      params = [data.name, id];
      break;
    case 'courses':
      query = 'UPDATE courses SET subject = ?, unit_category = ?, units = ?, year_level = ?, degree = ?, trimester = ? WHERE id = ?';
      params = [data.subject, data.unitCategory, data.units, data.yearLevel, data.degree, data.trimester, id];
      break;
    case 'schedules':
      query = 'UPDATE schedules SET dayType = ?, time = ?, col = ?, facultyId = ?, roomId = ?, courseId = ?, color = ?, unitType = ?, section = ?, section2 = ? WHERE id = ?';
      params = [data.dayType, data.time, data.col, data.facultyId, data.roomId, data.courseId, data.color, data.unitType, data.section, data.section2, id];
      break;
    case 'course_offerings':
      query = 'UPDATE course_offerings SET courseId = ?, section = ?, type = ?, units = ?, trimester = ? WHERE id = ?';
      params = [data.courseId, data.section, data.type, data.units, data.trimester, id];
      break;
    default:
      return res.status(400).json({ error: 'Invalid table' });
  }
  
  db.run(query, params, function(err) {
    if (err) res.status(500).json({ error: err.message });
    else {
      db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, row) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(row);
      });
    }
  });
});

// DELETE an item from a table
app.delete('/api/:table/:id', (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  if (!isValidTable(table)) return res.status(400).json({ error: 'Invalid table name' });
  db.run(`DELETE FROM ${table} WHERE id = ?`, [id], function(err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ success: true });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});