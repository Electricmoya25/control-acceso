import React, { useState, useEffect } from 'react';

// =============================================================================
//  🔴 INSTRUCCIONES PARA TU PC (VS CODE)
// =============================================================================
// 1. Asegúrate de que estas líneas estén activas (sin //) en tu VS Code:
import logoImg from './logo.png'; 
import { auth, db } from './firebaseConfig';

// --- BLOQUE DE COMPATIBILIDAD ---
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';

let auth_final, db_final, logo_final;
try {
  if (typeof __firebase_config !== 'undefined') {
    const firebaseConfig = JSON.parse(__firebase_config);
    const app = initializeApp(firebaseConfig);
    auth_final = getAuth(app);
    db_final = getFirestore(app);
    logo_final = "https://via.placeholder.com/150?text=CLUB+PATINAJE";
  }
} catch (e) {}
// =============================================================================

import { 
  Clock, LogIn, LogOut, ShieldAlert, FileText, 
  CheckCircle, Users, Briefcase, History, AlertCircle, 
  Calendar, Trash2, Edit2, Plus, Save, X, FileBarChart
} from 'lucide-react';

const COLLECTION_USERS = 'users'; 
const COLLECTION_LOGS = 'logs';
const COLLECTION_AUDIT = 'audit_trail'; // Para cumplimiento normativo

const Logo = () => (
  <div className="flex flex-col items-center justify-center mb-6">
    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-indigo-600 overflow-hidden relative z-10">
      <img 
        src={typeof logoImg !== 'undefined' ? logoImg : logo_final} 
        alt="Logo" 
        className="w-full h-full object-cover" 
        onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.opacity = 1; }} 
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

// --- Función de Trazabilidad (Cumplimiento Normativo) ---
const logAudit = async (db, action, details, user) => {
  // En un sistema real VeriFactu, esto generaría un hash encadenado.
  // Aquí simulamos el registro inmutable de la acción.
  try {
    await addDoc(collection(db, COLLECTION_AUDIT), {
      action,
      details: JSON.stringify(details),
      performedBy: user.email || user.uid,
      timestamp: serverTimestamp(),
      integrityHash: Math.random().toString(36).substring(7) // Simulación de hash
    });
  } catch (e) {
    console.error("Error de auditoría:", e);
  }
};

// --- Pantalla de Autenticación Simplificada ---
const AuthScreen = ({ authInstance, dbInstance }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    // Email "falso" interno para que Firebase funcione con Username
    const fakeEmail = `${username.toLowerCase().replace(/\s+/g, '')}@club-patinaje.local`;

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(authInstance, fakeEmail, password);
        await setDoc(doc(dbInstance, COLLECTION_USERS, userCredential.user.uid), {
          name: username,
          role: 'employee', // Por defecto empleado
          status: 'pending', // Requiere aprobación
          password: password, // Visible para admin como pediste
          createdAt: serverTimestamp()
        });
      } else {
        try {
          const userCredential = await signInWithEmailAndPassword(authInstance, fakeEmail, password);
          // Auto-corrección DUMMY (Admin por defecto)
          if (username.toUpperCase() === 'DUMMY') {
             await setDoc(doc(dbInstance, COLLECTION_USERS, userCredential.user.uid), {
                name: 'Administrador DUMMY',
                role: 'admin',
                status: 'active',
                password: password,
                lastLogin: serverTimestamp()
             }, { merge: true });
          }
        } catch (loginErr) {
          // Si DUMMY no existe, crearlo al vuelo
          if (username.toUpperCase() === 'DUMMY' && password === '123456' && loginErr.code === 'auth/user-not-found') {
             const userCredential = await createUserWithEmailAndPassword(authInstance, fakeEmail, password);
             await setDoc(doc(dbInstance, COLLECTION_USERS, userCredential.user.uid), {
                name: 'Administrador DUMMY',
                role: 'admin',
                status: 'active',
                password: password,
                createdAt: serverTimestamp()
             });
             return; 
          }
          throw loginErr; 
        }
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setError("Usuario o contraseña incorrectos.");
      else if (err.code === 'auth/email-already-in-use') setError("El usuario ya existe.");
      else if (err.code === 'auth/weak-password') setError("La contraseña es muy corta (min 6).");
      else setError("Error de acceso.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <Logo />
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button className={`flex-1 py-2 text-sm font-bold rounded-md ${!isRegister ? 'bg-white shadow text-indigo-900' : 'text-gray-500'}`} onClick={() => setIsRegister(false)}>Entrar</button>
          <button className={`flex-1 py-2 text-sm font-bold rounded-md ${isRegister ? 'bg-white shadow text-indigo-900' : 'text-gray-500'}`} onClick={() => setIsRegister(true)}>Registrarse</button>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de Usuario</label>
            <input type="text" required value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-900" placeholder="Ej. AlexPatin" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-900" placeholder="******" />
          </div>
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-100 text-center">{error}</div>}
          <button type="submit" className="w-full bg-indigo-900 hover:bg-indigo-800 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">
            {isRegister ? 'Crear mi cuenta' : 'Iniciar Sesión'}
          </button>
        </form>
        {isRegister && <p className="mt-4 text-xs text-center text-gray-500">Tu cuenta deberá ser activada por el administrador.</p>}
      </div>
    </div>
  );
};

