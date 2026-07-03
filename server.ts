import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

app.use(express.json({ limit: "50mb" }));

// Helper to read database
function readDB() {
  const defaultDB = {
    users: [
      {
        username: "Owner",
        password: "Ar739139597",
        role: "Owner",
        permissions: {
          items: "write",
          movements: "write",
          reports: "read",
          suppliers: "write",
          settings: "write",
          warehouses: "write",
          transfers: "write"
        },
        warehouseId: "WH-001",
        maxDevices: 10
      }
    ],
    warehouseData: {
      items: [
        {
          id: 'PROD-001',
          name: 'شاحن متنقل بقوة 20 واط',
          safetyLimit: 10,
          unit: 'حبة',
          price: 45,
          category: 'شواحن',
          description: 'شاحن سريع يدعم تقنية PD لشحن الأجهزة الذكية بكفاءة وسرعة فائقة.',
        },
        {
          id: 'PROD-002',
          name: 'سماعة بلوتوث لاسلكية',
          safetyLimit: 15,
          unit: 'حبة',
          price: 85,
          category: 'سماعات',
          description: 'سماعة رأس لاسلكية مريحة مع عزل ضوضاء ممتاز وبطارية تدوم طويلاً.',
        },
        {
          id: 'PROD-003',
          name: 'كابل شحن سريع 1.2 متر',
          safetyLimit: 30,
          unit: 'حبة',
          price: 15,
          category: 'كابلات',
          description: 'كابل مقاوم للقطع ومصنوع من النسيج المتين يدعم نقل البيانات والشحن السريع.',
        }
      ],
      suppliers: [
        {
          id: 'SUP-001',
          name: 'شركة المدي لإكسسوارات الجوالات',
          phone: '0501234567',
          email: 'info@al-mady.com',
          warehouseId: 'WH-001'
        },
        {
          id: 'SUP-002',
          name: 'مؤسسة المنتج الراقي للتجارة',
          phone: '0559876543',
          email: 'sales@raqi-product.com',
          warehouseId: 'WH-001'
        }
      ],
      movements: [
        {
          id: 1001,
          itemId: 'PROD-001',
          quantity: 100,
          type: 'in',
          partner: 'شركة المدي لإكسسوارات الجوالات',
          date: '2026-06-01',
          warehouseId: 'WH-001'
        },
        {
          id: 1002,
          itemId: 'PROD-002',
          quantity: 50,
          type: 'in',
          partner: 'مؤسسة المنتج الراقي للتجارة',
          date: '2026-06-02',
          warehouseId: 'WH-001'
        },
        {
          id: 1003,
          itemId: 'PROD-003',
          quantity: 200,
          type: 'in',
          partner: 'شركة المدي لإكسسوارات الجوالات',
          date: '2026-06-03',
          warehouseId: 'WH-001'
        },
        {
          id: 1004,
          itemId: 'PROD-001',
          quantity: 20,
          type: 'out',
          partner: 'شركة الوفاء للاتصالات',
          date: '2026-06-10',
          warehouseId: 'WH-001'
        },
        {
          id: 1005,
          itemId: 'PROD-002',
          quantity: 42,
          type: 'out',
          partner: 'مكتبة جرير',
          date: '2026-06-12',
          warehouseId: 'WH-001'
        },
        {
          id: 1006,
          itemId: 'PROD-003',
          quantity: 180,
          type: 'out',
          partner: 'المدى المتقدم لخدمات الجوال',
          date: '2026-06-15',
          warehouseId: 'WH-001'
        }
      ],
      groups: [
        { name: "شواحن", code: "CHG", description: "شواحن جدارية ومتنقلة سريعة" },
        { name: "سماعات", code: "HPH", description: "سماعات لاسلكية وسلكية ومكبرات صوت" },
        { name: "كابلات", code: "CBL", description: "كابلات شحن ونقل بيانات متنوعة" }
      ],
      warehouses: [
        {
          id: 'WH-001',
          name: 'المستودع الرئيسي - الرياض',
          manager: 'Owner',
          location: 'الرياض - حي الملز',
        },
        {
          id: 'WH-002',
          name: 'مستودع الغربية - جدة',
          manager: 'admin',
          location: 'جدة - المنطقة الصناعية',
        }
      ],
      transfers: [
        {
          id: 'TR-1001',
          fromWarehouseId: 'WH-001',
          toWarehouseId: 'WH-002',
          itemId: 'PROD-001',
          quantity: 15,
          status: 'pending',
          date: '2026-06-25',
          createdBy: 'Owner',
          handledBy: 'admin',
        }
      ],
      auditLogs: [
        {
          id: 'log-1',
          username: 'System',
          role: 'Owner',
          action: 'other',
          entityType: 'system',
          details: 'تهيئة النظام وتثبيت الإعدادات الافتراضية للمستودع',
          date: '2026-06-27T10:00:00.000Z'
        }
      ]
    }
  };

  try {
    let db = defaultDB;
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      try {
        db = JSON.parse(data);
      } catch (e) {
        db = defaultDB;
      }
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), "utf-8");
      return defaultDB;
    }

    // Auto Migration: Ensure critical properties and types exist in DB
    if (!db.users) db.users = defaultDB.users;
    if (!db.warehouseData) db.warehouseData = defaultDB.warehouseData;
    
    if (!db.warehouseData.items) db.warehouseData.items = defaultDB.warehouseData.items;
    if (!db.warehouseData.movements) db.warehouseData.movements = defaultDB.warehouseData.movements;
    if (!db.warehouseData.suppliers) db.warehouseData.suppliers = defaultDB.warehouseData.suppliers;
    if (!db.warehouseData.groups) db.warehouseData.groups = defaultDB.warehouseData.groups;

    if (!db.warehouseData.warehouses) {
      db.warehouseData.warehouses = defaultDB.warehouseData.warehouses;
    }
    if (!db.warehouseData.transfers) {
      db.warehouseData.transfers = defaultDB.warehouseData.transfers;
    }
    if (!db.warehouseData.auditLogs) {
      db.warehouseData.auditLogs = defaultDB.warehouseData.auditLogs;
    }

    // Support admin account by default if not exists, for testing manager flow
    const hasAdmin = db.users.some((u: any) => u.username.toLowerCase() === "admin");
    if (!hasAdmin) {
      db.users.push({
        username: "admin",
        password: "admin",
        role: "Admin",
        permissions: {
          items: "write",
          movements: "write",
          reports: "read",
          suppliers: "write",
          settings: "write",
          warehouses: "write",
          transfers: "write"
        },
        warehouseId: "WH-002",
        maxDevices: 5
      });
    }

    db.users.forEach((u: any) => {
      if (!u.permissions) {
        u.permissions = {
          items: "write",
          movements: "write",
          reports: "read",
          suppliers: "write",
          settings: "write"
        };
      }
      if (!u.permissions.warehouses) {
        u.permissions.warehouses = u.role === "Owner" || u.role === "Admin" ? "write" : "read";
      }
      if (!u.permissions.transfers) {
        u.permissions.transfers = u.role === "Viewer" ? "read" : "write";
      }
      if (!u.warehouseId) {
        u.warehouseId = u.username.toLowerCase() === "owner" ? "WH-001" : "WH-002";
      }
      if (!u.maxDevices) {
        u.maxDevices = u.role === "Owner" ? 10 : (u.role === "Admin" ? 5 : 1);
      }
    });

    writeDB(db);
    return db;
  } catch (error) {
    console.error("Error reading/migrating database file, using fallback:", error);
    return defaultDB;
  }
}

