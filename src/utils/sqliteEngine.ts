import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

export interface TableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: boolean;
  dflt_value: any;
  pk: boolean;
  fk?: boolean;
}

export interface ForeignKeyInfo {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
}

export interface TableItem {
  name: string;
  type: 'table' | 'view' | 'system';
  rowCount: number;
  sql?: string;
  columns?: TableColumnInfo[];
  foreignKeys?: ForeignKeyInfo[];
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  durationMs: number;
  error: string | null;
}

export interface DbMetadata {
  filename: string;
  fileSizeBytes: number;
  hasWal: boolean;
  sqliteVersion: string;
  pageSize: number;
  pageCount: number;
  encoding: string;
  journalMode: string;
  integrityOk: boolean;
}

let sqliteInstancePromise: Promise<any> | null = null;

export async function getSqliteModule() {
  if (!sqliteInstancePromise) {
    sqliteInstancePromise = sqlite3InitModule();
  }
  return sqliteInstancePromise;
}

export interface DatabaseLoadedResult {
  primaryFile: string;
  walFile: string | null;
  shmFile: string | null;
  totalFilesProcessed: number;
}

function isSqliteHeader(data: Uint8Array): boolean {
  if (data.byteLength < 16) return false;
  const magic = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00];
  return magic.every((byte, i) => data[i] === byte);
}

function isWalHeaderOrName(name: string, data: Uint8Array): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith('-wal') || lower.endsWith('.wal') || lower.includes('-wal') || lower.includes('.wal')) {
    return true;
  }
  if (data.byteLength >= 4) {
    const view = new DataView(data.buffer, data.byteOffset, 4);
    const magicBig = view.getUint32(0, false);
    const magicLittle = view.getUint32(0, true);
    if (
      magicBig === 0x377f0682 ||
      magicBig === 0x377f0683 ||
      magicLittle === 0x377f0682 ||
      magicLittle === 0x377f0683
    ) {
      return true;
    }
  }
  return false;
}

function isShmName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('-shm') || lower.endsWith('.shm') || lower.includes('-shm') || lower.includes('.shm');
}

function getCleanFileName(pathOrName: string): string {
  const parts = pathOrName.split(/[/\\]/);
  return parts[parts.length - 1] || pathOrName;
}

function getBasePrefix(fileName: string): string {
  const clean = getCleanFileName(fileName);
  return clean
    .replace(/(-wal|\.wal|-shm|\.shm|-journal|\.journal)$/i, '')
    .replace(/\.(sqlite|sqlite3|db|s3db|sl3)$/i, '')
    .toLowerCase();
}

export class SqliteEngine {
  private sqlite3: any;
  private db: any = null;
  public metadata: DbMetadata | null = null;
  public tables: TableItem[] = [];

  constructor(sqlite3: any) {
    this.sqlite3 = sqlite3;
  }

