'use strict';

module.exports = function(option) {

    //------------------
    //    Public API
    //------------------

    return {
        info: option('log.info') || function(message) {
            console.log(message);
        },
        warn: option('log.warn') || function(message) {
            console.warn(message);
        },
        fail: option('log.fail') || function(message, code) {
            console.error(message);
            process.exit(code || 1);
        }
    };
};
