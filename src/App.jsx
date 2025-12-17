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
import { getFirestore, collection, addDoc, query, onSnapshot, doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

let auth_final, db_final, logo_final;
try {
  if (typeof __firebase_config !== 'undefined') {
    const firebaseConfig = JSON.parse(__firebase_config);
    const app = initializeApp(firebaseConfig);
    auth_final = getAuth(app);
    db_final = getFirestore(app);
    logo_final = "https://via.placeholder.com/150?text=LOGO";
  }
} catch (e) {}
// =============================================================================

import { 
  Clock, LogIn, LogOut, Coffee, ShieldAlert, FileText, 
  CheckCircle, Users, Briefcase, History, AlertCircle, 
  Calendar, ChevronLeft, ChevronRight, User
} from 'lucide-react';

const COLLECTION_USERS = 'users'; 
const COLLECTION_LOGS = 'logs';
const COLLECTION_REQUESTS = 'requests';

const Logo = () => (
  <div className="flex flex-col items-center justify-center mb-6">
    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-blue-900 overflow-hidden relative z-10">
      <img 
        src={typeof logoImg !== 'undefined' ? logoImg : logo_final} 
        alt="Logo" 
        className="w-full h-full object-cover" 
        onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.opacity = 1; }} 
      />
      <Briefcase className="w-16 h-16 text-blue-900 absolute opacity-0" />
    </div>
    <h1 className="mt-4 text-2xl font-bold text-blue-900">Control de Acceso</h1>
  </div>
);

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
  </div>
);

