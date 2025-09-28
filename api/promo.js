module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  const action = req.query?.action || '';
  
  if (req.method === 'GET' && action === 'achievements') {
    return res.status(200).json({ 
      ok: true, 
      achievements: [
        { id: 1, name: 'First Coffee', description: 'Your first coffee purchase', points: 10 },
        { id: 2, name: 'Coffee Lover', description: '10 coffee purchases', points: 50 }
      ]
    });
  }
  
  if (req.method === 'GET' && action === 'promotions') {
    return res.status(200).json({ 
      ok: true, 
      promotions: [
        { id: 1, title: 'Happy Hour', description: '20% off from 3-5 PM', discount: 20 },
        { id: 2, title: 'Weekend Special', description: 'Buy 2 get 1 free', discount: 33 }
      ]
    });
  }
  
  return res.status(400).json({ ok: false, error: 'Invalid action. Use ?action=achievements or ?action=promotions' });
};