// --- Panel de Empleado (Autogestión Total) ---
const EmployeeDashboard = ({ user, userDocId, dbInstance, authInstance }) => {
  const [logs, setLogs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState('in');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addTime, setAddTime] = useState('');

  useEffect(() => {
    // Escuchar logs ordenados
    const q = query(collection(dbInstance, COLLECTION_LOGS), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      // Filtrado en cliente por simplicidad
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
    // Trazabilidad
    logAudit(dbInstance, 'CLOCK_IN_OUT', { type, time: now.toString() }, user);
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!addDate || !addTime) return;
    const dateObj = new Date(`${addDate}T${addTime}`);
    
    await addDoc(collection(dbInstance, COLLECTION_LOGS), {
      userId: userDocId,
      userName: user.name,
      type: addType,
      timestamp: dateObj, // Guardamos objeto fecha directamente si no usamos serverTimestamp
      manual: true
    });
    
    logAudit(dbInstance, 'MANUAL_ADD', { date: addDate, time: addTime, type: addType }, user);
    setIsAdding(false);
    setAddTime('');
  };

  const handleDelete = async (logId, logData) => {
    if(!window.confirm("¿Seguro que quieres borrar este fichaje? Se guardará un registro de esta acción.")) return;
    await deleteDoc(doc(dbInstance, COLLECTION_LOGS, logId));
    logAudit(dbInstance, 'DELETE_LOG', { logId, originalData: logData }, user);
  };

  const startEdit = (log) => {
    setEditingId(log.id);
    const d = log.timestamp.seconds ? new Date(log.timestamp.seconds * 1000) : log.timestamp;
    // Formatear para inputs
    setEditDate(d.toISOString().split('T')[0]);
    setEditTime(d.toTimeString().slice(0,5));
  };

  const saveEdit = async (logId) => {
    const newDateObj = new Date(`${editDate}T${editTime}`);
    await updateDoc(doc(dbInstance, COLLECTION_LOGS, logId), {
      timestamp: newDateObj,
      manual: true
    });
    logAudit(dbInstance, 'EDIT_LOG', { logId, newDate: editDate, newTime: editTime }, user);
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

  // Estado actual (aproximado basado en el último log)
  const lastLog = logs.length > 0 ? logs[0] : null;
  const currentStatus = lastLog ? lastLog.type : 'out';

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <header className="bg-indigo-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2 font-bold text-lg"><Briefcase size={20}/> {user.name}</div>
        <button onClick={() => signOut(authInstance)} className="bg-indigo-800 px-3 py-1 rounded text-sm hover:bg-indigo-700">Salir</button>
      </header>
      
      <main className="max-w-xl mx-auto p-4 space-y-6">
        
        {/* Panel de Fichaje Rápido */}
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

        {/* Panel de Gestión (Añadir/Editar/Borrar) */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><History size={16}/> Mi Historial</h3>
            <button onClick={() => setIsAdding(!isAdding)} className="text-indigo-600 text-xs font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">
              <Plus size={14}/> Añadir Manual
            </button>
          </div>

          {/* Formulario Añadir Manual */}
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

          {/* Lista de Registros */}
          <div className="max-h-[400px] overflow-y-auto">
            {logs.length === 0 ? <p className="p-4 text-center text-gray-400 text-sm">No hay registros.</p> : null}
            {logs.map(log => {
              const d = log.timestamp.seconds ? new Date(log.timestamp.seconds * 1000) : log.timestamp; // Manejo de timestamp firestore vs fecha js
              
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
const AdminDashboard = ({ dbInstance, authInstance }) => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [view, setView] = useState('users'); 

  useEffect(() => {
    // Escuchar cambios en tiempo real
    const unsubUsers = onSnapshot(collection(dbInstance, COLLECTION_USERS), snap => setUsers(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubLogs = onSnapshot(collection(dbInstance, COLLECTION_LOGS), snap => setLogs(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    return () => { unsubUsers(); unsubLogs(); };
  }, [dbInstance]);

  const approveUser = async (id) => await updateDoc(doc(dbInstance, COLLECTION_USERS, id), { status: 'active' });
  const deleteUser = async (id) => { if(window.confirm("¿Borrar usuario y sus datos?")) await deleteDoc(doc(dbInstance, COLLECTION_USERS, id)); };

  // Cálculo de Horas Trabajadas (Estimación)
  const calculateHours = (userId) => {
    // Obtenemos logs del usuario ordenados
    const userLogs = logs.filter(l => l.userId === userId).sort((a,b) => {
        const tA = a.timestamp.seconds || (a.timestamp.getTime()/1000);
        const tB = b.timestamp.seconds || (b.timestamp.getTime()/1000);
        return tA - tB;
    });

    let totalMilliseconds = 0;
    let entryTime = null;

    userLogs.forEach(log => {
        const time = log.timestamp.seconds ? log.timestamp.seconds * 1000 : log.timestamp.getTime(); // timestamp a ms
        if (log.type === 'in') {
            entryTime = time;
        } else if (log.type === 'out' && entryTime) {
            totalMilliseconds += (time - entryTime);
            entryTime = null;
        }
    });

    // Convertir a horas
    const hours = Math.floor(totalMilliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-indigo-900 text-white p-4 shadow-lg flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2"><ShieldAlert /> <h1 className="font-bold">Administración</h1></div>
        <div className="flex gap-4 text-sm font-bold text-indigo-200">
          <button onClick={()=>setView('users')} className={view==='users'?'text-white underline':''}>Usuarios</button>
          <button onClick={()=>setView('reports')} className={view==='reports'?'text-white underline':''}>Informes</button>
          <button onClick={() => signOut(authInstance)} className="text-red-400 hover:text-white">Salir</button>
        </div>
      </header>

      <main className="p-4 flex-1 overflow-auto">
        {view === 'users' && (
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Lista de Trabajadores</div>
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-500 uppercase font-bold">
                <tr><th className="p-4">Nombre</th><th className="p-4">Contraseña</th><th className="p-4">Estado</th><th className="p-4">Acción</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-bold text-indigo-900">{u.name} {u.role==='admin' && <span className="bg-indigo-100 text-indigo-700 text-xs px-1 rounded ml-2">ADMIN</span>}</td>
                    <td className="p-4 font-mono text-gray-600 bg-gray-50 rounded px-2">{u.password || '****'}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.status==='active'?'bg-green-100 text-green-800':'bg-yellow-100 text-yellow-800'}`}>{u.status}</span></td>
                    <td className="p-4 flex gap-2">
                      {u.status === 'pending' && <button onClick={()=>approveUser(u.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Aceptar</button>}
                      <button onClick={()=>deleteUser(u.id)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'reports' && (
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow overflow-hidden">
             <div className="p-4 bg-gray-50 border-b flex justify-between">
                <h3 className="font-bold text-gray-700">Resumen de Horas (Estimado)</h3>
                <span className="text-xs text-gray-400 flex items-center gap-1"><ShieldAlert size={12}/> Auditoría Activa</span>
             </div>
             <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-500 uppercase font-bold">
                <tr><th className="p-4">Empleado</th><th className="p-4">Fichajes Totales</th><th className="p-4">Horas Totales</th></tr>
              </thead>
              <tbody>
                {users.filter(u=>u.role!=='admin').map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="p-4 font-bold">{u.name}</td>
                    <td className="p-4">{logs.filter(l=>l.userId===u.id).length} movimientos</td>
                    <td className="p-4 font-mono font-bold text-indigo-700">{calculateHours(u.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 text-xs text-gray-400 bg-gray-50 border-t">
               * Nota: El sistema guarda un registro de auditoría interno de todas las modificaciones realizadas por los usuarios para cumplir con la normativa.
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null); 
  const [userData, setUserData] = useState(null); 
  const [loading, setLoading] = useState(true);

  const currentAuth = typeof auth !== 'undefined' ? auth : auth_final;
  const currentDb = typeof db !== 'undefined' ? db : db_final;

  useEffect(() => {
    if (!currentAuth) return;
    return onAuthStateChanged(currentAuth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
  }, [currentAuth]);

  useEffect(() => {
    if (!user || !currentDb) {
      if(!user) setUserData(null);
      return;
    }
    // Escucha en tiempo real del documento de usuario
    const unsub = onSnapshot(doc(currentDb, COLLECTION_USERS, user.uid), (docSnap) => {
      if (docSnap.exists()) setUserData({ ...docSnap.data(), uid: user.uid });
      else setUserData(null);
      setLoading(false);
    });
    return () => unsub();
  }, [user, currentDb]);

  if (loading) return <Loading />;
  
  if (!user || !userData) {
    return <AuthScreen authInstance={currentAuth} dbInstance={currentDb} />;
  }

  if (userData.role === 'admin' && userData.status === 'active') {
    return <AdminDashboard dbInstance={currentDb} authInstance={currentAuth} />;
  }

  return <EmployeeDashboard user={userData} userDocId={user.uid} dbInstance={currentDb} authInstance={currentAuth} />;
}