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

        base = option('base') || '.',
        templates = (
            concat(
                option('templates') || [],
                ['**/templates'])),

        //----------------------
        //    Implementation
        //----------------------

        // Join the base directory to other paths whose components may be specified as
        // absolute paths that will be treated as relative paths.
        join = function() {
            return (
                path.resolve(
                    apply(
                        path.join, path,
                        concat(
                            [base],
                            map(
                                slice(arguments),
                                function(part) {
                                    return (
                                        char(part, 0) === path.sep ?
                                            slice(part, 1) :
                                            part);
                                })))));
        },

        // Resolve the filename to the full path of a JavaScript file.
        js = function(filename) {
            return (
                join(
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
                            glob.sync(pattern, {cwd: base, dot: false}),
                            function(filepath) {
                                filepath = join(filepath);
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
        js: js,
        template: template
    };
};
