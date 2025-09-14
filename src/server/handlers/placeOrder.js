const { initializeFirebase } = require("../config");
const admin = require("firebase-admin");

async function handlePlaceOrder(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = initializeFirebase();
    const { userId, items, amount, bonusUsed = 0, tableNumber } = req.body;

    if (!userId || !items || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orderRef = db.collection("orders").doc();
    await orderRef.set({
      userId,
      items,
      amount,
      bonusUsed,
      tableNumber,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ success: true, orderId: orderRef.id });
  } catch (error) {
    console.error("🔥 Place Order Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = handlePlaceOrder;
