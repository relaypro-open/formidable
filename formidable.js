'use strict';

// TEMP!
var Formidable = function(base) {
    var path,
        urls;

    if (!(this instanceof Formidable)) {
        return new Formidable(base);
    }

    path = require('./lib/path')(base || '.'),
    urls = require('./lib/urls')(path),

    this.path = path;
    this.url = urls.url;
    this.include = urls.include;
    this.resolve = urls.resolve;
};

module.exports = Formidable;
