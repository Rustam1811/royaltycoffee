const { initializeFirebase } = require("../config");

async function handleRegister(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const db = initializeFirebase();
    const { name, phone, password } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }
    
    const exists = await db.collection("users").where("phone", "==", phone).limit(1).get();
    if (!exists.empty) {
      return res.status(400).json({ error: "Такой пользователь уже есть" });
    }
    
    const newUser = { name, phone, password, bonus: 0 };
    await db.collection("users").add(newUser);
    return res.status(200).json({ token: "mock-token", user: newUser });
  } catch (err) {
    console.error("🔥 Register Error:", err);
    return res.status(500).json({ error: "Ошибка сервера" });
  }
}

module.exports = handleRegister;
