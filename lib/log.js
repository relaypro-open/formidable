'use strict';

module.exports = function(option) {

    var //---------------
        //    Imports
        //---------------

        lang = require('rw-mercenary/lang'),
        last = lang.last,
        slice = lang.slice,
        join = lang.join,
        isNumber = lang.is.number,

        //----------------------
        //    Implementation
        //----------------------

        info = option('log', 'info') || function(message) {
            console.log(message);
        },
        warn = option('log', 'warn') || function(message) {
            console.warn(message);
        },
        fail = option('log', 'fail') || function(message, code) {
            console.error(message);
            process.exit(code);
        };

    //------------------
    //    Public API
    //------------------

    return {
        info: function() {
            info(join(slice(arguments), ' '));
        },
        warn: function() {
            warn(join(slice(arguments), ' '));
        },
        fail: function() {
            var args = slice(arguments),
                hasCode = isNumber(last(args));

            fail(
                join(
                    hasCode ?
                        slice(args, 0, -1) :
                        args,
                    ' '),
                (hasCode && last(args)) || 1);
        }
    };
};