  /**
   * Mount and open a database with optional companion .wal and .shm files.
   */
  async loadDatabaseFiles(
    files: { name: string; path?: string; data: Uint8Array }[]
  ): Promise<DatabaseLoadedResult> {
    if (this.db) {
      try {
        this.db.close();
      } catch (err) {
        console.warn('Error closing existing db:', err);
      }
      this.db = null;
    }

    // Filter out OS junk files (e.g. .DS_Store, Thumbs.db, hidden files)
    const validFiles = files.filter((f) => {
      const cleanName = getCleanFileName(f.name);
      return (
        cleanName &&
        !cleanName.startsWith('.') &&
        cleanName !== 'Thumbs.db' &&
        cleanName !== 'desktop.ini'
      );
    });

    if (validFiles.length === 0) {
      throw new Error('No valid files found in upload.');
    }

    // 1. Identify primary .db/.sqlite file
    // Strategy A: Check SQLite format 3 magic header
    let primaryFile = validFiles.find((f) => isSqliteHeader(f.data));

    // Strategy B: If no magic header found (e.g. 0-byte file), check filename extension
    if (!primaryFile) {
      primaryFile = validFiles.find(
        (f) =>
          /\.(sqlite|sqlite3|db|s3db|sl3)$/i.test(f.name) &&
          !isWalHeaderOrName(f.name, f.data) &&
          !isShmName(f.name)
      );
    }

    // Strategy C: Pick first file that is not explicitly WAL or SHM
    if (!primaryFile) {
      primaryFile = validFiles.find(
        (f) => !isWalHeaderOrName(f.name, f.data) && !isShmName(f.name)
      );
    }

    if (!primaryFile) {
      throw new Error(
        'Could not locate main SQLite database file. If uploading WAL files, please include the main .db/.sqlite database file as well.'
      );
    }

    const primaryDisplayName = getCleanFileName(primaryFile.name);
    const primaryBase = getBasePrefix(primaryDisplayName);

    // 2. Identify companion WAL / SHM files if provided
    let walFile = validFiles.find(
      (f) =>
        f !== primaryFile &&
        isWalHeaderOrName(f.name, f.data) &&
        getBasePrefix(f.name) === primaryBase
    );
    if (!walFile) {
      walFile = validFiles.find(
        (f) => f !== primaryFile && isWalHeaderOrName(f.name, f.data)
      );
    }

    let shmFile = validFiles.find(
      (f) =>
        f !== primaryFile &&
        isShmName(f.name) &&
        getBasePrefix(f.name) === primaryBase
    );
    if (!shmFile) {
      shmFile = validFiles.find((f) => f !== primaryFile && isShmName(f.name));
    }

    // 3. Write primary and companions to virtual POSIX filesystem with clean ASCII name
    const safeId = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const vfsDbPath = `db_${safeId}.sqlite`;
    const vfsWalPath = `${vfsDbPath}-wal`;
    const vfsShmPath = `${vfsDbPath}-shm`;

    this.sqlite3.capi.sqlite3_js_posix_create_file(vfsDbPath, primaryFile.data);

    if (walFile && walFile.data.byteLength > 0) {
      this.sqlite3.capi.sqlite3_js_posix_create_file(vfsWalPath, walFile.data);
    }
    if (shmFile && shmFile.data.byteLength > 0) {
      this.sqlite3.capi.sqlite3_js_posix_create_file(vfsShmPath, shmFile.data);
    }

    // 4. Open the database using POSIX VFS supporting WAL & shared-memory locking
    let openError: any = null;
    const vfsCandidates = ['unix', 'unix-excl', undefined];

    for (const vfs of vfsCandidates) {
      try {
        this.db = vfs
          ? new this.sqlite3.oo1.DB(vfsDbPath, 'c', vfs)
          : new this.sqlite3.oo1.DB(vfsDbPath);

        // Verification query
        this.db.exec('PRAGMA schema_version;');
        openError = null;
        break;
      } catch (err: any) {
        openError = err;
        if (this.db) {
          try {
            this.db.close();
          } catch {}
          this.db = null;
        }
      }
    }

    if (!this.db && openError) {
      const msg = String(openError.message || openError);
      if (msg.includes('SQLITE_CANTOPEN')) {
        throw new Error(
          `SQLITE_CANTOPEN: SQLite was unable to open "${primaryDisplayName}". ` +
            (walFile
              ? 'The WAL companion file may be corrupted or locked by another process.'
              : 'If this database is in WAL mode, please select or drop the companion .wal file together with the database file, or select the containing folder via "Open Folder".')
        );
      }
      throw openError;
    }

    // 5. If WAL was provided, trigger checkpoint to ensure full visibility of uncheckpointed transactions
    if (walFile) {
      try {
        this.db.exec('PRAGMA wal_checkpoint(PASSIVE);');
      } catch (e) {
        console.warn('WAL checkpoint notice:', e);
      }
    }

    // 6. Build database metadata & introspect tables
    await this.refreshMetadata(
      primaryDisplayName,
      primaryFile.data.byteLength,
      !!walFile
    );

    return {
      primaryFile: primaryDisplayName,
      walFile: walFile ? getCleanFileName(walFile.name) : null,
      shmFile: shmFile ? getCleanFileName(shmFile.name) : null,
      totalFilesProcessed: validFiles.length,
    };
  }

