if( location.hostname === 'imgur.com' ) { //make sure we're on imgur
(function($) {
///////////////////////////////////////////////////////////////////////////////////////////////////
/*global JSZip: false */

var ImgurZipAlbum = (function(options) {
    
    //called once the image has been downloaded
    function imgLoad()
    {
        setTimeout((function(dis){
            return function()
            {
                var id = $(dis).data('imgur-id');
                var data = atob(getImgAsBase64(dis));
                zip.file(id+opt.filetype, data, {base64:false, binary:true} ); //store binary data in memory, should take up less space
                console.log( sprintf('Succesful: %1, %2kB', id, (data.length/1024).toFixed(2)) );
                
                checkZip();
            };
        })(this), opt.timeout);
    }
    
    // http://stackoverflow.com/a/934925/489071
    var canvas = document.createElement("canvas"); // reuse canvas element
    function getImgAsBase64(img)
    {
        canvas.width = img.width;
        canvas.height = img.height;

        // Copy the image contents to the canvas
        canvas.getContext("2d").drawImage(img, 0, 0);

        // Get the data-URL formatted image
        // Firefox supports PNG and JPEG. You could check img.src to
        // guess the original format, but be aware the using "image/jpg"
        // will re-encode the image.
        return canvas.toDataURL(MIMETYPE, 0.95)
            .replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    }
    
    //called when image fails to load
    function imgError()
    {
        setTimeout((function(dis){
            return function()
            {
                var id = $(dis).data('imgur-id');
                imageIDs = $(imageIDs).not([id]).get();
                failedIDs.push(id);
                console.log('Failed: ' + id);
                
                //create list of failed images
                var $errorUl = {};
                if( ($errorUl = $('#IZAerrors')).length === 0 )
                {
                    //create div only on first error
                    $(window.body).append( $(ERRORDIVHTML) );
                }
                $errorUl.append( sprintf('<li><a href="http://imgur.com/download/%1">%1</a></li>', id) );
                
                //highlight affected images
                $( sprintf('[id=%1] img', id) ).css('outline', '3px solid red');
                $( sprintf('img[id=thumb-%1]', id) ).css('border', '3px solid red');
                
                checkZip();
            };
        })(this), opt.timeout);
    }
    
    //called whenever an image is processed or fails to load
    function checkZip()
    {
        var filesLoaded = Object.keys(zip.files).length;
        $statusSpan.html( sprintf(STATUSMSG, filesLoaded, imageIDs.length) );
        
        //make sure everything has been downloaded (or failed)
        if( filesLoaded === imageIDs.length )
        {
            console.log('Generating zip...');
            $statusSpan.html('Generating zip...');
            
            $statusSpan = $statusSpan.closest('.panel');
            $statusSpan.downloadify({
                filename: albumName + '.zip',
                data: zip.generate(),
                dataType: 'base64',
                
                onError: function(){ alert('An error occurred, sorry!'); },
                onComplete: function() {
                    $statusSpan.remove();
                    $statusSpan = undefined;
                    window.onbeforeunload = (function(){ /*return nothing*/ });
                },
                
                swf: opt.baseurl + 'media/downloadify.swf',
                downloadImage: opt.baseurl + 'media/download.png',
                width: 84,
                height: 25,
                transparent: true
            });
        }
    }
    
    //helper funcs
    function sprintf(str)
    {
        // sprintf('%1 %2', 'Hello', 'World!') === 'Hello World!'
        for(var i=1, len=arguments.length; i < len; i++)
        {
            str = str.replace( new RegExp('%'+i, 'g'), arguments[i] );
        }
        return str;
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    
    //defaults
    if( !options )
        { options = {}; }
    var opt = {
        baseurl: 'http://spencerhakim.github.com/ImgurZipAlbum/',
        filetype: '.jpg',
        timeout: 50
    };
    opt = $.extend(opt, options);
    
    //define some stuff
    var MIMETYPE = (opt.filetype === '.jpg' ? 'image/jpeg' : 'image/png');
    var STATUSMSG = '<span class="stat">%1</span> of <span class="stat">%2</span> images downloaded...';
    var STATUSDIVHTML =
        '<div class="panel" style="display:inline-block; position:fixed; bottom:0; padding:10px; z-index:1000">' +
            '<div class="textbox">' +
                '<img src="'+opt.baseurl+'media/loader.gif" style="vertical-align:text-bottom" /> <span id="IZAstatus"></span>' +
            '</div>' +
        '</div>';
    var ERRORDIVHTML =
        '<div class="panel" style="display:inline-block; position:fixed; bottom:0; right:0; padding:10px; z-index:1000; overflow-y:auto; max-height:'+($(window).height() * 0.95)+'px">' + 
            '<div class="textbox">' +
                '<span style="font-weight:bold; color:red">Failed images</span>' +
                '<ul id="IZAerrors" style="list-style-position:inside"></ul>' +
            '</div>' +
        '</div>';
    
    var albumName = (function() {
        var albumID = $('div[id^=album-].nodisplay').attr('id').split('-')[1];
        var albumTitle = $('div[id^=album-].nodisplay').data('title');
        return sprintf('%1%2', albumID, (albumTitle.length > 0 ? ' - ' + albumTitle : ''));
    })();
    var imageIDs = $('.jcarousel ul li img').map(function(){ return this.id.split('-')[1]; }).get();
    var failedIDs = [];
    var zip = new JSZip();
    
    console.log('Album name = ' + albumName);
    console.log('Image IDs  = ' + imageIDs);
    
    //make sure we have some image IDs
    if( imageIDs.length === 0 )
    {
        alert("This album appears to be empty...");
        return;
    }
    
    //add status div
    $(window.body).append( $(STATUSDIVHTML) );
    var $statusSpan = $('#IZAstatus');
    
    //initialize status
    $statusSpan.html( sprintf(STATUSMSG, 0, imageIDs.length) );
    
    //try to prevent leaving page
    window.onbeforeunload = (function(){ return; });
    
    //start grabbing all the images
    for( var i=0, len=imageIDs.length; i < len; i++ )
    {
        $('<img />')
            .load(imgLoad)
            .error(imgError)
            .data('imgur-id', imageIDs[i])
            .attr('src', 'http://imgur.com/download/'+imageIDs[i]); //set src last
    }
    
});
/*global base64: false */

//make sure this is an album
if( $('div[id^=album-].nodisplay').length === 0 )
{
    alert('Hey, this isn\'t an album!');
    return;
}

//load helper scripts (jQuery should already be loaded by imgur)
$.ajaxSetup({cache: true});

//Fuck you, IE
if( !window.atob || !window.btoa )
{
    $.ajaxSetup({async: false});
    $.getScript('http://stringencoders.googlecode.com/svn/trunk/javascript/base64.js', function() {
        if( !window.atob )
            { window.btoa = base64.encode; }
        
        if( !window.atob )
            { window.atob = base64.decode; }
    });
    $.ajaxSetup({async: true});
}

$.getScript('http://spencerhakim.github.com/ImgurZipAlbum/js/jszip.js', function() {
$.getScript('http://spencerhakim.github.com/ImgurZipAlbum/js/swfobject.js', function() {
$.getScript('http://spencerhakim.github.com/ImgurZipAlbum/js/downloadify.min.js', function() {
    ImgurZipAlbum(); //fire off processing
}); }); });
///////////////////////////////////////////////////////////////////////////////////////////////////
})(jQuery); }