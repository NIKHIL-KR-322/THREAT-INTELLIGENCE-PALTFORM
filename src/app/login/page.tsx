"use client";

import { useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";

const demoAccounts = [
  {
    role: "ADMIN" as const,
    title: "Administrator",
    description: "Manage users and review all security data.",
    email: "admin@demo.local",
    password: "DemoAdmin!2026",
  },
  {
    role: "ANALYST" as const,
    title: "Analyst",
    description: "Review assets, findings, alerts, and tickets.",
    email: "analyst@demo.local",
    password: "DemoAnalyst!2026",
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "ANALYST" | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function chooseAccount(account: (typeof demoAccounts)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setSelectedRole(account.role);
    setError("");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (r.ok) location.href = "/";
      else setError(j.error || "Sign in failed. Check your email and password.");
    } catch {
      setError("Could not reach the website. Check that the demo server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-box" aria-labelledby="login-title">
        <a href="/" className="brand">
          <span className="brand-icon"><ShieldCheck size={20} /></span>
          <span>THREAT<span className="blue">INTEL</span><small>SECURITY OPERATIONS</small></span>
        </a>
        <h1 id="login-title">Welcome back</h1>
        <p className="subheading">Choose the demo account you want to use.</p>

        <div className="login-options" aria-label="Choose a demo account">
          {demoAccounts.map((account) => {
            const Icon = account.role === "ADMIN" ? ShieldCheck : UserRound;
            return (
              <button
                className={`login-option${selectedRole === account.role ? " selected" : ""}`}
                type="button"
                key={account.role}
                aria-pressed={selectedRole === account.role}
                onClick={() => chooseAccount(account)}
              >
                <span className="login-option-icon"><Icon size={18} /></span>
                <span className="login-option-copy"><b>{account.title}</b><small>{account.description}</small></span>
                <span className="login-option-check">{selectedRole === account.role ? "Selected" : "Choose"}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={submit}>
          <label>Email<input name="email" type="email" autoComplete="username" required value={email} onChange={(e) => { setEmail(e.target.value); setSelectedRole(""); }} /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => { setPassword(e.target.value); setSelectedRole(""); }} /></label>
          <button className="button primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          {error && <p className="form-message error" role="alert">{error}</p>}
        </form>
        <p className="login-foot">Selecting a demo account fills its credentials. You can also enter another account manually.</p>
      </section>
    </main>
  );
}
