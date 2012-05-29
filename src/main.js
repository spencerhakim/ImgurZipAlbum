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
    $.ajax({
        url: 'http://stringencoders.googlecode.com/svn/trunk/javascript/base64.js',
        async: false,
        dataType: 'script'
    });
    
    if( !window.atob )
        { window.btoa = base64.encode; }
    
    if( !window.atob )
        { window.atob = base64.decode; }
}

$.getScript('@@BASEURL@@js/jszip.js', function() {
$.getScript('@@BASEURL@@js/swfobject.js', function() {
$.getScript('@@BASEURL@@js/downloadify.min.js', function() {
    ImgurZipAlbum(); //fire off processing
}); }); });