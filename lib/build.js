'use strict';

module.exports = function(option, log, path, urls, template) {

    var //---------------
        //    Imports
        //---------------

        fs = require('fs'),
        q = require('q'),
        lang = require('mercenary').lang,
        undef = lang.undef,
        apply = lang.apply,
        destructured = lang.destructured,
        each = lang.each,
        concat = lang.concat,
        isArray = lang.is.array,

        //----------------------
        //    Implementation
        //----------------------

        // Raise an error using the fail log.
        raise = function(error) {
            log.fail(error.stack || 'An unexpected error occurred');
        },

        // Fill in missing directories for the given file path.
        mkdirs = function(filepath) {
            var mkdir = function(dirname) {
                    if (fs.existsSync(dirname)) {
                        if (!fs.statSync(dirname).isDirectory()) {
                            throw new Error(
                                'The path "' +
                                dirname +
                                '" is not a directory');
                        }
                    } else {
                        mkdir(path.path.join(dirname, '..'));
                        fs.mkdirSync(dirname);
                    }
                };

            mkdir(path.path.dirname(filepath));
        };

    //------------------
    //    Public API
    //------------------

    return function() {
        try {
            (q.all(
                apply(
                    concat, undef,
                    require(path.js(option('urls') || 'urls'))))
            .then(function(patterns) {
                try {
                    each(patterns, function(pattern) {
                        (q.when(require(path.js(pattern.view)))
                        .then(function(view) {
                            try {
                                each(isArray(view) ? view : [view], function(view) {
                                    var urlpath = (
                                            path.build(
                                                urls.resolve(
                                                    pattern.name, view.params))),
                                        filepath = (
                                            path.path.extname(urlpath) ?
                                                urlpath :
                                                path.path.join(urlpath, 'index.html')),
                                        content = (
                                            template.render(
                                                view.template,
                                                view.context || {}));

                                    mkdirs(filepath);
                                    fs.writeFileSync(filepath, content);
                                });
                            } catch (error) {
                                raise(error);
                            }
                        }, raise));
                    });
                } catch (error) {
                    raise(error);
                }
            }, raise));
        } catch (error) {
            raise(error);
        }
    };
};
