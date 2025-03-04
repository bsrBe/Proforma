const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine the database path based on environment
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join(process.resourcesPath, 'newDatabase.db') // Packaged app
  : path.join(__dirname,  '../newDatabase.db'); // Development
  console.log('Using database at:', dbPath);
// Initialize the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the database at:', dbPath);
  }
});

module.exports = db;