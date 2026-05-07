const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username } = req.body;

  const token = jwt.sign(
    {
      id: 1,
      username,
      role: 'admin'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d'
    }
  );

  return res.json({
    token,
    user: {
      id: 1,
      username,
      role: 'admin'
    }
  });
});

module.exports = router;
