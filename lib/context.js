'use strict';

module.exports = function(option) {
    var //---------------
        //    Imports
        //---------------

        q = require('q'),
        lang = require('mercenary').lang,
        undef = lang.undef,
        apply = lang.apply,
        concat = lang.concat,
        slice = lang.slice,
        merge = lang.merge;

    //------------------
    //    Public API
    //------------------

    // Promises a deep copy of the default context with an arbitrary number of
    // objects mixed in. All arguments may be promises.
    return function() {
        return (
            q.all(slice(arguments))
            .then(function(contexts) {
                return (
                    apply(
                        merge, undef,
                        concat(
                            [{}, option('context') || {}],
                            contexts)));
            }));
    };
};
