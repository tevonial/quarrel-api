export {}

import * as mongoose from "mongoose";
import {ConnectOptions} from "mongoose";

//================================================================================
// Database configuration
//================================================================================

const dbUri = require('../config/db').uri;

let dbOptions: ConnectOptions = {
    // @ts-ignore
    // useMongoClient: true,
    useNewUrlParser: true
};

mongoose.connect(dbUri, dbOptions).catch((reason) => {
    console.error('Mongoose connect error: ', reason)
});

//================================================================================
// Model registration
//================================================================================
require('./thread.model');
require('./post.model');
require('./user.model');
require('./config.model');
