import * as mongoose from 'mongoose';
import { Router } from "express";
import {PostDoc} from "./model/post.model";

const jwtParse = require('./config/jwt-parse');
const postRouter = Router();
const Post = mongoose.model<PostDoc>('Post');

postRouter.get('/', getPosts);
postRouter.get('/:id', getPostById);
postRouter.get('/thread/:id/tree', getPostTree);
postRouter.get('/author/:id', getPostsByAuthor);

postRouter.post('/', createPost);
postRouter.post('/:id/reply', jwtParse, replyToPost);
postRouter.post('/purge-update', purgeUpdate);

postRouter.put('/:id', jwtParse, editPost);

postRouter.delete('/:id', jwtParse, deletePost);

module.exports.router = postRouter;



function getPosts(req, res, next) {
    Post.find({}, (err, posts) => {
        if (err)    next(err);

        res.json(posts);
    });
}

function getPostById(req, res, next) {
    Post.findById(req.params.id, (err, post) => {
        if (err)    next(err);

        res.json(post);
    });
}

/**
 * Post tree is generated by .pre() hooks called by Mongoose find()
 */
function getPostTree(req, res, next) {
    Post.find({thread: req.params.id, topLevel: true}).exec(
        (err, posts) => {
            if (err) next(err);

            res.json(posts);
        });
}

function createPost(req, res, next) {
    if (!req.body.title || req.body.title.length == 0) {
        req.body.title = `${req.body.post.substr(0, 60)}...`;
    }

    Post.create(req.body, (err, post) => {
        if (err)    next(err);

        res.json(post);
    });
}

function purgeUpdate(req, res, next) {
    Post.deleteMany({}, {},(err) => {
        if (err) return next(err);
    });

    Post.insertMany(req.body, {},(err, posts) => {
        if (err) return next(err);

        res.json(posts);
    });
}

function getPostsByAuthor(req, res, next) {
    if (!req.params.id)
        return;

    interface PostQuery {
        search: string;
        sort: string;
    }

    interface PageOptions {
        index: number;
        pageSize: number;
    }

    interface PostsResponse {
        totalPosts: number;
        index: number;
        pageSize: number;
        posts: PostDoc[];
    }

    // Destructure postQuery
    let search, sort;

    try {
        ({search, sort} = <PostQuery>JSON.parse(decodeURIComponent(req.query.postQuery)));
        if (typeof(search) !== 'string') {
            search = "";
        }
    } catch (e) {
        console.log('catched while trying to destructure postQuery');
        ({search, sort} = {search: "", sort: 'date'});
    }

    // Destructure pageOptions
    let index, pageSize;

    try {
        ({index, pageSize} = <PageOptions>JSON.parse(decodeURIComponent(req.query.pageOptions)));
    }
    catch (e) {
        console.log('catched while trying to destructure pageOptions');
        ({index, pageSize} = {index: 0, pageSize: 5});
    }

    const skip = index * pageSize;
    const limit = pageSize;

    Post.countDocuments({author: req.params.id}, (err, count) => {
        if (err)    return next(err);

        Post.aggregate([{
            $match: {
                author: mongoose.Types.ObjectId(req.params.id),
                body: {
                    $regex: search,
                    $options: 'i'
                }
            }
        }, {
            $lookup: {
                from: 'threads',
                localField: 'thread',
                foreignField: '_id',
                as: 'thread'
            }
        }, {
            $unwind: '$thread'
        }, {
            $sort: {
                [sort]: 1
            }
        }]).exec((err, posts) => {
            if (err)    return next(err);

            const response: PostsResponse = {
                totalPosts: posts.length,
                index,
                pageSize,
                posts: posts.slice(skip, skip + limit)
            }

            res.json(response);
        });
    })

}

function replyToPost(req, res, next) {
    if (!req.payload._id)
        return next({message: "Cannot update account - not signed in"});

    const author: string = req.payload._id;
    const parent: string = req.params.id;

    Post.findById(parent, {}, {},(err, parentPost) => {
        const thread = parentPost.thread;
        let partialReply: Partial<PostDoc> = req.body;
        let reply = { author, parent, thread, ...partialReply };

        Post.create(reply).then((newPost) => {

            parentPost.children.push(newPost._id);
            parentPost.save().then(() => {
                res.send();
            });
        });
    });
}

function editPost(req, res, next) {
    if (!req.payload._id)
        return next({message: "Cannot edit post - not logged in"});

    Post.findById(req.params.id,{},{},(err, post) => {
        if (post.author._id == req.payload._id || req.payload.role == 'admin') {
            post.body = req.body.body;
            post.save((err, post) => {
                if (err)    return next(err);

                res.json(post);
            })
        } else {
            return next({message: "Cannot edit post - unauthorized"});
        }
    })
}

export function recursiveDeletePost(postId: string, removeParentRef= true): Promise<boolean> {
    return new Promise((resolve, reject) => {
        // Find post to delete
        Post.findOne({_id: postId} ,{},{},(err, post) => {

            // Delete all child posts
            if (post.children.length > 0) {
                post.children.forEach((c) => {
                    recursiveDeletePost(c._id, false);
                });

                // Post.deleteMany({_id: { $in: childrenId}}, {}, (err) => {
                //     if (err)    return err;
                // });
            }

            if (removeParentRef) {
                // Find parent post
                Post.findOne({_id: post.parent}, {}, {}, (err, parent) => {

                    // Remove reference from parent post
                    parent.children = parent.children.filter((c) => !c._id.equals(post._id));

                    parent.save((err) => {
                        if (err)    return reject(err);

                        // Remove post
                        post.remove({}, (err) => {
                            if (err)    return reject(err);

                            return resolve(true);
                        });
                    });
                });
            } else {
                // Remove post
                post.remove({}, (err) => {
                    if (err)    return reject(err);

                    return resolve(true);
                });
            }
        });
    });
}

function deletePost(req, res, next) {
    if (!req.payload._id)
        return next({message: "Cannot delete post - not logged in"});

    recursiveDeletePost(req.params.id).then((result) => {
        res.json({success: result});
    });
}
