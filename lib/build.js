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
        reversed = lang.reversed,
        isArray = lang.is.array,
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
        mkdirs = function(buildPath) {
            var dirPath = path.path.dirname(buildPath);

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
        write = function(buildPath, content, pattern) {
            return (
                q.all([buildPath, content, pattern])
                .then(destructured(function(buildPath, content, pattern) {
                    return (
                        qfs.exists(buildPath)
                        .then(function(exists) {
                            if (!overwrite && exists) {
                                throw new Error(
                                    'The overwrite setting is false ' +
                                    'and the file "' +
                                    buildPath +
                                    '" already exists');
                            }
                            return (
                                mkdirs(buildPath)
                                .then(function() {
                                    if (verbose) {
                                        (exists ? log.warn : log.info)(
                                            'Rendering ' +
                                            (exists ?
                                                '(overwrite) ' :
                                                '') +
                                            '"' +
                                            buildPath +
                                            '" for URL pattern "' +
                                            pattern.name +
                                            '"');
                                    }
                                    return qfs.write(buildPath, content);
                                }));
                        })
                        .then(constant(buildPath)));
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
                                                                buildPath = path.build(url);

                                                            if (!path.path.extname(buildPath)) {
                                                                buildPath = (
                                                                    path.path.join(
                                                                        buildPath, 'index.html'));
                                                            }
                                                            return (
                                                                context.meta(
                                                                    view.context || context(),
                                                                    {
                                                                        url: url,
                                                                        params: view.params || {},
                                                                        template: view.template
                                                                    })
                                                                .then(function(context) {
                                                                    return (
                                                                        write(
                                                                            buildPath,
                                                                            template.render(
                                                                                view.template,
                                                                                context,
                                                                                buildPath),
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
                            reversed(middleware.get.post.build()),
                            require('../formidable')));
                })
                .then(constant())
                .fail(raise));
        } catch (error) {
            raise(error);
        }
    };
};
