module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  return res.status(200).json({ 
    ok: true, 
    users: [
      {
        id: 'user_001',
        email: 'john.doe@example.com',
        name: 'John Doe',
        phone: '+7 (999) 123-45-67',
        bonusPoints: 250,
        level: 'Silver',
        totalOrders: 15,
        totalSpent: 3200,
        registeredAt: '2024-01-15T10:30:00Z',
        lastOrderAt: new Date().toISOString()
      },
      {
        id: 'user_002',
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        phone: '+7 (999) 987-65-43',
        bonusPoints: 520,
        level: 'Gold',
        totalOrders: 28,
        totalSpent: 6800,
        registeredAt: '2024-02-20T14:15:00Z',
        lastOrderAt: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  });
};
