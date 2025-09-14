const { initializeFirebase } = require("../config");

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const db = initializeFirebase();
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ error: "Номер и пароль обязательны" });
    }
    
    const snapshot = await db.collection("users")
      .where("phone", "==", phone)
      .limit(1)
      .get();
      
    if (snapshot.empty) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    const user = snapshot.docs[0].data();
    if (user.password !== password) {
      return res.status(401).json({ error: "Неверный пароль" });
    }
    
    return res.status(200).json({ token: "mock-token", user });
  } catch (err) {
    console.error("🔥 Login Error:", err);
    return res.status(500).json({ error: "Ошибка сервера" });
  }
}

module.exports = handleLogin;
