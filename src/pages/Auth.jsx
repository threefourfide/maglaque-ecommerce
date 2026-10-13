import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import "./Auth.css";

function Auth({ onLogin, onRegister }) {
  const [flipped, setFlipped] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  useEffect(() => {
    if (flipped) return;
    const SECRET = "elleadmin";
    let armed = false;
    let otherKey = false;
    let buffer = "";
    let timer;
    const disarm = () => {
      armed = false;
      buffer = "";
      clearTimeout(timer);
    };

    const onKeyDown = (e) => {
      if (e.key === "Control" || e.key === "Meta") {
        if (!e.repeat) otherKey = false;
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        return;
      }
      if (!armed) return;
      if (e.key.length !== 1) return;
      e.preventDefault();
      buffer += e.key.toLowerCase();
      if (!SECRET.startsWith(buffer)) return disarm();
      if (buffer === SECRET) {
        disarm();
        setAdminMode((m) => !m);
      }
    };

    const onKeyUp = (e) => {
      if ((e.key === "Control" || e.key === "Meta") && !otherKey) {
        armed = true;
        buffer = "";
        clearTimeout(timer);
        timer = setTimeout(disarm, 5000);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      clearTimeout(timer);
    };
  }, [flipped]);
  const toggleFlip = () => {
    setSuccessMessage("");
    setFlipped((f) => !f);
  };

  const showSuccessToast = (message, destination) => {
    setSuccessMessage(message);
    clearTimeout(redirectTimer.current);
    redirectTimer.current = setTimeout(() => navigate(destination), 2500);
  };

  const handleLogin = (data) => {
    if (onLogin) onLogin(data);
    const message = data.role === "admin"
      ? "Welcome to the ELLE dashboard."
      : `Welcome back${data.name ? `, ${data.name.split(" ")[0]}` : ""}.`;
    showSuccessToast(message, data.role === "admin" ? "/admin/orders" : "/");
  };

  const handleRegister = (data) => {
    if (onRegister) onRegister(data);
    showSuccessToast("Your account was created successfully. Welcome to ELLE!", "/");
  };

  return (
    <main className="auth-page">
      <span className="auth-circle auth-circle--one" aria-hidden="true" />
      <span className="auth-circle auth-circle--two" aria-hidden="true" />

      <div className="auth-scene">
        <div className={`auth-card ${flipped ? "is-flipped" : ""}`}>
          {/* FRONT: SIGN IN */}
          <section
            className={`auth-face auth-face--front ${flipped ? "is-hidden" : ""}`}
            aria-hidden={flipped}
          >
            <LoginForm key={adminMode ? "admin" : "customer"} admin={adminMode} onFlip={toggleFlip} onLogin={handleLogin} />
          </section>

          {/* BACK: REGISTER */}
          <section
            className={`auth-face auth-face--back ${flipped ? "" : "is-hidden"}`}
            aria-hidden={!flipped}
          >
            <RegisterForm onFlip={toggleFlip} onRegister={handleRegister} />
          </section>
        </div>
      </div>
      {successMessage && createPortal(
        <div className="auth-toast-overlay pointer-events-none fixed inset-0 z-[60] grid place-items-center px-6">
          <div
            role="status"
            aria-live="polite"
            className="auth-success-toast flex w-full max-w-xs flex-col items-center gap-3 bg-[#2D3A31]/80 px-8 py-8 text-center text-[#F9F6F0] shadow-2xl backdrop-blur-sm sm:px-10"
          >
            <Check className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
            <p className="w-full text-xs tracking-wider">{successMessage}</p>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}

export default Auth;