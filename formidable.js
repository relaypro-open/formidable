'use strict';

module.exports = function(options) {
    var option = function(name) {
            return options && options[name];
        },
        path = require('./lib/path')(option),
        urls = require('./lib/urls')(path);

    return {
        path: path,
        url: urls.url,
        include: urls.include,
        resolve: urls.resolve
    };
};
