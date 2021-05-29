module.exports = function (err, req, res, next) {
    res.status(500).send('Congratulations! You reached the error handler middleware!')

    console.error("_____________________________");
    console.error("____________ERROR____________");
    console.error("err.message = " + err.message);
    console.error("_____________________________");
}
