'use strict';

module.exports = function(option, path, urls) {

    var //---------------
        //    Imports
        //---------------

        fs = require('fs'),
        qfs = require('q-io/fs'),
        swig = require('swig'),
        q = require('mercenary/promises'),
        lang = require('mercenary/lang'),
        partial = lang.partial,
        bound = lang.bound,
        destructured = lang.destructured,
        each = lang.each,
        isString = lang.is.string,

        //----------------------
        //    Implementation
        //----------------------

        // Resolve a template.
        resolve = function(to) {
            return to;
        },

        // Promise to load a template's content, optionally invoking
        // a Node-style callback.
        loadAsync = function(filename, done) {
            return (
                path.template(filename)
                .then(bound(qfs, 'read'))
                .then(
                    done && partial(done, null),
                    done));
        },

        // Synchronously load a template's content.
        loadSync = function(filename) {
            return (
                fs.readFileSync(
                    path.template.sync(filename),
                    {encoding: 'utf8'}));
        },

        // Load a template's content. If a done callback is specified, the
        // template's content will be loaded asynchronously.
        load = function(filename, done) {
            return (done ? loadAsync : loadSync)(filename, done);
        },

        // Promise to render a template with the given context. The buildname argument specifies
        // the absolute path to the output file that will be generated. This will be passed through
        // to the swig rendering options data so that template tags can access it if desired.
        render = function(template, context, buildname) {
            if (!template) {
                throw new Error('render() requires a template value');
            }
            return (
                q.all([loadAsync(template), context])
                .then(destructured(function(source, context) {
                    return (
                        swig.render(
                            source,
                            {
                                filename: template,
                                locals: context || {},
                                buildname: buildname
                            }));
                })));
        },

        // Load a filter.
        loadFilter = function(name, filter) {
            if (isString(filter)) {
                filter = path.js.require(filter);
            }
            swig.setFilter(name, filter);
        },

        // Load a tag.
        loadTag = function(name, tag) {
            if (isString(tag)) {
                tag = path.js.require(tag);
            }
            swig.setTag(name, tag.parse, tag.compile, tag.ends, tag.blockLevel);
        },

        // Load an extension.
        loadExtension = function(name, extension) {
            if (isString(extension)) {
                extension = path.js.require(extension);
            }
            swig.setExtension(name, extension);
        };

    // Configure swig.
    swig.setDefaults({
        cache: false,
        loader: {
            resolve: resolve,
            load: load
        }
    });

    // Load formidable's custom filters, tags and extensions.
    each(
        {},
        function(filter, name) {
            loadFilter(name, filter);
        });
    each(
        {'url': require('./swig/tags/url')()},
        function(tag, name) {
            loadTag(name, tag);
        });
    each(
        {'formidable': require('./swig/extensions/formidable')(path, urls)},
        function(extension, name) {
            loadExtension(name, extension);
        });

    // Load filters, tags and extensions from settings.
    each(
        option('swig', 'filters') || {},
        function(filter, name) {
            loadFilter(name, filter);
        });
    each(
        option('swig', 'tags') || {},
        function(tag, name) {
            loadTag(name, tag);
        });
    each(
        option('swig', 'extensions') || {},
        function(extension, name) {
            loadExtension(name, extension);
        });

    //------------------
    //    Public API
    //------------------

    return {
        engine: swig,
        render: render,
        load: {
            filter: loadFilter,
            tag: loadTag,
            extension: loadExtension
        }
    };
};
