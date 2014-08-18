'use strict';

var //---------------
    //    Imports
    //---------------

    path = require('path'),
    q = require('q'),
    lang = require('mercenary').lang,
    partial = lang.partial,
    has = lang.has,
    all = lang.all,
    extend = lang.extend,
    split = lang.split,
    isUndefined = lang.is.undef,
    isAbsent = lang.is.absent,

    //----------------------
    //    Implementation
    //----------------------

    // A map from settings module file paths to formidable instances.
    cache = {},

    // The default formidable settings module file path.
    defaultPath = process.env.FORMIDABLE_SETTINGS_MODULE,

    // Configure the default settings module file path.
    configure = function(settingsPath) {
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
                'must be passed to formidable/settings::load()');
        }
        if (has(cache, normalPath) && settings) {
            throw new Error(
                'A formidable instance for the settings module file path "' +
                + normalPath +
                '" already exists, so a new instance for the given settings ' +
                'cannot be created.');
        }
        return (
            cache[normalPath] ||
            (cache[normalPath] = instantiate(settings || require(normalPath))));
    },

    // Instantiate a formidable instance from settings.
    instantiate = function(options) {
        var // Resolve the value of a dotted-path option name.
            option = function(name) {
                var value = options;

                all(split(name || ''), function(key) {
                    value = value && value[key];
                    return !isAbsent(value);
                });
                return value;
            },
            log = require('./lib/log')(option),
            context = require('./lib/context')(option),
            path = require('./lib/path')(option),
            urls = require('./lib/urls')(option, path),
            template = require('./lib/templating/' + (option('templating') || 'swig'))(option, path, urls),
            build = require('./lib/build')(option, log, path, urls, template);

        if (option('debug')) {
            // Debug promise resolution stacks.
            q.longStackSupport === true;
        }
        return extend(build, {
            q: q,
            context: context,
            path: path,
            urls: urls,
            template: template
        });
    };

//------------------
//    Public API
//------------------

module.exports = {
    configure: configure,
    load: load
};
