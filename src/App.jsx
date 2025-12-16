import React, { useState, useEffect, useRef } from 'react';

// =============================================================================
//  🔴 INSTRUCCIONES: EN TU PC, DESCOMENTA LAS SIGUIENTES 2 LÍNEAS:
// =============================================================================
// import logoImg from './logo.png'; 
// import { auth, db } from './firebaseConfig';

/* --- BLOQUE TEMPORAL PARA EVITAR ERRORES EN ESTE CHAT (BÓRRALO EN TU PC) --- */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const logoImg = "https://via.placeholder.com/150"; // Marcador de posición
// Inicialización dummy para que compile aquí
const appDummy = initializeApp({apiKey: "dummy", projectId: "dummy"}); 
const auth = getAuth(appDummy);
const db = getFirestore(appDummy);
/* -------------------------------------------------------------------------- */

import { 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Coffee, 
  ShieldAlert, 
  FileText, 
  CheckCircle, 
  Users,
  Briefcase,
  History,
  AlertCircle,
  Chrome,
  Eye,
  EyeOff,
  Printer,
  FileBarChart,
  Lock
} from 'lucide-react';

// --- Constantes ---
const ADMIN_SECRET = "ADMIN123";
const COLLECTION_USERS = 'users'; 
const COLLECTION_LOGS = 'logs';
const COLLECTION_REQUESTS = 'requests';

// --- Componentes Auxiliares ---

const Logo = () => (
  <div className="flex items-center justify-center mb-6">
    <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-blue-900 overflow-hidden relative z-10">
      <img 
        src={logoImg} 
        alt="Logo Club" 
        className="w-full h-full object-cover" 
        onError={(e) => {
          e.target.style.display = 'none';
          const icon = e.target.nextSibling;
          if(icon) icon.style.opacity = 1;
        }} 
      />
      <Briefcase className="w-12 h-12 text-blue-900 absolute opacity-0 transition-opacity duration-300" style={{opacity: 0}} />
    </div>
  </div>
);

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
  </div>
);

