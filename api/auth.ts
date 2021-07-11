const express = require('express');
const Router = express.Router;
const mongoose = require('mongoose');
const passport = require('passport');

const authRouter = Router();
const User = mongoose.model('User');
const jwtParse = require('./config/jwt-parse');

authRouter.put('/:id/password', jwtParse, setPassword);
authRouter.post('/login', login);
authRouter.post('/register', register);


module.exports.router = authRouter;


function login (req, res, next) {
    passport.authenticate('local', function(err, user, info){

        // If Passport throws/catches an error
        if (err)
            return next(err);

        // If a user is found
        if (user) {
            res.status(200).json({
                "token" : user.generateJwt()
            });
        } else {
            // If user is not found
            res.status(401).json(info);
        }
    })(req, res);
}

function register(req, res, next) {
    let user = new User();

    user.name = req.body.name;
    user.email = req.body.email;
    user.setPassword(req.body.password);

    // For setup only
    if (req.body.role) {
        User.find({}, function (err, users) {
            if (err)    return next(err);

            if (users.length === 0) {
                user.role = req.body.role;
            }

            saveUser(user, res, next);
        });

        // For all other registrations
    } else {
        user.role = "admin";
        saveUser(user, res, next);
    }
}


function saveUser(user, res, next) {
    user.save(function(err) {
        if (err)    return next(err);

        res.status(200).json({
            "token" : user.generateJwt()
        });
    });
}

function setPassword(req, res, next) {
    if (!req.payload._id)
        return next({message: "Cannot set password - not signed in"});

    if ( !(req.payload._id === req.params.id || req.payload.role === 'admin') )
        return next({message: "Cannot set password - not authorized"})

    const {currentPassword, newPassword} = req.body;

    User.findById(req.params.id, (err, user) => {
        if (err)
            return next(err);

        if (!user.validPassword(currentPassword))
            return  next({message: "Current password incorrect"});

        user.setPassword(newPassword);
        user.save().then(() => {
            res.json({success: true});
        }, (err) => {
            res.json({success: false})
            return next(err);
        });
    });
}
