"use client";

import { useState } from "react";

export default function PasswordField() {
  const [show, setShow] = useState(false);
  return (
    <div className="login-field">
      <label htmlFor="pw">Sandi</label>
      <span className="pw">
        <input id="pw" type={show ? "text" : "password"} name="password" required autoFocus autoComplete="current-password" placeholder="Masukkan sandi" />
        <button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? "Sembunyikan" : "Tampilkan"}
        </button>
      </span>
    </div>
  );
}
