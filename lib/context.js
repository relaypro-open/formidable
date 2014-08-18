'use strict';

module.exports = function(option) {
    var //---------------
        //    Imports
        //---------------

        q = require('q'),
        lang = require('mercenary').lang,
        undef = lang.undef,
        apply = lang.apply,
        extend = lang.extend,
        concat = lang.concat,
        slice = lang.slice,
        merge = lang.merge,
        object = lang.object,

        //----------------------
        //    Implementation
        //----------------------

        // The default context.
        defaultContext = option('context') || {},

        // The context key for metadata.
        metaKey = option('meta') || 'meta',

        // Promises a deep copy of the default context with an arbitrary number of
        // objects mixed in. All arguments may be promises.
        context = function() {
            return (
                q.all(slice(arguments))
                .then(function(contexts) {
                    return (
                        apply(
                            merge, undef,
                            concat(
                                [{}, defaultContext],
                                contexts)));
                }));
        },

        // Promises to extend a promise for data under the configured meta key.
        meta = function(promised, data) {
            return (
                q.when(promised)
                .then(function(resolved) {
                    return extend({}, resolved, object([[metaKey, data || {}]]));
                }));
        };

    //------------------
    //    Public API
    //------------------

    return extend(context, {
        meta: meta
    });
};
