import React, { useState, useContext } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useHistory } from "react-router-dom";
import { app } from "../../src/firebase";
import { UserContext } from "../contexts/UserContext";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const auth = getAuth(app);
  const history = useHistory();
  const { user } = useContext(UserContext);

  if (user) history.replace("/admin/orders");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔐 LoginPage: попытка входа", { email, pass });

    try {
      // Временный тестовый логин для разработки
      if (email === "admin@test.com" && pass === "admin123") {
        console.log("🔐 LoginPage: тестовый логин");
        // Имитируем успешный логин
        const mockUser = {
          uid: "test-admin-uid",
          email: "admin@test.com",
          role: "admin",
        };
        // Сохраняем в localStorage для тестирования
        localStorage.setItem("admin_user", JSON.stringify(mockUser));

        // Принудительно обновляем UserContext
        console.log(
          "🔐 LoginPage: тестовый логин успешен, обновляем UserContext"
        );

        // Перезагружаем страницу для обновления UserContext
        window.location.href = "/admin/orders";
        return;
      }

      // Обычный Firebase логин
      console.log("🔐 LoginPage: Firebase логин");
      await signInWithEmailAndPassword(auth, email, pass);
      history.replace("/admin/orders");
    } catch (e: unknown) {
      const error = e as Error;
      console.error("❌ LoginPage: ошибка входа:", error);
      setErr(error.message);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-slate-100 via-slate-100 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.35)] overflow-hidden p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-2">
              Вход в админку
            </h1>
            <p className="text-slate-600">
              Введите данные для доступа к панели управления
            </p>
          </div>

          {err && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-600 font-medium">{err}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Пароль"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-slate-900 text-white font-semibold flex items-center justify-center hover:bg-black transition-colors active:shadow-none shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]"
            >
              Войти
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 mb-2">
              Для тестирования используйте:
            </p>
            <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
              <p>
                <strong>Email:</strong> admin@test.com
              </p>
              <p>
                <strong>Пароль:</strong> admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
