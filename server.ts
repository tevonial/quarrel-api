#!/usr/bin/env node

export {}

const express = require('express');
const errorHandler = require('./errorHandler');
const http = require('http');
const https = require('https')
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const fs = require('fs')
// const cors = require('cors');

const app = express();

const frontendPath = (process.env.NODE_ENV === 'production') ? './MaterialQuarrel' : '../../MaterialQuarrel/dist/MaterialQuarrel';

const port: number = Number(process.env.PORT) || 3001;

// Enable CORS
// app.use(cors({origin: [
//         "http://localhost:4200"
//     ], credentials: true}));

// Init Logger
app.use(logger('dev'));

// Init body-parser's JSON parser and cookie-parser
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Init DB/backend services/resources
require('./api/model');
require('./api/config/passport');
app.use(passport.initialize());
// app.use(passport.session());

// API Routing
app.use('/api', require('./api/router'));

// Serve static files from precompiled Angular Frontend
app.use(express.static(path.join(__dirname, frontendPath)));
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, `${frontendPath}/index.html`));
});

// Error Handling
app.use(errorHandler);

// Start server
let server;

if (process.env.NODE_ENV === 'production') {
    const tlsCredentials = {
        key: fs.readFileSync('./tls/tevonial_com.key'),
        cert: fs.readFileSync('./tls/tevonial_com.crt')
    };
    server = https.createServer(tlsCredentials, app);
} else {
    server = http.createServer(app);
}

server.listen(port, () => console.log(`App running on: http://localhost:${port}`));
