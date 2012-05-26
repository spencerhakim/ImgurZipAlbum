//make sure this is an album
if( $('div[id^=album-].nodisplay').length === 0 )
{
    alert('Hey, this isn\'t an album!');
    return;
}

//alert if failed to load a helper script
function failedGetScript(jqxhr, settings, exception)
{
    alert('Failed to load: ' + settings.url);
}

//load helper scripts (jQuery should already be loaded by imgur)
$.ajaxSetup({cache: true});
$.getScript('@@BASEURL@@js/jszip.js', function() {
$.getScript('@@BASEURL@@js/swfobject.js', function() {
$.getScript('@@BASEURL@@js/downloadify.min.js', function() {
    ImgurZipAlbum(); //fire off processing
}).fail(failedGetScript);
}).fail(failedGetScript);
}).fail(failedGetScript);