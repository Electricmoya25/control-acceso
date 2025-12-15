import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  serverTimestamp, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Coffee, 
  UserCheck, 
  ShieldAlert, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Users,
  Briefcase,
  History,
  AlertCircle,
  Chrome 
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---

// NOTA PARA CUANDO LO COPIES A TU PC:
// En tu ordenador, borra el bloque de abajo (desde 'const firebaseConfig' hasta 'const appId')
// y sustitúyelo por esta única línea:
// import { auth, db } from './firebaseConfig';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ----------------------------------

// --- Constantes ---
const ADMIN_SECRET = "ADMIN123";
// Usamos colecciones con el appId para que funcione en la preview
// En tu PC puedes cambiarlas a simplemente 'users', 'logs', 'requests'
const COLLECTION_USERS = 'users'; 
const COLLECTION_LOGS = 'logs';
const COLLECTION_REQUESTS = 'requests';

// Función auxiliar para obtener la referencia a la colección correcta
// En local esto sería simplemente collection(db, collectionName)
const getCollectionRef = (collectionName) => {
    // Si estamos en entorno de preview con appId definido
    if (typeof __app_id !== 'undefined') {
        return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
    }
    // Si estamos en local (tu PC)
    return collection(db, collectionName);
}

const getDocRef = (collectionName, docId) => {
     if (typeof __app_id !== 'undefined') {
        return doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId);
    }
    return doc(db, collectionName, docId);
}

// --- Componentes ---

const Logo = () => (
  <div className="flex items-center justify-center mb-6">
    <div className="w-24 h-24 bg-blue-900 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
      <Briefcase className="w-12 h-12 text-white" />
    </div>
  </div>
);

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
  </div>
);

