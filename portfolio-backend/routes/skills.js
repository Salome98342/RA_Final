const express = require('express');
const router = express.Router();
const { getSkills } = require('../controllers/skillsController');

router.get('/', getSkills);

module.exports = router;
