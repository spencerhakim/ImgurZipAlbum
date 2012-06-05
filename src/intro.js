if( location.hostname === 'imgur.com' ) { //make sure we're on imgur
(function($) {

//make sure console(.log) is defined (don't really care if I leave it in)
//window.console is used to avoid JSHint errors
if( !window.console )
{
    window.console = {};
    window.console.log = function(){};
}
///////////////////////////////////////////////////////////////////////////////////////////////////
