(function($) {

//define some stuff
var BASEURL = 'http://spencerhakim.github.com/ImgurZipAlbum/';

var ImgurZipAlbum = (function() {
    var albumID = $('[id^=album-]').attr('id').split('-')[1];
    var imageIDs = $('.jcarousel ul li img').map(function(){ return this.id.split('-')[1]; }).get();
    var zip = new JSZip();
    
    console.log('AlbumID = ' + albumID);
    console.log('ImageIDs= ' + imageIDs);
    
    function imgLoad()
    {
        var id = $(this).attr('data-imgur-id');
        //var data = getImgAsBase64PNG(this);
        var file = getImgAsFile(this);
        var fr = new FileReader();
        fr.onload = (function(id){
            return function(e){ dataLoad(id, e.target.result); };
        })(id);
        fr.readAsBinaryString(file);
    };
    
    function dataLoad(id, data)
    {
        if( data.length > 6 )
        {
            zip.file(id+'.jpg', data, {base64:false, binary:true});
            console.log('Succesful: ' + id);
        }
        else
        {
            imageIDs = $(imageIDs).not([id]);
            console.warn('Failed: ' + id);
        }
        
        if( Object.keys(zip.files).length === imageIDs.length )
        {
            console.log('Generating zip...');
            location.href = "data:application/zip;base64," + zip.generate();
        }
    };
    
    //GO!
    for( var i in imageIDs )
    {
        if( imageIDs.hasOwnProperty(i) )
        {
            $('<img />')
                .attr('src', 'http://imgur.com/download/'+imageIDs[i])
                .attr('data-imgur-id', imageIDs[i])
                .load(imgLoad);
        }
    }
    
});

function getImgAsFile(img)
{
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    
    return canvas.mozGetAsFile($(this).attr('data-imgur-id')+'.jpg', 'image/jpeg');
}

// http://stackoverflow.com/a/934925/489071
function getImgAsBase64PNG(img) {
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
    var dataURL = canvas.toDataURL("image/jpeg", 0.95);
    return dataURL.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
}

//load helper scripts (jQuery should already be loaded by imgur)
$.ajaxSetup({cache: true});
$.getScript(BASEURL + 'js/jszip.js', function() {
$.getScript(BASEURL + 'js/jszip-deflate.js', function() {
$.getScript(BASEURL + 'js/swfobject.js', function() {
$.getScript(BASEURL + 'js/downloadify.min.js', function() {
    ImgurZipAlbum(); //fire off processing
}); }); }); });

})(jQuery);