export {}

const express = require('express');
const Router = express.Router;

const router = Router();

router.use('/thread', require('./thread').router);
router.use('/user', require('./user').router);
router.use('/post', require('./post').router);
router.use('/auth', require('./auth').router);
router.use('/config', require('./config').router);

module.exports = router;
