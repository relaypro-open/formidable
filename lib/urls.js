'use strict';

module.exports = function(option, path) {

    var //---------------
        //    Imports
        //---------------

        q = require('rw-mercenary/promises'),
        lang = require('rw-mercenary/lang'),
        partial = lang.partial,
        invoke = lang.invoke,
        compose = lang.compose,
        destructure = lang.destructure,
        destructured = lang.destructured,
        each = lang.each,
        len = lang.len,
        has = lang.has,
        push = lang.push,
        concat = lang.concat,
        split = lang.split,
        join = lang.join,
        match = lang.match,
        isArray = lang.is.array,
        isDefined = lang.is.def,
        isString = lang.is.string,

        //----------------------
        //    Implementation
        //----------------------

        // The registry of named URL patterns.
        registry = {},

        // Create a URL resolver for the URL data. In the URL's pattern, required parameters are
        // specified with a :name syntax in the path or query string. Optional parameters
        // are specified with a ::name syntax in the path or query string, e.g.
        // '/articles/:topic/?ordering=::ordering'. Any missing optional parameters will be
        // excluded from the path or query string by the resolver.
        resolver = function(url) {
            var // Resolve an individual term with respect to the given parameters. If the term
                // is not a parameter, returns it. If it is a parameter, returns its resolved value
                // or undefined if the parameter is missing and not required.
                resolve = function(term, values) {
                    var matched = match(/^\:(\:)?(.+)$/, term),
                        name = matched && matched[2],
                        required = matched && !matched[1];

                    if (matched) {
                        if (required && !has(values, name)) {
                            throw new Error(
                                'The required parameter "' +
                                name +
                                '" for the URL pattern "' +
                                url.name +
                                '" is missing');
                        }
                        return values[name];
                    } else {
                        return term;
                    }
                };

            return function(values) {
                return destructure(split(url.pattern, '?'), function(pathPattern, queryPattern) {
                    var path = [],
                        query = [];

                    each(split(pathPattern || '', '/'), function(term) {
                        var resolved = resolve(term, values);

                        if (isDefined(resolved)) {
                            push(path, resolved);
                        }
                    });
                    each(split(queryPattern || '', '&'), function(assignment) {
                        if (assignment) {
                            destructure(split(assignment, '='), function(name, term) {
                                var resolved = resolve(term, values);

                                if (isDefined(resolved)) {
                                    push(query, name + '=' + encodeURIComponent(resolved));
                                }
                            });
                        }
                    });
                    return (
                        join(path, '/') +
                        (len(query) ?
                            ('?' + join(query, '&')) :
                            ''));
                });
            };
        },

        // Extend a URL pattern with URL patterns from another module.
        include = function(name) {
            return (
                // Resolve the top-level URL patterns promise.
                path.js(name)
                .then(compose(q.when, require))
                // Resolve the nested URL patterns.
                .then(q.all)
                // Flatten the nested URL patterns.
                .then(partial(invoke, concat))
                // Resolve the URL patterns.
                .then(q.all));
        },

        // Create a URL pattern.
        url = function(pattern, viewOrUrls, name) {
            return (
                q.all([pattern, viewOrUrls, name])
                .then(destructured(function(pattern, viewOrUrls, name) {
                    if (isArray(viewOrUrls)) {
                        if (name || isString(name)) {
                            throw new Error(
                                'The URL pattern "' +
                                pattern +
                                '" includes other URL patterns and must not be named');
                        }
                        // Update the patterns.
                        each(viewOrUrls, function(url) {
                            url.pattern = pattern + url.pattern;
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
                            view: viewOrUrls
                        };
                        return [registry[name]];
                    }
                })));
        },

        // Resolve a URL from a named URL pattern and an object of parameter values.
        resolve = function(name, values) {
            if (!has(registry, name)) {
                throw new Error(
                    'Unknown URL pattern "' +
                    name +
                    '"');
            }
            return (
                resolver(registry[name])(
                    values || {}));
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
