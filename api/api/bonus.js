module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  const action = req.query?.action || 'settings';
  
  if (req.method === 'GET' && action === 'settings') {
    return res.status(200).json({
      ok: true,
      settings: {
        baseRate: 5,
        pointsPerRuble: 1,
        percentage: 5,
        multipliers: {
          coffee: 2,
          pastry: 1.5
        },
        categories: {
          drinks: { multiplier: 2, active: true },
          food: { multiplier: 1.5, active: true }
        },
        rewards: [
          { id: 1, name: 'Free Coffee', points: 100, active: true },
          { id: 2, name: '20% Discount', points: 200, active: true }
        ],
        levels: [
          { id: 1, name: 'Bronze', minPoints: 0, benefits: 'Standard rewards' },
          { id: 2, name: 'Silver', minPoints: 500, benefits: '10% bonus points' },
          { id: 3, name: 'Gold', minPoints: 1000, benefits: '20% bonus points' }
        ]
      }
    });
  }
  
  if (req.method === 'POST' && action === 'settings') {
    return res.status(200).json({ ok: true, saved: true, message: 'Settings saved successfully' });
  }
  
  return res.status(400).json({ ok: false, error: 'Invalid action. Use ?action=settings' });
};
