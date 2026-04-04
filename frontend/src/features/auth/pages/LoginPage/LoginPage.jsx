import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import loginIllus from "../../../../assets/login.webp";
import {
  School,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
} from "lucide-react";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        localStorage.setItem("loginEmail", formData.email);
        if (result.user) localStorage.setItem("currentUser", JSON.stringify(result.user));
        navigate("/dashboard");
      } else {
        setError(result.error || "Email hoặc mật khẩu không đúng");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-white to-slate-200 !px-4 !py-10">
      <div className="!mx-auto w-full max-w-6xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-2">
            {/* LEFT: Form */}
            <div className="relative z-10 flex items-center justify-center !p-8 sm:!p-12">
              <div className="w-full max-w-sm">
                {/* Brand */}
                <div className="flex items-center !gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <School size={20} />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold tracking-tight text-slate-900">
                      ACADEMIA
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Hệ thống quản lý trường học
                    </div>
                  </div>
                </div>

                <h2 className="!mt-10 text-xl font-bold text-slate-900">
                  Đăng nhập với tài khoản của bạn
                </h2>
                <p className="!mt-2 text-sm text-slate-500">
                  Đăng nhập để truy cập hệ thống quản lý
                </p>

                <form onSubmit={handleSubmit} className="!mt-6 space-y-4">
                  {/* Email */}
                  <div>
                    <label className="!mb-1 block text-sm font-semibold text-slate-700">
                      Email
                    </label>

                    <div className="flex items-center !gap-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 !px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
                      <span className="shrink-0 text-slate-400">
                        <Mail size={16} />
                      </span>

                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="Tên tài khoản"
                        value={formData.email}
                        onChange={handleChange}
                        className="h-11 flex-1 min-w-0 !border-none bg-transparent text-sm text-slate-900 !outline-none !focus:outline-none focus:ring-0 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex items-center !gap-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 !px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
                    <span className="shrink-0 text-slate-400">
                      <Lock size={16} />
                    </span>

                    <input
                      name="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="Mật khẩu"
                      value={formData.password}
                      onChange={handleChange}
                      className="h-11 flex-1 min-w-0 !border-none bg-transparent text-sm text-slate-900 !outline-none !focus:outline-none focus:ring-0 placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      className="shrink-0 rounded-lg !p-2 text-slate-500 hover:bg-white hover:text-slate-700"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Error */}
                  {error && (
                    <div className="flex items-start !gap-2 rounded-xl border border-red-200 bg-red-50 !px-4 !py-3 text-sm text-red-700">
                      <AlertCircle size={16} className="mt-[2px]" />
                      <div>{error}</div>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex !mt-4 h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <span className="flex items-center !gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Đang đăng nhập...
                      </span>
                    ) : (
                      <span className="flex items-center !gap-2">
                        <LogIn size={16} />
                        Đăng nhập
                      </span>
                    )}
                  </button>

                  <p className="!pt-2 text-center text-xs text-slate-500">
                    © {new Date().getFullYear()} Hệ thống quản lý trường học
                  </p>
                </form>
              </div>
            </div>

            {/* RIGHT: Illustration */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-slate-100" />
              <div className="absolute -left-40 top-1/2 h-[120%] w-[140%] -translate-y-1/2 rounded-[999px] bg-[#EAF2FF]" />

              <div className="relative flex h-full items-center justify-center !p-10">
                <img
                  src={loginIllus}
                  alt="Login illustration"
                  className="max-h-[520px] w-auto select-none"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;

