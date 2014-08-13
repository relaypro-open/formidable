'use strict';

module.exports = function(urls) {

    var //---------------
        //    Imports
        //---------------

        lang = require('mercenary').lang,
        constant = lang.constant,
        map = lang.map,
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
                    value: 'value',
                    next: 'next'
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
                    state = states.assignment;
                    key = token.match;
                } else if (state === states.value) {
                    state = states.next;
                    push(params, [key, token.match]);
                } else {
                    error(token);
                }
            });

            parser.on(types.NUMBER, function(token) {
                if (state === states.value) {
                    state = states.next;
                    push(params, [key, token.match]);
                } else {
                    error(token);
                }
            });

            parser.on(types.VAR, function(token) {
                if (state === states.name) {
                    state = states.key
                    return true;
                } else if (state === states.key) {
                    state = states.assignment;
                    key = '\'' + token.match + '\'';
                } else if (state === states.value) {
                    state = states.next;
                    this.parseVar(token, token.match, this.state[this.state.length - 1] || null);
                    push(params, [key, pop(this.out)]);
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

            parser.on(types.COMMA, function(token) {
                if (state === states.next) {
                    state = states.key;
                } else {
                    error(token);
                }
            });

            parser.on('*', function(token) {
                error(token);
            });

            parser.on('end', function() {
                if (!(state === states.key || state === states.next)) {
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
            var name = args[0],
                params = args[1];

            return (
                '(function() {' +
                    'var params = {};' +
                    join(
                        map(
                            params || [],
                            function(param) {
                                var key = param[0],
                                    value = param[1];

                                return (
                                    'params[' +
                                    key +
                                    '] = ' +
                                    value +
                                    ';');
                            }),
                        '') +
                    'try {' +
                        '_output += ' +
                            '_ext.formidable.urls.resolve(' +
                                name +
                                ', params);' +
                    '} catch (e) {}' +
                '}());');
        };

    //------------------
    //    Public API
    //------------------

    return {
        parse: parse,
        compile: compile
    };
};
