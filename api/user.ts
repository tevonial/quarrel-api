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
const conn = mongoose.connection;
let gfs;
conn.once('open', function () {
    gfs = new Grid(conn.db, mongoose.mongo);
    gfs.collection('profileImages'); //set collection name to lookup into
})

userRouter.get('/:id/profile-image', getProfileImage);
userRouter.get('/', getAllUsers);

userRouter.post('/', createUser);
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
    interface UserQuery {
        search: string;
        searchBy: string;
    }

    interface PageOptions {
        index: number;
        pageSize: number;
    }

    interface UsersResponse {
        totalUsers: number;
        index: number;
        pageSize: number;
        users: LeanDocument<UserDoc>[];
    }

    // Destructure postQuery
    let search, searchBy;
    const searchByTypes = ['username', 'fullName'];

    try {
        ({search, searchBy} = <UserQuery>JSON.parse(decodeURIComponent(req.query.userQuery)));
        if (typeof (search) !== 'string') {
            search = "";
        }
        if (!searchByTypes.includes(searchBy)) {
            searchBy = searchByTypes[0];
        }
    } catch (e) {
        console.log('catched while trying to destructure postQuery');
        ({search, searchBy} = {search: "", searchBy: searchByTypes[0]});
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

    console.log(`searching ${search} by ${searchBy}`);

    User.aggregate([{
        $project: {
            name: 1, email: 1, username: 1, role: 1,
            fullName: {
                $concat: ['$name.first', ' ' , '$name.last']
            }
        }
    }, {
        $match: {
            [searchBy]: {
                $regex: search,
                $options: 'i'
            }
        },
    }, {
        $sort: {
            username: 1
        }
    }]).exec((err, users) => {
        if (err)    return next(err);

        let promises: ReturnType<typeof countAuthorRefs>[] = new Array<ReturnType<typeof countAuthorRefs>>();
        let pagedUsers: LeanDocument<UserDoc>[] = new Array<LeanDocument<UserDoc>>();

        users.slice(skip, skip + limit).forEach((userDoc) => {
            let user = userDoc;//.toObject();
            promises.push(countAuthorRefs<LeanDocument<UserDoc>>(Thread, 'threadCount', user._id, user));
            promises.push(countAuthorRefs<LeanDocument<UserDoc>>(Post, 'postCount', user._id, user));
            pagedUsers.push(user);
        });

        Promise.all(promises).then(() => {
            const response: UsersResponse = {
                totalUsers: users.length,
                index,
                pageSize,
                users: pagedUsers
            }
            console.log(response);
            res.json(response);
        }, (err) => next(err));
    });
}

function createUser(req, res, next) {
    User.create(req.body, (err, user) => {
       if (err)     return next(err);

       res.json(user);
    });
}

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
    if (!req.params.id)
        return next({message: 'no user id specified'});

    const userId = req.params.id;

    /** First check if file exists */
    gfs.files.find({"metadata.user": userId }).toArray(function(err, files){
        if (err)    return next(err);

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
