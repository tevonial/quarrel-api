export {}

const express = require('express');
const Router = express.Router;

const router = Router();

router.use('/thread', require('./thread'));
router.use('/user', require('./user'));
router.use('/post', require('./post'));
router.use('/auth', require('./auth'));
router.use('/config', require('./config'));

module.exports = router;
