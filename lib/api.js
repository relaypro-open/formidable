'use strict';

module.exports = function() {
    var //---------------
        //    Imports
        //---------------

        lang = require('mercenary/lang'),
        partial = lang.partial,
        extend = lang.extend,
        get = lang.get,
        set = lang.set,

        //----------------------
        //    Implementation
        //----------------------

        // The api registry.
        registry = {},

        // Register an api.
        register = function(name, api) {
            return set(registry, name, api);
        };

    //------------------
    //    Public API
    //------------------

    return (
        extend(
            partial(get, registry),
            {register: register}));
};
