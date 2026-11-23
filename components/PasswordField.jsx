"use client";

import { useState } from "react";

export default function PasswordField({ label = "Sandi", placeholder = "Masukkan sandi", autoComplete = "current-password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="login-field">
      <label htmlFor="pw">{label}</label>
      <span className="pw">
        <input id="pw" type={show ? "text" : "password"} name="password" required autoFocus autoComplete={autoComplete} placeholder={placeholder} />
        <button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? "Sembunyikan" : "Tampilkan"}
        </button>
      </span>
    </div>
  );
}
