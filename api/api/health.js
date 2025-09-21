module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    name: "coffee-api",
    ts: Date.now(),
    env: process.env.NODE_ENV || null
  });
};
