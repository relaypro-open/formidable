'use strict';

module.exports = function(grunt) {
    grunt.initConfig({
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                freeze: true,
                globalstrict: true,
                immed: true,
                noarg: true,
                nonew: true,
                plusplus: true,
                quotmark: 'single',
                unused: true,
                globals: {
                    __dirname: true,
                    console: true,
                    module: true,
                    process: true,
                    require: true
                }
            },
            all: {
                files: {
                    src: ['**/*.js']
                },
                options: {
                    ignores: ['node_modules/**']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['jshint']);
};
