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
    pos: {
      status: 'online',
      terminal: 'POS-001',
      lastSync: new Date().toISOString(),
      transactions: {
        today: 23,
        total: 1450
      },
      cashRegister: {
        balance: 15200,
        lastOpened: new Date(Date.now() - 3600000).toISOString()
      }
    }
  });
};
