'use strict';

module.exports = function(option, path, urls) {

    var //---------------
        //    Imports
        //---------------

        fs = require('fs'),
        swig = require('swig'),
        lang = require('mercenary').lang,
        each = lang.each,
        isString = lang.is.string,

        //----------------------
        //    Implementation
        //----------------------

        // Resolve a template.
        resolve = function(to) {
            return to;
        },

        // Load a template.
        load = function(filename) {
            return (
                fs.readFileSync(
                    path.template(filename),
                    'utf8'));
        },

        // Render a template with the given context.
        render = function(template, context) {
            if (!template) {
                throw new Error('render() requires a template value');
            }
            return (
                swig.render(
                    load(template),
                    {
                        filename: template,
                        locals: context || {}
                    }));
        },

        // Load a filter.
        loadFilter = function(filter, name) {
            if (isString(filter)) {
                filter = require(filter);
            }
            swig.setFilter(name, filter);
        },

        // Load a tag.
        loadTag = function(tag, name) {
            if (isString(tag)) {
                tag = require(tag);
            }
            swig.setTag(name, tag.parse, tag.compile, tag.ends, tag.blockLevel);
        },

        // Load an extension.
        loadExtension = function(extension, name) {
            if (isString(extension)) {
                extension = require(extension);
            }
            swig.setExtension(name, extension);
        },

        // The custom filters, tags and extensions defined here.
        filters = {},
        tags = {
            'url': require('./swig/tags/url')(urls)
        },
        extensions = {
            'formidable': require('./swig/extensions/formidable')(path, urls)
        };

    // Configure swig.
    swig.setDefaults({
        cache: false,
        loader: {
            resolve: resolve,
            load: load
        }
    });

    // Load custom filters, tags and extensions.
    each(filters, loadFilter);
    each(tags, loadTag);
    each(extensions, loadExtension);

    // Load filters, tags and extensions and from settings.
    each(option('swig.filters') || {}, loadFilter);
    each(option('swig.tags') || {}, loadTag);
    each(option('swig.extensions') || {}, loadExtension);

    //------------------
    //    Public API
    //------------------

    return {
        engine: swig,
        render: render
    };
};
