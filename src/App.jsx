import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     AUTH
  ========================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  /* =========================
     LOGS (ADMIN)
  ========================= */
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLogs(data);
    });

    return () => unsub();
  }, [user]);

  /* =========================
     FICHAJE
  ========================= */
  const registerLog = async (type) => {
    await addDoc(collection(db, "logs"), {
      uid: user.uid,
      email: user.email,
      type,
      timestamp: new Date(),
    });
  };

  const typeToText = (type) => {
    switch (type) {
      case "in":
        return "Entrada";
      case "out":
        return "Salida";
      case "break_start":
        return "Inicio de pausa";
      case "break_end":
        return "Fin de pausa";
      default:
        return type;
    }
  };

  /* =========================
     LOGIN SCREEN
  ========================= */
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        Cargando…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm relative">
          <h1 className="text-xl font-semibold mb-4 text-center">
            Acceso al Club
          </h1>

          <input
            type="email"
            placeholder="Correo electrónico"
            className="w-full mb-3 border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              className="w-full mb-3 border rounded px-3 py-2 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <button
            onClick={login}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  /* =========================
     APP / ADMIN
  ========================= */
  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow px-4 py-3 flex flex-wrap gap-2 items-center justify-between">
        <div>
          <strong>{user.email}</strong>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => registerLog("in")}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Entrada
          </button>

          <button
            onClick={() => registerLog("out")}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Salida
          </button>

          <button
            onClick={() => registerLog("break_start")}
            className="px-3 py-1 bg-yellow-500 text-white rounded"
          >
            Pausa
          </button>

          <button
            onClick={() => registerLog("break_end")}
            className="px-3 py-1 bg-yellow-700 text-white rounded"
          >
            Volver
          </button>

          <button
            onClick={logout}
            className="px-3 py-1 bg-gray-600 text-white rounded"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3">
          Registros de accesos
        </h2>

        <div className="overflow-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Usuario</th>
                <th className="px-3 py-2 text-left">Acción</th>
                <th className="px-3 py-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.email}</td>
                  <td className="px-3 py-2">
                    {typeToText(l.type)}
                  </td>
                  <td className="px-3 py-2">
                    {l.timestamp?.toDate
                      ? l.timestamp.toDate().toLocaleString("es-ES")
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
