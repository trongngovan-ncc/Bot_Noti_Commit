const express = require('express');
const fs = require('fs');
const path = require('path');


module.exports = function registerPublicKeyApi(app) {
  app.get('/public-key', (req, res) => {
    try {
      const pubKeyPath = path.join(__dirname, '../keys/public.pem');
      if (!fs.existsSync(pubKeyPath)) {
        return res.status(404).send('Public key not found');
      }
      const pubKey = fs.readFileSync(pubKeyPath, 'utf8');
      res.type('text/plain').send(pubKey);
    } catch (err) {
      res.status(500).send('Error reading public key');
    }
  });
}
