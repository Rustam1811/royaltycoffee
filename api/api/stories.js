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
    stories: [
      {
        id: 1,
        title: 'New Coffee Blend',
        content: 'Try our new seasonal blend!',
        imageUrl: 'https://via.placeholder.com/400x600/8B4513/FFFFFF?text=Coffee',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Happy Hour',
        content: '20% off from 3-5 PM daily',
        imageUrl: 'https://via.placeholder.com/400x600/FF6B35/FFFFFF?text=Discount',
        active: true,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  });
};
