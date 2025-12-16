import React, { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import {
  collection,
  addDoc,
  query,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  deleteDoc,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";

// ✅ En tu repo real:
// import logoImg from "./logo.png";
// import { auth, db } from "./firebaseConfig";

import logoImg from "./logo.png";
import { auth, db } from "./firebaseConfig";

import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  ShieldAlert,
  FileText,
  CheckCircle,
  Users,
  History,
  AlertCircle,
  Chrome,
  Eye,
  EyeOff,
  Printer,
  FileBarChart,
  Lock,
  Settings,
  RefreshCcw,
  Key,
  UserPlus,
  Mail,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ======================
// Config / Colecciones
// ======================
const DEFAULT_ADMIN_CODE = "123456";
const MASTER_EMAIL = "master@master.es";

const COLLECTION_USERS = "users";
const COLLECTION_LOGS = "logs";
const COLLECTION_REQUESTS = "requests";
const COLLECTION_SETTINGS = "settings";
const COLLECTION_ADMIN_INVITES = "admin_invites";

// ======================
// i18n simple (ES) + normalización
// ======================
const t = {
  role: { admin: "Administrador", employee: "Empleado" },
  status: { active: "Activo", pending: "Pendiente", inactive: "Inactivo" },
  requestStatus: { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" },
  logType: { in: "Entrada", out: "Salida", break_start: "Inicio de pausa", break_end: "Fin de pausa" },
};

const roleToEs = (role) => t.role[role] ?? (role || "");
const statusToEs = (status) => t.status[status] ?? (status || "");
const requestStatusToEs = (s) => t.requestStatus[s] ?? (s || "");
const logTypeToEs = (type) => t.logType[type] ?? (type || "");

const toEsDateTime = (ts) => {
  if (!ts) return "";
  if (typeof ts?.toDate === "function") return ts.toDate().toLocaleString("es-ES");
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toLocaleString("es-ES");
  if (ts instanceof Date) return ts.toLocaleString("es-ES");
  return "";
};

const pad2 = (n) => String(n).padStart(2, "0");

const toISODateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const fromISODateKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const minutesToHHMM = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${pad2(m)}m`;
};

// ======================
// Estilo visual (Material-like / alto contraste)
// ======================
const UI = {
  page: "min-h-[100dvh] bg-[#f6f7fb] text-slate-900",
  card: "bg-white rounded-2xl shadow-sm border border-slate-200",
  cardHeader: "px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl",
  tableHead: "bg-slate-50 text-slate-700",
  row: "border-t border-slate-100 hover:bg-slate-50/60",
  cell: "px-5 py-4 text-slate-900",
  nameCell: "px-5 py-4 font-semibold text-slate-900",
  badgeBase: "px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-wide",
  input:
    "w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500",
  inputCompact:
    "px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500",
  buttonPrimary:
    "bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-sm px-4 py-2.5",
  buttonOutline:
    "border border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold rounded-xl px-4 py-2.5",
};

const userStatusBadgeClass = (status) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "inactive":
      return "bg-gray-200 text-gray-800 border-gray-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const requestStatusBadgeClass = (status) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const logTypeBadgeClass = (type) => {
  switch (type) {
    case "in":
      return "bg-green-100 text-green-800 border-green-200";
    case "out":
      return "bg-red-100 text-red-800 border-red-200";
    case "break_start":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "break_end":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// ======================
// Cálculo de horas por día desde logs
// ======================
/**
 * Reglas:
 * - Tiempo dentro del club = in -> out, restando pausas (break_start -> break_end).
 * - Si falta el OUT (in abierto): NO suma ese tramo (criterio conservador).
 * - Además, marca el/los días afectados como "INCOMPLETO" para pintar en rojo
 *   (calendario usuario + informe admin).
 *
 * Parámetro rangeEnd (Date): fin del rango mostrado (p.ej., fin de mes o fin de informe).
 */
const computeDailyPresence = (logs, rangeEnd = null) => {
  const sorted = [...logs].sort((a, b) => {
    const da = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
    const dbb = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
    return da - dbb;
  });

  const minutesByDay = new Map(); // YYYY-MM-DD -> minutes
  const incompleteDays = new Set(); // YYYY-MM-DD

  let state = "out";
  let inStart = null;
  let breakStart = null;
  let breakMinutesAcc = 0;

  const addMinutes = (dayKey, mins) => {
    const prev = minutesByDay.get(dayKey) || 0;
    minutesByDay.set(dayKey, prev + Math.max(0, mins));
  };

  const addIntervalByDay = (start, end, minutesToSubtract) => {
    let s = new Date(start);
    const e = new Date(end);
    if (e <= s) return;

    while (s < e) {
      const dayKey = toISODateKey(s);
      const dayEnd = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999);
      const sliceEnd = e < dayEnd ? e : dayEnd;
      const mins = Math.floor((sliceEnd - s) / 60000);
      addMinutes(dayKey, mins);
      s = new Date(sliceEnd.getTime() + 1);
    }

    // Restamos pausas de forma simple al día del OUT (estable)
    if (minutesToSubtract > 0) {
      const key = toISODateKey(end);
      const prev = minutesByDay.get(key) || 0;
      minutesByDay.set(key, Math.max(0, prev - minutesToSubtract));
    }
  };

  for (const log of sorted) {
    const type = log.type;
    const dt = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp?.seconds ? log.timestamp.seconds * 1000 : 0);

    if (type === "in") {
      if (state === "out") {
        state = "in";
        inStart = dt;
        breakStart = null;
        breakMinutesAcc = 0;
      }
      continue;
    }

    if (type === "break_start") {
      if (state === "in") {
        state = "break";
        breakStart = dt;
      }
      continue;
    }

    if (type === "break_end") {
      if (state === "break" && breakStart) {
        const mins = Math.max(0, Math.floor((dt - breakStart) / 60000));
        breakMinutesAcc += mins;
        state = "in";
        breakStart = null;
      }
      continue;
    }

    if (type === "out") {
      if ((state === "in" || state === "break") && inStart) {
        addIntervalByDay(inStart, dt, breakMinutesAcc);
      }
      state = "out";
      inStart = null;
      breakStart = null;
      breakMinutesAcc = 0;
      continue;
    }
  }

  // Si queda una entrada abierta: NO SUMAR, pero marcar días como incompletos (rojo)
  if (inStart) {
    const end = rangeEnd ? new Date(rangeEnd) : new Date(inStart);
    let cur = new Date(inStart);
    cur.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);

    while (cur <= last) {
      incompleteDays.add(toISODateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  return { minutesByDay, incompleteDays };
};

// ======================
// Consultas Firestore por rango de fechas (logs)
// ======================
const fetchLogsInRange = async ({ startDate, endDate, userId = null }) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  let qRef;
  if (userId) {
    qRef = query(
      collection(db, COLLECTION_LOGS),
      where("userId", "==", userId),
      where("timestamp", ">=", startTs),
      where("timestamp", "<=", endTs),
      orderBy("timestamp", "asc")
    );
  } else {
    qRef = query(
      collection(db, COLLECTION_LOGS),
      where("timestamp", ">=", startTs),
      where("timestamp", "<=", endTs),
      orderBy("timestamp", "asc")
    );
  }

  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ======================
// UI: Logo / Loading
// ======================
const Logo = () => (
  <div className="flex items-center justify-center mb-6">
    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow border border-gray-200 overflow-hidden">
      <img src={logoImg} alt="Logo Club" className="w-full h-full object-cover" />
    </div>
  </div>
);

const Loading = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
  </div>
);

// ======================
// AuthScreen
// ======================
const AuthScreen = ({ onCompleteProfile, currentUser }) => {
  const [authMode, setAuthMode] = useState("login");
  const [isAdminMode, setIsAdminMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const [name, setName] = useState(currentUser?.displayName || "");
  const [role, setRole] = useState("employee");
  const [adminCode, setAdminCode] = useState("");

  useEffect(() => {
    if (currentUser?.displayName) setName(currentUser.displayName);
  }, [currentUser]);

  const handleForgotPassword = async () => {
    setError("");
    setResetMessage("");
    if (!email) return setError("Escribe tu correo electrónico primero.");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage(`Se ha enviado un correo a ${email} para restablecer tu contraseña.`);
    } catch (err) {
      console.error(err);
      setError("Error al enviar el correo. Verifica el email.");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setResetMessage("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error(err);
      setError("Error con Google. Intenta de nuevo.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setResetMessage("");
    if (!email || !password) return setError("Completa email y contraseña.");

    try {
      if (authMode === "login") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError("Error de autenticación. Revisa credenciales.");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Ingresa tu nombre completo.");

    let finalRole = role;
    let finalStatus = "pending";

    if (finalRole === "admin") {
      if (currentUser?.email === MASTER_EMAIL) {
        finalStatus = "active";
      } else {
        try {
          const inviteRef = doc(db, COLLECTION_ADMIN_INVITES, (currentUser?.email || "").toLowerCase());
          const inviteSnap = await getDoc(inviteRef);

          if (inviteSnap.exists()) {
            finalStatus = "active";
          } else {
            const settingsRef = doc(db, COLLECTION_SETTINGS, "admin_config");
            const settingsSnap = await getDoc(settingsRef);

            let currentAdminCode = DEFAULT_ADMIN_CODE;
            if (settingsSnap.exists() && settingsSnap.data()?.code) currentAdminCode = settingsSnap.data().code;

            if (adminCode !== currentAdminCode) return setError("Código de administrador incorrecto.");
            finalStatus = "active";
          }
        } catch (err) {
          console.error(err);
          return setError("Error verificando acceso admin.");
        }
      }
    }

    onCompleteProfile({
      name,
      role: finalRole,
      status: finalRole === "admin" ? finalStatus : "pending",
    });
  };

  if (!currentUser) {
    return (
      <div className={`min-h-[100dvh] w-full flex items-center justify-center p-4 ${isAdminMode ? "bg-slate-900" : "bg-gray-100"}`}>
        <div className={`${UI.card} w-full max-w-lg p-8`}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">
              {isAdminMode ? "Portal de Administración" : "Control de Acceso"}
            </h1>
            <button
              type="button"
              onClick={() => setIsAdminMode((v) => !v)}
              className="text-xs text-gray-800 hover:text-gray-900 underline inline-flex items-center gap-1"
            >
              <Lock size={14} /> {isAdminMode ? "Modo usuario" : "Modo admin"}
            </button>
          </div>

          <Logo />

          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-md ${authMode === "login" ? "bg-white text-gray-900 shadow" : "text-gray-800"}`}
              onClick={() => setAuthMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-md ${authMode === "register" ? "bg-white text-gray-900 shadow" : "text-gray-800"}`}
              onClick={() => setAuthMode("register")}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Correo electrónico</label>
              <input
                type="email"
                className={UI.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@club.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${UI.input} pr-10`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-gray-700 hover:text-gray-900"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {authMode === "login" && (
                <div className="text-right mt-1">
                  <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-800 hover:text-blue-900 underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-900 text-sm rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            {resetMessage && (
              <div className="p-3 bg-green-50 text-green-900 text-sm rounded-lg border border-green-200 flex items-center gap-2">
                <CheckCircle size={16} /> {resetMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl shadow flex items-center justify-center gap-2"
            >
              {authMode === "login" ? "Entrar" : "Crear cuenta"} <LogIn size={18} />
            </button>
          </form>

          <div className="mt-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-800">O continúa con</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full mt-4 bg-white border border-gray-300 text-gray-900 font-bold py-3 rounded-xl hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2"
            >
              <Chrome size={18} /> Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-100 flex items-center justify-center p-4">
      <div className={`${UI.card} w-full max-w-lg p-8`}>
        <Logo />
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Completar perfil</h2>
        <p className="text-center text-gray-800 mb-6">Necesitamos unos datos más para continuar.</p>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Nombre completo</label>
            <input
              type="text"
              className={UI.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Pedro Moya"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("employee")}
                className={`py-2 px-4 rounded-lg border ${role === "employee" ? "bg-blue-50 border-blue-300 text-blue-900 font-semibold" : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"}`}
              >
                {t.role.employee}
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`py-2 px-4 rounded-lg border ${role === "admin" ? "bg-purple-50 border-purple-300 text-purple-900 font-semibold" : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"}`}
              >
                {t.role.admin}
              </button>
            </div>
          </div>

          {role === "admin" && currentUser?.email !== MASTER_EMAIL && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Código de administrador</label>
              <input
                type="password"
                className={UI.input}
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Introduce el código"
              />
              <p className="text-xs text-gray-800 mt-1">Si no tienes código, solicita invitación a otro administrador.</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-900 text-sm rounded-lg border border-red-200 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => signOut(auth)} className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 rounded-xl">
              Cancelar
            </button>
            <button type="submit" className="w-2/3 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl shadow flex items-center justify-center gap-2">
              Guardar y entrar <CheckCircle size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================
// Calendario mensual (Usuario)
// ======================
const MonthlyCalendar = ({ year, monthIndex, minutesByDay, incompleteDays }) => {
  const firstDay = new Date(year, monthIndex, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const dow = ["L", "M", "X", "J", "V", "S", "D"];
  const totalMonthMinutes = Array.from(minutesByDay.values()).reduce((a, b) => a + b, 0);

  return (
    <div className={`${UI.card} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-blue-800" />
          <h3 className="text-lg font-semibold text-gray-900">
            {new Date(year, monthIndex, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </h3>
        </div>
        <div className="text-sm font-semibold text-gray-900">
          Total mes: <span className="text-blue-900">{minutesToHHMM(totalMonthMinutes)}</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs font-bold text-gray-800 mb-2">
        {dow.map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} className="h-20 rounded-lg bg-gray-50 border border-gray-200" />;

          const key = toISODateKey(date);
          const mins = minutesByDay.get(key) || 0;
          const isIncomplete = incompleteDays.has(key);

          const baseClass = "h-20 rounded-lg border p-2";
          const className = isIncomplete
            ? `${baseClass} bg-red-50 border-red-300`
            : mins > 0
              ? `${baseClass} bg-white border-blue-200`
              : `${baseClass} bg-gray-50 border-gray-200`;

          return (
            <div key={idx} className={className} title={isIncomplete ? "Registro incompleto: falta salida" : ""}>
              <div className={`text-sm font-semibold ${isIncomplete ? "text-red-900" : "text-gray-900"}`}>
                {date.getDate()}
              </div>

              <div className={`mt-1 text-xs font-semibold ${isIncomplete ? "text-red-800" : mins > 0 ? "text-blue-900" : "text-gray-700"}`}>
                {mins > 0 ? minutesToHHMM(mins) : "0h 00m"}
              </div>

              {isIncomplete && (
                <div className="mt-1 text-[10px] font-bold text-red-900">
                  INCOMPLETO
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-gray-800">
        Días en <span className="font-bold text-red-900">rojo</span>: existe una <span className="font-bold">Entrada</span> sin <span className="font-bold">Salida</span>. Ese tramo no se suma.
      </div>
    </div>
  );
};

// ======================
// Panel Empleado
// ======================
const EmployeeDashboard = ({ user, userDocId }) => {
  const [status, setStatus] = useState("out");

  const [logsRecent, setLogsRecent] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [monthLogs, setMonthLogs] = useState([]);
  const [monthLoading, setMonthLoading] = useState(false);

  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionTime, setCorrectionTime] = useState("");
  const [correctionDate, setCorrectionDate] = useState("");

  useEffect(() => {
    if (!userDocId) return;

    const qRef = query(
      collection(db, COLLECTION_LOGS),
      where("userId", "==", userDocId),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    return onSnapshot(qRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLogsRecent(data);

      if (data.length > 0) {
        const last = data[0];
        if (last.type === "in") setStatus("in");
        else if (last.type === "break_start") setStatus("break");
        else if (last.type === "break_end") setStatus("in");
        else setStatus("out");
      } else setStatus("out");
    });
  }, [userDocId]);

  useEffect(() => {
    if (!userDocId) return;
    const qRef = query(
      collection(db, COLLECTION_REQUESTS),
      where("userId", "==", userDocId),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    return onSnapshot(qRef, (snap) => {
      setMyRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [userDocId]);

  useEffect(() => {
    if (!userDocId) return;

    const start = new Date(calYear, calMonth, 1);
    const end = new Date(calYear, calMonth + 1, 0);
    end.setHours(23, 59, 59, 999);

    (async () => {
      setMonthLoading(true);
      try {
        const logs = await fetchLogsInRange({ startDate: start, endDate: end, userId: userDocId });
        setMonthLogs(logs);
      } catch (e) {
        console.error(e);
        setMonthLogs([]);
      } finally {
        setMonthLoading(false);
      }
    })();
  }, [userDocId, calYear, calMonth]);

  const monthRangeEnd = useMemo(() => {
    const end = new Date(calYear, calMonth + 1, 0);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [calYear, calMonth]);

  const { minutesByDay, incompleteDays } = useMemo(
    () => computeDailyPresence(monthLogs, monthRangeEnd),
    [monthLogs, monthRangeEnd]
  );

  const handleClockAction = async (type) => {
    if (user.status !== "active") return;
    await addDoc(collection(db, COLLECTION_LOGS), {
      userId: userDocId,
      userName: user.name || "Usuario",
      type,
      timestamp: serverTimestamp(),
      dateString: new Date().toLocaleDateString("es-ES"),
    });
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionDate || !correctionTime || !correctionReason) return;

    await addDoc(collection(db, COLLECTION_REQUESTS), {
      userId: userDocId,
      userName: user.name || "Usuario",
      date: correctionDate,
      time: correctionTime,
      reason: correctionReason,
      status: "pending",
      timestamp: serverTimestamp(),
    });

    setShowCorrection(false);
    setCorrectionReason("");
    setCorrectionTime("");
    setCorrectionDate("");
    alert("Solicitud enviada.");
  };

  if (user.status === "pending") {
    return (
      <div className={`${UI.page} flex flex-col items-center justify-center p-6 text-center`}>
        <Clock className="w-14 h-14 text-yellow-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Cuenta pendiente</h2>
        <p className="text-gray-800 mt-2 max-w-md">Tu cuenta está pendiente de aprobación por un administrador.</p>
        <button onClick={() => signOut(auth)} className="mt-6 text-blue-800 underline text-sm">
          Cerrar sesión
        </button>
      </div>
    );
  }

  const thirdActionType = status === "break" ? "break_end" : "out";
  const thirdActionLabel = status === "break" ? "Volver" : "Salida";

  const goPrevMonth = () => {
    const d = new Date(calYear, calMonth, 1);
    d.setMonth(d.getMonth() - 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  };

  const goNextMonth = () => {
    const d = new Date(calYear, calMonth, 1);
    d.setMonth(d.getMonth() + 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  };

  return (
    <div className={`${UI.page} pb-10`}>
      <header className="bg-blue-900 text-white p-4 shadow">
        <div className="w-full px-4 md:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full overflow-hidden">
              <img src={logoImg} className="w-full h-full object-cover" alt="Logo" />
            </div>
            <div>
              <div className="font-bold text-lg">{user.name}</div>
              <div className="text-blue-200 text-xs">Panel de usuario</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="bg-blue-800 px-3 py-2 rounded hover:bg-blue-700" aria-label="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="w-full px-4 md:px-8 py-6 space-y-6">
        <div className={`${UI.card} p-6`}>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="text-blue-800" /> Control de acceso
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleClockAction("in")}
              disabled={status === "in" || status === "break"}
              className={`p-6 rounded-xl border font-bold flex flex-col items-center gap-2 ${
                status === "out"
                  ? "bg-green-50 border-green-200 text-green-900 hover:bg-green-100"
                  : "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
              }`}
            >
              <LogIn size={34} /> Entrada
            </button>

            <button
              onClick={() => handleClockAction("break_start")}
              disabled={status !== "in"}
              className={`p-6 rounded-xl border font-bold flex flex-col items-center gap-2 ${
                status === "in"
                  ? "bg-yellow-50 border-yellow-200 text-yellow-900 hover:bg-yellow-100"
                  : "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
              }`}
            >
              <Coffee size={34} /> Pausa
            </button>

            <button
              onClick={() => handleClockAction(thirdActionType)}
              disabled={status === "out"}
              className={`p-6 rounded-xl border font-bold flex flex-col items-center gap-2 ${
                status !== "out"
                  ? "bg-red-50 border-red-200 text-red-900 hover:bg-red-100"
                  : "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
              }`}
            >
              <LogOut size={34} /> {thirdActionLabel}
            </button>
          </div>

          <div className="mt-5 text-center">
            <span
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border ${
                status === "in"
                  ? "bg-green-100 text-green-900 border-green-200"
                  : status === "break"
                  ? "bg-yellow-100 text-yellow-900 border-yellow-200"
                  : "bg-gray-100 text-gray-900 border-gray-200"
              }`}
            >
              Estado actual: {status === "in" ? "TRABAJANDO" : status === "break" ? "EN PAUSA" : "FUERA"}
            </span>
          </div>
        </div>

        <div className={`${UI.card} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="text-blue-800" size={20} /> Calendario mensual de horas
            </h2>

            <div className="flex items-center gap-2">
              <button onClick={goPrevMonth} className="px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 text-gray-900" aria-label="Mes anterior">
                <ChevronLeft size={18} />
              </button>
              <div className="font-semibold text-gray-900 min-w-[180px] text-center">
                {new Date(calYear, calMonth, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
              </div>
              <button onClick={goNextMonth} className="px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 text-gray-900" aria-label="Mes siguiente">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {monthLoading ? (
            <div className="py-10 text-center text-gray-900">Cargando calendario…</div>
          ) : (
            <MonthlyCalendar year={calYear} monthIndex={calMonth} minutesByDay={minutesByDay} incompleteDays={incompleteDays} />
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={() => setShowCorrection((v) => !v)} className="text-blue-800 hover:text-blue-900 underline text-sm inline-flex items-center gap-2">
            <AlertCircle size={16} /> ¿Olvidaste fichar? Solicitar corrección
          </button>
        </div>

        {showCorrection && (
          <div className={`${UI.card} p-6`}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Solicitud de corrección manual</h3>
            <form onSubmit={submitCorrection} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="date"
                  required
                  className={UI.inputCompact}
                  value={correctionDate}
                  onChange={(e) => setCorrectionDate(e.target.value)}
                />
                <input
                  type="time"
                  required
                  className={UI.inputCompact}
                  value={correctionTime}
                  onChange={(e) => setCorrectionTime(e.target.value)}
                />
              </div>
              <textarea
                required
                className={UI.inputCompact}
                rows={3}
                placeholder="Motivo…"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCorrection(false)} className="px-4 py-2 rounded border border-gray-200 hover:bg-gray-50 text-gray-900">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-900 hover:bg-blue-800 text-white font-bold">
                  Enviar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${UI.card} p-6 h-96 flex flex-col`}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History size={18} className="text-blue-800" /> Últimos registros
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {logsRecent.map((log) => (
                <div key={log.id} className="p-3 rounded border border-gray-200 bg-white flex justify-between items-center">
                  <span className="font-semibold text-gray-900">{logTypeToEs(log.type)}</span>
                  <span className="text-sm text-gray-800">{toEsDateTime(log.timestamp)}</span>
                </div>
              ))}
              {logsRecent.length === 0 && <div className="text-gray-800">No hay registros todavía.</div>}
            </div>
          </div>

          <div className={`${UI.card} p-6 h-96 flex flex-col`}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-800" /> Mis solicitudes
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {myRequests.map((req) => (
                <div key={req.id} className="p-3 rounded border border-gray-200 bg-white">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-gray-900">
                      {req.date} {req.time}
                    </div>
                    <span className={`${UI.badgeBase} ${requestStatusBadgeClass(req.status)}`}>
                      {requestStatusToEs(req.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-900 italic">"{req.reason}"</div>
                </div>
              ))}
              {myRequests.length === 0 && <div className="text-gray-800">No hay solicitudes.</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ======================
// Informe Admin (rojo incompleto)
// ======================
const AdminAttendanceReport = ({ users }) => {
  const [mode, setMode] = useState("week");
  const [anchorDate, setAnchorDate] = useState(toISODateKey(new Date()));
  const [monthValue, setMonthValue] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });
  const [yearValue, setYearValue] = useState(() => String(new Date().getFullYear()));

  const [loading, setLoading] = useState(false);
  const [tableDays, setTableDays] = useState([]);
  const [minutesByUserByDay, setMinutesByUserByDay] = useState({});
  const [incompleteByUser, setIncompleteByUser] = useState({});

  const resolveRange = () => {
    const d = new Date();
    if (mode === "week") {
      const base = fromISODateKey(anchorDate);
      const dow = (base.getDay() + 6) % 7;
      const start = new Date(base);
      start.setDate(base.getDate() - dow);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const dd = new Date(start);
        dd.setDate(start.getDate() + i);
        days.push(toISODateKey(dd));
      }
      return { start, end, days };
    }

    if (mode === "month") {
      const [yy, mm] = monthValue.split("-").map(Number);
      const start = new Date(yy, (mm || 1) - 1, 1);
      const end = new Date(yy, (mm || 1), 0);
      end.setHours(23, 59, 59, 999);

      const days = [];
      const n = new Date(yy, (mm || 1), 0).getDate();
      for (let i = 1; i <= n; i++) days.push(`${yy}-${pad2(mm)}-${pad2(i)}`);
      return { start, end, days };
    }

    const yy = Number(yearValue) || d.getFullYear();
    const start = new Date(yy, 0, 1);
    const end = new Date(yy, 11, 31);
    end.setHours(23, 59, 59, 999);

    const days = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push(toISODateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return { start, end, days };
  };

  const runReport = async () => {
    const { start, end, days } = resolveRange();
    setLoading(true);
    setTableDays(days);

    try {
      const logs = await fetchLogsInRange({ startDate: start, endDate: end, userId: null });

      const byUser = new Map();
      for (const l of logs) {
        const uid = l.userId || "unknown";
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid).push(l);
      }

      const minutesResult = {};
      const incompleteResult = {};

      for (const u of users) {
        const uLogs = byUser.get(u.id) || [];
        const { minutesByDay, incompleteDays } = computeDailyPresence(uLogs, end);

        const row = {};
        const inc = {};
        for (const dayKey of days) {
          row[dayKey] = minutesByDay.get(dayKey) || 0;
          if (incompleteDays.has(dayKey)) inc[dayKey] = true;
        }

        minutesResult[u.id] = row;
        incompleteResult[u.id] = inc;
      }

      setMinutesByUserByDay(minutesResult);
      setIncompleteByUser(incompleteResult);
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el informe. Si Firestore pide un índice, créalo desde el enlace del error.");
      setMinutesByUserByDay({});
      setIncompleteByUser({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, anchorDate, monthValue, yearValue]);

  const printReport = () => window.print();

  return (
    <div className={`${UI.card} p-6 report-container`}>
      <style>{`
        :root { color-scheme: light; }
        input, select, textarea { color-scheme: light; }

        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
          .report-container { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between no-print">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileBarChart size={18} className="text-blue-800" /> Informe de horas por usuario y día
          </h3>
          <p className="text-sm text-gray-800">
            Días en <span className="font-bold text-red-900">rojo</span>: Entrada sin Salida (no se contabiliza tiempo en ese tramo).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={UI.inputCompact}>
            <option value="week">Semanal</option>
            <option value="month">Mensual</option>
            <option value="year">Anual</option>
          </select>

          {mode === "week" && (
            <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className={UI.inputCompact} />
          )}

          {mode === "month" && (
            <input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} className={UI.inputCompact} />
          )}

          {mode === "year" && (
            <input type="number" min="2000" max="2100" value={yearValue} onChange={(e) => setYearValue(e.target.value)} className={`${UI.inputCompact} w-28`} />
          )}

          <button onClick={runReport} className={UI.buttonPrimary}>
            Generar
          </button>

          <button onClick={printReport} className={`${UI.buttonOutline} inline-flex items-center gap-2`}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      <div className="hidden print-only mb-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Informe de horas</h1>
        <p className="text-sm text-gray-800">Generado el: {new Date().toLocaleString("es-ES")}</p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-900">Generando informe…</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm border border-slate-200 bg-white text-slate-900 rounded-2xl overflow-hidden">
            <thead className={UI.tableHead}>
              <tr>
                <th className="px-4 py-3 text-left border-b border-slate-200 text-slate-700 font-semibold">Usuario</th>
                {tableDays.map((d) => (
                  <th key={d} className="px-3 py-3 text-center border-b border-slate-200 whitespace-nowrap text-slate-700 font-semibold">
                    {d.slice(8, 10)}/{d.slice(5, 7)}
                  </th>
                ))}
                <th className="px-4 py-3 text-center border-b border-slate-200 text-slate-700 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const row = minutesByUserByDay[u.id] || {};
                const inc = incompleteByUser[u.id] || {};
                const total = tableDays.reduce((acc, day) => acc + (row[day] || 0), 0);

                return (
                  <tr key={u.id} className={UI.row}>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      {u.name || u.email || "Sin nombre"}
                      <div className="text-xs text-gray-800">{roleToEs(u.role)} · {statusToEs(u.status)}</div>
                    </td>

                    {tableDays.map((day) => {
                      const mins = row[day] || 0;
                      const isIncomplete = !!inc[day];

                      if (isIncomplete) {
                        return (
                          <td
                            key={day}
                            className="px-3 py-3 text-center font-bold text-red-900 bg-red-50 border-l border-gray-100"
                            title="Registro incompleto: falta salida"
                          >
                            INCOMPLETO
                          </td>
                        );
                      }

                      return (
                        <td key={day} className="px-3 py-3 text-center text-gray-900">
                          {mins > 0 ? minutesToHHMM(mins) : "0h 00m"}
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 text-center font-bold text-blue-900">{minutesToHHMM(total)}</td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={tableDays.length + 2} className="px-6 py-10 text-center text-gray-900">
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="mt-3 text-xs text-gray-800">
            Criterio: si un usuario tiene una Entrada sin Salida dentro del rango, ese día se marca en rojo como INCOMPLETO y no suma minutos.
          </p>
        </div>
      )}
    </div>
  );
};

// ======================
// Panel Admin
// ======================
const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState("users");

  const [allUsers, setAllUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allLogs, setAllLogs] = useState([]);

  const [adminInvites, setAdminInvites] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const [newAdminCode, setNewAdminCode] = useState("");
  const [configMessage, setConfigMessage] = useState("");

  useEffect(() => {
    const qRef = collection(db, COLLECTION_USERS);
    return onSnapshot(qRef, (snap) => setAllUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    const qRef = query(collection(db, COLLECTION_REQUESTS), orderBy("timestamp", "desc"));
    return onSnapshot(qRef, (snap) => {
      const reqs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPendingRequests(reqs.filter((r) => r.status === "pending"));
    });
  }, []);

  useEffect(() => {
    const qRef = query(collection(db, COLLECTION_LOGS), orderBy("timestamp", "desc"), limit(500));
    return onSnapshot(qRef, (snap) => setAllLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    const qRef = collection(db, COLLECTION_ADMIN_INVITES);
    return onSnapshot(qRef, (snap) => setAdminInvites(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  const approveUser = async (userId) => updateDoc(doc(db, COLLECTION_USERS, userId), { status: "active" });

  const promoteToAdmin = async (userId) => {
    if (!window.confirm("¿Estás seguro de hacer Administrador a este usuario?")) return;
    await updateDoc(doc(db, COLLECTION_USERS, userId), { role: "admin", status: "active" });
    alert("Usuario promovido a Administrador.");
  };

  const handleRequest = async (reqId, status) => updateDoc(doc(db, COLLECTION_REQUESTS, reqId), { status });

  const handleInviteAdmin = async (e) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    if (!email.includes("@")) return;

    await setDoc(doc(db, COLLECTION_ADMIN_INVITES, email), {
      email,
      addedBy: user.email,
      createdAt: serverTimestamp(),
    });

    setNewAdminEmail("");
    alert("Invitación creada. Ese correo tendrá acceso admin al registrarse.");
  };

  const handleDeleteInvite = async (emailId) => {
    if (!window.confirm("¿Eliminar invitación?")) return;
    await deleteDoc(doc(db, COLLECTION_ADMIN_INVITES, emailId));
  };

  const handleChangeAdminCode = async (e) => {
    e.preventDefault();
    setConfigMessage("");
    if (newAdminCode.trim().length < 4) return setConfigMessage("La contraseña debe tener al menos 4 caracteres.");

    await setDoc(doc(db, COLLECTION_SETTINGS, "admin_config"), {
      code: newAdminCode.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: user.email,
    });

    setNewAdminCode("");
    setConfigMessage("Contraseña general de administrador actualizada.");
  };

  const handleResetAdminCode = async () => {
    if (!window.confirm("¿Restaurar contraseña original (123456)?")) return;

    await setDoc(doc(db, COLLECTION_SETTINGS, "admin_config"), {
      code: DEFAULT_ADMIN_CODE,
      updatedAt: serverTimestamp(),
      updatedBy: "MASTER RESET",
    });

    setConfigMessage("Contraseña restaurada a 123456.");
  };

  const pendingUsersCount = useMemo(() => allUsers.filter((u) => u.status === "pending").length, [allUsers]);

  return (
    <div className={`${UI.page} flex flex-col`}>
      <header className="bg-indigo-900 text-white shadow">
        <div className="w-full px-4 md:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} />
            <h1 className="text-xl font-bold">Administración</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm bg-indigo-800 px-3 py-1 rounded-full">{user.name}</div>
            <button onClick={() => signOut(auth)} className="bg-indigo-800 px-3 py-2 rounded hover:bg-indigo-700" aria-label="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <nav className="space-y-2 h-fit md:sticky md:top-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full text-left p-3 rounded-lg border flex items-center gap-3 ${
              activeTab === "users" ? "bg-white border-indigo-200 text-indigo-900 font-semibold shadow" : "bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Users size={18} /> Usuarios
            {pendingUsersCount > 0 && (
              <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingUsersCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`w-full text-left p-3 rounded-lg border flex items-center gap-3 ${
              activeTab === "requests" ? "bg-white border-indigo-200 text-indigo-900 font-semibold shadow" : "bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100"
            }`}
          >
            <FileText size={18} /> Solicitudes
            {pendingRequests.length > 0 && (
              <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`w-full text-left p-3 rounded-lg border flex items-center gap-3 ${
              activeTab === "logs" ? "bg-white border-indigo-200 text-indigo-900 font-semibold shadow" : "bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100"
            }`}
          >
            <History size={18} /> Registros globales
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full text-left p-3 rounded-lg border flex items-center gap-3 ${
              activeTab === "reports" ? "bg-white border-indigo-200 text-indigo-900 font-semibold shadow" : "bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100"
            }`}
          >
            <FileBarChart size={18} /> Informes
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full text-left p-3 rounded-lg border flex items-center gap-3 ${
              activeTab === "settings" ? "bg-white border-indigo-200 text-indigo-900 font-semibold shadow" : "bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Settings size={18} /> Configuración
          </button>
        </nav>

        <main className="md:col-span-3 space-y-6">
          {activeTab === "users" && (
            <div className={UI.card}>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Gestión de personal</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={UI.tableHead}>
                    <tr>
                      <th className="px-6 py-3 text-left">Nombre</th>
                      <th className="px-6 py-3 text-left">Rol</th>
                      <th className="px-6 py-3 text-left">Estado</th>
                      <th className="px-6 py-3 text-left">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className={UI.row}>
                        <td className={UI.nameCell}>{u.name || u.email || "Sin nombre"}</td>
                        <td className={UI.cell}>{roleToEs(u.role)}</td>
                        <td className={UI.cell}>
                          <span className={`${UI.badgeBase} ${userStatusBadgeClass(u.status)}`}>{statusToEs(u.status)}</span>
                        </td>
                        <td className={UI.cell}>
                          <div className="flex gap-2">
                            {u.status === "pending" && (
                              <button
                                onClick={() => approveUser(u.id)}
                                className="px-3 py-1 rounded bg-green-700 hover:bg-green-800 text-white text-xs font-bold"
                              >
                                Aprobar
                              </button>
                            )}
                            {u.role !== "admin" && (
                              <button
                                onClick={() => promoteToAdmin(u.id)}
                                className="px-3 py-1 rounded border border-indigo-200 hover:bg-indigo-50 text-indigo-900 text-xs font-bold"
                              >
                                + Administrador
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-gray-900">
                          No hay usuarios.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "requests" && (
            <div className="space-y-4">
              {pendingRequests.length === 0 && (
                <div className={`${UI.card} p-6 text-gray-900`}>No hay solicitudes pendientes.</div>
              )}

              {pendingRequests.map((req) => (
                <div key={req.id} className={`${UI.card} p-4 border-l-4 border-yellow-400`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{req.userName || "Usuario"}</div>
                      <div className="text-sm text-gray-900">Fichaje manual: {req.date} a las {req.time}</div>
                      <div className="text-sm text-gray-900 italic">"{req.reason}"</div>
                      <div className="mt-2">
                        <span className={`${UI.badgeBase} ${requestStatusBadgeClass(req.status)}`}>{requestStatusToEs(req.status)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(req.id, "rejected")} className="px-3 py-2 rounded border border-red-200 hover:bg-red-50 text-red-900 font-bold text-sm">
                        Rechazar
                      </button>
                      <button onClick={() => handleRequest(req.id, "approved")} className="px-3 py-2 rounded bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm">
                        Aprobar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "logs" && (
            <div className={UI.card}>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Registros globales</h2>
              </div>

              <div className="max-h-[650px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className={UI.tableHead}>
                    <tr>
                      <th className="px-6 py-3 text-left">Usuario</th>
                      <th className="px-6 py-3 text-left">Evento</th>
                      <th className="px-6 py-3 text-left">Fecha y hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLogs.map((log) => (
                      <tr key={log.id} className={UI.row}>
                        <td className={UI.nameCell}>{log.userName || "Desconocido"}</td>
                        <td className={UI.cell}>
                          <span className={`${UI.badgeBase} ${logTypeBadgeClass(log.type)}`}>{logTypeToEs(log.type)}</span>
                        </td>
                        <td className={`${UI.cell} text-gray-900`}>{toEsDateTime(log.timestamp)}</td>
                      </tr>
                    ))}
                    {allLogs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-10 text-center text-gray-900">No hay registros.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <AdminAttendanceReport users={allUsers.filter((u) => u.status === "active" || u.status === "pending")} />
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className={`${UI.card} p-6`}>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <UserPlus size={18} className="text-green-700" /> Invitaciones de administradores
                </h3>

                <form onSubmit={handleInviteAdmin} className="flex flex-col md:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="correo@admin.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-900"
                  />
                  <button type="submit" className="px-4 py-2 rounded bg-green-700 hover:bg-green-800 text-white font-bold">Añadir</button>
                </form>

                {adminInvites.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="text-sm font-semibold text-gray-900 mb-2">Listado de invitaciones</div>
                    <div className="space-y-2">
                      {adminInvites.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-2 rounded border border-gray-200 bg-white">
                          <div className="text-gray-900 font-semibold inline-flex items-center gap-2">
                            <Mail size={14} className="text-gray-900" /> {inv.email}
                          </div>
                          <button onClick={() => handleDeleteInvite(inv.id)} className="text-red-900 underline text-sm font-bold">Eliminar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`${UI.card} p-6`}>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <Key size={18} className="text-indigo-800" /> Contraseña general de administrador
                </h3>

                <form onSubmit={handleChangeAdminCode} className="flex flex-col md:flex-row gap-2">
                  <input
                    type="text"
                    value={newAdminCode}
                    onChange={(e) => setNewAdminCode(e.target.value)}
                    placeholder="Nueva contraseña…"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-900"
                  />
                  <button type="submit" className="px-4 py-2 rounded bg-blue-900 hover:bg-blue-800 text-white font-bold">Actualizar</button>
                </form>

                {configMessage && (
                  <div className="mt-3 p-3 rounded bg-green-50 border border-green-200 text-green-900 font-semibold">{configMessage}</div>
                )}
              </div>

              {user.email === MASTER_EMAIL && (
                <div className={`${UI.card} p-6 border border-red-200 bg-red-50`}>
                  <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2 mb-2">
                    <ShieldAlert size={18} /> Zona maestra
                  </h3>
                  <button
                    onClick={handleResetAdminCode}
                    className="w-full px-4 py-2 rounded bg-white border border-red-300 hover:bg-red-100 text-red-900 font-bold inline-flex items-center justify-center gap-2"
                  >
                    <RefreshCcw size={16} /> Restaurar (123456)
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// ======================
// App
// ======================
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, COLLECTION_USERS, user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setUserData({ ...snap.data(), uid: user.uid });
      else setUserData(null);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleCompleteProfile = async (formData) => {
    if (!user) return;

    await setDoc(
      doc(db, COLLECTION_USERS, user.uid),
      {
        name: formData.name,
        role: formData.role,
        status: formData.status,
        email: user.email || "",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  if (loading) return <Loading />;

  if (!user || !userData) return <AuthScreen onCompleteProfile={handleCompleteProfile} currentUser={user} />;

  if (userData.role === "admin") return <AdminDashboard user={userData} />;

  return <EmployeeDashboard user={userData} userDocId={user.uid} />;
}
