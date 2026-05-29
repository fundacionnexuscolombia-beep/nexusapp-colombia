// auditService.ts
// Captures runtime errors, network errors, and health checks for the Audit Panel.

export interface AuditLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'success';
  category: 'js_error' | 'network' | 'supabase' | 'health' | 'manual';
  title: string;
  detail?: string;
  stack?: string;
}

export interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'warning' | 'checking';
  latencyMs?: number;
  detail?: string;
}

const STORAGE_KEY = 'nexus_audit_logs';
const MAX_LOGS = 200;

const generateId = () => Math.random().toString(36).substring(2, 10);

function getLogs(): AuditLog[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLogs(logs: AuditLog[]): void {
  try {
    // Keep only the last MAX_LOGS entries
    const trimmed = logs.slice(-MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // If storage is full, clear and start fresh
    localStorage.removeItem(STORAGE_KEY);
  }
}

function addLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
  const logs = getLogs();
  logs.push({
    ...log,
    id: generateId(),
    timestamp: new Date().toISOString(),
  });
  saveLogs(logs);
}

// Initialize global error listeners
let initialized = false;
function initListeners() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Catch all unhandled JS errors
  window.addEventListener('error', (event) => {
    addLog({
      level: 'error',
      category: 'js_error',
      title: event.message || 'Error JS desconocido',
      detail: `${event.filename}:${event.lineno}:${event.colno}`,
      stack: event.error?.stack,
    });
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    addLog({
      level: 'error',
      category: 'js_error',
      title: reason?.message || 'Rechazo de promesa no manejado',
      detail: typeof reason === 'string' ? reason : JSON.stringify(reason),
      stack: reason?.stack,
    });
  });

  // Intercept fetch for network error logging
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let url = '';
    try {
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] && typeof args[0] === 'object') {
        if ('url' in args[0]) {
          url = (args[0] as any).url;
        } else if (typeof args[0].toString === 'function') {
          url = args[0].toString();
        }
      }
    } catch {
      url = 'unknown';
    }

    const start = Date.now();
    try {
      const response = await originalFetch(...args);
      const latency = Date.now() - start;
      if (!response.ok && response.status >= 400) {
        let path = url;
        try {
          path = new URL(url, window.location.origin).pathname;
        } catch {}
        addLog({
          level: response.status >= 500 ? 'error' : 'warning',
          category: 'network',
          title: `HTTP ${response.status} en ${path}`,
          detail: `${url} — ${latency}ms`,
        });
      }
      return response;
    } catch (err: any) {
      addLog({
        level: 'error',
        category: 'network',
        title: `Error de red: ${err.message}`,
        detail: url || 'unknown',
      });
      throw err;
    }
  };
}

async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // 1. Supabase REST check
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    const start = Date.now();
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?limit=1`, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      checks.push({
        name: 'Base de Datos (Supabase)',
        status: res.ok ? 'ok' : 'error',
        latencyMs: Date.now() - start,
        detail: res.ok ? 'Conexión establecida' : `HTTP ${res.status}`,
      });
    } catch (e: any) {
      checks.push({ name: 'Base de Datos (Supabase)', status: 'error', detail: e.message });
    }
  } else {
    checks.push({ name: 'Base de Datos (Supabase)', status: 'error', detail: 'URL no configurada' });
  }

  // 2. Google Sheets (Contenido académico)
  const sheetsUrl = import.meta.env.VITE_SHEETS_URL || import.meta.env.VITE_GOOGLE_SHEET_ID;
  if (sheetsUrl) {
    const start = Date.now();
    try {
      const res = await fetch(sheetsUrl, { method: 'HEAD' });
      checks.push({
        name: 'Contenido Académico (Sheets)',
        status: res.ok ? 'ok' : 'warning',
        latencyMs: Date.now() - start,
        detail: res.ok ? 'Accesible' : `HTTP ${res.status}`,
      });
    } catch {
      checks.push({ name: 'Contenido Académico (Sheets)', status: 'warning', detail: 'No se pudo verificar' });
    }
  }

  // 3. LocalStorage availability
  try {
    localStorage.setItem('nexus_health_test', '1');
    localStorage.removeItem('nexus_health_test');
    checks.push({ name: 'Almacenamiento Local', status: 'ok', detail: 'Disponible' });
  } catch {
    checks.push({ name: 'Almacenamiento Local', status: 'error', detail: 'No disponible (modo privado?)' });
  }

  // 4. Network connectivity
  checks.push({
    name: 'Conectividad de Red',
    status: navigator.onLine ? 'ok' : 'error',
    detail: navigator.onLine ? 'En línea' : 'Sin conexión',
  });

  return checks;
}

export const auditService = {
  init: initListeners,
  getLogs,
  clearLogs: () => localStorage.removeItem(STORAGE_KEY),
  addLog,
  runHealthChecks,
};
