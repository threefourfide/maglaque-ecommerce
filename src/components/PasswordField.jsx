import { useState } from "react";
import { EyeIcon } from "./AuthIcons";

function PasswordField({ name, value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);

  return (
    <div className="auth-field auth-field--password">
      <label className="auth-sr" htmlFor={`${name}-input`}>{placeholder}</label>
      <input
        id={`${name}-input`}
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="auth-input"
        required
      />
      <button
        type="button"
        className="auth-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        <EyeIcon off={show} />
      </button>
    </div>
  );
}

export default PasswordField;