'use strict';

module.exports = function(option, log, path, context, middleware, urls, template) {

    var //---------------
        //    Imports
        //---------------

        qfs = require('q-io/fs'),
        q = require('mercenary/promises'),
        lang = require('mercenary/lang'),
        constant = lang.constant,
        compose = lang.compose,
        destructured = lang.destructured,
        isArray = lang.is.array,
        isFunction = lang.is.fn,
        isString = lang.is.string,

        //---------------
        //    Options
        //---------------

        overwrite = option('overwrite') !== false,
        verbose = option('verbose') || false,

        //----------------------
        //    Implementation
        //----------------------

        // Raise an error using the fail log.
        raise = function(error) {
            log.fail(error.stack || 'An unexpected error occurred');
        },

        // Promise to fill in missing directories for the given build path.
        mkdirs = function(build) {
            var dirPath = path.path.dirname(build);

            return (
                qfs.exists(dirPath)
                .then(function(exists) {
                    if (exists) {
                        return (
                            qfs.stat(dirPath)
                            .then(function(stat) {
                                if (!stat.isDirectory()) {
                                    throw new Error(
                                        'The path "' +
                                        dirPath +
                                        '" is not a directory');
                                }
                            }));
                    } else {
                        if (verbose) {
                            log.info(
                                'Creating directory "' +
                                dirPath +
                                '"');
                        }
                        return qfs.makeTree(dirPath);
                    }
                })
                .then(constant(dirPath)));
        },

        // Promise to write a file to disk.
        write = function(build, content, pattern) {
            return (
                q.all([build, content, pattern])
                .then(destructured(function(build, content, pattern) {
                    return (
                        qfs.exists(build)
                        .then(function(exists) {
                            if (!overwrite && exists) {
                                throw new Error(
                                    'The overwrite setting is false ' +
                                    'and the file "' +
                                    build +
                                    '" already exists');
                            }
                            return (
                                mkdirs(build)
                                .then(function() {
                                    if (verbose) {
                                        (exists ? log.warn : log.info)(
                                            'Rendering ' +
                                            (exists ?
                                                '(overwrite) ' :
                                                '') +
                                            '"' +
                                            build +
                                            '" for URL pattern "' +
                                            pattern.name +
                                            '"');
                                    }
                                    return qfs.write(build, content);
                                }));
                        })
                        .then(constant(build)));
                })));
        };

    //------------------
    //    Public API
    //------------------

    return function() {
        try {
            return (
                q.call.sequence.all(
                    middleware.get.pre.build(),
                    require('../formidable'))
                .then(function() {
                    return (
                        urls.include(option('urls') || 'urls')
                        .then(function(patterns) {
                            return (
                                q.map(patterns, function(pattern) {
                                    return (
                                        q.when(
                                            isString(pattern.view) ?
                                                (path.js(pattern.view)
                                                    .then(compose(q.when, require))) :
                                                pattern.view)
                                        .then(function(views) {
                                            return (
                                                q.map(isArray(views) ? views : [views], function(view) {
                                                    return (
                                                        q.all(view)
                                                        .then(function(view) {
                                                            var url = urls.resolve(pattern.name, view.params),
                                                                build = path.build(url);

                                                            if (!path.path.extname(build)) {
                                                                build = (
                                                                    path.path.join(
                                                                        build, 'index.html'));
                                                            }
                                                            return (
                                                                context.meta(
                                                                    view.context || context(),
                                                                    {
                                                                        url: url,
                                                                        build: build
                                                                    })
                                                                .then(function(context) {
                                                                    return (
                                                                        write(
                                                                            build,
                                                                            isFunction(view.template) ?
                                                                                view.template(context) :
                                                                                template.render(
                                                                                    view.template,
                                                                                    context),
                                                                            pattern));
                                                                }));
                                                        }));
                                                }));
                                        }));
                                }));
                        }));
                })
                .then(function() {
                    return (
                        q.call.sequence.all(
                            middleware.get.post.build(),
                            require('../formidable')));
                })
                .then(constant())
                .fail(raise));
        } catch (error) {
            raise(error);
        }
    };
};
