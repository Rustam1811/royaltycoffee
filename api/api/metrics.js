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
    metrics: {
      todayOrders: 23,
      todayRevenue: 5120,
      avgResponseTime: 145,
      activeUsers: 89,
      popularHours: [
        { hour: '08:00', orders: 15 },
        { hour: '12:00', orders: 28 },
        { hour: '16:00', orders: 22 }
      ],
      systemStatus: {
        api: 'healthy',
        database: 'healthy',
        payments: 'healthy'
      }
    }
  });
};
