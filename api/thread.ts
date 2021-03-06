import * as mongoose from 'mongoose';
import { Router } from "express";
import {ThreadDoc} from "./model/thread.model";
import {recursiveDeletePost} from "./post";

const threadRouter = Router();
const Thread = mongoose.model<ThreadDoc>('Thread');
const Post = mongoose.model('Post');
const jwtParse = require('./config/jwt-parse');

threadRouter.get('/', getThreads);
threadRouter.get('/:id', getThreadById);

threadRouter.post('/', jwtParse, createThread);
threadRouter.delete('/:id', jwtParse, deleteThread);

module.exports.router = threadRouter;

function getThreads(req, res, next) {
    Thread.find()
        .populate({
            path: 'author',
            select: 'name fullName'
        })
        .exec((err, threads) => {
            if (err) return next(err);

            res.json({
                updated: Date.now(),
                threads
            });
        });
}

function getThreadById(req, res, next) {
    Thread.findById(req.params.id, {}, {},(err, thread) => {
       if (err)     next(err);

       res.json(thread);
    });
}

function createThread(req, res, next) {
    if (!req.payload._id)
        return next({message: "Cannot create thread - not logged in"});

    const newThread = {
        author: req.payload._id,
        title: req.body.title,
    };

    Thread.create(newThread, (err, thread) => {
        if (err)    next(err);

        const newPost = {
            author: req.payload._id,
            thread: mongoose.Types.ObjectId(thread._id),
            // thread: thread._id,
            body: req.body.body,
            threadRoot: true
        }

        Post.create(newPost, (err, post) => {
            if (err) next(err);

            thread.post = mongoose.Types.ObjectId(post._id);

            thread.save((err, thread) => {
                if (err) next(err);

                res.json(thread);
            });
        })
     });
}

function deleteThread(req, res, next) {
    if (!req.payload._id)
        return next({message: 'Cannot delete thread - not logged in'});

    Thread.findById(req.params.id).then((thread: ThreadDoc) => {

        recursiveDeletePost(String(thread.post), false).then(() => {
            thread.remove().then((result) => {
                res.json({success: true})
            }, () => {
                next({message: 'Error deleting thread'});
            });
        }, () => {
            next({message: 'Error deleting thread'});
        });
    })
}