  /**
   * Load bundled realistic sample database for immediate exploration.
   */
  async loadSampleDatabase() {
    if (this.db) {
      try {
        this.db.close();
      } catch (err) {
        console.warn('Error closing existing db:', err);
      }
      this.db = null;
    }

    const vfsDbPath = `sample_${Date.now()}_ecommerce.sqlite`;
    this.db = new this.sqlite3.oo1.DB(vfsDbPath);

    // Build rich sample schema
    this.db.exec(`
      -- Categories Table
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT
      );

      INSERT INTO categories (name, slug, description) VALUES
        ('Electronics', 'electronics', 'Gadgets, components, and personal tech devices'),
        ('Audio & Studio', 'audio-studio', 'Studio monitors, headphones, and microphones'),
        ('Apparel & Gear', 'apparel-gear', 'Developer apparel, hoodies, and daily carry bags'),
        ('Office & Ergonomics', 'office-ergonomics', 'Standing desks, mechanical keyboards, and monitor arms'),
        ('Books & Guides', 'books-guides', 'Software architecture, algorithms, and system design');

      -- Products Table
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        rating REAL DEFAULT 5.0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO products (category_id, sku, name, price, stock, rating, is_active) VALUES
        (4, 'KB-091', 'Ortholinear Mechanical Keyboard (Gateron Brown)', 149.99, 42, 4.8, 1),
        (2, 'AU-702', 'Active Noise-Cancelling ANC Headphones', 249.50, 18, 4.9, 1),
        (1, 'DK-410', 'Thunderbolt 4 Quad-Display Workstation Dock', 189.00, 31, 4.7, 1),
        (4, 'DS-108', 'Dual-Motor Motorized Standing Desk Frame', 399.00, 12, 4.9, 1),
        (5, 'BK-001', 'Designing Data-Intensive Applications (Hardcover)', 45.00, 85, 5.0, 1),
        (3, 'AP-301', 'Heavyweight Organic Cotton Dev Hoodie (Charcoal)', 68.00, 64, 4.6, 1),
        (1, 'MC-205', 'Precision Ergonomic Wireless Trackball', 89.95, 27, 4.5, 1),
        (2, 'AU-112', 'Cardioid Dynamic Broadcast USB/XLR Microphone', 129.00, 22, 4.8, 1),
        (5, 'BK-002', 'Site Reliability Engineering (OReilly Handbook)', 38.50, 50, 4.9, 1),
        (3, 'AP-104', 'Water-Resistant Commuter Tech Backpack 24L', 115.00, 39, 4.7, 1),
        (4, 'MO-802', 'Heavy-Duty Gas Spring Dual Monitor Arm', 79.99, 53, 4.6, 1),
        (1, 'KB-002', 'Split Ergonomic Mechanical Keyboard (PBT Caps)', 210.00, 15, 4.9, 1);

      -- Customers Table
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        country TEXT DEFAULT 'US',
        city TEXT,
        tier TEXT DEFAULT 'standard',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO customers (full_name, email, country, city, tier) VALUES
        ('Elena Rostova', 'elena.rostova@example.com', 'DE', 'Berlin', 'vip'),
        ('Marcus Chen', 'marcus.chen@example.com', 'US', 'Seattle', 'pro'),
        ('Sophia Al-Mansoor', 'sophia.almansoor@example.com', 'AE', 'Dubai', 'pro'),
        ('Lucas Takahashi', 'lucas.takahashi@example.com', 'JP', 'Tokyo', 'vip'),
        ('Amara Okafor', 'amara.okafor@example.com', 'NG', 'Lagos', 'standard'),
        ('David Miller', 'david.miller@example.com', 'US', 'Austin', 'standard'),
        ('Ingrid Bergman', 'ingrid.bergman@example.com', 'SE', 'Stockholm', 'vip'),
        ('Mateo Rossi', 'mateo.rossi@example.com', 'IT', 'Milan', 'standard'),
        ('Zoe Vance', 'zoe.vance@example.com', 'CA', 'Vancouver', 'pro'),
        ('Liam Thorne', 'liam.thorne@example.com', 'GB', 'London', 'standard');

      -- Orders Table
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers(id),
        order_number TEXT UNIQUE NOT NULL,
        status TEXT CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
        total_amount REAL NOT NULL,
        shipping_fee REAL DEFAULT 0.0,
        placed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO orders (customer_id, order_number, status, total_amount, shipping_fee, placed_at) VALUES
        (1, 'ORD-9821', 'delivered', 399.49, 0.0, '2026-08-10 14:22:00'),
        (2, 'ORD-9822', 'delivered', 189.00, 0.0, '2026-08-12 09:15:30'),
        (3, 'ORD-9823', 'delivered', 45.00, 5.0, '2026-08-14 18:40:12'),
        (4, 'ORD-9824', 'shipped', 609.00, 0.0, '2026-08-20 11:05:00'),
        (5, 'ORD-9825', 'processing', 149.99, 12.0, '2026-08-25 16:30:45'),
        (6, 'ORD-9826', 'delivered', 83.50, 0.0, '2026-08-28 08:20:10'),
        (7, 'ORD-9827', 'delivered', 249.50, 0.0, '2026-09-01 13:12:00'),
        (8, 'ORD-9828', 'shipped', 129.00, 10.0, '2026-09-03 10:45:00'),
        (9, 'ORD-9829', 'processing', 325.00, 0.0, '2026-09-05 17:02:18'),
        (10, 'ORD-9830', 'delivered', 115.00, 0.0, '2026-09-08 15:33:40');

      -- Order Items Table
      CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        unit_price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1
      );

      INSERT INTO order_items (order_id, product_id, unit_price, quantity) VALUES
        (1, 2, 249.50, 1),
        (1, 1, 149.99, 1),
        (2, 3, 189.00, 1),
        (3, 5, 45.00, 1),
        (4, 4, 399.00, 1),
        (4, 12, 210.00, 1),
        (5, 1, 149.99, 1),
        (6, 5, 45.00, 1),
        (6, 9, 38.50, 1),
        (7, 2, 249.50, 1),
        (8, 8, 129.00, 1),
        (9, 12, 210.00, 1),
        (9, 10, 115.00, 1),
        (10, 10, 115.00, 1);

      -- Reviews Table
      CREATE TABLE reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id),
        customer_id INTEGER REFERENCES customers(id),
        rating INTEGER CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES
        (1, 1, 5, 'Great build quality, typing feel is sublime for programming.'),
        (2, 7, 5, 'Noise cancelling makes working in open offices or coffee shops peaceful.'),
        (3, 2, 4, 'Powers three 4K monitors without heating up. Solid metal chassis.'),
        (4, 4, 5, 'Motor is ultra-quiet and remembers all my seated/standing presets.'),
        (5, 3, 5, 'Must-read classic for every backend and infrastructure engineer.');

      -- Analytical Views
      CREATE VIEW v_top_selling_products AS
      SELECT
        p.id,
        p.name,
        c.name AS category,
        p.price,
        SUM(oi.quantity) AS total_sold,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY total_sold DESC;

      CREATE VIEW v_customer_order_summary AS
      SELECT
        c.id AS customer_id,
        c.full_name,
        c.email,
        c.tier,
        COUNT(o.id) AS total_orders,
        COALESCE(ROUND(SUM(o.total_amount), 2), 0.0) AS lifetime_spend
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id
      ORDER BY lifetime_spend DESC;
    `);

    const exported = this.sqlite3.capi.sqlite3_js_db_export(this.db);
    await this.refreshMetadata('ecommerce_sample.sqlite', exported.byteLength, false);
  }

