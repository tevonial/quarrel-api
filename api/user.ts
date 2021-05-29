import * as mongoose from 'mongoose';
import {RequestHandler, Router} from "express";
import {UserDoc} from "./model/user.model";
import {ThreadDoc} from "./model/thread.model";
import {PostDoc} from "./model/post.model";
import {LeanDocument} from "mongoose";

const userRouter = Router();
const User = mongoose.model<UserDoc>('User');
const Thread = mongoose.model<ThreadDoc>('Thread');
const Post = mongoose.model<PostDoc>('Post');
const jwtParse = require('./config/jwt-parse');

// For file uploads
const dbUri = require('./config/db').uri;
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');



// MongoDb GridFs Connection, for retrievals
let Grid = require('gridfs-stream');
// const conn = mongoose.createConnection(mongoURI);
const conn = mongoose.connection;
let gfs;
conn.once('open', function () {
    gfs = new Grid(conn.db, mongoose.mongo);
    gfs.collection('profileImages'); //set collection name to lookup into
})

userRouter.get('/:id/profile-image', getProfileImage);
userRouter.get('/', getAllUsers);

userRouter.post('/', createUser);
// userRouter.put('/name/:id', updateName);
userRouter.put('/:id/profile-image', jwtParse, setProfileImage);
userRouter.put('/:id', jwtParse, updateUser);

module.exports = userRouter;



function countAuthorRefs<DocType>(model: mongoose.Model<any, {}>, name: string, id: string, doc: DocType): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        model.count({author: id}, (err, count) => {
            if (err)    reject(err);

            doc[name] = count;
            resolve(count);
        });
    });
}

function getAllUsers(req, res, next) {
    User.find({}, 'name fullName role email username', {}, (err, users) => {
        if (err)    return next(err);

        let promises: ReturnType<typeof countAuthorRefs>[] = new Array<ReturnType<typeof countAuthorRefs>>();
        let response: LeanDocument<UserDoc>[] = new Array<LeanDocument<UserDoc>>();

        users.forEach((userDoc, i, array) => {
            let user = userDoc.toObject();
            promises.push(countAuthorRefs<LeanDocument<UserDoc>>(Thread, 'threadCount', user._id, user));
            promises.push(countAuthorRefs<LeanDocument<UserDoc>>(Post, 'postCount', user._id, user));
            response.push(user);
        });

        Promise.all(promises).then(() => res.json(response), (err) => next(err));
    })
}

function createUser(req, res, next) {
    User.create(req.body, (err, user) => {
       if (err)     return next(err);

       res.json(user);
    });
}

// function updateName(req, res, next) {
//     User.findById(req.params.id, {},{},(err, user) => {
//         if (err)    return next(err);
//
//         user.name = req.body.name;
//         user.save((err, user) => {
//             if (err)     return next(err);
//
//             res.json({"token" : user.generateJwt()});
//         });
//     });
// }

function updateUser(req, res, next) {
    if (!req.payload._id)
        return next({message: "Cannot update account - not signed in"});

    User.findById(req.payload._id, (err, user) => {
        if (err)    return next(err);

        Object.keys(req.body).forEach((key) => {
            user[key] = req.body[key];
        });

        user.save((err, user) => {
            if (err)     return next(err);

            res.json({token : user.generateJwt()});
        });
    });
}

function setProfileImage(req, res, next) {
    if (!req.payload._id)
        return next({message: "Cannot set profile image - not signed in"});

    if ( !(req.payload._id === req.params.id || req.payload.role === 'admin') )
        return next({message: "Cannot set profile image - not authorized"})

    const userId = req.params.id;

    gfs.files.find({"metadata.user": userId }).toArray((err, files) => {
        if (files && files.length > 0) {
            gfs.remove()
        }
    })


    const storage = GridFsStorage({
        url: dbUri,
        file: (req, file) => {
            return {
                metadata: { filename: file.originalname, user: req.params.id },
                bucketName: "profileImages"
            }
        }
    });

    multer({storage: storage}).single('image')(req, res, (err) => {
        if (err)    return next(err);

        console.log(JSON.stringify(req.body));
        res.status(200).send();
    });
}

function getProfileImage(req, res, next) {

    const userId = req.params.id;

    /** First check if file exists */
    gfs.files.find({"metadata.user": userId }).toArray(function(err, files){
        console.log(JSON.stringify(files));

        if(!files || files.length === 0){
            return res.status(404).json({
                responseCode: 1,
                responseMessage: "No files found"
            });
        }
        // create read stream
        const readstream = gfs.createReadStream({filename: files[0].filename});
        // set the proper content type
        res.set('Content-Type', files[0].contentType);
        res.set('Content-Disposition: attachment; filename=\"' + files[0].filename + '\"');
        // Return response
        return readstream.pipe(res);
    });
}
