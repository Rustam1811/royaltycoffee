const { initializeFirebase } = require("../config");
const admin = require("firebase-admin");

async function handlePromoCodes(req, res) {
  try {
    const db = initializeFirebase();

    if (req.method === "GET") {
      const { code } = req.query;
      
      if (code) {
        // Получение конкретного промокода
        const promoDoc = await db.collection("promoCodes").doc(code).get();
        
        if (!promoDoc.exists) {
          return res.status(404).json({ error: "Промокод не найден" });
        }

        const promoData = promoDoc.data();
        
        // Проверяем срок действия
        if (promoData.expiresAt && new Date(promoData.expiresAt.toDate()) < new Date()) {
          return res.status(400).json({ error: "Промокод истек" });
        }

        if (promoData.isUsed) {
          return res.status(400).json({ error: "Промокод уже использован" });
        }

        return res.status(200).json({ code, ...promoData });
      } else {
        // Получение всех активных промокодов (для админки)
        const snap = await db.collection("promoCodes")
          .where("isUsed", "==", false)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();
        
        const codes = snap.docs.map(doc => ({ code: doc.id, ...doc.data() }));
        return res.status(200).json(codes);
      }
    }

    if (req.method === "POST") {
      const { code, userId, type, discount, description } = req.body;
      
      if (!code || !userId) {
        return res.status(400).json({ error: "code и userId обязательны" });
      }

      // Используем промокод
      const promoRef = db.collection("promoCodes").doc(code);
      await promoRef.update({
        isUsed: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        usedBy: userId
      });

      return res.status(200).json({ success: true, message: "Промокод использован" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("🔥 Promo Codes Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = handlePromoCodes;
