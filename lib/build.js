'use strict';

module.exports = function(option, log, path, urls, template) {

    var //---------------
        //    Imports
        //---------------

        fs = require('fs'),
        q = require('q'),
        lang = require('mercenary').lang,
        undef = lang.undef,
        constant = lang.constant,
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
        write = function(filepath, content, pattern) {
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
                (exists() ? log.warn : log.info)(
                    'Rendering ' +
                    (exists() ?
                        '(overwrite) ' :
                        '') +
                    '"' +
                    filepath +
                    '" for URL pattern "' +
                    pattern.name +
                    '"');
            }
            fs.writeFileSync(filepath, content);
        };

    //------------------
    //    Public API
    //------------------

    // TODO (mkibbel): Improve overall performance and scalability by:
    //
    // * Eliminating synchronous I/O operations throughout the codebase. This should keep
    //   Node's single thread busy while it would otherwise be I/O-bound. Use q-fs to
    //   implement this.
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
                                            require(path.js(pattern.view)) :
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
                                                                    .then(destructured(function(params, template, context) {
                                                                        var urlpath = (
                                                                                path.build(
                                                                                    urls.resolve(
                                                                                        pattern.name,
                                                                                        params)));

                                                                        return (
                                                                            write(
                                                                                path.path.extname(urlpath) ?
                                                                                    urlpath :
                                                                                    path.path.join(urlpath, 'index.html'),
                                                                                template.render(
                                                                                    template,
                                                                                    context || {}),
                                                                                pattern));
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
