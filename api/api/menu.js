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
    menu: [
      {
        id: 1,
        name: 'Espresso',
        price: 120,
        category: 'coffee',
        available: true,
        description: 'Classic Italian espresso'
      },
      {
        id: 2,
        name: 'Cappuccino',
        price: 150,
        category: 'coffee',
        available: true,
        description: 'Espresso with steamed milk foam'
      },
      {
        id: 3,
        name: 'Croissant',
        price: 80,
        category: 'pastry',
        available: true,
        description: 'Fresh buttery croissant'
      }
    ]
  });
};
