export {}

import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose'

export interface UserDoc extends Document {
    username: string;
    email: string;
    name: {
        first: string;
        last: string;
    };
    fullName: string;
    role: string;
    profileImage: string;
    hash: string;
    salt: string;
    threadCount: number;

    setPassword(password: string): void;
    generateJwt(): string;
}

// export interface IUserDoc extends UserDoc, Document {}

const userSchema = new Schema<UserDoc>({
    username: {type: String, required: true},
    email: {type: String, required: true},
    name: {
        first: {type: String, required: true},
        last: {type: String, required: true}
    },
    role: {type: String, default: 'reg'},
    hash: String,
    salt: String
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

userSchema.virtual('fullName').get(function () {
    return `${this.name.first} ${this.name.last}`;
})


//================================================================================
// Authentication and JSON web tokens
//================================================================================

const _crypto = require('crypto');
const jwt = require('jsonwebtoken');
const secret = require('../config/jwt').secret;

function md5(string) {
    return _crypto.createHash('md5').update(string).digest('hex');
}

userSchema.methods.setPassword = function(password) {
    this.salt = _crypto.randomBytes(16).toString('hex');
    this.hash = md5(password + this.salt);
};

userSchema.methods.validPassword = function (password) {
    return this.hash === md5(password + this.salt);
};

userSchema.methods.generateJwt = function() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    return jwt.sign({
        _id: this._id,
        username: this.username,
        email: this.email,
        name: this.name,
        fullName: this.fullName,
        role: this.role,
        exp: expiry.getTime() / 1000
    }, secret);
};

mongoose.model<UserDoc>('User', userSchema);