// --- Pantalla de Autenticación / Registro ---
const AuthScreen = ({ onLogin, currentUser }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState(currentUser?.displayName || '');
  const [role, setRole] = useState('employee'); // employee | admin
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');

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
      setError("Error al iniciar sesión con Google. Intenta de nuevo.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor ingresa tu nombre.');
      return;
    }

    if (role === 'admin' && adminCode !== ADMIN_SECRET) {
      setError('Código de administrador incorrecto.');
      return;
    }

    onLogin({ name, role, status: role === 'admin' ? 'active' : 'pending' });
  };

  const isProfilePending = !!currentUser;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <Logo />
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {isProfilePending ? 'Completar Registro' : (isRegistering ? 'Registro de Personal' : 'Acceso al Sistema')}
        </h2>
        <p className="text-center text-gray-500 mb-6">
          {isProfilePending 
            ? `Hola, ${currentUser.displayName || 'Usuario'}. Por favor selecciona tu rol.` 
            : 'Control de Acceso y Fichaje'}
        </p>

        {!isProfilePending && (
          <div className="mb-6">
             <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-all hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2 mb-4"
            >
              <Chrome size={20} className="text-red-500" /> Iniciar con Google
            </button>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">O ingresa manualmente</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ej. Juan Pérez"
              disabled={!!currentUser?.displayName}
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
             {isProfilePending && (
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
             )}
            <button
              type="submit"
              className={`bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2 ${isProfilePending ? 'w-2/3' : 'w-full'}`}
            >
              {isProfilePending ? 'Confirmar y Entrar' : (isRegistering ? 'Crear Cuenta' : 'Entrar')} <LogIn size={20} />
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

  // Cargar historial de logs
  useEffect(() => {
    if (!userDocId) return;
    const q = query(getCollectionRef(COLLECTION_LOGS));
    
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
    }, (error) => console.error("Error fetching logs:", error));
    return () => unsubscribe();
  }, [userDocId]);

  // Cargar mis solicitudes
  useEffect(() => {
    if (!userDocId) return;
    const q = getCollectionRef(COLLECTION_REQUESTS);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyRequests(reqs.filter(r => r.userId === userDocId));
    }, (error) => console.error("Error fetching requests:", error));
    return () => unsubscribe();
  }, [userDocId]);

  const handleClockAction = async (type) => {
    if (user.status !== 'active') return;

    try {
      await addDoc(getCollectionRef(COLLECTION_LOGS), {
        userId: userDocId,
        userName: user.name,
        type: type,
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleDateString()
      });
    } catch (e) {
      console.error("Error al fichar:", e);
    }
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionDate || !correctionTime || !correctionReason) return;

    try {
      await addDoc(getCollectionRef(COLLECTION_REQUESTS), {
        userId: userDocId,
        userName: user.name,
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
      alert('Solicitud enviada correctamente');
    } catch (e) {
      console.error("Error enviando solicitud:", e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  if (user.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Cuenta Pendiente</h2>
        <p className="text-gray-600 mt-2 max-w-md">
          Tu cuenta ha sido creada pero requiere aprobación del administrador para poder fichar.
        </p>
        <button onClick={handleLogout} className="mt-6 text-blue-600 underline text-sm">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <header className="bg-blue-900 text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-900">
              <Briefcase size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg">{user.name}</h1>
              <p className="text-blue-200 text-xs">Panel de Empleado</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-4">
             <div className="hidden md:block">
                <div className="text-sm opacity-80">{new Date().toLocaleDateString()}</div>
                <div className="font-mono text-xl font-bold">
                   {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
             </div>
             <button onClick={handleLogout} className="bg-blue-800 p-2 rounded hover:bg-blue-700" title="Cerrar Sesión">
               <LogOut size={18} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Clock className="text-blue-600" /> Control de Acceso
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleClockAction('in')}
              disabled={status === 'in' || status === 'break'}
              className={`p-6 rounded-xl flex flex-col items-center gap-3 transition-all ${
                status === 'out' 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 border-2 border-green-500 shadow-sm' 
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
              }`}
            >
              <LogIn size={32} />
              <span className="font-bold text-lg">Entrada</span>
            </button>

            <button
              onClick={() => handleClockAction('break_start')}
              disabled={status !== 'in'}
              className={`p-6 rounded-xl flex flex-col items-center gap-3 transition-all ${
                status === 'in' 
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-2 border-yellow-500 shadow-sm' 
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
              }`}
            >
              <Coffee size={32} />
              <span className="font-bold text-lg">Pausa</span>
            </button>

            <button
              onClick={() => handleClockAction(status === 'break' ? 'in' : 'out')} 
              disabled={status === 'out'}
              className={`p-6 rounded-xl flex flex-col items-center gap-3 transition-all ${
                status !== 'out' 
                  ? 'bg-red-100 text-red-800 hover:bg-red-200 border-2 border-red-500 shadow-sm' 
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
              }`}
            >
              <LogOut size={32} />
              <span className="font-bold text-lg">
                {status === 'break' ? 'Volver de Pausa' : 'Salida'}
              </span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              status === 'in' ? 'bg-green-100 text-green-700' :
              status === 'break' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              Estado actual: {status === 'in' ? 'Trabajando' : status === 'break' ? 'En Pausa' : 'Fuera de turno'}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
           <button 
             onClick={() => setShowCorrection(!showCorrection)}
             className="text-blue-600 font-medium hover:underline text-sm flex items-center gap-1"
           >
             <AlertCircle size={16} /> ¿Olvidaste fichar? Solicitar corrección
           </button>
        </div>

        {showCorrection && (
          <div className="bg-white rounded-xl shadow-md p-6 animate-in slide-in-from-top-4 border border-blue-100">
            <h3 className="font-bold text-gray-800 mb-4">Solicitud de Corrección Manual</h3>
            <form onSubmit={submitCorrection} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Fecha</label>
                  <input type="date" required className="w-full mt-1 p-2 border rounded" value={correctionDate} onChange={e=>setCorrectionDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Hora Correcta</label>
                  <input type="time" required className="w-full mt-1 p-2 border rounded" value={correctionTime} onChange={e=>setCorrectionTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Motivo</label>
                <textarea required className="w-full mt-1 p-2 border rounded" rows="2" placeholder="Ej. Olvidé fichar la salida porque..." value={correctionReason} onChange={e=>setCorrectionReason(e.target.value)}></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={()=>setShowCorrection(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enviar Solicitud</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><History size={18} /> Últimos Registros</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {logs.length === 0 ? <p className="text-gray-400 text-sm italic">No hay registros aún.</p> : null}
              {logs.map(log => (
                <div key={log.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className={`font-medium ${
                    log.type === 'in' ? 'text-green-600' :
                    log.type === 'out' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {log.type === 'in' ? 'Entrada' : log.type === 'out' ? 'Salida' : 'Pausa'}
                  </span>
                  <span className="text-gray-500">
                    {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Procesando...'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FileText size={18} /> Mis Solicitudes</h3>
             <div className="space-y-3 max-h-64 overflow-y-auto">
              {myRequests.length === 0 ? <p className="text-gray-400 text-sm italic">No hay solicitudes pendientes.</p> : null}
              {myRequests.map(req => (
                <div key={req.id} className="p-3 border border-gray-100 rounded bg-gray-50">
                   <div className="flex justify-between mb-1">
                     <span className="text-xs font-bold text-gray-600">{req.date} - {req.time}</span>
                     <span className={`text-xs px-2 py-0.5 rounded-full ${
                       req.status === 'approved' ? 'bg-green-100 text-green-700' :
                       req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                       'bg-yellow-100 text-yellow-700'
                     }`}>
                       {req.status === 'approved' ? 'Aprobada' : req.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                     </span>
                   </div>
                   <p className="text-xs text-gray-500 truncate">{req.reason}</p>
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

  useEffect(() => {
    const q = getCollectionRef(COLLECTION_USERS);
    return onSnapshot(q, (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    const q = getCollectionRef(COLLECTION_REQUESTS);
    return onSnapshot(q, (snap) => {
      setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === 'pending'));
    });
  }, []);

  useEffect(() => {
    const q = getCollectionRef(COLLECTION_LOGS);
    return onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllLogs(logs.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
  }, []);

  const approveUser = async (userId) => {
    await updateDoc(getDocRef(COLLECTION_USERS, userId), {
      status: 'active'
    });
  };

  const handleRequest = async (reqId, status) => {
    await updateDoc(getDocRef(COLLECTION_REQUESTS, reqId), {
      status
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload(); 
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-indigo-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldAlert size={28} />
            <h1 className="text-xl font-bold">Portal Administración</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-sm bg-indigo-800 px-3 py-1 rounded-full">{user.name}</div>
             <button onClick={handleLogout} className="text-indigo-200 hover:text-white" title="Cerrar Sesión">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
              activeTab === 'users' ? 'bg-white text-indigo-700 shadow font-medium' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users size={18} /> Usuarios
             {allUsers.filter(u => u.status === 'pending').length > 0 && (
               <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                 {allUsers.filter(u => u.status === 'pending').length}
               </span>
             )}
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
              activeTab === 'requests' ? 'bg-white text-indigo-700 shadow font-medium' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText size={18} /> Solicitudes
            {pendingRequests.length > 0 && (
               <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                 {pendingRequests.length}
               </span>
             )}
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
              activeTab === 'logs' ? 'bg-white text-indigo-700 shadow font-medium' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <History size={18} /> Registros Globales
          </button>
        </nav>

        <main className="md:col-span-3">
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Gestión de Personal</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Nombre</th>
                      <th className="px-6 py-3">Rol</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                        <td className="px-6 py-4">{u.role === 'admin' ? 'Admin' : 'Empleado'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {u.status === 'active' ? 'Activo' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.status === 'pending' && (
                            <button 
                              onClick={() => approveUser(u.id)}
                              className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs flex items-center gap-1"
                            >
                              <CheckCircle size={14} /> Aprobar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 mb-2">Solicitudes de Corrección ({pendingRequests.length})</h3>
              {pendingRequests.length === 0 && (
                <div className="bg-white p-8 rounded-xl shadow text-center text-gray-400">
                  No hay solicitudes pendientes.
                </div>
              )}
              {pendingRequests.map(req => (
                <div key={req.id} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-400 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-gray-800">{req.userName}</h4>
                    <p className="text-sm text-gray-600">
                      Solicita fichaje manual para el <span className="font-bold">{req.date}</span> a las <span className="font-bold">{req.time}</span>.
                    </p>
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                      " {req.reason} "
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleRequest(req.id, 'rejected')}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                    >
                      Rechazar
                    </button>
                    <button 
                      onClick={() => handleRequest(req.id, 'approved')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow"
                    >
                      Aprobar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-700">Bitácora Global de Fichajes</h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3">Empleado</th>
                      <th className="px-6 py-3">Acción</th>
                      <th className="px-6 py-3">Fecha/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLogs.map(log => (
                      <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{log.userName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                            log.type === 'in' ? 'bg-green-100 text-green-700' :
                            log.type === 'out' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {log.type === 'in' ? <LogIn size={12}/> : log.type === 'out' ? <LogOut size={12}/> : <Coffee size={12}/>}
                            {log.type === 'in' ? 'Entrada' : log.type === 'out' ? 'Salida' : 'Pausa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                           {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '...'}
                        </td>
                      </tr>
                    ))}
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

// --- Componente Principal ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
       if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        // En entorno de preview, auth anonima de fallback si no hay token
        // En tu PC esto no se ejecutará si usas el import local
        // await signInAnonymously(auth); 
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    const userProfileRef = getDocRef(COLLECTION_USERS, user.uid);
    
    const unsub = onSnapshot(userProfileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData({ ...docSnap.data(), uid: user.uid });
      } else {
        setUserData(null); 
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleRegisterOrLogin = async (formData) => {
    if (!user) {
      // Intento de login anónimo si falla google auth en preview
      await signInAnonymously(auth);
    }
    
    const currentUser = auth.currentUser;
    if (!currentUser) return; 

    try {
      await setDoc(getDocRef(COLLECTION_USERS, currentUser.uid), {
         ...formData,
         email: currentUser.email || '', 
         createdAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Error creating profile:", e);
    }
  };

  if (loading) return <Loading />;

  if (!userData) {
    return <AuthScreen onLogin={handleRegisterOrLogin} currentUser={user} />;
  }

  if (userData.role === 'admin') {
    return <AdminDashboard user={userData} />;
  }

  return <EmployeeDashboard user={userData} userDocId={user.uid} />;
}