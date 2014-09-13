'use strict';

module.exports = function() {
    var //---------------
        //    Imports
        //---------------

        lang = require('rw-mercenary/lang'),
        partial = lang.partial,
        push = lang.push,
        get = lang.get,
        set = lang.set,

        //----------------------
        //    Implementation
        //----------------------

        // The middleware registry.
        registry = {
            pre: {
                build: []
            },
            post: {
                build: []
            }
        },

        // Register pre-build middleware.
        registerPreBuild = function(fn) {
            var middleware = get(registry, 'pre', 'build');

            push(middleware, fn);
            set(registry, 'pre', 'build', middleware);
        },

        // Register post-build middleware.
        registerPostBuild = function(fn) {
            var middleware = get(registry, 'post', 'build');

            push(middleware, fn);
            set(registry, 'post', 'build', middleware);
        };

    //------------------
    //    Public API
    //------------------

    return {
        register: {
            pre: {
                build: registerPreBuild
            },
            post: {
                build: registerPostBuild
            }
        },
        get: {
            pre: {
                build: partial(get, registry, 'pre', 'build')
            },
            post: {
                build: partial(get, registry, 'post', 'build')
            }
        }
    };
};
