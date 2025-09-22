const express = require('express');
const fs = require('fs');
const path = require('path');


module.exports = function registerPublicKeyApi(app) {
  app.get('/public-key', (req, res) => {
    try {
      const pubKey = process.env.PUBLIC_KEY_PEM;
      if (!pubKey) {
        return res.status(404).send('Public key not found');
      }
      res.type('text/plain').send(pubKey);
    } catch (err) {
      res.status(500).send('Error reading public key');
    }
  });
}
