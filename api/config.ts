import * as mongoose from 'mongoose';
import { Router } from "express";
import {ConfigurationDoc} from "./model/config.model";
import {Observable} from "rxjs";

const configRouter = Router();
const Config = mongoose.model('Configuration');

configRouter.get('/', getConfigurations);
configRouter.post('/', replaceConfiguration);

module.exports.router = configRouter;

function getConfigurations(req, res, next) {
    Config.find({}, {}, {}, (err, settings: ConfigurationDoc[]) => {
        if (err)    next(err);

        res.json(settings);
    })
}

function replaceConfiguration(req, res, next) {
    // if (req.body.scope) {
    //     Config.replaceOne({scope: req.body.scope}, req.body, {upsert: true}, (err, setting) => {
    //         if (err)    next(err);
    //
    //         res.status(200).json(setting);
    //     });
    // } else {
    //     next({message: 'replaceSetting() failed'});
    // }

    if (req.body.scope) {
        console.log(JSON.stringify(req.body.settings));

        Config.findOneAndUpdate({scope: req.body.scope}, {$set: {settings: req.body.settings}}, {upsert: true, new: true}, (err, config) => {
            if (err)    next(err);

            res.status(200).json(config);
        });
    } else {
        next({message: 'replaceSetting() failed'});
    }

}

