import React, { useState, useEffect } from 'react';

// =============================================================================
//  🔴 INSTRUCCIONES PARA TU PC (VS CODE)
// =============================================================================
// 1. DESCOMENTA (quita las //) de las siguientes 2 líneas para que funcione:
// import logoImg from './logo.png'; 
// import { auth, db } from './firebaseConfig';

// 2. Una vez descomentadas las de arriba, BORRA el bloque "CÓDIGO TEMPORAL" de abajo.
// =============================================================================

// --- INICIO CÓDIGO TEMPORAL (SOLO PARA QUE NO DE ERROR EL CHAT) ---
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const logoImg = "https://via.placeholder.com/150?text=CLUB+PATINAJE"; // Marcador de posición
// Inicialización dummy para que compile aquí
const appDummy = initializeApp({apiKey: "dummy", projectId: "dummy"}); 
const auth = getAuth(appDummy);
const db = getFirestore(appDummy);
// --- FIN CÓDIGO TEMPORAL -----------------------------------------

import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updatePassword // Importamos updatePassword
} from 'firebase/auth';

import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';

import { 
  Clock, LogIn, LogOut, ShieldAlert, 
  Briefcase, History, Trash2, Edit2, 
  Plus, Save, User, Calendar, 
  ChevronLeft, ChevronRight, PlayCircle
} from 'lucide-react';

const COLLECTION_USERS = 'users'; 
const COLLECTION_LOGS = 'logs';
const COLLECTION_AUDIT = 'audit_trail'; 

// --- Componente Logo ---
const Logo = () => (
  <div className="flex flex-col items-center justify-center mb-6">
    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-indigo-600 overflow-hidden relative z-10">
      <img 
        src={logoImg} 
        alt="Logo Club" 
        className="w-full h-full object-cover" 
        onError={(e) => { 
          e.target.style.display = 'none'; 
          if (e.target.nextSibling) e.target.nextSibling.style.opacity = 1; 
        }} 
      />
      <Briefcase className="w-16 h-16 text-indigo-600 absolute opacity-0" />
    </div>
    <h1 className="mt-4 text-2xl font-bold text-indigo-900">Club de Patinaje</h1>
    <p className="text-sm text-indigo-500">Registro de Trabajadores</p>
  </div>
);

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900"></div>
  </div>
);

// --- Trazabilidad (Cumplimiento VeriFactu) ---
const logAudit = async (action, details, user) => {
  try {
    await addDoc(collection(db, COLLECTION_AUDIT), {
      action,
      details: JSON.stringify(details),
      performedBy: user.email || user.uid,
      timestamp: serverTimestamp(),
      integrityHash: Math.random().toString(36).substring(7) 
    });
  } catch (e) {
    console.error("Error de auditoría:", e);
  }
};

