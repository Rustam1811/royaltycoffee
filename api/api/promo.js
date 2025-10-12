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

  // POST endpoints for creating new items
  if (req.method === 'POST' && action === 'achievements') {
    const { name, description, points, iconUrl } = req.body || {};
    
    if (!name || !description || !points) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: name, description, points' });
    }
    
    const newAchievement = {
      id: Date.now(),
      name,
      description,
      points: parseInt(points),
      iconUrl: iconUrl || null,
      createdAt: new Date().toISOString()
    };
    
    return res.status(201).json({ 
      ok: true, 
      message: 'Achievement created successfully',
      achievement: newAchievement
    });
  }

  if (req.method === 'POST' && action === 'promotions') {
    const { title, description, discount, validFrom, validTo } = req.body || {};
    
    if (!title || !description || !discount) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: title, description, discount' });
    }
    
    const newPromotion = {
      id: Date.now(),
      title,
      description,
      discount: parseInt(discount),
      validFrom: validFrom || new Date().toISOString(),
      validTo: validTo || null,
      createdAt: new Date().toISOString()
    };
    
    return res.status(201).json({ 
      ok: true, 
      message: 'Promotion created successfully',
      promotion: newPromotion
    });
  }

  // DELETE endpoints
  if (req.method === 'DELETE' && action === 'promotions') {
    const id = req.query?.id;
    if (!id) {
      return res.status(400).json({ ok: false, error: 'Missing promotion ID' });
    }
    return res.status(200).json({ 
      ok: true, 
      message: 'Promotion deleted successfully',
      id 
    });
  }

  if (req.method === 'DELETE' && action === 'achievements') {
    const id = req.query?.id;
    if (!id) {
      return res.status(400).json({ ok: false, error: 'Missing achievement ID' });
    }
    return res.status(200).json({ 
      ok: true, 
      message: 'Achievement deleted successfully',
      id 
    });
  }
  
  return res.status(400).json({ ok: false, error: 'Invalid action or method. Use GET/POST/DELETE with ?action=achievements or ?action=promotions' });
};