// Helper to write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Ensure database is initialized on boot
readDB();

// API Endpoints

// Active sessions tracker: username -> array of active deviceIds
const activeSessions: Record<string, string[]> = {};

// Login endpoint
app.post("/api/auth/login", (req, res) => {
  const { username, password, deviceId } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "اسم المستخدم وكلمة المرور مطلوبة" });
  }

  const db = readDB();
  const user = db.users.find(
    (u: any) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password.trim() === password.trim()
  );

  if (!user) {
    return res.status(401).json({ success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  }

  // Enforce maxDevices limit
  const uName = user.username.toLowerCase();
  const maxDevices = user.maxDevices || 1;
  
  if (!activeSessions[uName]) {
    activeSessions[uName] = [];
  }

  if (deviceId) {
    const hasDevice = activeSessions[uName].includes(deviceId);
    if (!hasDevice) {
      if (activeSessions[uName].length >= maxDevices) {
        return res.status(403).json({
          success: false,
          error: `⚠️ عذراً، تجاوزت الحد الأقصى للأجهزة المفتوحة في نفس الوقت لهذا الحساب وهو (${maxDevices}) أجهزة.`
        });
      }
      activeSessions[uName].push(deviceId);
    }
  }

  res.json({
    success: true,
    user: {
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      warehouseId: user.warehouseId,
      maxDevices: user.maxDevices || 1
    }
  });
});

// Verify password endpoint for critical operations (like database reset)
app.post("/api/auth/verify-reset", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "البيانات ناقصة" });
  }

  const db = readDB();
  const user = db.users.find(
    (u: any) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password.trim() === password.trim()
  );

  if (!user) {
    return res.status(401).json({ success: false, error: "كلمة المرور غير صحيحة للتأكيد" });
  }

  res.json({ success: true });
});

