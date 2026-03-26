import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { login } from '@/services/auth'
import { useSession } from '@/state/SessionContext'
import { Alert } from '@/utils/alert'

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("Español - Internacional (es)");
  const ddRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { setName, setRole, setCode } = useSession()

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) { 
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !password) {
      Alert.warning("Por favor complete usuario y contraseña");
      return;
    }
    try {
      const profile = await login(usuario, password)
      setName(profile.nombre)
      setRole(profile.rol)
      setCode(profile.code ?? usuario)
      navigate(profile.rol === 'docente' ? '/docente/inicio' : (profile.rol === 'coordinador' ? '/coordinador' : '/estudiante/inicio'))
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const statusCode = (err as { response?: { status?: number } })?.response?.status
      
      let msg = 'Error al iniciar sesión'
      
      // Mensaje específico según el código de estado
      if (statusCode === 423) {
        // Cuenta bloqueada por múltiples intentos fallidos
        msg = 'Cuenta bloqueada por seguridad. Revisa tu correo para más información. Se desbloqueará automáticamente en 30 minutos.'
        Alert.warning(msg)
      } else if (statusCode === 401) {
        // Credenciales incorrectas - extraer mensaje del backend que incluye intentos restantes
        if (data && typeof data === 'object') {
          const detail = (data as Record<string, unknown>).detail
          if (detail && String(detail).includes('quedan')) {
            // El backend envía algo como "Credenciales inválidas. Te quedan 2 intentos."
            msg = String(detail)
            if (String(detail).includes('queda 1')) {
              Alert.warning(msg)
            } else {
              Alert.error(msg)
            }
          } else {
            msg = 'Usuario o contraseña incorrectos.'
            Alert.error(msg)
          }
        } else {
          msg = 'Usuario o contraseña incorrectos.'
          Alert.error(msg)
        }
      } else if (statusCode === 400) {
        msg = 'Complete todos los campos requeridos.'
        Alert.warning(msg)
      } else if (statusCode === 500) {
        msg = 'Error en el servidor. Intente nuevamente más tarde.'
        Alert.error(msg)
      } else if (data && typeof data === 'object') {
        const detail = (data as Record<string, unknown>).detail
        const message = (data as Record<string, unknown>).message
        if (detail) msg = String(detail)
        else if (message) msg = String(message)
        Alert.error(msg)
      }
    }
  };

  // Recuperación de contraseña ahora navega a /recuperar

  return (
    <div className="login-page">
    <header>
  {/* Imágenes en public/ -> usa rutas absolutas */}
  <img src="/LogoBlanco.png" alt="UniBlanco" />
        <h1>Universidad del Valle</h1>
      </header>

      <main className="login-container">
        <section className="login-box">
          <img src="/UniLogo.jpg" alt="Logo Univalle" />
          <form id="loginForm" autoComplete="off" onSubmit={handleSubmit}>
            <label htmlFor="usuario" className="visually-hidden">Código (docente/estudiante)</label>
            <input
              type="text"
              id="usuario"
              placeholder="Código (docente/estudiante)"
              aria-label="Código (docente/estudiante)"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
            />
            <label htmlFor="password" className="visually-hidden">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="Contraseña"
              aria-label="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { /* redundante pero explícito */ } }}
            />
            <button type="submit">Entrar</button>
          </form>

          <div className="extra">
            <Link to="/recuperar" id="forgotLink">
              ¿Olvidó su contraseña y/o usuario?
            </Link>
          </div>

          <div className="top-bar">
            {/* Custom dropdown */}
            {/* eslint-disable-next-line jsx-a11y/aria-props */}
            <div
              className="dropdown"
              id="langDropdown"
              ref={ddRef}
              onClick={() => setLangOpen((v) => !v)}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label="Idioma"
              tabIndex={0}
              aria-controls="langOptions"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLangOpen(v => !v) } if (e.key === 'Escape') setLangOpen(false) }}
            >
              <div className="dropdown-selected">{lang}</div>
              <ul
                id="langOptions"
                className={`dropdown-list ${langOpen ? '' : 'd-none'}`}
                role="listbox"
                aria-label="Opciones de idioma"
              >
                <li role="option" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setLang("Español - Internacional (es)"); setLangOpen(false) } }} onClick={() => { setLang("Español - Internacional (es)"); setLangOpen(false) }}>
                  Español - Internacional (es)
                </li>
                <li role="option" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setLang("English (en)"); setLangOpen(false) } }} onClick={() => { setLang("English (en)"); setLangOpen(false) }}>English (en)</li>
                <li role="option" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setLang("Français (fr)"); setLangOpen(false) } }} onClick={() => { setLang("Français (fr)"); setLangOpen(false) }}>Français (fr)</li>
              </ul>
            </div>
            {/* Aviso de cookies */}
            <div
              className="cookies"
              id="cookiesBtn"
              role="button"
              onClick={() =>
                Alert.toast.info(
                  "Este sitio usa cookies para mejorar su experiencia."
                )
              }
            >
              Aviso de Cookies
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}