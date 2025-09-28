module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  const action = req.query?.action || 'get';
  
  if (action === 'get') {
    return res.status(200).json({ 
      ok: true, 
      orders: [
        {
          id: 'order_001',
          userId: 'user_123',
          items: [
            { name: 'Espresso', price: 120, quantity: 2 },
            { name: 'Croissant', price: 80, quantity: 1 }
          ],
          total: 320,
          status: 'completed',
          createdAt: new Date().toISOString()
        },
        {
          id: 'order_002',
          userId: 'user_456',
          items: [
            { name: 'Cappuccino', price: 150, quantity: 1 }
          ],
          total: 150,
          status: 'pending',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      admin: true 
    });
  }
  
  return res.status(400).json({ ok: false, error: 'Invalid action. Use ?action=get' });
};
