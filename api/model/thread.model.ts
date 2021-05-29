import * as mongoose from "mongoose";
import {Schema, Document} from 'mongoose';

export interface ThreadDoc extends Document {
    title: string;
    created: Date;
    updated: Date;
    author: mongoose.Types.ObjectId;
    post: mongoose.Types.ObjectId;
}

const threadSchema  = new Schema<ThreadDoc>({
    title: {type: String, required: true },
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'}
}, {
    toJSON: { virtuals: true }
});

threadSchema.virtual('posts', {
    ref: 'Post',
    localField: '_id',
    foreignField: 'thread',
});

mongoose.model<ThreadDoc>('Thread', threadSchema);
