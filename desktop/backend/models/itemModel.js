const db = require('../../config/db');
db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proformaId INTEGER,
    itemName TEXT,
    unit TEXT,
    quantity INTEGER,
    unitPrice REAL,
    totalPrice REAL, 
    lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY(proformaId) REFERENCES proformas(id) ON DELETE CASCADE,
  )
`);
module.exports = db;
