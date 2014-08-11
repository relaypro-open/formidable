'use strict';

module.exports = function(base) {

    var //---------------
        //    Imports
        //---------------

        fs = require('fs'),
        path = require('path'),
        lang = require('mercenary').lang,
        undef = lang.undef,
        apply = lang.apply,
        slice = lang.slice,
        each = lang.each,
        any = lang.any,
        map = lang.map,
        filter = lang.filter,
        concat = lang.concat,
        push = lang.push,
        pop = lang.pop,
        char = lang.char,

        //----------------------
        //    Implementation
        //----------------------

        // Join the base directory to arrays of other paths path whose components
        // may be specified as absolute paths that will be treated as relative paths.
        join = function() {
            return (
                path.normalize(
                    apply(
                        path.join, path,
                        concat(
                            [base],
                            map(
                                apply(concat, undef, slice(arguments)),
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
                join([
                    path.dirname(filename),
                    path.basename(filename, '.js')
                ]) +
                '.js');
        },

        // Resolve the template name to the full path of an existing template file.
        template = function(filename) {
            var // Does the filename exist under the given directory?
                resolve = function(directories) {
                    var filepath = join(directories, ['templates', filename]);
                    if (fs.existsSync(filepath)) {
                        return filepath;
                    }
                },
                // Iterate over subdirectories to search for the filename.
                find = function(directories) {
                    var found = resolve(directories);

                    if (!found) {
                        any(
                            filter(
                                fs.readdirSync(join(directories)),
                                function(part) {
                                    return (
                                        char(part, 0) !== '.' &&
                                        part !== 'templates' &&
                                        fs.lstatSync(join(directories, [part]))
                                            .isDirectory());
                                }),
                            function(subdirectory) {
                                push(directories, subdirectory);
                                found = find(directories);
                                pop(directories);
                                return found;
                            });
                    }
                    return found;
                };

            return find([]);
        };

    //------------------
    //    Public API
    //------------------

    return {
        js: js,
        template: template
    };
};
