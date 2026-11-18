import React, { useState } from "react";
import { Shield, Eye, EyeOff, Lock, Mail, User, KeyRound, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const GoogleLogo = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#EA4335"
      d="M12 5c1.617 0 3.077.557 4.223 1.65l3.168-3.168C17.477 1.698 14.977.6 12 .6 7.46.6 3.535 3.204 1.622 7.004l3.69 2.864C6.183 7.253 8.852 5 12 5z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.275c0-.85-.075-1.675-.215-2.475H12v4.685h6.445c-.278 1.495-1.12 2.762-2.388 3.61v3.002h3.865c2.262-2.083 3.568-5.15 3.568-8.822z"
    />
    <path
      fill="#FBBC05"
      d="M5.312 14.132A7.016 7.016 0 0 1 4.94 12c0-.74.13-1.458.372-2.132L1.622 7.004A11.387 11.387 0 0 0 .4 12c0 1.835.44 3.57 1.222 4.996l3.69-2.864z"
    />
    <path
      fill="#34A853"
      d="M12 23.4c3.24 0 5.957-1.075 7.942-2.903l-3.865-3.002c-1.075.72-2.45 1.145-4.077 1.145-3.148 0-5.817-2.253-6.688-5.268l-3.69 2.864C3.535 20.796 7.46 23.4 12 23.4z"
    />
  </svg>
);

const GitHubLogo = () => (
  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const res = await login(email, password, mfaStep ? totpCode : undefined);
        if (res.mfa_required) {
          setMfaStep(true);
        }
      } else {
        await register(fullName, email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerOAuth = (provider: "google" | "github") => {
    window.location.href = `http://localhost:8000/api/v1/auth/oauth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">NEXUS NIDS</h1>
            <p className="text-xs text-slate-400">Enterprise SOC Authentication Gateway</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && !mfaStep && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Pankaj Puri Goswami"
                  className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {!mfaStep ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@nexus-soc.io"
                    className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg pl-9 pr-10 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {mode === "signup" && password.length > 0 && (
                  <div className="mt-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-1 rounded-full ${
                            strength >= lvl
                              ? strength <= 2
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                              : "bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Argon2id hashed • {strength < 3 ? "Add uppercase, numbers & symbols" : "Strong password"}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-cyan-400 mb-1.5">
                Authenticator 6-Digit TOTP Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-cyan-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-[#0B0F19] border border-cyan-500/40 rounded-lg pl-9 pr-3 py-2.5 text-sm tracking-widest focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-sm transition disabled:opacity-50"
          >
            {submitting
              ? "Verifying..."
              : mfaStep
              ? "Verify MFA Token"
              : mode === "signin"
              ? "Sign In to SOC Console"
              : "Create Analyst Account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px bg-slate-800 flex-1" />
          <span>OR CONTINUE WITH OIDC</span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => triggerOAuth("google")}
            className="w-full py-2.5 px-4 rounded-lg bg-[#0B0F19] hover:bg-slate-800/80 border border-slate-700 text-sm font-medium flex items-center justify-center gap-2.5 transition"
          >
            <GoogleLogo />
            <span>Continue with Google</span>
          </button>
          <button
            type="button"
            onClick={() => triggerOAuth("github")}
            className="w-full py-2.5 px-4 rounded-lg bg-[#0B0F19] hover:bg-slate-800/80 border border-slate-700 text-sm font-medium flex items-center justify-center gap-2.5 transition"
          >
            <GitHubLogo />
            <span>Continue with GitHub</span>
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {mode === "signin" ? "Need an analyst account?" : "Already have credentials?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMfaStep(false);
              setError("");
            }}
            className="text-indigo-400 hover:underline font-medium"
          >
            {mode === "signin" ? "Create Account" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};