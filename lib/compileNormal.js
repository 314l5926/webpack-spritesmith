var Spritesmith = require('spritesmith');
var path = require('path');
var crypto = require('crypto')
var spritesheetTemplater = require('spritesheet-templates');
var async = require('async');
var _ = require('lodash');

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
            async.parallel([
                writeCSS.bind(null, spritesmithResult),
                writeImage.bind(null, options.target.image, spritesmithResult)
            ], callback);
        }
    ], function (err) {
        if (err) {
            metaOutput.errors.push(err);
        }
        callback();
    });

    function writeCSS(spritesmithResult, callback) {
        var templaterData = convertSpritesmithResultToSpritesheetTemplatesFormat(spritesmithResult);
        var code = spritesheetTemplater(templaterData, options.spritesheetTemplatesOptions);

        writeFileR(
            options.target.css,
            code,
            callback
        );
    }

    function convertSpritesmithResultToSpritesheetTemplatesFormat(spritesmithResult) {
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
        var cssImageRef = options.apiOptions.cssImageRef.replace('[hash]', spritesmithResult.hash);
        var spritesheet = _.extend(
            {image: cssImageRef},
            spritesmithResult.properties
        );

        return {
            sprites: sprites,
            spritesheet: spritesheet
        };
    }

    function writeImage(fileName, spritesmithResult, callback) {
        fileName = fileName.replace('[hash]', spritesmithResult.hash);
        writeFileR(
            fileName,
            spritesmithResult.image,
            'binary',
            callback
        );
    }

};
