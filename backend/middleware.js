const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tasktock_local_secret_2026';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token.' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid.' });
  }
}

module.exports = { auth, JWT_SECRET };
