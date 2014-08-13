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
        once = lang.once,
        destructured = lang.destructured,
        each = lang.each,
        map = lang.map,
        concat = lang.concat,
        isArray = lang.is.array,
        isString = lang.is.string,

        //---------------
        //    Options
        //---------------

        overwrite = !(option('overwrite') === false),
        verbose = option('verbose') || false,

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
                        if (verbose) {
                            log.info('Creating directory "' + dirname + '"');
                        }
                        fs.mkdirSync(dirname);
                    }
                };

            mkdir(path.path.dirname(filepath));
        },

        // Write a file to disk.
        write = function(filepath, content) {
            var exists = once(function() {
                    return fs.existsSync(filepath);
                });

            if (!overwrite && exists()) {
                throw new Error(
                    'The overwrite setting is false and the file "' +
                    filepath +
                    '" already exists');
            }
            mkdirs(filepath);
            if (verbose) {
                if (exists()) {
                    log.warn('Rendering (overwrite) "' + filepath + '"');
                } else {
                    log.info('Rendering "' + filepath + '"');
                }
            }
            fs.writeFileSync(filepath, content);
        };

    //------------------
    //    Public API
    //------------------

    return function() {
        try {
            return (
                // Resolve the URL patterns.
                urls.include(option('urls') || 'urls')
                // Process each URL pattern to resolve its view instances.
                .then(function(patterns) {
                    return (
                        map(patterns, function(pattern) {
                            return (
                                // Resolve the top-level view promise.
                                q.when(
                                    isString(pattern.view) ?
                                        require(path.js(pattern.view)) :
                                        pattern.view)
                                // Resolve all views instances.
                                .then(function(views) {
                                    return q.all(isArray(views) ? views : [views]);
                                })
                                // Package the pattern with its view instances.
                                .then(function(views) {
                                    return [pattern, views];
                                }));
                        }));
                })
                // Resolve each URL pattern with its view instances.
                .then(q.all)
                // Process each URL pattern with its view instances to generate the site.
                .then(function(patternViews) {
                    each(patternViews, destructured(function(pattern, views) {
                        if (verbose) {
                            log.info('Processing URL pattern "' + pattern.name + '"');
                        }
                        each(views, function(view) {
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

                            write(filepath, content);
                        });
                    }));
                })
                // Handle errors.
                .fail(raise));
        } catch (error) {
            raise(error);
        }
    };
};
