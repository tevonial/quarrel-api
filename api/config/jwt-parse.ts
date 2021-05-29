const jwt = require('express-jwt');
const secret = require('./jwt').secret;

// Middleware parses JWT and adds payload to req object
module.exports = jwt({
    secret,
    userProperty: 'payload',
    algorithms: ['sha1', 'RS256', 'HS256']
});
