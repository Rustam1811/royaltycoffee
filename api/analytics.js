module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  const range = req.query?.range || '7d';
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return res.status(200).json({ 
    ok: true,
    range,
    summary: { orders: 145, revenue: 32500 },
    analytics: {
      totalOrders: 145,
      totalRevenue: 32500,
      avgOrderValue: 224,
      popularItems: [
        { name: 'Cappuccino', count: 45, revenue: 6750 },
        { name: 'Espresso', count: 38, revenue: 4560 },
        { name: 'Latte', count: 32, revenue: 5440 }
      ],
      dailyStats: [
        { date: today.toISOString().split('T')[0], orders: 23, revenue: 5120 },
        { date: new Date(today.getTime() - 86400000).toISOString().split('T')[0], orders: 19, revenue: 4200 }
      ],
      period: {
        from: weekAgo.toISOString(),
        to: today.toISOString()
      }
    }
  });
};
