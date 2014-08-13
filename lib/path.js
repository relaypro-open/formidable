'use strict';

module.exports = function(option) {

    var //---------------
        //    Imports
        //---------------

        List = require('collections/list'),
        fs = require('q-io/fs'),
        glob = require('./utils/glob'),
        path = require('path'),
        q = require('q'),
        lang = require('mercenary').lang,
        apply = lang.apply,
        destructured = lang.destructured,
        slice = lang.slice,
        any = lang.any,
        map = lang.map,
        concat = lang.concat,
        char = lang.char,

        //---------------
        //    Options
        //---------------

        // The root directory.
        root = option('root') || '.',

        // The build directory.
        build = option('build') || path.join(root, '..', 'build'),

        // The templates directory glob patterns.
        templates = (
            concat(
                option('templates') || [],
                ['**/templates'])),

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

        // Resolve the filename to the full path of a JavaScript file.
        js = function(filename) {
            return (
                rootJoin(
                    path.dirname(filename),
                    path.basename(filename, '.js')) +
                '.js');
        },

        // Resolve the template name to the full path of an existing template file.
        template = function(filename) {
            var found = q.defer(),
                loop = function(patterns, i) {
                    var // A function to cancel the current glob search.
                        cancel = null,
                        // The pending list of file checks.
                        pending = new List();

                    // Any remaining patterns to check?
                    if (i < patterns.length) {

                        // Check this pattern.
                        cancel = (
                            glob.on(
                                patterns[i],
                                {cwd: root, dot: false},
                                function(filepath) {
                                    // Last matched file path?
                                    if (filepath === null) {
                                        // Wait for pending file checks to continue with the
                                        // next pattern.
                                        (q.all(pending.toArray())
                                        .then(function() {
                                            loop(patterns, i + 1);
                                        }));
                                    } else {
                                        pending.push(
                                            // Wait for pending file checks before
                                            // performing more.
                                            (q.all(pending.toArray())
                                            .then(function() {
                                                return (
                                                    q.all([
                                                        fs.exists(filepath),
                                                        fs.stat(filepath)
                                                    ])
                                                    .then(destructured(function(exists, stat) {
                                                        if (exists && stat.isFile()) {
                                                            // Cancel the glob search, resolve
                                                            // the promise and throw an error
                                                            // to cancel subsequent file checks.
                                                            cancel();
                                                            found.resolve(filepath);
                                                            throw new Error();
                                                        } else {
                                                            // Subsequent file checks will no
                                                            // longer need to wait for this
                                                            // promise to resolve.
                                                            pending.shift();
                                                        }
                                                    })));
                                            })));
                                    }
                                }));
                    } else {
                        // No patterns left, so we've found nothing.
                        found.resolve(null);
                    }
                };

            // Loop over the template patterns with the filename appended.
            loop(
                map(templates, function(pattern) {
                    return path.join(pattern, filename);
                }),
                0);

            return found.promise;
        };

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
