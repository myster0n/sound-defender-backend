var fs = require('fs');
var watch = require('watch');
var im = require('imagemagick');
var path = require('path');

var destinationFolder = "converted/"
var sourceFolder = "source/"
var backendCall=null;
var alienImages = {};

alienImages.init = function(options) {
    if (options.destinationFolder) destinationFolder = options.destinationFolder;
    if (options.sourceFolder) sourceFolder = options.sourceFolder;
    if (options.callback) backendCall = options.callback;
}

alienImages.watchFolder = function(folder, callback) {
    watch.createMonitor(folder, function (monitor) {
        function handleFile(f, state) {
            if (fs.lstatSync(f).isDirectory()) {
                console.log("new directory: "+f);
            } else {
                console.log("new file: "+f);
                convertImage(f);
            }
        }

        monitor.on("created", function(f, state) {
            // workaround, anders triggered dit dubbel
            if (monitor.files[f] === undefined) handleFile(f, state);
        });
        monitor.on("changed", handleFile);
    });
}

alienImages.rescanFolder = function(folder, callback) {
    var convertedFiles = alienImages.getAllConverted();
    fs.readdir(folder, function (err, files) {
        if (err) return console.error(err);
        files.forEach(function(file) {
            var fullPath = folder+"/"+file;
            if (!fs.lstatSync(fullPath).isDirectory() && convertedFiles.indexOf( getConvertedFilename(fullPath) ) < 0 ) {
                console.log("No convertion found for "+fullPath+", creating one ...");
                convertImage( fullPath , callback );
            }
        })
    });
}

alienImages.getLatestConverted = function(count, callback) {
    fs.readdir(destinationFolder, function (err, files) {
        files.sort(function(a, b) {
            return fs.statSync(destinationFolder + b).mtime.getTime() - fs.statSync(destinationFolder + a).mtime.getTime();
        });
        if (typeof callback === 'function') callback( files.slice(0, count) );
    });
}

alienImages.getAllConverted = function() {
    return fs.readdirSync(destinationFolder);
}


var getConvertedFilename = function(p) {
    return path.basename(p, path.extname(p)) + ".png";
}
// convert cedrik.jpg -resize 60x60^ -gravity South-East -extent 134x100 -gravity North-West -extent 200x200 -background none output.png
// convert -size 1024x1024 tile:output.png +repage bigmask.png -compose CopyOpacity -composite PNG32:output.png
// convert spaceship_badguys_user.png output.png -compose Over -composite bigover.png -compose Overlay -composite output.png
var convertImage = function(source, callback) {
    var destFileName = getConvertedFilename(source);
    var tempFile = sourceFolder + "/" + destFileName;
    var finalFile = destinationFolder + "/" + destFileName;
    var step1 = function() {
        console.log("Converting "+source+" step 1...");
        im.convert( [source, '-resize', '60x60^','-gravity','Center','-crop','60x60+0+0', '+repage','-gravity', 'South-East', '-extent', '134x100', '-gravity', 'North-West', '-extent', '200x200', '-background', 'none', tempFile],
            function(err, stdout){ if (err) console.error(err); else step2(); }
        );
    };
    var step2 = function() {
        console.log("Converting "+source+" step 2...");
        im.convert( ['-size', '1024x1024', 'tile:'+tempFile, '+repage', sourceFolder+'/bigmask.png', '-compose', 'CopyOpacity', '-composite', 'PNG32:'+tempFile],
            function(err, stdout){ if (err) console.error(err); else step3(); }
        );
    };
    var step3 = function() {
        console.log("Converting "+source+" step 3...");
        im.convert( [sourceFolder+'/spaceship_badguys_user.png', tempFile, '-compose', 'Over', '-composite', sourceFolder+'/bigover.png', '-compose', 'Overlay', '-composite', finalFile],
            function(err, stdout){ if (err) console.error(err); else {
                fs.unlink(tempFile,  function (err) { if (err) console.error(err); });
                if(backendCall && typeof backendCall === 'function'){
                    backendCall(destFileName);
                }
            }}
        );
    };
    step1();
}

module.exports = alienImages;
