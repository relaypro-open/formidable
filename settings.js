'use strict';

var //---------------
    //    Imports
    //---------------

    path = require('path'),
    q = require('mercenary/promises').q,
    lang = require('mercenary/lang'),
    partial = lang.partial,
    destructured = lang.destructured,
    has = lang.has,
    each = lang.each,
    extend = lang.extend,
    items = lang.items,
    get = lang.get,
    isUndefined = lang.is.undef,

    //----------------------
    //    Implementation
    //----------------------

    // A map from settings module file paths to formidable instances.
    cache = {},

    // The default formidable settings module file path.
    defaultPath = process.env.FORMIDABLE_SETTINGS_MODULE,

    // Reset the require() cache for formidable and for any paths resolved with the path library.
    reset = function() {
        var path = cache[defaultPath] && cache[defaultPath].path;

        delete require.cache[path.join(__dirname, 'formidable.js')];
        if (path) {
            path.js.clear();
            path.template.clear();
        }
    },

    // Configure the default settings module file path.
    configure = function(settingsPath) {
        reset();
        defaultPath = path.resolve(settingsPath);
        return {
            load: partial(load, defaultPath)
        };
    },

    // Load the formidable instance identified by the settings module file path.
    // Optionally accepts a settings object as the second parameter, which
    // will be used instead of an on-disk module to instantiate the formidable
    // instance. For the latter case, the settings path serves as a key for the
    // formidable instance in subsequent calls to load().
    load = function(settingsPath, settings) {
        var normalPath = (
                (settingsPath || defaultPath) &&
                path.resolve(settingsPath || defaultPath));

        if (isUndefined(normalPath)) {
            throw new Error(
                'Either the FORMIDABLE_SETTINGS_MODULE environment variable ' +
                'must be set to the settings module file path, or a path ' +
                'must be passed to formidable/settings.load()');
        }
        if (has(cache, normalPath) && settings) {
            throw new Error(
                'A formidable instance for the settings module file path "' +
                normalPath +
                '" already exists, so a new instance for the given settings ' +
                'cannot be created.');
        }
        return (
            cache[normalPath] ||
            instantiate(
                normalPath,
                settings || require(normalPath)));
    },

    // Instantiate and cache a formidable instance from the given options.
    instantiate = function(id, options) {
        var option = partial(get, options),
            log = require('./lib/log')(option),
            path = require('./lib/path')(option),
            context = require('./lib/context')(option),
            api = require('./lib/api')(option),
            middleware = require('./lib/middleware')(option),
            urls = require('./lib/urls')(option, path),
            template = require('./lib/templating/' + (option('templating') || 'swig'))(option, path, urls),
            plugins = option('plugins') || [],
            build = (
                extend(
                    require('./lib/build')(option, log, path, context, middleware, urls, template),
                    {
                        q: q,
                        log: log,
                        path: path,
                        context: context,
                        api: api,
                        middleware: middleware,
                        urls: urls,
                        template: template,
                        option: option
                    }));

        // Debug?
        if (option('debug')) {
            q.longStackSupport = true;
        }

        // Cache the build API so that it's immediately available for import
        // with require('formidable').
        cache[id] = build;

        // Load any plugins.
        each(items(plugins), destructured(function(name, options) {
            path.js.require(name)(build, partial(get, options));
        }));

        return build;
    };

//------------------
//    Public API
//------------------

module.exports = {
    reset: reset,
    configure: configure,
    load: load
};