// Logout / session release endpoint
app.post("/api/auth/logout", (req, res) => {
  const { username, deviceId } = req.body;
  if (username && deviceId) {
    const uName = username.toLowerCase();
    if (activeSessions[uName]) {
      activeSessions[uName] = activeSessions[uName].filter(id => id !== deviceId);
    }
  }
  res.json({ success: true });
});

// Reset sessions for user
app.post("/api/auth/reset-sessions", (req, res) => {
  const { username } = req.body;
  if (username) {
    activeSessions[username.toLowerCase()] = [];
  }
  res.json({ success: true });
});

// Users management endpoints (List Users)
app.get("/api/users", (req, res) => {
  const db = readDB();
  const safeUsers = db.users.map((u: any) => ({
    username: u.username,
    role: u.role,
    permissions: u.permissions,
    warehouseId: u.warehouseId,
    password: u.password, // included for easy management in this local tool
    maxDevices: u.maxDevices || 1,
    activeDevicesCount: activeSessions[u.username.toLowerCase()]?.length || 0
  }));
  res.json(safeUsers);
});

// Create user
app.post("/api/users", (req, res) => {
  const { username, password, role, permissions, warehouseId, maxDevices } = req.body;
  if (!username || !password || !role || !permissions) {
    return res.status(400).json({ success: false, error: "جميع حقول المستخدم مطلوبة" });
  }

  const db = readDB();
  const exists = db.users.some((u: any) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ success: false, error: "اسم المستخدم هذا موجود بالفعل" });
  }

  const newUser = {
    username: username.trim(),
    password,
    role,
    permissions,
    warehouseId: warehouseId || "WH-001",
    maxDevices: Number(maxDevices) || 1
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ 
    success: true, 
    user: { 
      username: newUser.username, 
      role: newUser.role, 
      permissions: newUser.permissions,
      warehouseId: newUser.warehouseId,
      maxDevices: newUser.maxDevices
    } 
  });
});

// Update user
app.put("/api/users/:username", (req, res) => {
  const targetUsername = req.params.username;
  const { password, role, permissions, warehouseId, maxDevices } = req.body;

  const db = readDB();
  const userIndex = db.users.findIndex((u: any) => u.username.toLowerCase() === targetUsername.toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: "المستخدم غير موجود" });
  }

  // Prevent modifying the core Owner user's critical properties to lock yourself out
  if (targetUsername.toLowerCase() === "owner") {
    if (password) db.users[userIndex].password = password;
    if (warehouseId) db.users[userIndex].warehouseId = warehouseId;
    if (maxDevices !== undefined) db.users[userIndex].maxDevices = Number(maxDevices);
  } else {
    if (password) db.users[userIndex].password = password;
    if (role) db.users[userIndex].role = role;
    if (permissions) db.users[userIndex].permissions = permissions;
    if (warehouseId) db.users[userIndex].warehouseId = warehouseId;
    if (maxDevices !== undefined) db.users[userIndex].maxDevices = Number(maxDevices);
  }

  writeDB(db);
  res.json({ 
    success: true, 
    user: { 
      username: db.users[userIndex].username, 
      role: db.users[userIndex].role, 
      permissions: db.users[userIndex].permissions,
      warehouseId: db.users[userIndex].warehouseId,
      maxDevices: db.users[userIndex].maxDevices || 1
    } 
  });
});

// Delete user
app.delete("/api/users/:username", (req, res) => {
  const targetUsername = req.params.username;
  if (targetUsername.toLowerCase() === "owner") {
    return res.status(400).json({ success: false, error: "لا يمكن حذف المستخدم المالك الرئيسي" });
  }

  const db = readDB();
  const initialLength = db.users.length;
  db.users = db.users.filter((u: any) => u.username.toLowerCase() !== targetUsername.toLowerCase());

  if (db.users.length === initialLength) {
    return res.status(404).json({ success: false, error: "المستخدم غير موجود" });
  }

  writeDB(db);
  res.json({ success: true });
});

// Data Pull
app.get("/api/sync/pull", (req, res) => {
  const db = readDB();
  res.json(db.warehouseData);
});

// Data Push / Sync
app.post("/api/sync/push", (req, res) => {
  const { items, movements, suppliers, warehouses, transfers, auditLogs, groups } = req.body;
  if (!items || !movements || !suppliers) {
    return res.status(400).json({ success: false, error: "بيانات المزامنة غير مكتملة" });
  }

  const db = readDB();
  
  // Overwrite or selectively merge
  db.warehouseData = {
    items,
    movements,
    suppliers,
    warehouses: warehouses || db.warehouseData.warehouses || [],
    transfers: transfers || db.warehouseData.transfers || [],
    auditLogs: auditLogs || db.warehouseData.auditLogs || [],
    groups: groups || db.warehouseData.groups || []
  };

  writeDB(db);
  res.json({ success: true, warehouseData: db.warehouseData });
});

// Vite Middleware integration for SPA development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
