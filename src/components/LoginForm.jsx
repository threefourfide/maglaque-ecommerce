import { useState } from "react";
import PasswordField from "./PasswordField";
import { UserIcon, PlusIcon } from "./AuthIcons";

import { loginAccount, setToken } from "../api";

function LoginForm({ onFlip, onLogin, admin = false }) {
  const [login, setLogin] = useState({ email: "", password: "", remember: false });
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLogin((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setLoginError("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (!email || !password) {
      return setLoginError("Enter your email and password.");
    }
    setLogin((prev) => ({ ...prev, email, password }));
    setLoginError("");
    setLoading(true);
    try {
      const { token, user } = await loginAccount({ email, password, admin });
      setToken(token, login.remember);
      if (onLogin) onLogin(user);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-badge"><UserIcon /></div>
      {admin && <span className="auth-admin-tag">Admin</span>}
      <h1 className="auth-title">{admin ? "Admin Sign In" : "Welcome back"}</h1>
      <p className="auth-sub">
        {admin ? "Authorized ELLE staff only" : "Sign in to continue to ELLE"}
      </p>

      <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
        <div className="auth-field">
          <label className="auth-sr" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="Email address"
            value={login.email}
            onChange={handleLoginChange}
            autoComplete="email"
            className="auth-input"
          />
        </div>

        <PasswordField
          name="password"
          value={login.password}
          onChange={handleLoginChange}
          placeholder="Password"
          autoComplete="current-password"
        />

        <div className="auth-row">
          <label className="auth-check">
            <input
              type="checkbox"
              name="remember"
              checked={login.remember}
              onChange={handleLoginChange}
            />
            <span className="auth-check-box" aria-hidden="true" />
            Remember me
          </label>
          <a href="#forgot" className="auth-link">Forgot password?</a>
        </div>

        {loginError && <p className="auth-error" role="alert">{loginError}</p>}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Signing in..." : admin ? "Admin Sign In" : "Sign in"}
        </button>
      </form>

      {!admin && <div className="auth-switch">
        <span>Don't have an account?</span>
        <button
          type="button"
          className="auth-round"
          onClick={onFlip}
          aria-label="Create an account"
          title="Create an account"
        >
          <PlusIcon />
        </button>
      </div>}
    </>
  );
}

export default LoginForm;