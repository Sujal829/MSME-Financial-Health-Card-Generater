const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', '..', 'data', 'db.json');

// Ensure database directory and file exist
function initDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(DB_FILE)) {
    const initialSchema = {
      profiles: [],
      evaluations: [],
      loans: [],
      audit_logs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf-8');
  }
}

// Read database
function readData() {
  initDB();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

// Write database
function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const db = {
  // Get all rows in a table
  get: (table) => {
    const data = readData();
    return data[table] || [];
  },

  // Find a specific row or rows matching a query object
  find: (table, query = {}) => {
    const rows = db.get(table);
    return rows.filter(row => {
      for (let key in query) {
        if (row[key] !== query[key]) return false;
      }
      return true;
    });
  },

  // Find one row
  findOne: (table, query = {}) => {
    const rows = db.find(table, query);
    return rows.length > 0 ? rows[0] : null;
  },

  // Insert a new row
  insert: (table, item) => {
    const data = readData();
    if (!data[table]) data[table] = [];
    
    // Add id and timestamps if missing
    const newItem = {
      id: item.id || `id_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item
    };
    
    data[table].push(newItem);
    writeData(data);
    return newItem;
  },

  // Update a row by id
  update: (table, id, updates) => {
    const data = readData();
    if (!data[table]) return null;
    
    const idx = data[table].findIndex(row => row.id === id);
    if (idx === -1) return null;
    
    const updatedItem = {
      ...data[table][idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    data[table][idx] = updatedItem;
    writeData(data);
    return updatedItem;
  },

  // Delete a row by id
  delete: (table, id) => {
    const data = readData();
    if (!data[table]) return false;
    
    const initialLen = data[table].length;
    data[table] = data[table].filter(row => row.id !== id);
    writeData(data);
    return data[table].length < initialLen;
  },

  // Log an audit event
  log: (msmeId, type, message) => {
    db.insert('audit_logs', {
      msmeId,
      type, // 'GST', 'UPI', 'EPFO', 'SYSTEM', 'LOAN'
      message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = db;
