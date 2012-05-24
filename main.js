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

//check for jQuery
if( typeof($) === 'undefined' )
{
    console.log('jQuery missing');
    alert('Unable to download album, an error occured');
    return;
}

//make sure this is an album
if( $('div[id^=album-].nodisplay').length === 0 )
{
    console.log('Not an album');
    alert('Hey, this isn\'t an album!');
    return;
}

//define some stuff
var BASEURL = 'http://spencerhakim.github.com/ImgurZipAlbum/';
var FILETYPE = '.jpg';
var MIMETYPE = (FILETYPE === '.jpg' ? 'image/jpeg' : 'image/png');

var ImgurZipAlbum = (function() {
    
    //called once the image has been downloaded
    function imgLoad()
    {
        var id = $(this).attr('data-imgur-id');
        
        if( $.browser.mozilla ) //mozilla support a faster method
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
        var id = $(this).attr('data-imgur-id');
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
        statusDiv.html( statusMsg.replace('%IMGS%', filesLoaded).replace('%IMGL%', imageIDs.length) );
        
        //make sure everything has been downloaded (or failed)
        if( filesLoaded === imageIDs.length )
        {
            console.log('Generating zip...');
            statusDiv.html('<img src="'+BASEURL+'media/loader.gif" style="vertical-align:text-bottom" /> Generating zip... (your browser may freeze during this process)');
            location.href = "data:application/zip;base64," + zip.generate(); //don't use compression, takes up too much CPU
            statusDiv.parent().remove();
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    var albumID = $('div[id^=album-].nodisplay').attr('id').split('-')[1];
    var imageIDs = $('.jcarousel ul li img').map(function(){ return this.id.split('-')[1]; }).get();
    var zip = new JSZip();
    
    console.log('AlbumID = ' + albumID);
    console.log('ImageIDs= ' + imageIDs);
    
    //make sure we have some image IDs
    if( imageIDs.length === 0 )
    {
        alert("This album appears to be empty...");
        return;
    }
    
    //add status div
    $(body).append( $('<div class="panel" style="display:inline-block; position:fixed; bottom:0; padding:10px"><div id="imgurZipAlbum" class="textbox" /></div>') );
    var statusDiv = $('#imgurZipAlbum');
    
    //initialize status
    var statusMsg = '<img src="'+BASEURL+'media/loader.gif" style="vertical-align:text-bottom" /> %IMGS%/%IMGL% loaded';
    statusDiv.html( statusMsg.replace('%IMGS%', 0).replace('%IMGL%', imageIDs.length) );
    
    //start grabbing all the images
    for( var i in imageIDs )
    {
        if( !imageIDs.hasOwnProperty(i) )
            continue;
        
        $('<img />')
            .load(imgLoad)
            .error(imgError)
            .attr('data-imgur-id', imageIDs[i])
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
    
    return canvas.mozGetAsFile( $(this).attr('data-imgur-id')+FILETYPE, MIMETYPE);
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