// --- Pantalla de Autenticación ---
const AuthScreen = ({ authInstance, dbInstance }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    // Email "falso" interno
    const fakeEmail = `${username.toLowerCase().replace(/\s+/g, '')}@club.local`;

    try {
      if (isRegister) {
        // Registro normal
        const userCredential = await createUserWithEmailAndPassword(authInstance, fakeEmail, password);
        await setDoc(doc(dbInstance, COLLECTION_USERS, userCredential.user.uid), {
          name: username,
          role: 'employee',
          status: 'pending',
          password: password, 
          createdAt: serverTimestamp()
        });
      } else {
        // Login
        try {
          const userCredential = await signInWithEmailAndPassword(authInstance, fakeEmail, password);
          
          // --- AUTOCORRECCIÓN DUMMY ---
          // Si entra DUMMY, forzamos que sea ADMIN siempre, por si se creó mal antes.
          if (username.toUpperCase() === 'DUMMY') {
             await setDoc(doc(dbInstance, COLLECTION_USERS, userCredential.user.uid), {
                name: 'Administrador DUMMY',
                role: 'admin',
                status: 'active',
                password: password,
                lastLogin: serverTimestamp()
             }, { merge: true });
          }
          // ----------------------------

        } catch (loginErr) {
          // Si DUMMY no existe, lo creamos ahora mismo como Admin
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
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setError("Contraseña incorrecta.");
      else if (err.code === 'auth/email-already-in-use') setError("Usuario ya existe.");
      else if (err.code === 'auth/weak-password') setError("La contraseña debe tener 6+ caracteres.");
      else setError("Error de acceso. Intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <Logo />
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button className={`flex-1 py-2 text-sm font-bold rounded-md ${!isRegister ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`} onClick={() => setIsRegister(false)}>Entrar</button>
          <button className={`flex-1 py-2 text-sm font-bold rounded-md ${isRegister ? 'bg-white shadow text-blue-900' : 'text-gray-500'}`} onClick={() => setIsRegister(true)}>Registrarse</button>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de Usuario</label>
            <input type="text" required value={username} onChange={e=>setUsername(e.target.value)} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-900" placeholder="Ej. JuanPerez" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-900" placeholder="******" />
          </div>
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-100 text-center">{error}</div>}
          <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">
            {isRegister ? 'Crear mi cuenta' : 'Iniciar Sesión'}
          </button>
        </form>
        {isRegister && <p className="mt-4 text-xs text-center text-gray-500">Tu cuenta deberá ser aprobada por el administrador.</p>}
      </div>
    </div>
  );
};

// --- Panel de Empleado ---
const EmployeeDashboard = ({ user, userDocId, dbInstance, authInstance }) => {
  const [status, setStatus] = useState('out');
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    const q = query(collection(dbInstance, COLLECTION_LOGS));
    return onSnapshot(q, (snapshot) => {
      const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const myLogs = allLogs.filter(log => log.userId === userDocId).sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds); 
      setLogs(myLogs);
      if (myLogs.length > 0) {
        const last = myLogs[0];
        if (last.type === 'in') setStatus('in'); else if (last.type === 'break_start') setStatus('break'); else setStatus('out');
      }
    });
  }, [userDocId, dbInstance]);

  const handleClock = async (type) => await addDoc(collection(dbInstance, COLLECTION_LOGS), { userId: userDocId, userName: user.name, type, timestamp: serverTimestamp() });

  if (user.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-20 h-20 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Esperando Aprobación</h2>
        <p className="text-gray-600 mt-2">El administrador debe activar tu cuenta.</p>
        <button onClick={() => signOut(authInstance)} className="mt-8 text-blue-600 font-bold underline">Salir</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-lg"><User size={20}/> {user.name}</div>
        <button onClick={() => signOut(authInstance)} className="bg-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-700">Salir</button>
      </header>
      <main className="max-w-md mx-auto p-4 mt-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <p className="text-gray-500 mb-4 font-medium uppercase text-sm tracking-wide">Registro de Jornada</p>
          <div className="space-y-3">
            <button onClick={()=>handleClock('in')} disabled={status!=='out'} className={`w-full p-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all ${status==='out'?'bg-green-500 text-white shadow-lg hover:bg-green-600':'bg-gray-100 text-gray-300'}`}><LogIn /> ENTRADA</button>
            <button onClick={()=>handleClock('break_start')} disabled={status!=='in'} className={`w-full p-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all ${status==='in'?'bg-yellow-500 text-white shadow-lg hover:bg-yellow-600':'bg-gray-100 text-gray-300'}`}><Coffee /> PAUSA</button>
            <button onClick={()=>handleClock('out')} disabled={status!=='in' && status!=='break'} className={`w-full p-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all ${status!=='out'?'bg-red-500 text-white shadow-lg hover:bg-red-600':'bg-gray-100 text-gray-300'}`}><LogOut /> SALIDA</button>
          </div>
          <div className="mt-6 pt-4 border-t">
            <span className={`inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${status==='in'?'bg-green-100 text-green-800':status==='break'?'bg-yellow-100 text-yellow-800':'bg-gray-100 text-gray-600'}`}>Estado: {status==='in'?'Trabajando':status==='break'?'En Pausa':'Fuera'}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><History size={16}/> Historial Hoy</h3>
          <div className="space-y-2">
            {logs.slice(0,5).map(log => (
              <div key={log.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                <span className="font-medium capitalize text-gray-700">{log.type === 'in' ? 'Entrada' : log.type === 'out' ? 'Salida' : 'Pausa'}</span>
                <span className="text-gray-500">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="text-center text-gray-400 text-xs py-2">Sin registros hoy</p>}
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
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date()); 
  const [view, setView] = useState('calendar'); 

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

  const changeWeek = (d) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (d * 7));
    setCurrentWeekStart(newDate);
  };

  const approveUser = async (id) => await updateDoc(doc(dbInstance, COLLECTION_USERS, id), { status: 'active' });
  const toggleRole = async (id, currentRole) => {
    if(!window.confirm("¿Cambiar rol?")) return;
    await updateDoc(doc(dbInstance, COLLECTION_USERS, id), { role: currentRole === 'admin' ? 'employee' : 'admin' });
  };

  const getWeeklyData = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return { days, rows: users.map(user => {
      const userLogs = logs.filter(l => l.userId === user.id);
      const daysData = days.map(day => {
        const dayLogs = userLogs.filter(l => {
          if (!l.timestamp) return false;
          const ld = new Date(l.timestamp.seconds * 1000);
          return ld.toDateString() === day.toDateString();
        }).sort((a,b) => a.timestamp.seconds - b.timestamp.seconds);
        if (dayLogs.length === 0) return null;
        const firstIn = dayLogs.find(l => l.type === 'in');
        const lastOut = [...dayLogs].reverse().find(l => l.type === 'out');
        return {
          in: firstIn ? new Date(firstIn.timestamp.seconds*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-',
          out: lastOut ? new Date(lastOut.timestamp.seconds*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'
        };
      });
      return { user, daysData };
    })};
  };

  const weeklyData = getWeeklyData();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2"><ShieldAlert className="text-blue-900" /><h1 className="font-bold text-gray-800">Administración</h1></div>
        <div className="flex gap-4 text-sm font-bold text-gray-500">
          <button onClick={()=>setView('calendar')} className={view==='calendar'?'text-blue-900 underline':''}>Calendario</button>
          <button onClick={()=>setView('users')} className={view==='users'?'text-blue-900 underline':''}>Usuarios ({users.filter(u=>u.status==='pending').length})</button>
          <button onClick={() => signOut(authInstance)} className="text-red-500 hover:underline">Salir</button>
        </div>
      </header>
      <main className="p-4 flex-1 overflow-auto">
        {view === 'users' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-500 uppercase font-bold"><tr><th className="p-4">Nombre</th><th className="p-4">Contraseña</th><th className="p-4">Rol</th><th className="p-4">Estado</th><th className="p-4">Acción</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-bold">{u.name}</td>
                    <td className="p-4 text-gray-500 font-mono">{u.password || '***'}</td>
                    <td className="p-4 cursor-pointer hover:underline" onClick={()=>toggleRole(u.id, u.role)}>{u.role === 'admin' ? 'Admin' : 'Empleado'}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.status==='active'?'bg-green-100 text-green-800':'bg-yellow-100 text-yellow-800'}`}>{u.status}</span></td>
                    <td className="p-4">{u.status === 'pending' && <button onClick={()=>approveUser(u.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Aprobar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {view === 'calendar' && (
          <div className="bg-white rounded-xl shadow overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-700">Semana del {weeklyData.days[0].toLocaleDateString()}</h2>
              <div className="flex items-center gap-4"><button onClick={()=>changeWeek(-1)} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft/></button><button onClick={()=>changeWeek(1)} className="p-1 hover:bg-gray-200 rounded"><ChevronRight/></button></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="p-3 text-left sticky left-0 bg-blue-900 z-10 w-32">Empleado</th>
                    {weeklyData.days.map((d, i) => <th key={i} className="p-3 border-l border-blue-800 min-w-[80px]"><div>{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i]}</div><div className="font-normal opacity-75">{d.getDate()}</div></th>)}
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-left font-bold sticky left-0 bg-white border-r">{row.user.name}</td>
                      {row.daysData.map((data, j) => (
                        <td key={j} className="p-2 border-l">{data ? <div className="flex flex-col gap-1"><span className="bg-green-100 text-green-800 px-1 rounded">{data.in}</span><span className="bg-red-100 text-red-800 px-1 rounded">{data.out}</span></div> : <span className="text-gray-300">-</span>}</td>
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