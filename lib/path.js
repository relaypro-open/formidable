'use strict';

module.exports = function(option) {

    var //---------------
        //    Imports
        //---------------

        List = require('collections/list'),
        qfs = require('q-io/fs'),
        fs = require('fs'),
        qglob = require('./utils/qglob'),
        glob = require('glob'),
        path = require('path'),
        q = require('q'),
        lang = require('mercenary').lang,
        apply = lang.apply,
        destructured = lang.destructured,
        has = lang.has,
        extend = lang.extend,
        slice = lang.slice,
        any = lang.any,
        map = lang.map,
        pop = lang.pop,
        concat = lang.concat,
        reversed = lang.reversed,
        char = lang.char,
        isString = lang.is.string,

        //---------------
        //    Options
        //---------------

        // The root directory.
        root = option('root') || '.',

        // The build directory.
        build = option('build') || path.join(root, '..', 'build'),

        // The templates directory glob patterns.
        templates = (function() {
            var templates = option('templates');

            return (
                (isString(templates) ?
                    [templates] :
                    templates) ||
                ['**/templates']);
        }()),

        //----------------------
        //    Implementation
        //----------------------

        // Create a function that joins a directory to arbitrary path components which
        // may be specified as absolute paths but will be treated as relative paths.
        mkjoin = function(root) {
            return function() {
                return (
                    path.resolve(
                        apply(
                            path.join, path,
                            concat(
                                [root],
                                map(
                                    slice(arguments),
                                    function(component) {
                                        component = path.normalize(component);
                                        return (
                                            char(component, 0) === path.sep ?
                                                slice(component, 1) :
                                                component);
                                    })))));
            };
        },

        // Join with the root directory.
        rootJoin = mkjoin(root),

        // Join with the build directory.
        buildJoin = mkjoin(build),

        // Promise to resolve the js filename to the full path
        // of an existing js file.
        js = (function() {
            var // The cache of js lookups.
                cache = {};

            // Resolve the template filepath.
            return function(filename) {
                var error = function() {
                        return new Error(
                            'The js module "' +
                            filename +
                            '" could not be found');
                    },
                    find = function() {
                        var filepath = (
                                rootJoin(
                                    path.dirname(filename),
                                    path.basename(filename, '.js')) +
                                '.js');

                        return (
                            qfs.exists(filepath)
                            .then(function(exists) {
                                return (
                                    exists ?
                                        (qfs.stat(filepath)
                                        .then(function(stat) {
                                            return [exists, stat.isFile()];
                                        })) :
                                        [exists]);
                            })
                            .then(destructured(function(exists, isFile) {
                                if (exists && isFile) {
                                    cache[filename] = filepath;
                                    return filepath;
                                } else {
                                    cache[filename] = null;
                                    throw error();
                                }
                            })));
                    };

                return (
                    q.when(
                        has(cache, filename) ?
                            cache[filename] || q.reject(error()) :
                            (cache[filename] = find())));
            };
        }()),

        // Promise or synchronously resolve the template name to the
        // full path of an existing template file.
        template = (function() {
            var // The cache of template lookups.
                cache = {},

                // Resolve the template file path synchronously.
                sync = function(filename) {
                    var error = function() {
                            return new Error(
                                'The template "' +
                                filename +
                                '" could not be found');
                        };

                    if (!has(cache, filename)) {
                        any(
                            map(templates, function(pattern) {
                                return path.join(pattern, filename);
                            }),
                            function(pattern) {
                                return (
                                    any(
                                        glob.sync(pattern, {cwd: root, dot: false}),
                                        function(filepath) {
                                            filepath = rootJoin(filepath);
                                            if (fs.existsSync(filepath) &&
                                                fs.statSync(filepath).isFile()) {

                                                cache[filename] = filepath;
                                                return true;
                                            }
                                        }));
                            });
                    }
                    return (
                        cache[filename] ||
                        (function() {
                            throw error();
                        }()));
                },

                // Resolve the template file path asynchronously.
                async = function(filename) {
                    var error = function() {
                            return new Error(
                                'The template "' +
                                filename +
                                '" could not be found');
                        },
                        find = function() {
                            var found = q.defer();

                            (function loop(patterns) {
                                var // The pattern.
                                    pattern = patterns.length > 0 ? pop(patterns) : null,
                                    // The pending list of file checks.
                                    pending = new List(),
                                    // Stop the current glob search.
                                    stop = null,
                                    // Success and failure.
                                    succeed = function(filepath) {
                                        if (stop) {
                                            stop();
                                        }
                                        cache[filename] = filepath;
                                        found.resolve(filepath);
                                        throw new Error();
                                    },
                                    fail = function() {
                                        cache[filename] = null;
                                        found.reject(error());
                                    };

                                if (pattern === null) {
                                    fail();
                                } else {
                                    stop = (
                                        qglob.on(
                                            pattern,
                                            {cwd: root, dot: false},
                                            function(filepath) {
                                                if (filepath === null) {
                                                    (q.all(pending.toArray())
                                                    .then(function() {
                                                        loop(patterns);
                                                    }));
                                                } else {
                                                    filepath = rootJoin(filepath);
                                                    pending.push(
                                                        (q.all(pending.toArray())
                                                        .then(function() {
                                                            return (
                                                                qfs.exists(filepath)
                                                                .then(function(exists) {
                                                                    return (
                                                                        exists ?
                                                                            (qfs.stat(filepath)
                                                                            .then(function(stat) {
                                                                                return [exists, stat.isFile()];
                                                                            })) :
                                                                            [exists]);
                                                                })
                                                                .then(destructured(function(exists, isFile) {
                                                                    if (exists && isFile) {
                                                                        succeed(filepath);
                                                                    } else {
                                                                        pending.shift();
                                                                    }
                                                                })));
                                                        })));
                                                }
                                            }));
                                }
                            }(
                                reversed(
                                    map(templates, function(pattern) {
                                        return path.join(pattern, filename);
                                    }))));

                            return found.promise;
                        };

                    return (
                        q.when(
                            has(cache, filename) ?
                                cache[filename] || q.reject(error()) :
                                (cache[filename] = find())));
                };

            return extend(async, {sync: sync});
        }());

    //------------------
    //    Public API
    //------------------

    return {
        path: path,
        js: js,
        template: template,
        root: rootJoin,
        build: buildJoin
    };
};
