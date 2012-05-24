//make sure console(.log) is defined (don't really care if I leave it in)
if( !console )
{
    console = console || {};
    console.log = function(){};
}

//make sure we're on imgur
if( location.hostname !== 'imgur.com' )
    console.log('Heyyy, this isnt imgur...');
else
(function($) {

//make sure this is an album
var $album = $('div[id^=album-].nodisplay');
if( $album.length === 0 )
{
    console.log('Not an album');
    alert('Hey, this isn\'t an album!');
    return;
}

//define some stuff
var BASEURL = 'http://spencerhakim.github.com/ImgurZipAlbum/';
var FILETYPE = ($.browser.mozilla ? '.jpg' : '.png');
var MIMETYPE = (FILETYPE === '.jpg' ? 'image/jpeg' : 'image/png');

var ImgurZipAlbum = (function() {
    
    //called once the image has been downloaded
    function imgLoad()
    {
        var id = $(this).data('imgur-id');
        
        if( $.browser.mozilla ) //mozilla supports a faster method
        {
            var file = getImgAsFile(this);
            var fr = new FileReader();
            fr.onload = (function(id){
                return function(e){ dataLoad(id, e.target.result, {base64:false, binary:true}); };
            })(id);
            fr.readAsBinaryString(file);
        }
        else
        {
            var data = getImgAsBase64(this);
            dataLoad(id, data, {base64:true});
        }
    }
    
    //called when image fails to load
    function imgError()
    {
        var id = $(this).data('imgur-id');
        imageIDs = $(imageIDs).not([id]).get();
        console.log('Failed: ' + id);
        
        checkZip();
    }
    
    //called when base64/binary data is available
    function dataLoad(id, data, options)
    {
        zip.file(id+FILETYPE, data, options);
        console.log('Succesful: ' + id);
        
        checkZip();
    }
    
    //called whenever an image is processed or fails to load
    function checkZip()
    {
        var filesLoaded = Object.keys(zip.files).length;
        $statusDiv.html( statusMsg.replace('%IMGS%', filesLoaded).replace('%IMGL%', imageIDs.length) );
        
        //make sure everything has been downloaded (or failed)
        if( filesLoaded === imageIDs.length )
        {
            console.log('Generating zip...');
            $statusDiv = $statusDiv.parent();
            
            $statusDiv.html('<img src="'+BASEURL+'media/loader.gif" style="vertical-align:text-bottom" /> Generating zip... (your browser may appear to freeze during this process)');
            $statusDiv.downloadify({
                filename: albumName + '.zip',
                data: zip.generate(),
                dataType: 'base64',
                
                onError: function(){ alert('An error occurred, sorry!'); },
                onComplete: function() { $statusDiv.remove(); $statusDiv = undefined; },
                
                swf: BASEURL + 'media/downloadify.swf',
                downloadImage: BASEURL + 'media/download.png',
                width: 84,
                height: 25,
                transparent: true
            });
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    var albumName = $album.attr('id').split('-')[1] + ' - ' + $album.data('title');
    var imageIDs = $('.jcarousel ul li img').map(function(){ return this.id.split('-')[1]; }).get();
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
    $(window.body).append( $('<div class="panel" style="display:inline-block; position:fixed; bottom:0; padding:10px; z-index:+1001"><img src="'+BASEURL+'media/loader.gif" style="vertical-align:text-bottom" /><div id="imgurZipAlbum" class="textbox" /></div>') );
    var $statusDiv = $('#imgurZipAlbum');
    
    //initialize status
    var statusMsg = '<span class="stat">%IMGS%</span> of <span class="stat">%IMGL%</span> images downloaded...';
    $statusDiv.html( statusMsg.replace('%IMGS%', 0).replace('%IMGL%', imageIDs.length) );
    
    //start grabbing all the images
    for( var i in imageIDs )
    {
        if( !imageIDs.hasOwnProperty(i) )
            continue;
        
        $('<img />')
            .load(imgLoad)
            .error(imgError)
            .data('imgur-id', imageIDs[i])
            .attr('src', 'http://imgur.com/download/'+imageIDs[i]);
    }
    
});

//Eventually, browsers will implement canvas.toBlob, and I'll switch to that
function getImgAsFile(img)
{
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    
    return canvas.mozGetAsFile( $(this).data('imgur-id')+FILETYPE, MIMETYPE);
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

//load helper scripts (jQuery should already be loaded by imgur)
$.ajaxSetup({cache: true});
$.getScript(BASEURL + 'js/jszip.js', function() {
$.getScript(BASEURL + 'js/swfobject.js', function() {
$.getScript(BASEURL + 'js/downloadify.min.js', function() {
    ImgurZipAlbum(); //fire off processing
}); }); });

})(jQuery);