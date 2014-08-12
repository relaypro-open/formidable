'use strict';

module.exports = function(option, path) {

    var //---------------
        //    Imports
        //---------------

        lang = require('mercenary').lang,
        each = lang.each,
        has = lang.has,
        push = lang.push,
        concat = lang.concat,
        replace = lang.replace,
        match = lang.match,
        isArray = lang.is.array,
        isString = lang.is.string,

        //----------------------
        //    Implementation
        //----------------------

        // The registry of named URL patterns.
        registry = {},

        // Parse the URL pattern parameters.
        rxParams = /:([^/]+)/g,
        params = function(pattern) {
            var next = function() {
                    var matched = match(rxParams, pattern);

                    return matched && matched[1];
                },
                unique = {},
                params = [],
                param = next();

            while (param) {
                if (has(unique, param)) {
                    throw new Error(
                        'Parameter names are not unique in the URL pattern: ' +
                        pattern);
                }
                unique[param] = true;
                push(params, param);
                param = next();
            }
            return params;
        },

        // Extend a URL pattern with URL patterns from another module.
        include = function(name) {
            return require(path.js(name));
        },

        // Create a URL pattern.
        url = function(pattern, viewOrUrls, name) {
            if (isArray(viewOrUrls)) {
                if (isString(name)) {
                    throw new Error(
                        'The URL pattern "' +
                        pattern +
                        '" includes other URL patterns and must not be named');
                }
                // Update the patterns.
                each(viewOrUrls, function(url) {
                    url.pattern = pattern + url.pattern;
                    url.params = params(url.pattern);
                });
                return viewOrUrls;
            } else {
                if (!isString(name)) {
                    throw new Error(
                        'The URL pattern "' +
                        pattern +
                        '" requires a name');
                }
                if (has(registry, name)) {
                    throw new Error(
                        'A URL pattern with the name "' +
                        name +
                        '" already exists');
                }
                // Register this pattern.
                registry[name] = {
                    name: name,
                    pattern: pattern,
                    params: params(pattern),
                    view: viewOrUrls
                };
                return [registry[name]];
            }
        },

        // Resolve a URL from a named URL pattern and an object of parameters.
        resolve = function(name, params) {
            params = params || {};
            if (!has(registry, name)) {
                throw new Error(
                    'Unknown URL pattern "' +
                    name +
                    '"');
            }
            return replace(registry[name].pattern, rxParams, function(matched, param) {
                if (!has(params, param)) {
                    throw new Error(
                        'The parameter "' +
                        param +
                        '" was not specified for the URL pattern "' +
                        registry[name].pattern +
                        '"');
                }
                return params[param];
            });
        };

    //------------------
    //    Public API
    //------------------

    return {
        url: url,
        include: include,
        resolve: resolve
    };
};
