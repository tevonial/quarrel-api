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
    // const fileExt = path.extname(file.originalname);
    const fileExt = '.png';

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
            console.log('type ' + file.mimetype);

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

        const fullWriter = new Promise<string>((resolve, reject) => {
            const fullReadStream = new ReadableStreamClone(file.stream);
            const fullWriteStream = this.gfs.createWriteStream(writeStreamOptions(filenames.fullSize, false));

            fullReadStream
                .pipe(fullWriteStream)
                .on("error", (err) => {
                    if (err !== undefined) {
                        fullWriteStream.end();
                        console.log('full stream error: ' + err);
                    }
                })
                .on("finish", () => {
                    resolve(filenames.fullSize);
                });
        });

        const thumbWriter = new Promise<string>((resolve, reject) => {
            const thumbReadStream = new ReadableStreamClone(file.stream);
            const thumbWriteStream = this.gfs.createWriteStream(writeStreamOptions(filenames.thumb, true));

            let resizeTransform = sharp().resize(this.width);

            thumbReadStream
                .pipe(resizeTransform)
                .pipe(thumbWriteStream)
                .on("error", (err) => {
                    if (err !== undefined) {
                        thumbWriteStream.end();
                        console.log('thumb stream error: ' + err);
                    }
                })
                .on("finish", () => {
                    resolve(filenames.thumb);
                });
        });

        Promise.all([fullWriter, thumbWriter])
            .then((response) => {
                console.log("HHH " + JSON.stringify(response));
                callback(null, {filename: response[0]});
            })
            .catch((error) => {
                console.log("FFF" + JSON.stringify(error));
                callback(error);
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
