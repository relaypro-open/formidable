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
        registry = {};

    //------------------
    //    Public API
    //------------------

    return (
        extend(
            partial(get, registry),
            {
                register: partial(set, registry)
            }));
};
