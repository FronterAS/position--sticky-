/*!
 * 'position: sticky' polyfill
 * http://codepen.io/the-plumpNation/pen/xsndz
 * https://github.com/FronterAS/position--sticky-.git
 * based on https://github.com/matthewp/position--sticky-
 * based on http://codepen.io/FWeinb/details/xLakC
 * License: MIT
 */
(function () {
    'use strict';

    var prefixTestList = ['', '-webkit-', '-ms-', '-moz-', '-o-'],
        stickyTestElement = document.createElement('div'),
        lastKnownScrollTop = 0,
        waitingForUpdate = false,
        slice = Array.prototype.slice,

        // requestAnimationFrame may be prefixed
        requestAnimationFrame = window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame,

        cssPattern = /\s*(.*?)\s*{(.*?)}+/g,
        matchPosition = /\.*?position:.*?sticky.*?;/i,
        getTop = /\.*?top:(.*?);/i,
        toObserve = [],
        i,
        l;

    function getBodyOffset(body) {
        return {
            top: body.offsetTop,
            left: body.offsetLeft
        };
    }

    function getOffset(elem) {
        var docElem,
                body,
                win,
                clientTop,
                clientLeft,
                scrollTop,
                scrollLeft,
                box = {
                top: 0,
                left: 0
            },
            doc = elem && elem.ownerDocument;

        if (!doc) {
            return;
        }

        if ((body = doc.body) === elem) {
            return getBodyOffset(elem);
        }

        docElem = doc.documentElement;

        if (elem.getBoundingClientRect !== undefined) {
            box = elem.getBoundingClientRect();
        }

        win = window;
        clientTop = docElem.clientTop || body.clientTop || 0;
        clientLeft = docElem.clientLeft || body.clientLeft || 0;
        scrollTop = win.pageYOffset || docElem.scrollTop;
        scrollLeft = win.pageXOffset || docElem.scrollLeft;

        return {
            top: box.top + scrollTop - clientTop,
            left: box.left + scrollLeft - clientLeft
        };
    }

    function setStyle(elem, repl) {
        var style = elem.getAttribute('style').split(';'),
            newStyle = [],
            i,
            l,
            both,
            key,
            value;

        for (i = 0, l = style.length; i < l; i += 1) {
            both = style[i].split(':');
            key = both[0];
            value = both[1];

            if (key in repl) {
                newStyle.push(key + ':' + repl[key]);

            } else {
                newStyle.push(both.join(':'));
            }
        }

        elem.setAttribute('style', newStyle.join(';'));
    }

    function parse(css) {
        var matches,
            topMatch,
            topCSS,
            elems,

            foreEachElement = function (elem) {
                var height = elem.offsetHeight,
                    parent = elem.parentElement,

                    parOff = getOffset(parent),
                    parOffTop = ((parOff !== null && parOff.top !== null) ? parOff.top : 0),

                    elmOff = getOffset(elem),
                    elmOffTop = ((elmOff !== null && elmOff.top !== null) ? elmOff.top : 0),

                    start = elmOffTop - topCSS,
                    end = (parOffTop + parent.offsetHeight) - height - topCSS,

                    newCSS = matches[2] +
                        'position:fixed;' +
                        'width:' + elem.offsetWidth + 'px;' +
                        'height:' + height + 'px',

                    dummy = document.createElement('div');

                dummy.innerHTML = '<span ' +
                    'style="position:static;display:block;height:' + height + 'px;">' +
                    '</span>';

                toObserve.push({
                    element: elem,
                    parent : parent,
                    repl   : dummy.firstElementChild,
                    start  : start,
                    end    : end,
                    oldCSS : matches[2],
                    newCSS : newCSS,
                    fixed  : false
                });
            };

        css = css.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '').replace(/\n|\r/g, '');

        while((matches = cssPattern.exec(css)) !== null) {
            var selector = matches[1];

            if (matchPosition.test(matches[2]) && selector !== '#modernizr') {
                topMatch = getTop.exec(matches[2]);
                topCSS = ((topMatch !== null) ? parseInt(topMatch[1]) : 0);
                elems = slice.call(document.querySelectorAll(selector));

                elems.forEach(foreEachElement);
            }
        }
    }

    function setPositions() {
        var scrollTop = lastKnownScrollTop;

        waitingForUpdate = false;

        for (var i = 0, l = toObserve.length; i < l; i += 1) {
            var obj = toObserve[i];

            if (obj.fixed === false && scrollTop > obj.start && scrollTop < obj.end) {
                obj.element.setAttribute('style', obj.newCSS);
                obj.fixed = true;
                obj.element.classList.add('stuck');

            } else {
                if (obj.fixed === true) {
                    if (scrollTop < obj.start) {
                        obj.element.setAttribute('style', obj.oldCSS);
                        obj.fixed = false;
                        obj.element.classList.remove('stuck');

                    } else if (scrollTop > obj.end) {
                        var absolute = getOffset(obj.element);

                        absolute.position = 'absolute';
                        obj.element.setAttribute('style', obj.newCSS);
                        setStyle(obj.element, absolute);
                        obj.fixed = false;
                        obj.element.classList.remove('stuck');
                    }
                }
            }
        }
    }

    // Debounced scroll handling
    function updateScrollPos() {
        lastKnownScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

        // Only trigger a layout change if we’re not already waiting for one
        if (!waitingForUpdate) {
            waitingForUpdate = true;

            // Don’t update until next animation frame if we can, otherwise use a
            // timeout - either will help avoid too many repaints
            if (requestAnimationFrame) {
                requestAnimationFrame(setPositions);
            } else {
                setTimeout(setPositions, 15);
            }
        }
    }

    for (i = 0, l = prefixTestList.length; i < l; i += 1) {
        stickyTestElement.style.position = prefixTestList[i] + 'sticky';

        if (stickyTestElement.style.position !== '') {
            return;
        }
    }

    window.addEventListener('scroll', updateScrollPos);

    window.addEventListener('load', function () {
        var styles = slice.call(document.querySelectorAll('style')),
            links = slice.call(document.querySelectorAll('link'));

        styles.forEach(function (style) {
            var text = style.textContent || style.innerText;
            parse(text);
        });

        links.forEach(function (link) {
            var href,
                req;

            if (link.getAttribute('rel') !== 'stylesheet') {
                return;
            }

            href = link.getAttribute('href');
            req = new XMLHttpRequest();

            req.open('GET', href, true);

            req.onload = function () {
                parse(req.responseText);
                // Update once stylesheet loaded, in case page loaded with a scroll offset
                updateScrollPos();
            };

            req.send();
        });
    }, false);

}());
