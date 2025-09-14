const { initializeFirebase } = require("../config");
const admin = require("firebase-admin");

async function handleSimpleOrder(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = initializeFirebase();
    const { userId, items, total, customerInfo } = req.body;

    if (!userId || !items || !total) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orderRef = db.collection("orders").doc();
    await orderRef.set({
      userId,
      items,
      amount: total,
      customerInfo,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ success: true, orderId: orderRef.id });
  } catch (error) {
    console.error("🔥 Simple Order Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = handleSimpleOrder;
