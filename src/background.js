chrome.runtime.onMessage.addListener(function(msg, sender, response) {

    var host = msg.host;

    response({
        localStorage: localStorage['__L__' + host],
        sessionStorage: localStorage['__S__' + host]
    });
});
