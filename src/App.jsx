import React, { useState, useEffect, useRef } from 'react';

// =============================================================================
//  🔴 INSTRUCCIONES PARA ACTIVAR EN TU PC (VS CODE)
// =============================================================================
// 1. QUITA las barras '//' de las dos líneas siguientes para activar tus archivos:
import logoImg from './logo.png'; 
import { auth, db } from './firebaseConfig';



import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
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
  getDoc, 
  serverTimestamp, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  Clock, LogIn, LogOut, Coffee, ShieldAlert, FileText, CheckCircle, Users,
  Briefcase, History, AlertCircle, Chrome, Eye, EyeOff, Printer, FileBarChart,
  Lock, Settings, RefreshCcw, Key, UserPlus, Mail
} from 'lucide-react';

// --- Constantes Globales ---
const DEFAULT_ADMIN_CODE = "123456"; 
const MASTER_EMAIL = "master@master.es"; 
const COLLECTION_USERS = 'users'; 
const COLLECTION_LOGS = 'logs';
const COLLECTION_REQUESTS = 'requests';
const COLLECTION_SETTINGS = 'settings'; 
const COLLECTION_ADMIN_INVITES = 'admin_invites';

// --- Componente Logo ---
const Logo = () => (
  <div className="flex items-center justify-center mb-6">
    <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-blue-900 overflow-hidden relative z-10">
      <img 
        src={logoImg} 
        alt="Logo" 
        className="w-full h-full object-cover" 
        onError={(e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.opacity = 1;
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

// --- Pantalla de Autenticación (Login / Registro / Olvidé Contraseña) ---
const AuthScreen = ({ onCompleteProfile, currentUser }) => {
  const [authMode, setAuthMode] = useState('login'); 
  const [isAdminMode, setIsAdminMode] = useState(false); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  
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

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Correo de recuperación enviado. Revisa tu bandeja de entrada.");
      setError('');
    } catch (err) {
      setError("No se pudo enviar el correo. Verifica que el email sea correcto.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(''); setResetMessage('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError("Error de autenticación. Revisa tus credenciales.");
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Ingresa tu nombre.'); return; }

    let finalStatus = 'pending';
    if (role === 'admin') {
      if (currentUser?.email === MASTER_EMAIL) {
        finalStatus = 'active';
      } else {
        try {
          const inviteRef = doc(db, COLLECTION_ADMIN_INVITES, currentUser.email);
          const inviteSnap = await getDoc(inviteRef);
          if (inviteSnap.exists()) {
            finalStatus = 'active';
          } else {
            const settingsRef = doc(db, COLLECTION_SETTINGS, 'admin_config');
            const settingsSnap = await getDoc(settingsRef);
            const currentCode = settingsSnap.exists() ? settingsSnap.data().code : DEFAULT_ADMIN_CODE;
            if (adminCode !== currentCode) { setError('Código de administrador incorrecto.'); return; }
            finalStatus = 'active';
          }
        } catch(e) {
           // Fallback si falla la lectura (ej. permisos iniciales)
           if (adminCode === DEFAULT_ADMIN_CODE) finalStatus = 'active';
           else { setError('Error verificando admin.'); return; }
        }
      }
    }
    onCompleteProfile({ name, role, status: finalStatus });
  };

  // Si NO hay usuario autenticado
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-all duration-500 ${isAdminMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${isAdminMode ? 'bg-red-600' : 'bg-blue-900'}`}></div>
          <Logo />
          <h2 className="text-2xl font-bold text-center text-gray-800">{isAdminMode ? 'Portal Admin' : 'Acceso Personal'}</h2>
          
          <div className="flex bg-gray-100 p-1 rounded-lg my-6">
            <button className={`flex-1 py-2 text-sm font-bold rounded-md ${authMode === 'login' ? 'bg-white shadow' : 'text-gray-500'}`} onClick={() => setAuthMode('login')}>Entrar</button>
            <button className={`flex-1 py-2 text-sm font-bold rounded-md ${authMode === 'register' ? 'bg-white shadow' : 'text-gray-500'}`} onClick={() => setAuthMode('register')}>Registrarse</button>
          </div>
          
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="correo@ejemplo.com" />
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-lg pr-10" placeholder="Contraseña" />
              <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400"><Eye size={20} /></button>
            </div>
            
            {authMode === 'login' && <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-600 hover:underline block ml-auto">¿Olvidaste tu contraseña?</button>}
            
            {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-100">{error}</div>}
            {resetMessage && <div className="p-3 bg-green-50 text-green-700 text-xs rounded border border-green-100">{resetMessage}</div>}
            
            <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl shadow-lg ${isAdminMode ? 'bg-red-700' : 'bg-blue-900'}`}>{authMode === 'login' ? 'Entrar' : 'Crear Cuenta'}</button>
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

          <div className="mt-8 text-center">
            <button onClick={() => setIsAdminMode(!isAdminMode)} className="text-xs text-gray-400 flex items-center justify-center gap-2 mx-auto"><Lock size={12}/> {isAdminMode ? 'Volver a Empleados' : 'Acceso Administrador'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg">
        <Logo />
        <h2 className="text-xl font-bold text-center mb-6">Completar Perfil</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Tu nombre completo" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>setRole('employee')} className={`py-2 border rounded-lg ${role==='employee'?'bg-blue-50 border-blue-500 text-blue-700':'bg-white'}`}>Empleado</button>
            <button type="button" onClick={()=>setRole('admin')} className={`py-2 border rounded-lg ${role==='admin'?'bg-purple-50 border-purple-500 text-purple-700':'bg-white'}`}>Admin</button>
          </div>
          {role === 'admin' && currentUser?.email !== MASTER_EMAIL && (
            <input type="password" required value={adminCode} onChange={e=>setAdminCode(e.target.value)} className="w-full px-4 py-2 border border-purple-300 rounded-lg bg-purple-50" placeholder="Código de Administrador" />
          )}
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded">{error}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={()=>signOut(auth)} className="w-1/3 py-3 bg-gray-200 rounded-xl font-bold">Salir</button>
            <button type="submit" className="w-2/3 py-3 bg-blue-900 text-white rounded-xl font-bold">Guardar y Entrar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Dashboard Empleado ---
const EmployeeDashboard = ({ user, userDocId }) => {
  const [status, setStatus] = useState('out');
  const [logs, setLogs] = useState([]);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionTime, setCorrectionTime] = useState('');
  const [correctionDate, setCorrectionDate] = useState('');
  const [myRequests, setMyRequests] = useState([]);

  useEffect(() => {
    if (!userDocId || !db) return;
    const q = query(collection(db, COLLECTION_LOGS));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const myLogs = allLogs.filter(log => log.userId === userDocId).sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds); 
      setLogs(myLogs);
      if (myLogs.length > 0) {
        const last = myLogs[0];
        if (last.type === 'in') setStatus('in');
        else if (last.type === 'break_start') setStatus('break');
        else setStatus('out');
      }
    });
    return () => unsubscribe();
  }, [userDocId]);

  useEffect(() => {
    if (!userDocId || !db) return;
    const q = collection(db, COLLECTION_REQUESTS);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyRequests(reqs.filter(r => r.userId === userDocId));
    });
    return () => unsubscribe();
  }, [userDocId]);

  const handleClock = async (type) => {
    await addDoc(collection(db, COLLECTION_LOGS), {
      userId: userDocId, userName: user.name, type, timestamp: serverTimestamp(), dateString: new Date().toLocaleDateString()
    });
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionDate || !correctionTime || !correctionReason) return;
    await addDoc(collection(db, COLLECTION_REQUESTS), {
      userId: userDocId, userName: user.name, date: correctionDate, time: correctionTime, reason: correctionReason, status: 'pending', timestamp: serverTimestamp()
    });
    setShowCorrection(false); setCorrectionReason(''); setCorrectionTime(''); setCorrectionDate('');
    alert('Solicitud enviada');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-900 text-white p-4 shadow-md w-full">
        <div className="w-full px-4 md:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <Briefcase size={24} />
             <div><h1 className="font-bold">{user.name}</h1><p className="text-xs text-blue-200">Panel Empleado</p></div>
          </div>
          <button onClick={() => signOut(auth)} className="bg-blue-800 p-2 rounded hover:bg-blue-700"><LogOut size={18} /></button>
        </div>
      </header>
      <main className="w-full px-4 md:px-8 py-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={()=>handleClock('in')} disabled={status!=='out'} className={`p-8 rounded-xl flex flex-col items-center gap-3 transition-all ${status==='out'?'bg-green-100 text-green-800 border-2 border-green-500 shadow-md hover:scale-105':'bg-gray-50 text-gray-300 cursor-not-allowed'}`}><LogIn size={40}/> <span className="font-bold">Entrada</span></button>
            <button onClick={()=>handleClock('break_start')} disabled={status!=='in'} className={`p-8 rounded-xl flex flex-col items-center gap-3 transition-all ${status==='in'?'bg-yellow-100 text-yellow-800 border-2 border-yellow-500 shadow-md hover:scale-105':'bg-gray-50 text-gray-300 cursor-not-allowed'}`}><Coffee size={40}/> <span className="font-bold">Pausa</span></button>
            <button onClick={()=>handleClock(status==='break'?'in':'out')} disabled={status==='out'} className={`p-8 rounded-xl flex flex-col items-center gap-3 transition-all ${status!=='out'?'bg-red-100 text-red-800 border-2 border-red-500 shadow-md hover:scale-105':'bg-gray-50 text-gray-300 cursor-not-allowed'}`}><LogOut size={40}/> <span className="font-bold">{status==='break'?'Volver':'Salida'}</span></button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 h-96 flex flex-col">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-700"><History size={18}/> Registros Recientes</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {logs.map(log => (
                <div key={log.id} className="flex justify-between p-3 bg-gray-50 rounded text-sm">
                  <span className={`font-bold ${log.type==='in'?'text-green-600':log.type==='out'?'text-red-600':'text-yellow-600'}`}>{log.type==='in'?'Entrada':log.type==='out'?'Salida':'Pausa'}</span>
                  <span className="text-gray-500">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '...'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Dashboard Administrador ---
const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users'); 
  const [allUsers, setAllUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [reportFilter, setReportFilter] = useState('week');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminCode, setNewAdminCode] = useState('');
  const [msg, setMsg] = useState('');
  const [adminInvites, setAdminInvites] = useState([]);

  useEffect(() => {
    if (!db) return;
    onSnapshot(collection(db, COLLECTION_USERS), (snap) => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, COLLECTION_LOGS), (snap) => setAllLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>b.timestamp?.seconds - a.timestamp?.seconds)));
    onSnapshot(collection(db, COLLECTION_REQUESTS), (snap) => setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === 'pending')));
    onSnapshot(collection(db, COLLECTION_ADMIN_INVITES), (snap) => setAdminInvites(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const approveUser = async (userId) => { await updateDoc(doc(db, COLLECTION_USERS, userId), { status: 'active' }); };
  const promoteToAdmin = async (userId) => { 
    if(window.confirm("¿Hacer Admin?")) await updateDoc(doc(db, COLLECTION_USERS, userId), { role: 'admin', status: 'active' }); 
  };
  const handleRequest = async (reqId, status) => { await updateDoc(doc(db, COLLECTION_REQUESTS, reqId), { status }); };

  const getFilteredLogs = () => {
    const now = new Date();
    const start = new Date();
    if (reportFilter === 'week') start.setDate(now.getDate() - 7);
    else if (reportFilter === 'month') start.setMonth(now.getMonth() - 1);
    else start.setFullYear(now.getFullYear() - 1);
    return allLogs.filter(l => l.timestamp && new Date(l.timestamp.seconds * 1000) >= start);
  };

  const handleUpdateCode = async () => {
    if (newAdminCode.length < 4) return;
    await setDoc(doc(db, COLLECTION_SETTINGS, 'admin_config'), { code: newAdminCode, updatedAt: serverTimestamp() });
    setMsg("Contraseña actualizada."); setNewAdminCode('');
  };

  const handleReset = async () => {
    await setDoc(doc(db, COLLECTION_SETTINGS, 'admin_config'), { code: DEFAULT_ADMIN_CODE, updatedAt: serverTimestamp() });
    setMsg("Contraseña restaurada a 123456.");
  };

  const handleInvite = async () => {
    if (!newAdminEmail.includes('@')) return;
    await setDoc(doc(db, COLLECTION_ADMIN_INVITES, newAdminEmail), { email: newAdminEmail, addedBy: user.email });
    setMsg("Administrador invitado con éxito."); setNewAdminEmail('');
  };

  const handleDeleteInvite = async (emailId) => {
    if (window.confirm("¿Eliminar invitación?")) await deleteDoc(doc(db, COLLECTION_ADMIN_INVITES, emailId));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <style>{`@media print { .no-print { display: none !important; } .print-only { display: block !important; } body { background: white; } }`}</style>
      <header className="bg-indigo-900 text-white p-4 shadow-lg no-print w-full">
        <div className="w-full px-4 md:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3"><ShieldAlert size={28} /> <h1 className="font-bold text-xl">Panel de Control</h1></div>
          <button onClick={() => signOut(auth)} className="text-indigo-200 hover:text-white"><LogOut size={20} /></button>
        </div>
      </header>
      <div className="flex-1 w-full px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        <nav className="space-y-2 no-print">
          {['users', 'requests', 'logs', 'reports', 'settings'].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)} className={`w-full text-left p-3 rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-white text-indigo-700 shadow font-bold' : 'text-gray-600 hover:bg-gray-200'}`}>
              {tab === 'requests' ? `Solicitudes (${pendingRequests.length})` : tab}
            </button>
          ))}
        </nav>
        <main className="md:col-span-3">
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 uppercase text-gray-500 font-bold"><tr><th className="px-6 py-3">Usuario</th><th className="px-6 py-3">Rol</th><th className="px-6 py-3">Estado</th><th className="px-6 py-3">Acción</th></tr></thead>
                <tbody>
                  {allUsers.map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="px-6 py-4 font-medium">{u.name || 'Sin nombre'}</td>
                      <td className="px-6 py-4 capitalize">{u.role}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.status==='active'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{u.status}</span></td>
                      <td className="px-6 py-4 flex gap-2">
                        {u.status==='pending' && <button onClick={()=>approveUser(u.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Aprobar</button>}
                        {u.role !== 'admin' && <button onClick={()=>promoteToAdmin(u.id)} className="text-indigo-600 border border-indigo-200 px-2 py-1 rounded text-xs">+ Admin</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-6 no-print">
                <h3 className="font-bold text-lg">Informes de Asistencia</h3>
                <div className="flex gap-2">
                  <select value={reportFilter} onChange={e=>setReportFilter(e.target.value)} className="border rounded p-2 text-sm">
                    <option value="week">Esta Semana</option><option value="month">Este Mes</option><option value="year">Este Año</option>
                  </select>
                  <button onClick={()=>window.print()} className="bg-blue-900 text-white px-4 py-2 rounded text-sm flex items-center gap-2"><Printer size={16}/> PDF</button>
                </div>
              </div>
              <div className="hidden print-only mb-8 text-center"><h1 className="text-2xl font-bold">Informe Club Acceso</h1><p>{new Date().toLocaleDateString()}</p></div>
              <table className="w-full text-sm border">
                <thead><tr className="bg-gray-100 font-bold"> <th className="p-3 border">Nombre</th><th className="p-3 border">Acción</th><th className="p-3 border">Fecha/Hora</th> </tr></thead>
                <tbody>
                  {getFilteredLogs().map(l => (
                    <tr key={l.id} className="border-b"><td className="p-3">{l.userName}</td><td className="p-3 uppercase">{l.type}</td><td className="p-3">{l.timestamp ? new Date(l.timestamp.seconds*1000).toLocaleString() : ''}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-indigo-500">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-700"><Key size={18}/> Código de Admin General</h3>
                <div className="flex gap-2">
                  <input type="text" value={newAdminCode} onChange={e=>setNewAdminCode(e.target.value)} placeholder="Nuevo código..." className="flex-1 border rounded p-2" />
                  <button onClick={handleUpdateCode} className="bg-indigo-600 text-white px-4 rounded font-bold">Actualizar</button>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-green-700"><UserPlus size={18}/> Invitar Nuevo Administrador</h3>
                <div className="flex gap-2">
                  <input type="email" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="email@admin.com" className="flex-1 border rounded p-2" />
                  <button onClick={handleInvite} className="bg-green-600 text-white px-4 rounded font-bold">Invitar</button>
                </div>
                {adminInvites.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {adminInvites.map(inv => (
                      <li key={inv.id} className="flex justify-between bg-gray-50 p-2 rounded text-sm">
                        <span>{inv.email}</span>
                        <button onClick={()=>handleDeleteInvite(inv.id)} className="text-red-500 text-xs">Eliminar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {user.email === MASTER_EMAIL && (
                <div className="bg-red-50 p-6 rounded-xl shadow border border-red-200">
                   <h3 className="font-bold text-red-800 mb-2">Zona Maestra</h3>
                   <button onClick={handleReset} className="w-full py-2 border-2 border-red-600 text-red-600 rounded font-bold hover:bg-red-600 hover:text-white transition-all">Restaurar Clave Original (123456)</button>
                </div>
              )}
              {msg && <div className="text-center text-sm font-bold text-green-600 mt-4">{msg}</div>}
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
    // Si auth no está inicializado (en local pero sin descomentar), salir
    if(!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) {
      if(!user) setUserData(null);
      return;
    }
    const userProfileRef = doc(db, COLLECTION_USERS, user.uid);
    const unsub = onSnapshot(userProfileRef, (docSnap) => {
      if (docSnap.exists()) setUserData({ ...docSnap.data(), uid: user.uid });
      else setUserData(null);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleComplete = async (formData) => {
    if (!user) return;
    await setDoc(doc(db, COLLECTION_USERS, user.uid), {
       ...formData, email: user.email || '', createdAt: serverTimestamp()
    }, { merge: true });
  };

  if (loading) return <Loading />;
  if (!user || !userData) return <AuthScreen onCompleteProfile={handleComplete} currentUser={user} authInstance={auth} dbInstance={db} />;
  
  return userData.role === 'admin' 
    ? <AdminDashboard user={userData} dbInstance={db} authInstance={auth} /> 
    : <EmployeeDashboard user={userData} userDocId={user.uid} dbInstance={db} authInstance={auth} />;
}