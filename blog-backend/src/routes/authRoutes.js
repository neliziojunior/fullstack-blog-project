// Rotas Improvissadas

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Auth route funcionando');
});

module.exports = router;
