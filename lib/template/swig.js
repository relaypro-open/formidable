'use strict';

module.exports = function(option, path) {

    var //---------------
        //    Imports
        //---------------

        fs = require('fs'),
        swig = require('swig'),

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
        };

    // Configure swig.
    swig.setDefaults({
        cache: false,
        loader: {
            resolve: resolve,
            load: load
        }
    });

    //------------------
    //    Public API
    //------------------

    return {
        render: render
    };
};
