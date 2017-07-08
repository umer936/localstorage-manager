(function(window, document, $, chrome) {
'use strict';

function htmlEscape(str, noQuotes) {
    var map = [];
    map['&'] = '&amp;';
    map['<'] = '&lt;';
    map['>'] = '&gt;';

    var regex;

    if (noQuotes) {
        regex = /[&<>]/g;
    }
    else {
        map['"'] = '&#34;';
        map["'"] = '&#39;';
        regex = /[&<>"']/g;
    }

    return ('' + str).replace(regex, function(match) {
        return map[match];
    });
}

function loading(value) {
    var $loading = $('#loading');
    var $html = $('html');

    if (value) {
        $loading.width($html.width());
        $loading.height($html.height());
        $loading.show();
    }
    else {
        $loading.hide();
    }
}

function sendMessage(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {

        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
            callback && callback(response);
        });
    });
}

function getLockedData(type, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var host = tabs[0].url.split('/')[2];
        var hash = '__' + type + '__' + host;

        var lockedData = localStorage.getItem(hash);

        if (lockedData === null) {
            lockedData = {};
        }

        try {
            lockedData = JSON.parse(lockedData);
        }
        catch(e) {
            lockedData = {};
        }

        callback && callback(lockedData, hash);
    });
}

function noData() {
    var pClass;
    var promptText;

    if (type === 'L') {
        pClass = 'localstorage';
        promptText = 'local';
    }
    else {
        pClass = 'sessionstorage';
        promptText = 'session';
    }
    return '<p class="' + pClass + '">No ' + promptText + ' storage data found</p>';
}

function parseJSON(str) {
    if (typeof str !== 'string') {
        return str;
    }

    try {
        var obj = JSON.parse(str);

        if (obj === null || typeof obj !== 'object') {
            return str;
        }
    }
    catch(e) {
        return str;
    }

    var tempObj;

    if (Array.isArray(obj)) {
        tempObj = [];
    }
    else {
        tempObj = {};
    }

    for (var i in obj) {
        tempObj[i] = parseJSON(obj[i]);
    }

    return tempObj;
}

function syntaxHighlight(json) {

    json = htmlEscape(json, true);

    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}
//------------------------------------------------------------------------------


var type;
var $type = $('#type');

if (localStorage['type'] === 'L' || localStorage['type'] === undefined) {
    type = 'L';
    $type.attr('class', 'localstorage').html('L');
}
else {
    type = 'S';
    $type.attr('class', 'sessionstorage').html('S');
}


getLockedData(type, function(lockedData) {

    sendMessage({ what: 'get', type: type }, function(response) {
        var storage = response;
        var str = '';
        var key;
        var value;
        var img;
        var dataLocked;
        //var readonly;
        var size = 0;
        var tableClass = type === 'L' ? 'localstorage' : 'sessionstorage';

        if (storage === undefined) {
            str = '<p class="error">Could not read data from this page</p>';
        }

        else {

            str += '<table class="' + tableClass + '">';
            str += '<thead>';
            str += '<tr>';
            str += '<th class="td-nome">Name</th>';
            str += '<th class="td-value" colspan="4">Value</th>';
            str += '</tr>';
            str += '</thead>';
            str += '<tbody>';

            // Merge?
            /*for (var i in lockedData) {
                storage[i] = lockedData[i];
            }

            for (var i in response) {
                storage[i] = response[i];
            }*/

            for (var i in storage) {
                key = i;

                if (lockedData[key] === undefined) {
                    img = 'unlock';
                    dataLocked = 'false';
                    //readonly = '';
                }
                else {
                    img = 'lock';
                    dataLocked = 'true';
                    //readonly = 'readonly ';
                }

                key = htmlEscape(i);
                value = htmlEscape(storage[i]);

                str += '<tr>';
                str += '<td class="td-nome"><input type="text" value="' + key + '" data-key="' + key + '"></td>';
                str += '<td class="td-value"><input type="text" value="' + value + '"></td>';
                str += '<td class="td-icon minus"><img src="img/minus.png"></td>';
                str += '<td class="td-icon lock"><img src="img/'+ img + '.png" data-locked="' + dataLocked + '"></td>';
                str += '<td class="td-icon open"><img src="img/open.png"></td>';
                str += '</tr>';

                size++;
            }

            str += '</tbody></table>';

            if (!size) {
                str = noData();
            }
        }

        $('#table').html(str);
    });
});


$('#type').click(function() {
    if ($(this).html() === 'L') {
        localStorage['type'] = 'S';
    }
    else {
        localStorage['type'] = 'L';
    }

    location.reload();
});


$('#add').click(function(e) {
    e.preventDefault();

    var key;
    var value;

    key = prompt('Key:');

    if (key === null) {
        return;
    }

    value = prompt('Value:');

    if (value === null) {
        return;
    }

    var message = {
        type: type,
        what: 'set',
        key: key,
        value: value
    };

    sendMessage(message, function(response) {
        location.reload();
    });
});

$('#reload').click(function(e) {
    e.preventDefault();
    location.reload();
});

$('#clear').click(function(e) {
    e.preventDefault();
    sendMessage({ type: type, what: 'clear' }, function(response) {
        location.reload();
    });
});

