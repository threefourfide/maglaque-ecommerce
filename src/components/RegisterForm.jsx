import { useState } from "react";
import PasswordField from "./PasswordField";
import { UserIcon, BackIcon } from "./AuthIcons";
import { registerAccount, setToken } from "../api";
import { validName, NAME_ERROR } from "../utils/validate";

// Live checklist shown under the password field
const getChecks = (pw) => [
  { label: "8 to 20 characters", ok: pw.length >= 8 && pw.length <= 20 },
  { label: "At least one uppercase letter", ok: /[A-Z]/.test(pw) },
  { label: "At least one lowercase letter", ok: /[a-z]/.test(pw) },
  { label: "At least one number", ok: /\d/.test(pw) },
];

function RegisterForm({ onFlip, onRegister }) {
  const [register, setRegister] = useState({ name: "", email: "", password: "", confirm: "" });
  const [registerError, setRegisterError] = useState("");
  const [loading, setLoading] = useState(false);

  const checks = getChecks(register.password);

  const handleRegisterChange = (e) => {
    setRegister((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setRegisterError("");
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const values = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      password: String(data.get("register-password") || ""),
      confirm: String(data.get("register-confirm") || ""),
    };
    setRegister(values);
    if (!values.name.trim() || !values.email.trim() || !values.password) {
      return setRegisterError("Fill in all the fields.");
    }
    if (!validName(values.name)) return setRegisterError(NAME_ERROR);
    if (!getChecks(values.password).every((c) => c.ok)) {
      return setRegisterError("Your password doesn't meet all the requirements.");
    }
    if (values.password !== values.confirm) {
      return setRegisterError("Passwords do not match.");
    }
    setRegisterError("");
    setLoading(true);
    try {
      const { token, user } = await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      setToken(token, true);
      if (onRegister) onRegister(user);
    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-badge"><UserIcon /></div>
      <h2 className="auth-title">Create your account</h2>
      <p className="auth-sub">Join ELLE and start collecting</p>

      <form onSubmit={handleRegisterSubmit} className="auth-form" noValidate>
        <div className="auth-field">
          <label className="auth-sr" htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            name="name"
            type="text"
            placeholder="Full name"
            value={register.name}
            onChange={handleRegisterChange}
            autoComplete="name"
            className="auth-input"
          />
        </div>

        <div className="auth-field">
          <label className="auth-sr" htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            name="email"
            type="email"
            placeholder="Email address"
            value={register.email}
            onChange={handleRegisterChange}
            autoComplete="email"
            className="auth-input"
          />
        </div>

        <PasswordField
          name="register-password"
          value={register.password}
          onChange={(e) => setRegister({ ...register, password: e.target.value })}
          placeholder="Password"
          autoComplete="new-password"
        />

        <ul className="auth-req" aria-label="Password requirements">
          {checks.map((c) => (
            <li key={c.label} className={`auth-req-item ${c.ok ? "is-met" : ""}`}>
              <span className="auth-req-dot" aria-hidden="true" />
              {c.label}
            </li>
          ))}
        </ul>

        <PasswordField
          name="register-confirm"
          value={register.confirm}
          onChange={(e) => setRegister({ ...register, confirm: e.target.value })}
          placeholder="Confirm password"
          autoComplete="new-password"
        />

        {registerError && <p className="auth-error" role="alert">{registerError}</p>}

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <div className="auth-switch">
        <span>
          Already have an account?{" "}
          <button type="button" className="auth-link auth-link--button" onClick={onFlip}>
            Sign in
          </button>
        </span>
        <button
          type="button"
          className="auth-round"
          onClick={onFlip}
          aria-label="Back to sign in"
          title="Back to sign in"
        >
          <BackIcon />
        </button>
      </div>
    </>
  );
}

export default RegisterForm;