'use strict';

module.exports = function(option) {
    var //---------------
        //    Imports
        //---------------

        q = require('rw-mercenary/promises'),
        lang = require('rw-mercenary/lang'),
        partial = lang.partial,
        invoke = lang.invoke,
        extend = lang.extend,
        slice = lang.slice,
        merge = lang.merge,
        object = lang.object,

        //----------------------
        //    Implementation
        //----------------------

        // Promises a deep copy of the default context with an arbitrary number of
        // objects mixed in. All arguments may be promises.
        context = function() {
            return (
                q.all(slice(arguments))
                .then(partial(invoke, merge, {}, option('context') || {})));
        },

        // Promises to extend a promise for data under the configured meta key.
        meta = function(promise, data) {
            return (
                q.when(promise)
                .then(function(resolved) {
                    return (
                        extend(
                            {},
                            resolved,
                            object([
                                [option('meta') || 'meta', data || {}]
                            ])));
                }));
        };

    //------------------
    //    Public API
    //------------------

    return extend(context, {
        meta: meta
    });
};