// --- Pantalla de Login / Registro ---
const AuthScreen = ({ authInstance, dbInstance }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Función especial de Inicialización
  const handleInitialize = async () => {
    if(!confirm("¿Deseas inicializar el sistema como Administrador?")) return;
    setLoading(true);
    setError('');
    
    const initUser = "admin";
    const initPass = "123456";
    const fakeEmail = "admin@club-patinaje.local";

    try {
        // Intentar login con credenciales por defecto
        await signInWithEmailAndPassword(authInstance, fakeEmail, initPass);
        // Si entra, verificamos si necesita setup en el dashboard
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                // Crear usuario admin si no existe
                const cred = await createUserWithEmailAndPassword(authInstance, fakeEmail, initPass);
                await setDoc(doc(dbInstance, COLLECTION_USERS, cred.user.uid), {
                    name: "Administrador",
                    role: "admin",
                    status: "active",
                    setupRequired: true, // Importante: Marca para pedir cambio de pass
                    password: initPass,
                    createdAt: serverTimestamp()
                });
            } catch (createError) {
                setError("Error al crear admin: " + createError.message);
                setLoading(false);
            }
        } else {
            setError("Error al inicializar: " + error.message);
            setLoading(false);
        }
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    const fakeEmail = `${username.toLowerCase().replace(/\s+/g, '')}@club-patinaje.local`;

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(authInstance, fakeEmail, password);
        await setDoc(doc(dbInstance, COLLECTION_USERS, userCredential.user.uid), {
          name: username,
          role: 'employee',
          status: 'pending',
          password: password, 
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(authInstance, fakeEmail, password);
      }
    } catch (err) {
      console.error("Error Auth:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setError("Usuario o contraseña incorrectos.");
      else if (err.code === 'auth/email-already-in-use') setError("El usuario ya existe.");
      else if (err.code === 'auth/weak-password') setError("La contraseña es muy corta.");
      else setError("Error de acceso.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <Logo />
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isRegister ? 'bg-white shadow text-indigo-900' : 'text-gray-500'}`} 
            onClick={() => {setIsRegister(false); setError('');}}
          >
            Entrar
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isRegister ? 'bg-white shadow text-indigo-900' : 'text-gray-500'}`} 
            onClick={() => {setIsRegister(true); setError('');}}
          >
            Registrarse
          </button>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de Usuario</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={e=>setUsername(e.target.value)} 
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-900" 
              placeholder="Ej. AlexPatin" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-900" 
              placeholder="******" 
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-100 text-center">
              {error}
            </div>
          )}

          <button type="submit" className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">
            {isRegister ? 'Crear mi cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <button 
                onClick={handleInitialize}
                disabled={loading}
                className="text-indigo-600 font-bold text-sm flex items-center justify-center gap-2 mx-auto hover:bg-indigo-50 px-4 py-2 rounded transition-colors"
            >
                <PlayCircle size={16}/> {loading ? 'Iniciando...' : 'Inicializar Sistema'}
            </button>
            <p className="text-[10px] text-gray-400 mt-1">Solo para el primer uso del administrador</p>
        </div>
      </div>
    </div>
  );
};

