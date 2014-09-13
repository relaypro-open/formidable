'use strict';

module.exports = function(option) {

    var //---------------
        //    Imports
        //---------------

        List = require('collections/list'),
        fs = require('fs'),
        qfs = require('q-io/fs'),
        glob = require('glob'),
        qglob = require('./utils/qglob'),
        path = require('path'),
        q = require('rw-mercenary/promises'),
        lang = require('rw-mercenary/lang'),
        apply = lang.apply,
        destructured = lang.destructured,
        each = lang.each,
        any = lang.any,
        map = lang.map,
        pop = lang.pop,
        slice = lang.slice,
        has = lang.has,
        extend = lang.extend,
        len = lang.len,
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
                            root,
                            map(slice(arguments), function(component) {
                                component = path.normalize(component);
                                return (
                                    char(component, 0) === path.sep ?
                                        slice(component, 1) :
                                        component);
                            }))));
            };
        },

        // Join with the root directory.
        rootJoin = mkjoin(root),

        // Join with the build directory.
        buildJoin = mkjoin(build),

        // Promise or synchronously resolve the js filename to the full path of an existing
        // js file, import a js file or clear the require() cache of any resolved filenames.
        js = (function() {
            var // The cache of js lookups.
                cache = {},

                // Resolve the js file path synchronously.
                sync = function(filename) {
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
                                        path.basename(filename, '.js')));

                            cache[filename] = (
                                fs.existsSync(filepath + '.js') &&
                                fs.statSync(filepath + '.js').isFile() ?
                                    filepath :
                                    null);
                        };

                    if (!has(cache, filename)) {
                        find();
                    }
                    return (
                        cache[filename] ||
                        (function() {
                            throw error();
                        }()));
                },

                // Resolve the js file path asynchronously.
                async = function(filename) {
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
                                        path.basename(filename, '.js')));

                            return (
                                qfs.exists(filepath + '.js')
                                .then(function(exists) {
                                    return (
                                        exists ?
                                            (qfs.stat(filepath + '.js')
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
                },

                // Import a js file with require(). Unless forceLocal is specified, first attempt
                // to import the given module name directly with require(). Next, attempt to
                // import the module name resolved by js.sync() with require().
                req = function(name, forceLocal) {
                    if (!forceLocal) {
                        try {
                            return require(name);
                        } catch (error) {}
                    }
                    return require(sync(name));
                },

                // Clear the require() cache of any resolved js filenames.
                clear = function() {
                    each(cache, function(filepath) {
                        if (isString(filepath)) {
                            delete require.cache[filepath + '.js'];
                        }
                    });
                    cache = {};
                };

            // The js resolution API.
            return (
                extend(async, {
                    sync: sync,
                    require: req,
                    clear: clear
                }));
        }()),

        // Promise or synchronously resolve the template name to the
        // full path of an existing template file.
        template = (function() {
            var // The cache of resolved template file paths.
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
                        if (!any(
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
                                })) {
                            cache[filename] = null;
                        }
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
                                    pattern = len(patterns) ? pop(patterns) : null,
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
                            }(reversed(map(templates, function(pattern) {
                                return path.join(pattern, filename);
                            }))));

                            return found.promise;
                        };

                    return (
                        q.when(
                            has(cache, filename) ?
                                cache[filename] || q.reject(error()) :
                                (cache[filename] = find())));
                },

                // Clear the cache of any resolved template file paths.
                clear = function() {
                    cache = {};
                };

            // The template resolution API.
            return (
                extend(
                    async, {
                        sync: sync,
                        clear: clear
                    }));
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
