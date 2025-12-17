import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import './App.css'
import { db } from './firebaseConfig'

const DEFAULT_PASSWORD = 'Club123'
const SESSION_KEY = 'access-control-user'

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function readStoredSession() {
  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch (error) {
    console.error('No se pudo leer la sesión almacenada', error)
    return null
  }
}

function App() {
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirm, setRegisterConfirm] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => readStoredSession())
  const [pendingUsers, setPendingUsers] = useState([])
  const [registeredUsers, setRegisteredUsers] = useState([])

  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser])

  useEffect(() => {
    const ensureDefaultAdmin = async () => {
      try {
        const adminRef = doc(db, 'users', 'admin')
        const adminSnap = await getDoc(adminRef)
        if (!adminSnap.exists()) {
          const passwordHash = await hashPassword(DEFAULT_PASSWORD)
          await setDoc(adminRef, {
            username: 'admin',
            passwordHash,
            role: 'admin',
            approved: true,
            createdAt: serverTimestamp(),
          })
          console.info('Usuario administrador creado con la contraseña Club123')
        }
      } catch (error) {
        console.error('No se pudo crear el administrador por defecto', error)
      }
    }

    ensureDefaultAdmin()
  }, [])

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!isAdmin) return
      try {
        const pendingQuery = query(
          collection(db, 'users'),
          where('approved', '==', false),
        )
        const [pendingSnapshot, usersSnapshot] = await Promise.all([
          getDocs(pendingQuery),
          getDocs(collection(db, 'users')),
        ])

        const pendingList = pendingSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))

        const allUsers = usersSnapshot.docs
          .filter((docSnap) => docSnap.id !== 'admin')
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))

        setPendingUsers(pendingList)
        setRegisteredUsers(allUsers)
      } catch (error) {
        console.error('No se pudieron cargar los usuarios', error)
        setStatusMessage('Hubo un problema al cargar los datos de administración')
      }
    }

    fetchAdminData()
  }, [isAdmin])

  const handleLogin = async (event) => {
    event.preventDefault()
    setStatusMessage('')
    setIsSubmitting(true)
    try {
      const formattedUsername = username.trim().toLowerCase()
      if (!formattedUsername || !password) {
        setStatusMessage('Introduce un nombre de usuario y contraseña')
        return
      }

      const userRef = doc(db, 'users', formattedUsername)
      const userSnap = await getDoc(userRef)
      if (!userSnap.exists()) {
        setStatusMessage('El usuario no existe o no ha sido dado de alta')
        return
      }

      const userData = userSnap.data()
      const providedHash = await hashPassword(password)

      if (userData.passwordHash !== providedHash) {
        setStatusMessage('La contraseña no es correcta')
        return
      }

      if (!userData.approved) {
        setStatusMessage('Tu cuenta está pendiente de autorización del administrador')
        return
      }

      const session = { username: userData.username, role: userData.role }
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      setCurrentUser(session)
      setStatusMessage('Acceso concedido. ¡Bienvenido!')
    } catch (error) {
      console.error('No se pudo iniciar sesión', error)
      setStatusMessage('Hubo un problema al iniciar sesión, inténtalo de nuevo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setStatusMessage('')
    setIsSubmitting(true)
    try {
      const formattedUsername = registerUsername.trim().toLowerCase()
      if (!formattedUsername) {
        setStatusMessage('Introduce un nombre de usuario')
        return
      }

      if (registerPassword.length < 6) {
        setStatusMessage('La contraseña debe tener al menos 6 caracteres')
        return
      }

      if (registerPassword !== registerConfirm) {
        setStatusMessage('Las contraseñas no coinciden')
        return
      }

      const userRef = doc(db, 'users', formattedUsername)
      const existing = await getDoc(userRef)
      if (existing.exists()) {
        setStatusMessage('Ya existe un usuario con ese nombre')
        return
      }

      const passwordHash = await hashPassword(registerPassword)
      await setDoc(userRef, {
        username: formattedUsername,
        passwordHash,
        approved: false,
        role: 'user',
        createdAt: serverTimestamp(),
      })

      setStatusMessage('Usuario creado, pendiente de autorización del administrador')
      setRegisterUsername('')
      setRegisterPassword('')
      setRegisterConfirm('')
    } catch (error) {
      console.error('No se pudo registrar el usuario', error)
      setStatusMessage('Hubo un problema al registrar al usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
    setUsername('')
    setPassword('')
    setStatusMessage('Sesión cerrada correctamente')
  }

  const approveUser = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, { approved: true, approvedAt: serverTimestamp() })
      setPendingUsers((prev) => prev.filter((user) => user.id !== userId))
      setRegisteredUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, approved: true, approvedAt: new Date() } : user,
        ),
      )
    } catch (error) {
      console.error('No se pudo autorizar al usuario', error)
      setStatusMessage('Hubo un problema al autorizar al usuario')
    }
  }

  const resetPassword = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId)
      const passwordHash = await hashPassword(DEFAULT_PASSWORD)
      await updateDoc(userRef, { passwordHash })
      setStatusMessage(`Contraseña de ${userId} restablecida a ${DEFAULT_PASSWORD}`)
    } catch (error) {
      console.error('No se pudo restablecer la contraseña', error)
      setStatusMessage('Hubo un problema al restablecer la contraseña')
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Control de Acceso</h1>
        <p className="subtitle">
          Accede con tu nombre de usuario y contraseña. Los nuevos registros requieren autorización
          del administrador.
        </p>
      </header>

      {statusMessage && <div className="status">{statusMessage}</div>}

      {!currentUser && (
        <div className="card-grid">
          <section className="card">
            <div className="tabs">
              <button
                className={authMode === 'login' ? 'tab active' : 'tab'}
                onClick={() => setAuthMode('login')}
              >
                Iniciar sesión
              </button>
              <button
                className={authMode === 'register' ? 'tab active' : 'tab'}
                onClick={() => setAuthMode('register')}
              >
                Crear usuario
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="form" onSubmit={handleLogin}>
                <label>
                  Nombre de usuario
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Ej. juan.perez"
                    autoComplete="username"
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Introduce tu clave"
                    autoComplete="current-password"
                  />
                </label>
                <button className="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Validando...' : 'Entrar'}
                </button>
                <p className="hint">El administrador autorizará tu acceso tras registrarte.</p>
              </form>
            ) : (
              <form className="form" onSubmit={handleRegister}>
                <label>
                  Nombre de usuario
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(event) => setRegisterUsername(event.target.value)}
                    placeholder="Ej. juan.perez"
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>
                <label>
                  Confirmar contraseña
                  <input
                    type="password"
                    value={registerConfirm}
                    onChange={(event) => setRegisterConfirm(event.target.value)}
                    placeholder="Repite tu contraseña"
                  />
                </label>
                <button className="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Crear cuenta'}
                </button>
                <p className="hint">Tu acceso quedará pendiente de aprobación.</p>
              </form>
            )}
          </section>
        </div>
      )}

      {currentUser && (
        <section className="card">
          <div className="session">
            <div>
              <p className="welcome">Hola, {currentUser.username}</p>
              <p className={`badge ${isAdmin ? 'badge-info' : 'badge-success'}`}>
                {isAdmin ? 'Administrador' : 'Usuario autorizado'}
              </p>
            </div>
            <button className="secondary" type="button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
          {!isAdmin && (
            <p>
              Ya puedes acceder a las instalaciones. Si olvidas tu contraseña, contacta con un
              administrador para restablecerla a la clave genérica "{DEFAULT_PASSWORD}".
            </p>
          )}
        </section>
      )}

      {isAdmin && (
        <div className="card-grid">
          <section className="card">
            <h2>Autorizaciones pendientes</h2>
            {pendingUsers.length === 0 ? (
              <p className="hint">No hay usuarios esperando aprobación.</p>
            ) : (
              <ul className="list">
                {pendingUsers.map((user) => (
                  <li key={user.id} className="list-item">
                    <div>
                      <strong>{user.username}</strong>
                      <p className="small">Registrado, pendiente de autorización.</p>
                    </div>
                    <button className="primary" type="button" onClick={() => approveUser(user.id)}>
                      Autorizar acceso
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Usuarios registrados</h2>
            {registeredUsers.length === 0 ? (
              <p className="hint">Aún no hay usuarios registrados.</p>
            ) : (
              <ul className="list">
                {registeredUsers.map((user) => (
                  <li key={user.id} className="list-item">
                    <div>
                      <strong>{user.username}</strong>
                      <p className="small">
                        Estado: {user.approved ? 'Autorizado' : 'Pendiente'} | Rol: {user.role}
                      </p>
                    </div>
                    <button className="secondary" type="button" onClick={() => resetPassword(user.id)}>
                      Restablecer a "{DEFAULT_PASSWORD}"
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
