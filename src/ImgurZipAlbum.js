var ImgurZipAlbum = (function(options) {
    
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
        '<div class="panel" style="display:inline-block; position:fixed; bottom:0; padding:10px; z-index:+1001">' +
            '<div class="textbox">' +
                '<img src="'+opt.baseurl+'media/loader.gif" style="vertical-align:text-bottom" /> <span id="IZAstatus"></span>' +
            '</div>' +
        '</div>';
    var ERRORDIVHTML =
        '<div class="panel" style="display:inline-block; position:fixed; bottom:0; right:0; padding:10px; z-index:+1001">' + 
            '<div class="textbox">' +
                '<span style="font-weight:bold; color:red">Failed images</span>' +
                '<ul id="IZAerrors" style="list-style-position:inside"></ul>' +
            '</div>' +
        '</div>';
    
    //called once the image has been downloaded
    function imgLoad()
    {
        setTimeout(function(dis) {
            var id = $(dis).data('imgur-id');
            var data = atob(getImgAsBase64(dis));
            zip.file(id+options, data, {base64:false, binary:true} ); //store binary data in memory, should take up less space
            console.log( sprintf('Succesful: %1, %2kB', id, (data.length/1024).toFixed(2)) );
            
            checkZip();
        }, opt.timeout, this);
    }
    
    // http://stackoverflow.com/a/934925/489071
    function getImgAsBase64(img)
    {
        // Create an empty canvas element
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        // Copy the image contents to the canvas
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Get the data-URL formatted image
        // Firefox supports PNG and JPEG. You could check img.src to
        // guess the original format, but be aware the using "image/jpg"
        // will re-encode the image.
        var dataURL = canvas.toDataURL(MIMETYPE, 0.95);
        return dataURL.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    }
    
    //called when image fails to load
    function imgError()
    {
        setTimeout(function(dis) {
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
            $( sprintf('[id$=%1] img, img[id$=%1]', id) ).css('outline', '3px solid red');
            
            checkZip();
        }, opt.timeout, this);
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
            str = str.replace("%"+i, arguments[i]);
        }
        return str;
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    
    var albumName =
        $('div[id^=album-].nodisplay').attr('id').split('-')[1] +
        ' - ' + 
        $('div[id^=album-].nodisplay').data('title');
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
    for( var i in imageIDs )
    {
        if( !imageIDs.hasOwnProperty(i) )
            { continue; }
        
        $('<img />')
            .load(imgLoad)
            .error(imgError)
            .data('imgur-id', imageIDs[i])
            .attr('src', 'http://imgur.com/download/'+imageIDs[i]); //set src last
    }
    
});