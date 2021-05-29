import * as mongoose from "mongoose";
import {Schema, Document} from 'mongoose'
import {UserDoc} from "./user.model";

export interface PostDoc extends Document {
    date: Date;
    thread: string | {
        title: string,
        created: Date,
        updated: Date,
        author: string,
        post: string
    };
    title: string;
    author: UserDoc;
    body: string;
    topLevel: boolean;
    parent?: string;
    children: PostDoc[];
    image?: string;
}

// export interface IPostDoc extends PostDoc, Document {}

const postSchema  = new Schema<PostDoc>({
    date: {type: Date, default: Date.now},
    thread: {type: mongoose.Schema.Types.ObjectId, ref: 'Thread' },
    title: {required: false, type: String},
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    body: String,
    topLevel: {type: Boolean, required: true, default: false},
    parent: {type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    children: [{type: mongoose.Schema.Types.ObjectId, ref: 'Post'}]
}, {
    toJSON: {virtuals: true}
})

postSchema.virtual('childs', {
    ref: 'Post',
    localField: '_id',
    foreignField: 'parent',
})

const autoPopulatePosts = function (next) {
    // this.populate('children');
    this.populate([{
        path: 'children'
    },{
        path: 'author',
        select: 'name'
    }])
    next();
}

const updateDate = function (next) {

}

postSchema.pre('find', autoPopulatePosts);

mongoose.model('Post', postSchema);
