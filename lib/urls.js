'use strict';

module.exports = function(option, path) {

    var //---------------
        //    Imports
        //---------------

        q = require('mercenary/promises'),
        lang = require('mercenary/lang'),
        invoke = lang.invoke,
        destructured = lang.destructured,
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
            return (
                // Resolve the top-level URL patterns promise.
                (path.js(name)
                .then(function(urls) {
                    return q.when(require(urls));
                }))
                // Resolve the nested URL patterns.
                .then(q.all)
                // Flatten the nested URL patterns.
                .then(function(entries) {
                    return invoke(concat, entries);
                })
                // Resolve the URL patterns.
                .then(q.all));
        },

        // Create a URL pattern.
        url = function(pattern, viewOrUrls, name) {
            return (
                q.all([pattern, viewOrUrls, name])
                .then(destructured(function(pattern, viewOrUrls, name) {
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
                })));
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
            return (
                replace(
                    registry[name].pattern,
                    rxParams,
                    function(matched, param) {
                        if (!has(params, param)) {
                            throw new Error(
                                'The parameter "' +
                                param +
                                '" was not specified for the URL pattern "' +
                                registry[name].name +
                                '"');
                        }
                        return params[param];
                    }));
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
