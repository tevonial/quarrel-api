import * as multer from "multer"
import {Request} from "express";
import * as mongoose from "mongoose";
import ReadableStreamClone from "readable-stream-clone"

const Grid = require('gridfs-stream');
const sharp = require('sharp');
const path = require('path');

type nameFnType = (req: Request, file: Express.Multer.File) => {fullSize: string, thumb: string};

type Options = {
    conn: mongoose.Connection
    collection: string;
    userId: string;
    width: number;
    nameFn?: nameFnType;
};

const defaultNameFn: nameFnType = (_req: Request, file: Express.Multer.File) => {
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname);

    return {
        fullSize: `${file.fieldname}_${timestamp}${fileExt}`,
        thumb: `thumb_${timestamp}${fileExt}`
    };
};

class ThumbnailStorageEngine implements multer.StorageEngine {
    private conn: mongoose.Connection;
    private collection: string;
    private userId: string;
    private width: number;
    private nameFn: nameFnType;
    private gfs: any;

    constructor(options: Options) {
        this.conn = options.conn;
        this.collection = options.collection;
        this.userId = options.userId;
        this.width = options.width || 250;
        this.nameFn = options.nameFn || defaultNameFn;

        this.gfs = Grid(this.conn.db, mongoose.mongo);
    }

    _handleFile(req: Request, file: Express.Multer.File, callback: (error?: any, info?: Partial<Express.Multer.File>) => void): void {
        if (!this.conn) {
            return callback(new Error("conn is a required field."));
        }

        if (!this.collection) {
            return callback(new Error("collection is a required field."));
        }

        if (!this.userId) {
            return callback(new Error("userId is a required field."));
        }

        const filenames = this.nameFn(req, file);

        const writeStreamOptions = (filename: string, thumb: boolean) => {
            return {
                filename,
                root: this.collection,
                content_type: file.mimetype,
                metadata: {
                    user: this.userId,
                    filename: file.originalname,
                    thumb
                }
            }
        }

        const fullReadStream = new ReadableStreamClone(file.stream);
        const fullWriteStream = this.gfs.createWriteStream(writeStreamOptions(filenames.fullSize, false));

        const thumbReadStream = new ReadableStreamClone(file.stream);
        const thumbWriteStream = this.gfs.createWriteStream(writeStreamOptions(filenames.thumb, true));


        fullReadStream
            .pipe(fullWriteStream)
            .on("error", (err) => {
                fullWriteStream.end();
                // storageFile.delete({ ignoreNotFound: true });
                callback(err);
            })
            .on("finish", () => {
                console.log(`finished ${filenames}`)
                callback(null, { filename: filenames.fullSize });
            });

        let resizeTransform = sharp().resize(this.width);

        thumbReadStream
            .pipe(resizeTransform)
            .pipe(thumbWriteStream)
            .on("error", (err) => {
                thumbWriteStream.end();
                callback(err)
            })
            .on("finish", () => {
                console.log("saved thumbnail");
                callback(null, {filename: filenames.fullSize});
            });
    };

    _removeFile = (_req: Request, file: Express.Multer.File & { name: string }, cb: (error: Error | null) => void): void => {
        // this.bucket.file(file.name).delete({ ignoreNotFound: true });
        this.gfs.remove({filename: file.name})
        cb(null);
    };
}

export default (opts: Options) => {
    return new ThumbnailStorageEngine(opts);
};
