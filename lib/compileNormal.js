var Spritesmith = require('spritesmith');
var path = require('path');
var async = require('async');
var _ = require('lodash');
var crypto = require('crypto')

var writeCSS = require('./writeCSS');
var writeFileR = require('./writeFileR');

module.exports = function (options, metaOutput, srcFiles, callback) {
    var spritesmithOptions = _.extend({
        src: srcFiles.map(function (filename) {
            return path.resolve(options.src.cwd, filename);
        })
    }, options.spritesmithOptions);

    async.waterfall([
        Spritesmith.run.bind(Spritesmith, spritesmithOptions),
        function (spritesmithResult, callback) {
            spritesmithResult.hash = crypto.createHash('md5').update(spritesmithResult.image).digest('hex').slice(0, 8);
            var fileNameWithHash = options.target.image.replace('[hash]', spritesmithResult.hash);
            async.parallel([
                writeCSS.bind(null, options.target.css, toSpritesheetTemplatesFormat(spritesmithResult)),
                writeFileR.bind(null, fileNameWithHash, spritesmithResult.image, 'binary')
            ], callback);
        }
    ], function (err) {
        if (err) {
            metaOutput.errors.push(err);
        }
        callback();
    });

    function toSpritesheetTemplatesFormat(spritesmithResult) {
        var generateSpriteName = options.apiOptions.generateSpriteName;
        var sprites = _.map(
            spritesmithResult.coordinates,
            function (oneSourceInfo, fileName) {
                return _.extend(
                    {name: generateSpriteName(fileName)},
                    oneSourceInfo
                );
            }
        );
        var cssImageRef = options.apiOptions.cssImageRef.replace('[hash]', spritesmithResult.hash)
        var spritesheet = _.extend(
            {image: cssImageRef},
            spritesmithResult.properties
        );

        return {
            sprites: sprites,
            spritesheet: spritesheet
        };
    }
};
