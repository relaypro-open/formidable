'use strict';

module.exports = function(option, log, context, path, urls, template) {

    var //---------------
        //    Imports
        //---------------

        fs = require('q-io/fs'),
        q = require('q'),
        lang = require('mercenary').lang,
        undef = lang.undef,
        constant = lang.constant,
        apply = lang.apply,
        destructured = lang.destructured,
        has = lang.has,
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

        // Promise to fill in missing directories for the given file path.
        mkdirs = function(filepath) {
            var dirpath = path.path.dirname(filepath);

            return (
                fs.exists(dirpath)
                .then(function(exists) {
                    if (exists) {
                        return (
                            fs.stat(dirpath)
                            .then(function(stat) {
                                if (!stat.isDirectory()) {
                                    throw new Error(
                                        'The path "' +
                                        dirname +
                                        '" is not a directory');
                                }
                            }));
                    } else {
                        if (verbose) {
                            log.info(
                                'Creating directory "' +
                                dirpath +
                                '"');
                        }
                        return fs.makeTree(dirpath);
                    }
                }));
        },

        // Promise to write a file to disk.
        write = function(filepath, content, pattern) {
            return (
                q.all([filepath, content, pattern])
                .then(destructured(function(filepath, content, pattern) {
                    return (
                        fs.exists(filepath)
                        .then(function(exists) {
                            if (!overwrite && exists) {
                                throw new Error(
                                    'The overwrite setting is false ' +
                                    'and the file "' +
                                    filepath +
                                    '" already exists');
                            }
                            return (
                                mkdirs(filepath)
                                .then(function() {
                                    if (verbose) {
                                        (exists ? log.warn : log.info)(
                                            'Rendering ' +
                                            (exists ?
                                                '(overwrite) ' :
                                                '') +
                                            '"' +
                                            filepath +
                                            '" for URL pattern "' +
                                            pattern.name +
                                            '"');
                                    }
                                    return fs.write(filepath, content);
                                }));
                        })
                        .then(constant()));
                })));
        };

    //------------------
    //    Public API
    //------------------

    return function() {
        try {
            return (
                urls.include(option('urls') || 'urls')
                .then(function(patterns) {
                    return (
                        q.all(
                            map(patterns, function(pattern) {
                                return (
                                    q.when(
                                        isString(pattern.view) ?
                                            (path.js(pattern.view)
                                            .then(function(view) {
                                                return q.when(require(view));
                                            })) :
                                            pattern.view)
                                    .then(function(views) {
                                        return (
                                            q.all(
                                                map(
                                                    isArray(views) ?
                                                        views :
                                                        [views],
                                                    function(view) {
                                                        return (
                                                            q.when(view)
                                                            .then(function(view) {
                                                                return (
                                                                    q.all([view.params, view.template, view.context])
                                                                    .then(destructured(function(viewParams, viewTemplate, viewContext) {
                                                                        var url = urls.resolve(pattern.name, viewParams),
                                                                            urlpath = path.build(url);

                                                                        return (
                                                                            q.when(
                                                                                context.meta(
                                                                                    viewContext || context(),
                                                                                    {
                                                                                        params: viewParams || {},
                                                                                        url: url,
                                                                                        template: viewTemplate
                                                                                    }))
                                                                            .then(function(fullContext) {
                                                                                return (
                                                                                    write(
                                                                                        path.path.extname(urlpath) ?
                                                                                            urlpath :
                                                                                            path.path.join(urlpath, 'index.html'),
                                                                                        template.render(
                                                                                            viewTemplate,
                                                                                            fullContext),
                                                                                        pattern));
                                                                            }));
                                                                    })));
                                                            }));
                                                    })));
                                    }));
                            })));
                })
                .then(constant(true), raise));
        } catch (error) {
            raise(error);
        }
    };
};
