const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { createMessage } = require('../controllers/contactController');

// Validation rules
const contactValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Debe proporcionar un email válido'),
  body('message').trim().notEmpty().withMessage('El mensaje es requerido')
];

router.post('/', contactValidation, createMessage);

module.exports = router;