  /**
   * Introspects metadata, PRAGMAs, and tables list.
   */
  async refreshMetadata(filename: string, fileSizeBytes: number, hasWal: boolean) {
    if (!this.db) return;

    // PRAGMAs
    const pragmaVersion = this.execScalar('SELECT sqlite_version();') || '3.x';
    const pragmaPageSize = Number(this.execScalar('PRAGMA page_size;')) || 4096;
    const pragmaPageCount = Number(this.execScalar('PRAGMA page_count;')) || 0;
    const pragmaEncoding = String(this.execScalar('PRAGMA encoding;') || 'UTF-8');
    const pragmaJournal = String(this.execScalar('PRAGMA journal_mode;') || 'delete');
    const pragmaIntegrity = String(this.execScalar('PRAGMA integrity_check(1);') || 'ok');

    this.metadata = {
      filename,
      fileSizeBytes,
      hasWal,
      sqliteVersion: String(pragmaVersion),
      pageSize: pragmaPageSize,
      pageCount: pragmaPageCount,
      encoding: pragmaEncoding,
      journalMode: pragmaJournal,
      integrityOk: pragmaIntegrity.toLowerCase() === 'ok',
    };

    // Load tables and views
    const schemaItems: TableItem[] = [];
    const masterRows: any[][] = [];
    this.db.exec({
      sql: `SELECT name, type, sql FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY type ASC, name ASC;`,
      rowMode: 'array',
      resultRows: masterRows,
    });

    for (const [name, type, sql] of masterRows) {
      const isSystem = name.startsWith('sqlite_');
      let rowCount = 0;
      if (type === 'table') {
        try {
          const countVal = this.execScalar(`SELECT COUNT(*) FROM "${name}";`);
          rowCount = Number(countVal) || 0;
        } catch {
          rowCount = 0;
        }
      }

      // Column definitions
      const colRows: any[][] = [];
      try {
        this.db.exec({
          sql: `PRAGMA table_info("${name}");`,
          rowMode: 'array',
          resultRows: colRows,
        });
      } catch {
        // Ignore
      }

      // Foreign key definitions
      const fkRows: any[][] = [];
      try {
        this.db.exec({
          sql: `PRAGMA foreign_key_list("${name}");`,
          rowMode: 'array',
          resultRows: fkRows,
        });
      } catch {
        // Ignore
      }

      const foreignKeys: ForeignKeyInfo[] = fkRows.map((r) => ({
        id: Number(r[0]),
        seq: Number(r[1]),
        table: String(r[2]),
        from: String(r[3]),
        to: String(r[4] || 'id'),
        on_update: String(r[5] || 'NO ACTION'),
        on_delete: String(r[6] || 'NO ACTION'),
        match: String(r[7] || 'NONE'),
      }));

      const fkColNames = new Set(foreignKeys.map((fk) => fk.from));

      const columns: TableColumnInfo[] = colRows.map((r) => ({
        cid: r[0],
        name: r[1],
        type: r[2] || 'ANY',
        notnull: Boolean(r[3]),
        dflt_value: r[4],
        pk: Boolean(r[5]),
        fk: fkColNames.has(r[1]),
      }));

      schemaItems.push({
        name,
        type: isSystem ? 'system' : (type as 'table' | 'view'),
        rowCount,
        sql,
        columns,
        foreignKeys,
      });
    }

    this.tables = schemaItems;
  }

