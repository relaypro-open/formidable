'use strict';

module.exports = function(option) {

    var //---------------
        //    Imports
        //---------------

        fs = require('fs'),
        glob = require('glob'),
        path = require('path'),
        lang = require('mercenary').lang,
        apply = lang.apply,
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
            var found;

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
                                if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
                                    found = filepath;
                                    return true;
                                }
                            }));
                });
            return found;
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
