const util = require("util");
const Readable = require('stream').Readable;

const ReadableClone = function (input, options) {

    const me = this;
    Readable.call(me, options);

    input.on("data", function (chunk) {
        me.push(chunk);
    });

    input.on('end', function () {
        me.push(null);
    });

    input.on("error", function (err) {
        me.emit("error", err);
    });

    me._read = function () {

    };
};


util.inherits(ReadableClone, Readable);

module.exports = ReadableClone;
module.exports.default = ReadableClone;