  /**
   * Execute arbitrary SQL query and return results with timing.
   */
  executeQuery(sql: string): QueryResult {
    if (!this.db) {
      return { columns: [], rows: [], durationMs: 0, error: 'No database is open.' };
    }

    const trimmed = sql.trim();
    if (!trimmed) {
      return { columns: [], rows: [], durationMs: 0, error: null };
    }

    const start = performance.now();
    try {
      const columnNames: string[] = [];
      const rows: any[][] = [];

      this.db.exec({
        sql: trimmed,
        rowMode: 'array',
        columnNames,
        resultRows: rows,
      });

      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        columns: columnNames,
        rows,
        durationMs,
        error: null,
      };
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        columns: [],
        rows: [],
        durationMs,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Fetch paginated and sorted rows for a specific table.
   */
  fetchTableData(
    tableName: string,
    page = 0,
    pageSize = 50,
    sortCol?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
    searchQuery?: string,
    searchCol?: string
  ): {
    columns: string[];
    rows: any[][];
    totalRows: number;
    page: number;
    pageSize: number;
    durationMs: number;
    error: string | null;
  } {
    if (!this.db) {
      return { columns: [], rows: [], totalRows: 0, page, pageSize, durationMs: 0, error: 'No database is open.' };
    }

    const start = performance.now();
    try {
      // Get column info
      const colRows: any[][] = [];
      this.db.exec({
        sql: `PRAGMA table_info("${tableName}");`,
        rowMode: 'array',
        resultRows: colRows,
      });
      const colNames = colRows.map((r) => r[1]);

      // Build search WHERE condition if search query provided
      let whereClause = '';
      if (searchQuery && searchQuery.trim()) {
        const term = searchQuery.trim().replace(/'/g, "''");
        if (searchCol && colNames.includes(searchCol)) {
          whereClause = `WHERE (CAST("${searchCol}" AS TEXT) LIKE '%${term}%')`;
        } else {
          const conditions = colNames.map(
            (c) => `CAST("${c}" AS TEXT) LIKE '%${term}%'`
          );
          whereClause = `WHERE (${conditions.join(' OR ')})`;
        }
      }

      // Get count
      const countSql = `SELECT COUNT(*) FROM "${tableName}" ${whereClause};`;
      const totalRows = Number(this.execScalar(countSql)) || 0;

      // Build pagination & sort
      let orderClause = '';
      if (sortCol && colNames.includes(sortCol)) {
        orderClause = `ORDER BY "${sortCol}" ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
      }

      const offset = page * pageSize;
      const dataSql = `SELECT * FROM "${tableName}" ${whereClause} ${orderClause} LIMIT ${pageSize} OFFSET ${offset};`;

      const columnNames: string[] = [];
      const rows: any[][] = [];
      this.db.exec({
        sql: dataSql,
        rowMode: 'array',
        columnNames,
        resultRows: rows,
      });

      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        columns: columnNames.length ? columnNames : colNames,
        rows,
        totalRows,
        page,
        pageSize,
        durationMs,
        error: null,
      };
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      return {
        columns: [],
        rows: [],
        totalRows: 0,
        page,
        pageSize,
        durationMs,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Export the in-memory database to a downloadable binary Uint8Array.
   */
  exportBinaryDatabase(): Uint8Array {
    if (!this.db) throw new Error('No database is open.');
    return this.sqlite3.capi.sqlite3_js_db_export(this.db);
  }

  /**
   * Convert query results to CSV string.
   */
  static toCsv(columns: string[], rows: any[][]): string {
    const escapeCell = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = columns.map(escapeCell).join(',');
    const body = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
    return `${header}\n${body}`;
  }

  /**
   * Convert query results to formatted JSON string.
   */
  static toJson(columns: string[], rows: any[][]): string {
    const objects = rows.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    return JSON.stringify(objects, null, 2);
  }

  /**
   * Generate SQL INSERT statements for table rows.
   */
  static toSqlInserts(tableName: string, columns: string[], rows: any[][]): string {
    if (!rows.length) return `-- No rows in table ${tableName};\n`;

    const colList = columns.map((c) => `"${c}"`).join(', ');
    const lines = rows.map((row) => {
      const vals = row.map((v) => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        if (typeof v === 'boolean') return v ? 1 : 0;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      return `INSERT INTO "${tableName}" (${colList}) VALUES (${vals.join(', ')});`;
    });

    return lines.join('\n');
  }

  private execScalar(sql: string): any {
    if (!this.db) return null;
    let res: any = null;
    this.db.exec({
      sql,
      rowMode: 'array',
      callback: (row: any[]) => {
        res = row[0];
        return false; // Stop after first row
      },
    });
    return res;
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
      } catch (err) {
        console.warn('Error closing database:', err);
      }
      this.db = null;
    }
  }
}