// --- Pantalla de Autenticación Unificada ---
const AuthScreen = ({ onCompleteProfile, currentUser }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [isAdminMode, setIsAdminMode] = useState(false); // Nuevo estado para modo visual admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState(currentUser?.displayName || '');
  const [role, setRole] = useState('employee');
  const [adminCode, setAdminCode] = useState('');

  useEffect(() => {
    if (currentUser?.displayName) {
      setName(currentUser.displayName);
    }
  }, [currentUser]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError("Error con Google. Intenta de nuevo.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError("Credenciales incorrectas.");
      else if (err.code === 'auth/email-already-in-use') setError("El correo ya está registrado.");
      else if (err.code === 'auth/weak-password') setError("La contraseña debe tener al menos 6 caracteres.");
      else setError("Ocurrió un error. Intenta de nuevo.");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Ingresa tu nombre completo.');
      return;
    }

    if (role === 'admin' && adminCode !== ADMIN_SECRET) {
      setError('Código de administrador incorrecto.');
      return;
    }

    onCompleteProfile({ name, role, status: role === 'admin' ? 'active' : 'pending' });
  };

  // Si NO hay usuario autenticado (ni por Google ni por Email)
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${isAdminMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
          {/* Header Visual según modo */}
          <div className={`absolute top-0 left-0 w-full h-2 ${isAdminMode ? 'bg-red-600' : 'bg-blue-900'}`}></div>
          
          <Logo />
          
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            {isAdminMode ? 'Portal Administrativo' : 'Control de Acceso'}
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm">
            {isAdminMode ? 'Ingresa tus credenciales de administrador' : 'Bienvenido al sistema del Club'}
          </p>

          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${authMode === 'login' ? 'bg-white text-gray-800 shadow' : 'text-gray-500'}`}
              onClick={() => {setAuthMode('login'); setError('');}}
            >
              Iniciar Sesión
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${authMode === 'register' ? 'bg-white text-gray-800 shadow' : 'text-gray-500'}`}
              onClick={() => {setAuthMode('register'); setError('');}}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="usuario@club.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 z-10 focus:outline-none"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              type="submit"
              className={`w-full text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 ${isAdminMode ? 'bg-red-700' : 'bg-blue-900'}`}
            >
              {authMode === 'login' ? 'Entrar' : 'Crear Cuenta'} <LogIn size={20} />
            </button>
          </form>

          <div className="mt-6">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">O continúa con</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full mt-4 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-all hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2"
            >
              <Chrome size={20} className="text-red-500" /> Google
            </button>
          </div>

          {/* Botón de cambio a modo Admin */}
          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsAdminMode(!isAdminMode)}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isAdminMode ? (
                <>Volver a acceso empleados</>
              ) : (
                <><Lock size={14} /> Acceso Administrador</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si hay usuario pero falta completar perfil (nombre/rol)
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <Logo />
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Completar Perfil</h2>
        <p className="text-center text-gray-500 mb-6">Hola, necesitamos unos datos más.</p>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('employee')}
                className={`py-2 px-4 rounded-lg flex items-center justify-center gap-2 border ${
                  role === 'employee' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users size={18} /> Empleado
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-4 rounded-lg flex items-center justify-center gap-2 border ${
                  role === 'admin' 
                    ? 'bg-purple-50 border-purple-500 text-purple-700 font-medium' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShieldAlert size={18} /> Admin
              </button>
            </div>
          </div>

          {role === 'admin' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-purple-700 mb-1">Código de Administrador</label>
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-purple-50"
                placeholder="Ingresa el código secreto"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex gap-2">
             <button
                type="button"
                onClick={() => signOut(auth)}
                className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-all"
              >
                Cancelar
              </button>
            <button
              type="submit"
              className="w-2/3 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Guardar y Entrar <CheckCircle size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Panel de Empleado ---
const EmployeeDashboard = ({ user, userDocId }) => {
  const [status, setStatus] = useState('out');
  const [logs, setLogs] = useState([]);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionTime, setCorrectionTime] = useState('');
  const [correctionDate, setCorrectionDate] = useState('');
  const [myRequests, setMyRequests] = useState([]);

  useEffect(() => {
    if (!userDocId) return;
    const q = query(collection(db, COLLECTION_LOGS));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const myLogs = allLogs
        .filter(log => log.userId === userDocId)
        .sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds); 
      setLogs(myLogs);
      if (myLogs.length > 0) {
        const lastLog = myLogs[0];
        if (lastLog.type === 'in') setStatus('in');
        else if (lastLog.type === 'break_start') setStatus('break');
        else setStatus('out');
      }
    });
    return () => unsubscribe();
  }, [userDocId]);

  useEffect(() => {
    if (!userDocId) return;
    const q = collection(db, COLLECTION_REQUESTS);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyRequests(reqs.filter(r => r.userId === userDocId));
    });
    return () => unsubscribe();
  }, [userDocId]);

  const handleClockAction = async (type) => {
    if (user.status !== 'active') return;
    try {
      await addDoc(collection(db, COLLECTION_LOGS), {
        userId: userDocId,
        userName: user.name || 'Usuario', // Fallback por si no hay nombre
        type: type,
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleDateString()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionDate || !correctionTime || !correctionReason) return;
    try {
      await addDoc(collection(db, COLLECTION_REQUESTS), {
        userId: userDocId,
        userName: user.name || 'Usuario',
        date: correctionDate,
        time: correctionTime,
        reason: correctionReason,
        status: 'pending', 
        timestamp: serverTimestamp()
      });
      setShowCorrection(false);
      setCorrectionReason('');
      setCorrectionTime('');
      setCorrectionDate('');
      alert('Solicitud enviada');
    } catch (e) { console.error(e); }
  };

  if (user.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Cuenta Pendiente</h2>
        <p className="text-gray-600 mt-2 max-w-md">Tu cuenta espera aprobación del administrador.</p>
        <button onClick={() => {signOut(auth); window.location.reload();}} className="mt-6 text-blue-600 underline text-sm">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <header className="bg-blue-900 text-white p-4 shadow-md">
        {/* Container ampliado para PC: max-w-7xl */}
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
               <img src={logoImg} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{user.name}</h1>
              <p className="text-blue-200 text-xs">Panel de Empleado</p>
            </div>
          </div>
          <button onClick={() => {signOut(auth); window.location.reload();}} className="bg-blue-800 p-2 rounded hover:bg-blue-700">
             <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Container ampliado */}
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Clock className="text-blue-600" /> Control de Acceso
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => handleClockAction('in')} disabled={status === 'in' || status === 'break'} className={`p-8 rounded-xl flex flex-col items-center gap-3 transition-all ${status === 'out' ? 'bg-green-100 text-green-800 border-2 border-green-500 shadow-md hover:scale-105' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}>
              <LogIn size={40} /> <span className="font-bold text-xl">Entrada</span>
            </button>
            <button onClick={() => handleClockAction('break_start')} disabled={status !== 'in'} className={`p-8 rounded-xl flex flex-col items-center gap-3 transition-all ${status === 'in' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-500 shadow-md hover:scale-105' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}>
              <Coffee size={40} /> <span className="font-bold text-xl">Pausa</span>
            </button>
            <button onClick={() => handleClockAction(status === 'break' ? 'in' : 'out')} disabled={status === 'out'} className={`p-8 rounded-xl flex flex-col items-center gap-3 transition-all ${status !== 'out' ? 'bg-red-100 text-red-800 border-2 border-red-500 shadow-md hover:scale-105' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}>
              <LogOut size={40} /> <span className="font-bold text-xl">{status === 'break' ? 'Volver' : 'Salida'}</span>
            </button>
          </div>
          <div className="mt-8 text-center">
            <span className={`inline-flex items-center gap-2 px-6 py-2 rounded-full text-base font-medium ${status === 'in' ? 'bg-green-100 text-green-700' : status === 'break' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
              Estado actual: {status === 'in' ? 'TRABAJANDO' : status === 'break' ? 'EN PAUSA' : 'FUERA DE TURNO'}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
           <button onClick={() => setShowCorrection(!showCorrection)} className="text-blue-600 font-medium hover:underline text-sm flex items-center gap-1">
             <AlertCircle size={16} /> ¿Olvidaste fichar? Solicitar corrección
           </button>
        </div>

        {showCorrection && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100">
            <h3 className="font-bold text-gray-800 mb-4">Solicitud de Corrección Manual</h3>
            <form onSubmit={submitCorrection} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" required className="w-full p-2 border rounded" value={correctionDate} onChange={e=>setCorrectionDate(e.target.value)} />
                <input type="time" required className="w-full p-2 border rounded" value={correctionTime} onChange={e=>setCorrectionTime(e.target.value)} />
              </div>
              <textarea required className="w-full p-2 border rounded" rows="2" placeholder="Motivo..." value={correctionReason} onChange={e=>setCorrectionReason(e.target.value)}></textarea>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setShowCorrection(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enviar</button>
              </div>
            </form>
          </div>
        )}

        {/* Grid de historial ajustado para pantallas grandes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 h-96 flex flex-col">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><History size={18} /> Últimos Registros</h3>
             <div className="space-y-2 flex-1 overflow-y-auto pr-2">
               {logs.map(log => (
                 <div key={log.id} className="flex justify-between p-3 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors">
                   <span className={`font-medium ${log.type==='in'?'text-green-600':log.type==='out'?'text-red-600':'text-yellow-600'}`}>
                     {log.type === 'in' ? 'Entrada' : log.type === 'out' ? 'Salida' : 'Pausa'}
                   </span>
                   <span className="text-gray-500">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '...'}</span>
                 </div>
               ))}
             </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 h-96 flex flex-col">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FileText size={18} /> Mis Solicitudes</h3>
             <div className="space-y-2 flex-1 overflow-y-auto pr-2">
               {myRequests.map(req => (
                 <div key={req.id} className="p-3 border rounded bg-gray-50 text-sm hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between font-bold mb-1">
                      <span>{req.date} {req.time}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${req.status==='approved'?'bg-green-100 text-green-700':req.status==='rejected'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>
                        {req.status === 'approved' ? 'Aprobada' : req.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="text-gray-600 italic">"{req.reason}"</div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Panel de Administrador ---
const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users'); 
  const [allUsers, setAllUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [reportFilter, setReportFilter] = useState('week');

  useEffect(() => {
    const q = collection(db, COLLECTION_USERS);
    return onSnapshot(q, (snap) => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    const q = collection(db, COLLECTION_REQUESTS);
    return onSnapshot(q, (snap) => setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === 'pending')));
  }, []);

  useEffect(() => {
    const q = collection(db, COLLECTION_LOGS);
    return onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllLogs(logs.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
  }, []);

  const approveUser = async (userId) => {
    await updateDoc(doc(db, COLLECTION_USERS, userId), { status: 'active' });
  };

  const handleRequest = async (reqId, status) => {
    await updateDoc(doc(db, COLLECTION_REQUESTS, reqId), { status });
  };

  const getFilteredLogs = () => {
    const now = new Date();
    const startOfPeriod = new Date();
    
    if (reportFilter === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
      startOfPeriod.setDate(diff);
      startOfPeriod.setHours(0,0,0,0);
    } else if (reportFilter === 'month') {
      startOfPeriod.setDate(1);
      startOfPeriod.setHours(0,0,0,0);
    } else if (reportFilter === 'year') {
      startOfPeriod.setMonth(0, 1);
      startOfPeriod.setHours(0,0,0,0);
    }

    return allLogs.filter(log => {
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp.seconds * 1000);
      return logDate >= startOfPeriod;
    });
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
          .report-container { box-shadow: none; border: none; }
        }
      `}</style>

      <header className="bg-indigo-900 text-white shadow-lg no-print">
        {/* Container ampliado max-w-7xl */}
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldAlert size={28} />
            <h1 className="text-xl font-bold">Portal Administración</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-sm bg-indigo-800 px-3 py-1 rounded-full">{user.name}</div>
             <button onClick={() => {signOut(auth); window.location.reload();}} className="text-indigo-200 hover:text-white">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* Grid ampliado max-w-7xl */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <nav className="space-y-2 no-print">
          <button onClick={() => setActiveTab('users')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'users' ? 'bg-white text-indigo-700 shadow font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>
            <Users size={18} /> Usuarios {allUsers.filter(u => u.status === 'pending').length > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{allUsers.filter(u => u.status === 'pending').length}</span>}
          </button>
          <button onClick={() => setActiveTab('requests')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'requests' ? 'bg-white text-indigo-700 shadow font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>
            <FileText size={18} /> Solicitudes {pendingRequests.length > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('logs')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'logs' ? 'bg-white text-indigo-700 shadow font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>
            <History size={18} /> Registros Globales
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'reports' ? 'bg-white text-indigo-700 shadow font-medium' : 'text-gray-600 hover:bg-gray-200'}`}>
            <FileBarChart size={18} /> Informes
          </button>
        </nav>

        <main className="md:col-span-3">
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
               <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Gestión de Personal</div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-6 py-3">Nombre</th><th className="px-6 py-3">Estado</th><th className="px-6 py-3">Acción</th></tr></thead>
                   <tbody>
                     {allUsers.map(u => (
                       <tr key={u.id} className="border-b hover:bg-gray-50">
                         <td className="px-6 py-4 font-medium">{u.name}</td>
                         <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{u.status}</span></td>
                         <td className="px-6 py-4">{u.status === 'pending' && <button onClick={() => approveUser(u.id)} className="text-white bg-green-600 px-3 py-1 rounded text-xs">Aprobar</button>}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'requests' && (
             <div className="space-y-4">
               {pendingRequests.length === 0 && <div className="text-center text-gray-400 py-10">No hay solicitudes.</div>}
               {pendingRequests.map(req => (
                 <div key={req.id} className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-400 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div>
                     <h4 className="font-bold">{req.userName}</h4>
                     <p className="text-sm">Fichaje manual: {req.date} a las {req.time}</p>
                     <p className="text-xs text-gray-500 italic">"{req.reason}"</p>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => handleRequest(req.id, 'rejected')} className="px-3 py-1 border border-red-200 text-red-600 rounded text-sm">Rechazar</button>
                     <button onClick={() => handleRequest(req.id, 'approved')} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Aprobar</button>
                   </div>
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'logs' && (
             <div className="bg-white rounded-xl shadow-md overflow-hidden">
               <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">Bitácora en Vivo</div>
               <div className="max-h-[600px] overflow-y-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0"><tr><th className="px-6 py-3">Empleado</th><th className="px-6 py-3">Acción</th><th className="px-6 py-3">Fecha</th></tr></thead>
                    <tbody>
                      {allLogs.map(log => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4">{log.userName || 'Desconocido'}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${log.type==='in'?'bg-green-100 text-green-700':log.type==='out'?'bg-red-100 text-red-700':'bg-yellow-100'}`}>{log.type}</span></td>
                          <td className="px-6 py-4 text-gray-500">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '...'}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white rounded-xl shadow-md p-6 report-container">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print">
                <h3 className="font-bold text-gray-700 text-lg flex items-center gap-2">
                  <FileBarChart className="text-blue-600" /> Generador de Informes
                </h3>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <select 
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="week">Esta Semana</option>
                    <option value="month">Este Mes</option>
                    <option value="year">Este Año</option>
                  </select>
                  <button 
                    onClick={printReport}
                    className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-800 transition-colors"
                  >
                    <Printer size={16} /> Imprimir PDF
                  </button>
                </div>
              </div>

              <div className="hidden print-only mb-6 text-center">
                 <h1 className="text-2xl font-bold text-blue-900">Informe de Asistencia</h1>
                 <p className="text-gray-500">Periodo: {reportFilter === 'week' ? 'Semanal' : reportFilter === 'month' ? 'Mensual' : 'Anual'}</p>
                 <p className="text-xs text-gray-400">Generado el: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border border-gray-200">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-4 py-3 border-b">Empleado</th>
                      <th className="px-4 py-3 border-b">Evento</th>
                      <th className="px-4 py-3 border-b">Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredLogs().length === 0 ? (
                      <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400">No hay datos en este periodo.</td></tr>
                    ) : (
                      getFilteredLogs().map(log => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{log.userName || 'Usuario'}</td>
                          <td className="px-4 py-3">
                             {log.type === 'in' ? 'ENTRADA' : log.type === 'out' ? 'SALIDA' : 'PAUSA'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : ''}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null); 
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en la autenticación
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Si no hay usuario, no hacemos nada
    if (!user) {
      setUserData(null);
      return;
    }
    // Si hay usuario, escuchamos su perfil en Firestore
    const userProfileRef = doc(db, COLLECTION_USERS, user.uid);
    const unsub = onSnapshot(userProfileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData({ ...docSnap.data(), uid: user.uid });
      } else {
        setUserData(null); // Auth ok, pero sin perfil en BD
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleCompleteProfile = async (formData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, COLLECTION_USERS, user.uid), {
         ...formData,
         email: user.email || '', 
         createdAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Error creating profile:", e);
    }
  };

  if (loading) return <Loading />;

  // Si no está logueado O si está logueado pero no tiene perfil (rol)
  if (!user || !userData) {
    return <AuthScreen onCompleteProfile={handleCompleteProfile} currentUser={user} />;
  }

  if (userData.role === 'admin') {
    return <AdminDashboard user={userData} />;
  }

  return <EmployeeDashboard user={userData} userDocId={user.uid} />;
}