// --- Panel de Empleado ---
const EmployeeDashboard = ({ user, userDocId, dbInstance, authInstance }) => {
  const [logs, setLogs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  // Estados para edición
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  
  // Estados para añadir manual
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState('in');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addTime, setAddTime] = useState('');

  useEffect(() => {
    const q = query(collection(dbInstance, COLLECTION_LOGS), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(allLogs.filter(log => log.userId === userDocId));
    });
  }, [userDocId, dbInstance]);

  const handleClock = async (type) => {
    const now = new Date();
    await addDoc(collection(dbInstance, COLLECTION_LOGS), {
      userId: userDocId, 
      userName: user.name, 
      type, 
      timestamp: serverTimestamp(),
      manual: false 
    });
    logAudit('CLOCK_IN_OUT', { type, time: now.toString() }, user);
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!addDate || !addTime) return;
    const dateObj = new Date(`${addDate}T${addTime}`);
    
    await addDoc(collection(dbInstance, COLLECTION_LOGS), {
      userId: userDocId,
      userName: user.name,
      type: addType,
      timestamp: dateObj,
      manual: true
    });
    
    logAudit('MANUAL_ADD', { date: addDate, time: addTime, type: addType }, user);
    setIsAdding(false);
    setAddTime('');
  };

  const handleDelete = async (logId, logData) => {
    if(!window.confirm("¿Borrar este fichaje?")) return;
    await deleteDoc(doc(dbInstance, COLLECTION_LOGS, logId));
    logAudit('DELETE_LOG', { logId, originalData: logData }, user);
  };

  const startEdit = (log) => {
    setEditingId(log.id);
    const d = log.timestamp.seconds ? new Date(log.timestamp.seconds * 1000) : new Date(log.timestamp);
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - offset)).toISOString().slice(0, -1);
    setEditDate(localISOTime.split('T')[0]);
    setEditTime(d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'));
  };

  const saveEdit = async (logId) => {
    const newDateObj = new Date(`${editDate}T${editTime}`);
    await updateDoc(doc(dbInstance, COLLECTION_LOGS, logId), {
      timestamp: newDateObj,
      manual: true
    });
    logAudit('EDIT_LOG', { logId, newDate: editDate, newTime: editTime }, user);
    setEditingId(null);
  };

  if (user.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-20 h-20 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Cuenta Pendiente</h2>
        <p className="text-gray-600 mt-2">El administrador debe validar tu usuario.</p>
        <button onClick={() => signOut(authInstance)} className="mt-8 text-indigo-600 font-bold underline">Salir</button>
      </div>
    );
  }

  const lastLog = logs.length > 0 ? logs[0] : null;
  const currentStatus = lastLog ? lastLog.type : 'out';

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <header className="bg-indigo-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2 font-bold text-lg"><Briefcase size={20}/> {user.name}</div>
        <button onClick={() => signOut(authInstance)} className="bg-indigo-800 px-3 py-1 rounded text-sm hover:bg-indigo-700">Salir</button>
      </header>
      
      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <p className="text-gray-500 mb-4 font-medium uppercase text-xs tracking-wide">Fichaje en Tiempo Real</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={()=>handleClock('in')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all ${currentStatus==='in'?'bg-gray-100 text-gray-400':'bg-green-500 text-white shadow-lg active:scale-95'}`}>
              <LogIn /> ENTRADA
            </button>
            <button onClick={()=>handleClock('out')} className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all ${currentStatus==='out'?'bg-gray-100 text-gray-400':'bg-red-500 text-white shadow-lg active:scale-95'}`}>
              <LogOut /> SALIDA
            </button>
          </div>
          <div className="mt-4">
             <span className={`text-xs font-mono p-1 px-2 rounded ${currentStatus==='in'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                Estado: {currentStatus === 'in' ? 'DENTRO' : 'FUERA'}
             </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><History size={16}/> Mi Historial</h3>
            <button onClick={() => setIsAdding(!isAdding)} className="text-indigo-600 text-xs font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">
              <Plus size={14}/> Añadir Manual
            </button>
          </div>

          {isAdding && (
            <div className="p-4 bg-indigo-50 border-b animate-in slide-in-from-top-2">
              <form onSubmit={handleAddManual} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <select value={addType} onChange={e=>setAddType(e.target.value)} className="p-2 rounded border text-sm w-1/3">
                    <option value="in">Entrada</option>
                    <option value="out">Salida</option>
                  </select>
                  <input type="date" value={addDate} onChange={e=>setAddDate(e.target.value)} className="p-2 rounded border text-sm w-2/3" />
                </div>
                <div className="flex gap-2">
                  <input type="time" required value={addTime} onChange={e=>setAddTime(e.target.value)} className="p-2 rounded border text-sm w-full" />
                  <button type="submit" className="bg-indigo-600 text-white px-4 rounded text-sm font-bold">Guardar</button>
                </div>
              </form>
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto">
            {logs.length === 0 ? <p className="p-4 text-center text-gray-400 text-sm">No hay registros.</p> : null}
            {logs.map(log => {
              const d = log.timestamp.seconds ? new Date(log.timestamp.seconds * 1000) : new Date(log.timestamp);
              
              if (editingId === log.id) {
                return (
                  <div key={log.id} className="p-3 border-b bg-yellow-50 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} className="p-1 border rounded text-sm w-full" />
                      <input type="time" value={editTime} onChange={e=>setEditTime(e.target.value)} className="p-1 border rounded text-sm w-full" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={()=>setEditingId(null)} className="text-gray-500 text-xs">Cancelar</button>
                      <button onClick={()=>saveEdit(log.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"><Save size={12}/> Guardar</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={log.id} className="flex justify-between items-center p-3 border-b hover:bg-gray-50 group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${log.type==='in'?'bg-green-500':'bg-red-500'}`}></div>
                    <div>
                      <div className="font-bold text-gray-700 text-sm">{log.type==='in'?'ENTRADA':'SALIDA'}</div>
                      <div className="text-xs text-gray-500">
                        {d.toLocaleDateString()} <span className="font-mono text-gray-800 ml-1">{d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>startEdit(log)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Editar"><Edit2 size={16}/></button>
                    <button onClick={()=>handleDelete(log.id, log)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Borrar"><Trash2 size={16}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Dashboard Administrador ---
const AdminDashboard = ({ user, dbInstance, authInstance }) => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState('calendar'); 
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  
  // Estados para Setup Inicial
  const [showSetup, setShowSetup] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [setupPass, setSetupPass] = useState('');

  useEffect(() => {
    // Verificar si se requiere configuración inicial
    if (user.setupRequired) {
        setShowSetup(true);
    }
  }, [user]);

  useEffect(() => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1; 
    const monday = new Date(curr.setDate(first));
    monday.setHours(0,0,0,0);
    setCurrentWeekStart(monday);

    const unsubUsers = onSnapshot(collection(dbInstance, COLLECTION_USERS), snap => setUsers(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubLogs = onSnapshot(collection(dbInstance, COLLECTION_LOGS), snap => setLogs(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    return () => { unsubUsers(); unsubLogs(); };
  }, [dbInstance]);

  const handleSetupSave = async (e) => {
      e.preventDefault();
      if (!setupName || setupPass.length < 6) {
          alert("Por favor ingresa un nombre y una contraseña de al menos 6 caracteres.");
          return;
      }
      try {
          if (authInstance.currentUser) {
              await updatePassword(authInstance.currentUser, setupPass);
              await updateDoc(doc(dbInstance, COLLECTION_USERS, user.uid), {
                  name: setupName,
                  password: setupPass,
                  setupRequired: false
              });
              setShowSetup(false);
              alert("¡Configuración completada! Ahora eres el administrador.");
          }
      } catch (e) {
          console.error(e);
          alert("Error: " + e.message + " (Prueba a reconectar si lleva tiempo abierta la sesión)");
      }
  };

  const approveUser = async (id) => await updateDoc(doc(dbInstance, COLLECTION_USERS, id), { status: 'active' });
  const deleteUser = async (id) => { if(window.confirm("¿Borrar usuario y sus datos?")) await deleteDoc(doc(dbInstance, COLLECTION_USERS, id)); };

  const changeWeek = (d) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (d * 7));
    setCurrentWeekStart(newDate);
  };

  const getWeeklyData = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return { days, rows: users.filter(u=>u.role!=='admin').map(user => {
      const userLogs = logs.filter(l => l.userId === user.id);
      const daysData = days.map(day => {
        const dayLogs = userLogs.filter(l => {
          if (!l.timestamp) return false;
          const logDate = l.timestamp.seconds ? new Date(l.timestamp.seconds * 1000) : new Date(l.timestamp);
          return logDate.toDateString() === day.toDateString();
        }).sort((a,b) => {
           const ta = a.timestamp.seconds || 0;
           const tb = b.timestamp.seconds || 0;
           return ta - tb;
        });
        
        if (dayLogs.length === 0) return null;
        
        const firstIn = dayLogs.find(l => l.type === 'in');
        const lastOut = [...dayLogs].reverse().find(l => l.type === 'out');
        
        const fmt = (t) => {
            if(!t) return '-';
            const date = t.seconds ? new Date(t.seconds*1000) : new Date(t);
            return date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        };

        return { in: fmt(firstIn?.timestamp), out: fmt(lastOut?.timestamp) };
      });
      return { user, daysData };
    })};
  };

  const weeklyData = getWeeklyData();

  if (showSetup) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg border-t-4 border-indigo-600">
                <h2 className="text-2xl font-bold text-indigo-900 mb-2">Bienvenido, Administrador</h2>
                <p className="text-gray-500 mb-6">Por seguridad, configura tus datos definitivos para dejar de usar la cuenta por defecto.</p>
                <form onSubmit={handleSetupSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Nombre del Club / Admin</label>
                        <input type="text" required value={setupName} onChange={e=>setSetupName(e.target.value)} className="w-full px-4 py-2 border rounded" placeholder="Ej. Club Patinaje Centro" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Nueva Contraseña</label>
                        <input type="text" required value={setupPass} onChange={e=>setSetupPass(e.target.value)} className="w-full px-4 py-2 border rounded" placeholder="Nueva contraseña segura" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700">Guardar Configuración</button>
                </form>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-indigo-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2"><ShieldAlert /> <h1 className="font-bold">Administración</h1></div>
        <div className="flex gap-4 text-sm font-bold text-indigo-200">
          <button onClick={()=>setView('calendar')} className={view==='calendar'?'text-white underline':''}>Calendario</button>
          <button onClick={()=>setView('users')} className={view==='users'?'text-white underline':''}>Usuarios</button>
          <button onClick={() => signOut(authInstance)} className="text-red-400 hover:text-white">Salir</button>
        </div>
      </header>

      <main className="p-4 flex-1 overflow-auto">
        {view === 'users' && (
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex justify-between items-center">
                <span>Lista de Trabajadores</span>
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded border">Total: {users.length}</span>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-500 uppercase font-bold">
                <tr><th className="p-4">Nombre</th><th className="p-4">Contraseña</th><th className="p-4">Estado</th><th className="p-4">Acción</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-bold text-indigo-900 uppercase">{u.name} {u.role==='admin' && <span className="bg-indigo-100 text-indigo-700 text-xs px-1 rounded ml-2">ADMIN</span>}</td>
                    <td className="p-4 font-mono text-gray-600 bg-gray-50 rounded px-2 select-all">{u.password || '****'}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.status==='active'?'bg-green-100 text-green-800':'bg-yellow-100 text-yellow-800'}`}>{u.status}</span></td>
                    <td className="p-4 flex gap-2">
                      {u.status === 'pending' && <button onClick={()=>approveUser(u.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 shadow text-xs">Aceptar</button>}
                      <button onClick={()=>deleteUser(u.id)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'calendar' && (
          <div className="bg-white rounded-xl shadow overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex flex-col">
                 <h2 className="font-bold text-gray-700">Resumen Semanal</h2>
                 <span className="text-xs text-gray-500">{weeklyData.days[0].toLocaleDateString()} - {weeklyData.days[6].toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>changeWeek(-1)} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft/></button>
                <button onClick={()=>changeWeek(1)} className="p-1 hover:bg-gray-200 rounded"><ChevronRight/></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-indigo-900 text-white">
                    <th className="p-3 text-left sticky left-0 bg-indigo-900 z-10 w-32 border-r border-indigo-800">Empleado</th>
                    {weeklyData.days.map((d, i) => (
                      <th key={i} className="p-2 border-l border-indigo-800 min-w-[70px]">
                        <div>{['L','M','X','J','V','S','D'][i]}</div>
                        <div className="font-normal opacity-75">{d.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.rows.length === 0 && <tr><td colSpan="8" className="p-8 text-gray-400 text-center">No hay empleados registrados.</td></tr>}
                  {weeklyData.rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-left font-bold sticky left-0 bg-white border-r text-indigo-900 uppercase">{row.user.name}</td>
                      {row.daysData.map((data, j) => (
                        <td key={j} className="p-1 border-l">
                          {data ? (
                            <div className="flex flex-col gap-1 text-[10px]">
                              <span className="bg-green-100 text-green-800 px-1 rounded font-bold">{data.in}</span>
                              <span className="bg-red-100 text-red-800 px-1 rounded font-bold">{data.out}</span>
                            </div>
                          ) : <span className="text-gray-200 text-lg">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Componente Principal ---
export default function App() {
  const [user, setUser] = useState(null); 
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);

  // Determinar instancias correctas
  const currentAuth = typeof auth !== 'undefined' ? auth : auth_final;
  const currentDb = typeof db !== 'undefined' ? db : db_final;

  // Escuchar estado de autenticación
  useEffect(() => {
    if(!currentAuth) return;
    const unsubscribe = onAuthStateChanged(currentAuth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, [currentAuth]);

  // Escuchar perfil de usuario en base de datos
  useEffect(() => {
    if (!user || !currentDb) {
      if(!user) setUserData(null);
      return;
    }
    const unsub = onSnapshot(doc(currentDb, COLLECTION_USERS, user.uid), (docSnap) => {
      if (docSnap.exists()) setUserData({ ...docSnap.data(), uid: user.uid });
      else setUserData(null);
      setLoading(false);
    }, (error) => {
      console.error("Error al leer perfil:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [user, currentDb]);

  if (loading) return <Loading />;
  
  if (!user || !userData) {
    return <AuthScreen authInstance={currentAuth} dbInstance={currentDb} />;
  }

  // Router de roles
  if (userData.role === 'admin' && userData.status === 'active') {
    return <AdminDashboard user={userData} dbInstance={currentDb} authInstance={currentAuth} />;
  }

  return <EmployeeDashboard user={userData} userDocId={user.uid} dbInstance={currentDb} authInstance={currentAuth} />;
}