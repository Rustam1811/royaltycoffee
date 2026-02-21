const { initializeFirebase } = require("../config");

async function handleTestBonus(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Возвращаем тестовые данные для демонстрации
    const testData = {
      success: true,
      message: "Test bonus data",
      bonus: {
        balance: 150,
        level: "Серебро",
        cashbackPercent: 10
      }
    };

    return res.status(200).json(testData);
  } catch (error) {
    console.error("🔥 Test Bonus Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = handleTestBonus;
