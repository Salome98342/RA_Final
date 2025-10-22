import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { login } from '@/services/auth'
import { useSession } from '@/state/SessionContext'


type ToastKind = "ok" | "error" | undefined;

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("Español - Internacional (es)");
  const [toastMsg, setToastMsg] = useState<string>("");
  const [toastKind, setToastKind] = useState<ToastKind>(undefined);
  const [toastVisible, setToastVisible] = useState(false);
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

  // Pequeño helper para toast
  const showToast = (msg: string, kind: ToastKind = undefined, ms = 2200) => {
    setToastMsg(msg);
    setToastKind(kind);
    setToastVisible(true);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToastVisible(false), ms);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !password) {
      showToast("Complete usuario y contraseña", "error");
      return;
    }
    try {
  const profile = await login(usuario, password)
      setName(profile.nombre)
      setRole(profile.rol)
  setCode(profile.code ?? usuario)
      navigate(profile.rol === 'docente' ? '/docente' : '/estudiante')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Credenciales inválidas'
      showToast(msg, 'error')
    }
  };

  // Recuperación de contraseña ahora navega a /recuperar

  return (
    <div>
    <header>
  {/* Imágenes en public/ -> usa rutas absolutas */}
  <img src="/LogoBlanco.png" alt="UniBlanco" />
        <h1>Universidad del Valle</h1>
      </header>

      <main className="login-container">
        <section className="login-box">
          <img src="/UniLogo.jpg" alt="Logo Univalle" />
          <form id="loginForm" autoComplete="off" onSubmit={handleSubmit}>
            <input
              type="text"
              id="usuario"
              placeholder="Código (docente/estudiante)"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
            <input
              type="password"
              id="password"
              placeholder="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              role="button"
              aria-expanded={langOpen}
            >
              <div className="dropdown-selected">{lang}</div>
              <ul
                className="dropdown-list"
                style={{ display: langOpen ? "block" : "none" }}
              >
                <li onClick={() => setLang("Español - Internacional (es)")}>
                  Español - Internacional (es)
                </li>
                <li onClick={() => setLang("English (en)")}>English (en)</li>
                <li onClick={() => setLang("Français (fr)")}>Français (fr)</li>
              </ul>
            </div>
            {/* Aviso de cookies */}
            <div
              className="cookies"
              id="cookiesBtn"
              role="button"
              onClick={() =>
                showToast(
                  "Este sitio usa cookies para mejorar su experiencia.",
                  "ok"
                )
              }
            >
              🍪 Aviso de Cookies
            </div>
          </div>
        </section>
      </main>

      {/* Toast/Mensaje flotante */}
      <div
        id="toast"
        className={`mensaje${toastVisible ? " visible" : ""}${
          toastKind ? " " + toastKind : ""
        }`}
        role="status"
        aria-live="polite"
      >
        {toastMsg}
      </div>
    </div>
  );
}