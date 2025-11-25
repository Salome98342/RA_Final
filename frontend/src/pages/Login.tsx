import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { login } from '@/services/auth'
import { useSession } from '@/state/SessionContext'
import Toast from '@/components/Toast'


type ToastKind = "ok" | "error" | "warning" | "info";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("Español - Internacional (es)");
  const [toast, setToast] = useState<{ text: string; type: ToastKind } | null>(null);
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

  // Helper para mostrar toast
  const showToast = (msg: string, kind: ToastKind = "error") => {
    setToast({ text: msg, type: kind });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !password) {
      showToast("⚠️ Por favor complete usuario y contraseña", "warning");
      return;
    }
    try {
      const profile = await login(usuario, password)
      setName(profile.nombre)
      setRole(profile.rol)
      setCode(profile.code ?? usuario)
      navigate(profile.rol === 'docente' ? '/docente' : (profile.rol === 'coordinador' ? '/coordinador' : '/estudiante'))
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const statusCode = (err as { response?: { status?: number } })?.response?.status
      
      let msg = 'Error al iniciar sesión'
      
      // Mensaje específico según el código de estado
      if (statusCode === 401) {
        msg = '❌ Usuario o contraseña incorrectos. Verifique sus credenciales.'
      } else if (statusCode === 400) {
        msg = '⚠️ Complete todos los campos requeridos.'
      } else if (statusCode === 500) {
        msg = '🔧 Error en el servidor. Intente nuevamente más tarde.'
      } else if (data && typeof data === 'object') {
        const detail = (data as Record<string, unknown>).detail
        const message = (data as Record<string, unknown>).message
        if (detail) msg = String(detail)
        else if (message) msg = String(message)
      }
      
      showToast(msg, 'error')
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
            <button
              type="button"
              className="btn btn-outline-secondary w-100 mt-2"
              onClick={() => navigate("/docente")}
            >
              Entrar como invitado
            </button>
          </form>

          <div className="extra">
            <Link to="/recuperar" id="forgotLink">
              ¿Olvidó su contraseña y/o usuario?
            </Link>
          </div>

          <div className="top-bar">
            {/* Custom dropdown */}
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
                showToast(
                  "🍪 Este sitio usa cookies para mejorar su experiencia.",
                  "info"
                )
              }
            >
              🍪 Aviso de Cookies
            </div>
          </div>
        </section>
      </main>

      {/* Toast moderno con componente profesional */}
      {toast && (
        <Toast 
          text={toast.text} 
          type={toast.type} 
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}