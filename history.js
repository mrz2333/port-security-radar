const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'scans.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('node:fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scanned_at TEXT NOT NULL,
        total INTEGER,
        critical INTEGER,
        high INTEGER,
        medium INTEGER,
        low INTEGER,
        exposed INTEGER,
        docker_containers INTEGER,
        raw_data TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
      
      CREATE TABLE IF NOT EXISTS port_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id INTEGER,
        port TEXT,
        address TEXT,
        severity TEXT,
        change_type TEXT,
        detected_at TEXT,
        FOREIGN KEY (scan_id) REFERENCES scans(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_changes_detected_at ON port_changes(detected_at);
    `);
  }
  return db;
}

function saveScan(result) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scans (scanned_at, total, critical, high, medium, low, exposed, docker_containers, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    result.scannedAt,
    result.summary.total,
    result.summary.critical,
    result.summary.high,
    result.summary.medium,
    result.summary.low,
    result.summary.exposed,
    result.summary.dockerContainers || 0,
    JSON.stringify(result)
  );
  
  return info.lastInsertRowid;
}

function detectChanges(currentPorts, previousPorts) {
  const changes = [];
  const prevMap = new Map();
  
  previousPorts.forEach(p => {
    const key = `${p.port}:${p.address}`;
    prevMap.set(key, p);
  });
  
  const currMap = new Map();
  currentPorts.forEach(p => {
    const key = `${p.port}:${p.address}`;
    currMap.set(key, p);
  });
  
  // New ports
  currMap.forEach((port, key) => {
    if (!prevMap.has(key)) {
      changes.push({ ...port, changeType: 'added' });
    }
  });
  
  // Removed ports
  prevMap.forEach((port, key) => {
    if (!currMap.has(key)) {
      changes.push({ ...port, changeType: 'removed' });
    }
  });
  
  // Severity changes
  currMap.forEach((port, key) => {
    const prev = prevMap.get(key);
    if (prev && prev.severity !== port.severity) {
      changes.push({ ...port, changeType: 'severity_changed', previousSeverity: prev.severity });
    }
  });
  
  return changes;
}

function saveChanges(scanId, changes) {
  if (changes.length === 0) return;
  
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO port_changes (scan_id, port, address, severity, change_type, detected_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(scanId, item.port, item.address, item.severity, item.changeType, new Date().toISOString());
    }
  });
  
  insertMany(changes);
}

function getHistory(limit = 100) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM scans ORDER BY scanned_at DESC LIMIT ?
  `).all(limit);
}

function getChanges(limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT pc.*, s.scanned_at as scan_time
    FROM port_changes pc
    JOIN scans s ON pc.scan_id = s.id
    ORDER BY pc.detected_at DESC
    LIMIT ?
  `).all(limit);
}

function getStats(days = 7) {
  const db = getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  return db.prepare(`
    SELECT 
      DATE(scanned_at) as date,
      AVG(total) as avg_total,
      AVG(critical) as avg_critical,
      AVG(high) as avg_high,
      MAX(critical) as max_critical,
      MAX(high) as max_high,
      COUNT(*) as scan_count
    FROM scans
    WHERE scanned_at >= ?
    GROUP BY DATE(scanned_at)
    ORDER BY date DESC
  `).all(since);
}

function getLatestScan() {
  const db = getDb();
  const row = db.prepare('SELECT raw_data FROM scans ORDER BY scanned_at DESC LIMIT 1').get();
  return row ? JSON.parse(row.raw_data) : null;
}

module.exports = {
  saveScan,
  detectChanges,
  saveChanges,
  getHistory,
  getChanges,
  getStats,
  getLatestScan
};