$('#import').click(function(e) {
    e.preventDefault();

    var json = prompt((type === 'L' ? 'Local' : 'Session') + ' storage data (JSON):');

    if (json) {
        sendMessage({ type: type, what: 'import', json: json }, function(response) {
            location.reload();
        });
    }
});

$('#download').click(function(e) {
    e.preventDefault();

    loading(true);

    chrome.tabs.query({ active: true, currentWindow: true }, function(tab) {
        var host = tab[0].url.split('/')[2];

        function zero(n) {
            return n < 10 ? '0' + n : n;
        }

        var d = new Date;
        var date = [zero(d.getFullYear()), zero(d.getMonth() + 1),
            zero(d.getDate())].join('-') + '_' + [zero(d.getHours()),
            zero(d.getMinutes()), zero(d.getSeconds())].join('-');

        var filename = host + '-' + date + '.txt';

        sendMessage({ type: type, what: 'export' }, function(response) {

            if (response === undefined) {
                return;
            }

            var file = new Blob([response]);
            var a = document.createElement('a');
            a.href = window.URL.createObjectURL(file);
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            loading(false);
        });
    });

});


$('#copy').click(function(e) {
    e.preventDefault();

    loading(true);

    sendMessage({ type: type, what: 'export' }, function(response) {

        if (response === undefined) {
            return;
        }

        var e = document.createElement('textarea');
        e.style.position = 'fixed';
        e.style.opacity = 0;
        e.value = response;
        document.body.appendChild(e);
        e.select();
        document.execCommand('copy');
        document.body.removeChild(e);

        loading(false);
    });
});



$('#table').on('input', 'input', function() {
    var $this = $(this);
    var $parent = $this.parent();

    var oldKey;
    var key;
    var value;

    // Editing the value
    if ($parent.attr('class') === 'td-value') {
        key = $parent.prev().find('input').val();
        value = $this.val();
    }

    // Editing the key
    else {
        oldKey = $this.data('key');
        key = $this.val();
        $this.data('key', key);
        value = $parent.next().find('input').val();
    }

    var message = {
        type: type,
        what: 'set',
        oldKey: oldKey,
        key: key,
        value: value
    };

    sendMessage(message);
});

$('#table').on('click', 'td.td-icon', function() {
    var $this = $(this);

    // minus / lock / open
    var icon = $this.attr('class').split(' ')[1];

    if (icon === 'minus') {

        var $parent = $this.parent();
        var key = $this.prev().prev().find('input').val();

        sendMessage({ type: type, what: 'remove', key: key }, function(response) {
            $parent.fadeOut(100, function() {

                var siblingsLen = $parent.siblings().length;

                $parent.remove();
                // If removed all, removes the table too
                if (!siblingsLen) {
                    $('#table').html(noData())
                }
            });
        });
    }

    else if (icon === 'open') {
        var $siblings = $this.siblings();
        var $inputKey = $siblings.eq(0).find('input');
        var $inputValue = $siblings.eq(1).find('input');

        var key = $inputKey.val();
        var value = $inputValue.val();

        key = htmlEscape(key) || '&#65279;';

        var json = parseJSON(value);

        if (typeof json === 'object') {
            value = syntaxHighlight(JSON.stringify(json, null, 4));
        }
        else {
            value = htmlEscape(value);
        }

        var html = '';
        html += '<!DOCTYPE html>'
        html += '<html><head><meta charset="UTF-8"><title>' + key + '</title>';
        html += '<style>';
        html += 'pre { font-size: 13px }';
        html += '.string { color: #DF0101 }';
        html += '.number { color: #0B610B }';
        html += '.boolean { color: #5F04B4 }';
        html += '.null { color: #FF8000 }';
        html += '.key { color: #0000FF }';
        html += '</style>';
        html += '</head>';
        html += '<body>';
        html += '<pre>' + value + '</pre>';
        html += '</body>';
        html += '</html>';

        var win = window.open('about:blank'); //, '', 'width=600,height=500,top=0,left=0');
        win.document.write(html);
    }

    else if (icon === 'lock') {
        var $img = $this.find('img');
        var isLocked = $img.data('locked');

        var $siblings = $this.siblings();
        var $inputKey = $siblings.eq(0).find('input');
        var $inputValue = $siblings.eq(1).find('input');

        var key = $inputKey.val();
        var value = $inputValue.val();

        getLockedData(type, function(lockedData, hash) {


            var invertLock;

            if (isLocked) {
                // Unlock
                delete lockedData[key];
                invertLock = 'unlock';

                //$inputKey.prop('readonly', false);
                //$inputValue.prop('readonly', false);
            }
            else {
                // Lock
                lockedData[key] = value;
                invertLock = 'lock';

                //$inputKey.prop('readonly', true);
                //$inputValue.prop('readonly', true);
            }


            if ($.isEmptyObject(lockedData)) {
                localStorage.removeItem(hash);
            }
            else {
                localStorage.setItem(hash, JSON.stringify(lockedData));
            }

            $img.attr('src', 'img/' + invertLock + '.png');
            $img.data('locked', !isLocked);
        });
    }
});

})(window, document, jQuery, chrome);
