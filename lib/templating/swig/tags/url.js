'use strict';

module.exports = function() {

    var //---------------
        //    Imports
        //---------------

        lang = require('mercenary/lang'),
        constant = lang.constant,
        destructure = lang.destructure,
        destructured = lang.destructured,
        map = lang.map,
        last = lang.last,
        push = lang.push,
        pop = lang.pop,
        join = lang.join,

        //----------------------
        //    Implementation
        //----------------------

        parse = function(string, line, parser, types) {
            var error = function(token) {
                    throw new Error(
                        'Unexpected token "' +
                        token.match +
                        '" in {% url %} tag on line ' +
                        parser.line +
                        ' in file ' +
                        parser.filename +
                        '.');
                },
                states = {
                    name: 'name',
                    key: 'key',
                    assignment: 'assignment',
                    value: 'value'
                },
                state = states.name,
                params = [],
                key;

            parser.on(types.WHITESPACE, constant(true));

            parser.on(types.STRING, function(token) {
                if (state === states.name) {
                    state = states.key;
                    return true;
                } else if (state === states.key) {
                    key = token.match;
                    state = states.assignment;
                } else if (state === states.value) {
                    push(params, [key, token.match]);
                    state = states.key;
                } else {
                    error(token);
                }
            });

            parser.on(types.NUMBER, function(token) {
                if (state === states.value) {
                    push(params, [key, token.match]);
                    state = states.key;
                } else {
                    error(token);
                }
            });

            parser.on(types.VAR, function(token) {
                if (state === states.name) {
                    state = states.key;
                    return true;
                } else if (state === states.key) {
                    key = '\'' + token.match + '\'';
                    state = states.assignment;
                } else if (state === states.value) {
                    this.parseVar(token, token.match, last(this.state) || null);
                    push(params, [key, pop(this.out)]);
                    state = states.key;
                } else {
                    error(token);
                }
            });

            parser.on(types.ASSIGNMENT, function(token) {
                if (state === states.assignment) {
                    state = states.value;
                } else {
                    error(token);
                }
            });

            parser.on('*', function(token) {
                error(token);
            });

            parser.on('end', function() {
                if (state !== states.key) {
                    throw new Error(
                        'Unexpected closure of the {% url %} tag on line ' +
                        parser.line +
                        ' in file ' +
                        parser.filename +
                        '.');
                }
                push(this.out, params);
                return true;
            });

            return true;
        },

        compile = function(compiler, args) {
            return destructure(args, function(name, params) {
                return (
                    '(function() {' +
                        'var params = {};' +
                        join(
                            map(
                                params || [],
                                destructured(function(key, value) {
                                    return (
                                        'params[' +
                                        key +
                                        '] = ' +
                                        value +
                                        ';');
                                })),
                            '') +
                        '_output += ' +
                            '_ext.formidable.urls.resolve(' +
                                name +
                                ', params);' +
                    '}());');
            });
        };

    //------------------
    //    Public API
    //------------------

    return {
        parse: parse,
        compile: compile
    };
};
