/*global JSZip: false */

var ImgurZipAlbum = (function(options) {
    
    //called once the image has been downloaded
    function imgLoad()
    {
        setTimeout((function(dis){
            return function()
            {
                //get image ID and binary data
                var id = $(dis).data('imgur-id');
                var filename = $(dis).data('filename');
                var data = atob(getImgAsBase64(dis));
                
                zip.file(filename+opt.filetype, data, {base64:false, binary:true} ); //store binary data in memory, should take up less space
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
                //get image ID
                var id = $(dis).data('imgur-id');
                
                //remove ID from original list and add to list of failures
                imageIDs = $(imageIDs).not([id]).get();
                failedIDs.push(id);
                console.log('Failed: ' + id);
                
                //create list of failed images
                var $errorUl = {};
                if( ($errorUl = $('#IZAerrors')).length === 0 )
                {
                    //create div only on first error
                    $(window.body).append( $(ERRORDIVHTML) );
                    $errorUl = $('#IZAerrors');
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
                
                onError: function(){ alert('An error occurred, sorry!\nIt\'s possible that the album is too large (in the number of images and/or image resolution) to store in memory.'); },
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
        baseurl: '@@BASEURL@@',
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
        '<div class="panel" style="display:inline-block; position:fixed; bottom:0; right:0; padding:10px; z-index:1000">' + 
            '<div class="textbox" style="overflow-y:auto; max-height:'+($(window).height() * 0.95)+'px">' +
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
        var id = imageIDs[i];
        var img = new Image();
        var titleText = $('.image#'+id+' > h2').text();
        $(img)
            .load(imgLoad)
            .error(imgError)
            .data('imgur-id', id)
            .data('filename', sprintf('%1 - %2%3', i+1, id, (titleText === '' ? '' : ' - ' + titleText)) )
            .attr('src', 'http://imgur.com/download/'+id); //set src last
    }
    
});
