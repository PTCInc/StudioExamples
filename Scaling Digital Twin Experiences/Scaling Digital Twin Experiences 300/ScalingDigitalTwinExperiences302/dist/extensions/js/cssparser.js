// jQuery based CSS parser
// documentation: http://youngisrael-stl.org/wordpress/2009/01/16/jquery-css-parser/
// Version: 1.5
// Copyright (c) 2011 Daniel Wachsstock
// MIT license:
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
// Notes : Modified by Steve Ghee to fix parse issues, flatten out
// grouped styles, abstract @media selector
//
var CSSParser = new Object();
var CSSLoader = new Object();

(function(parser) {

    parser.parseUrl = function(image) {
        var regExp = /\(([^)]+)\)/;
        var matches = regExp.exec(image);
        image = matches[1];
        return image;
    };

    parser.extend = function(a, b){
        for(var key in b)
            if(b.hasOwnProperty(key))
                a[key] = b[key];
        return a;
    };

    // utility function, since we want to allow parser('style') and parser(document), so we need to look for elements in the jQuery object (parser.fn.filter) and elements that are children of the jQuery object (parser.fn.find)
    parser.findandfilter = function(selector) {
        var ret = this.filter(selector).add(this.find(selector));
        ret.prevObject = ret.prevObject.prevObject; // maintain the filter/end chain correctly (the filter and the find both push onto the chain).
        return ret;
    };

    parser.parsecss = function(str, media, callback) {
        var ret = {};
        str = munge(str).replace(/@(([^;`]|`[^b]|`b[^%])*(`b%)?);?/g, function(s,rule) {
            // @rules end with ; or a block, with the semicolon not being part of the rule but the closing brace (represented by `b%) is
            processAtRule(rule.trim(), media, callback);
            return '';
        });
        str.split('`b%').forEach(function(css) { // split on the end of a block
            css = css.split('%b`'); // css[0] is the selector; css[1] is the index in munged for the cssText
            if (css.length < 2) return; // invalid css

            // selectors can be grouped e.g. p, h1, a so process each separately
            // note the results in expanding/flattening the style table
            var selectors = css[0].split(',');
            for (var i=0; i<selectors.length; i++) {
                var sel = selectors[i] = restore(selectors[i]);
                ret[sel] = parser.extend(ret[sel] || {}, parsedeclarations(css[1]));
            }
        });
        callback(ret);
    };

    // explanation of the above: munge(str) strips comments and encodes strings and brace-delimited blocks, so that
    // %b` corresponds to { and `b% corresponds to }
    // munge(str) replaces blocks with %b`1`b% (for example)
    //
    // str.split('`b%') splits the text by '}' (which ends every CSS statement)
    // Each so the each(munge(str... function(i,css)
    // is called with css being empty (the string after the last delimiter), an @rule, or a css statement of the form
    // selector %b`n where n is a number (the block was turned into %b`n`b% by munge). Splitting on %b` gives the selector and the
    // number corresponding to the declaration block. parsedeclarations will do restore('%b`'+n+'`b%') to get it back.

    // if anyone ever implements http://www.w3.org/TR/cssom-view/#the-media-interface, we're ready

    parser.parsecss.mediumApplies = /*(window.media && window.media.query) ||*/ function(str, media) {
        if (!str) return true; // if no descriptor, everything applies
        var found = false;
        str.split(',').forEach(function(em) {
            if (em.trim() in media) found = true;
        });
        return found;
    };


    parser.parsecss.isValidSelector = function(str) {
        var s = parser('<style>'+str+'{}</style>').appendTo('head')[0];
        // s.styleSheet is IE; it accepts illegal selectors but converts them to UNKNOWN. Standards-based (s.shee.cssRules) just reject the rule
        return [s.styleSheet ? !/UNKNOWN/i.test(s.styleSheet.cssText) : !!s.sheet.cssRules.length, parser(s).remove()][0]; // the [x,y][0] is a silly hack to evaluate two expressions and return the first
    };

    parser.parsecss.parseArguments = function(str) {
        if (!str) return [];
        var ret = [], mungedArguments = munge(str, true).split(/\s+/); // can't use parser.map because it flattens arrays !
        for (var i = 0; i < mungedArguments.length; ++i) {
            var a = restore(mungedArguments[i]);
            try {
                ret.push(eval('('+a+')'));
            } catch(err) {
                ret.push(a);
            }
        }
        return ret;
    };

    //expose the styleAttributes function
    parser.parsecss.styleAttributes = styleAttributes;

    // caches
    var media = {}; // media description strings
    var munged = {}; // strings that were removed by the parser so they don't mess up searching for specific characters

    // private functions

    function parsedeclarations(index) { // take a string from the munged array and parse it into an object of property: value pairs
        var str = munged[index].replace(/^{|}parser/g, ''); // find the string and remove the surrounding braces
        str = munge(str); // make sure any internal braces or strings are escaped
        var parsed = {};
        str.split(';').forEach(function (decl) {
            decl = decl.split(':');
            if (decl.length < 2) return;
            parsed[restore(decl[0])] = restore(decl.slice(1).join(':'));
        });
        return parsed;
    }

    // replace strings and brace-surrounded blocks with %s`number`s% and %b`number`b%. By successively taking out the innermost
    // blocks, we ensure that we're matching braces. No way to do this with just regular expressions. Obviously, this assumes no one
    // would use %s` in the real world.
    // Turns out this is similar to the method that Dean Edwards used for his CSS parser in IE7.js (http://code.google.com/p/ie7-js/)
    var REbraces = /{[^{}]*}/;
    var REfull = /\[[^\[\]]*\]|{[^{}]*}|\([^()]*\)|function(\s+\w+)?(\s*%b`\d+`b%){2}/; // match pairs of parentheses, brackets, and braces and function definitions.
    var REatcomment = /\/\*@((?:[^\*]|\*[^\/])*)\*\//g; // comments of the form /*@ text */ have text parsed
    // we have to combine the comments and the strings because comments can contain string delimiters and strings can contain comment delimiters
    // var REcomment = /\/\*(?:[^\*]|\*[^\/])*\*\/|<!--|-->/g; // other comments are stripped. (this is a simplification of real SGML comments (see http://htmlhelp.com/reference/wilbur/misc/comment.html) , but it's what real browsers use)
    // var REstring = /\\.|"(?:[^\\\"]|\\.|\\\n)*"|'(?:[^\\\']|\\.|\\\n)*'/g; //  match escaped characters and strings
    var REcomment_string =
        /(?:\/\*(?:[^\*]|\*[^\/])*\*\/)|(\\.|"(?:[^\\\"]|\\.|\\\n)*"|'(?:[^\\\']|\\.|\\\n)*')/g;
    var REmunged = /%\w`(\d+)`\w%/;
    var uid = 0; // unique id number
    function munge(str, full) {
        var match;
        var replacement;
        str = str
            .replace(REatcomment,'parser1') // strip /*@ comments but leave the text (to let invalid CSS through)
            .replace(REcomment_string, function (s, string) { // strip strings and escaped characters, leaving munged markers, and strip comments
                if (!string) return '';

                var replacement = '%s`'+(++uid)+'`s%';
                munged[uid] = string.replace(/^\\/,''); // strip the backslash now
                return replacement;
            });
        // need a loop here rather than .replace since we need to replace nested braces
        var RE = full ? REfull : REbraces;
        while (match = RE.exec(str)) {
            replacement = '%b`'+(++uid)+'`b%';
            munged[uid] = match[0];
            str = str.replace(RE, replacement);
        }
        return str;
    }

    function restore(str) {
        var match;
        if (str === undefined) return str;
        while (match = REmunged.exec(str)) {
            str = str.replace(REmunged, munged[match[1]]);
        }
        return str.trim();
    }

    function processAtRule (rule, media, callback) {
        var split = rule.split(/\s+/); // split on whitespace
        var type = split.shift(); // first word
        if (type=='media') {
            var css = restore(split.pop()).slice(1,-1); // last word is the rule; need to strip the outermost braces
            if (parser.parsecss.mediumApplies(split.join(' '), media)) {
                parser.parsecss(css, {}, callback);
            }
        } else if (type=='import') {
            var url = restore(split.shift());
            if (parser.parsecss.mediumApplies(split.join(' '), media)) {
                url = url.replace(/^url\(|\)parser/gi, '').replace(/^["']|["']parser/g, ''); // remove the url('...') wrapper
                parser.get(url, function(str) { parser.parsecss(str, {}, callback) });
            }
        } else if (type=='-webkit-keyframes' || type=='-moz-keyframes' || type=='keyframes') {
            var kfName = split.shift();
            var css = restore(split.join(' '));
            css = css.substr(1, css.length - 2); // strip {}
            parser.parsecss(css, {}, function(keyframes) {
                // console.log("Parsed keyframes: ", keyframes);
                var ret = {};
                ret[kfName] = keyframess;
                callback(ret);
            })
        }
    }

    // experimental: find unrecognized style attributes in elements by reloading the code as text
    var RESGMLcomment = /<!--([^-]|-[^-])*-->/g; // as above, a simplification of real comments. Don't put -- in your HTML comments!
    var REnotATag = /(>)[^<]*/g;
    var REtag = /<(\w+)([^>]*)>/g;

    function styleAttributes (HTMLtext, callback) {
        var ret = '', style, tags = {}; //  keep track of tags so we can identify elements unambiguously
        HTMLtext = HTMLtext.replace(RESGMLcomment, ''); //.replace(REnotATag, 'parser1');
        munge(HTMLtext).replace(REtag, function(s, tag, attrs) {
            tag = tag.toLowerCase();
            if (tags[tag]) ++tags[tag]; else tags[tag] = 1;
            if (style = /\bstyle\s*=\s*(%s`\d+`s%)/i.exec(attrs)) { // style attributes must be of the form style = "a: bc" ; they must be in quotes. After munging, they are marked with numbers. Grab that number
                var id = /\bid\s*=\s*(\S+)/i.exec(attrs); // find the id if there is one.
                if (id) id = tag+'#'+restore(id[1]).replace(/^['"]|['"]/g,''); //"
                else id = tag; //sg + ':eq(' + (tags[tag]-1) + ')'; //"
                ret += [id, '{', restore(style[1]).replace(/^['"]|['"]/g,''),'}'].join(''); //"
                //console.log('ret='+ret);
            }
        });
        parser.parsecss(ret, {}, callback);
    }

})(CSSParser);

(function(loader) {
    loader.styles   = {};
    loader.loadcss = function(str, media) {
        CSSParser.parsecss(str,media, function(val) {
            CSSParser.extend(loader.styles,val);
        });
        return this;
    }

    loader.mixin = function(attrs, attr) {
        for (var vals in attr) {
            //console.log(vals+':'+attr[vals]);
            attrs[vals] = attr[vals];
        }
    }

    loader.get = function(index) {
        //console.log('getting index='+index);
        return loader.styles[index];
    }

    loader.gather = function (tag,id,clazz,style,callback) {
        var attrs = {};
        var tel = tag;
        var tid = '#'+id;
        var tcl = (clazz != undefined) ? '.'+clazz : undefined;
        var cls = (clazz != undefined) ? clazz.split(' ') : undefined;
        var clj = "";

        // handle local style overrides first
        if (style != undefined) {
            var HTMLtext="<"+tag;
            if (id != undefined) HTMLtext = HTMLtext + " id=\""+id+"\"";
            HTMLtext = HTMLtext + " style=\""+style+"\">";
            CSSParser.parsecss.styleAttributes(HTMLtext, function(val) {
                CSSParser.extend(loader.styles,val);
            });
        }

        // Specificity is calculated by counting various components of your css and expressing them in a form (a,b,c,d).
        // Element, Pseudo Element: d = 1 � (0,0,0,1)
        // Class, Pseudo class, Attribute: c = 1 � (0,0,1,0)
        // Id: b = 1 � (0,1,0,0)
        // Inline Style: a = 1 � (1,0,0,0)
        // hence we collect in this order; element,class,id

        // start with element
        loader.mixin(attrs, loader.get(tel));

        if (cls != undefined) {
            // there can be multiple items in a class listing e.g. class="hot water"
            // we first break these into separate items and collect from each...
            cls.forEach(function(cl) {
                var lcl = '.'+cl;
                clj = clj + lcl;
                // class
                loader.mixin(attrs, loader.get(lcl));
                // element + class
                loader.mixin(attrs, loader.get(tel+lcl));
            });
            // composite class
            loader.mixin(attrs, loader.get(clj));
            // element + composite class
            loader.mixin(attrs, loader.get(tel+clj));
        }

        // id
        loader.mixin(attrs, loader.get(tid));
        // element + id
        loader.mixin(attrs, loader.get(tel+tid));

        if (cls != undefined) {
            // id+class (individuals)
            cls.forEach(function(cl) {
                var lcl = '.'+cl;
                loader.mixin(attrs, loader.get(tid+lcl));
                loader.mixin(attrs, loader.get(tel+tid+lcl));
            });
            // id + class (joint)
            loader.mixin(attrs, loader.get(tid+clj));
            loader.mixin(attrs, loader.get(tel+tid+clj));
        }
        callback(attrs);
    }
})(CSSLoader);

if (typeof(exports) !== "undefined") {
    exports.CSSParser = CSSParser;
    exports.CSSLoader = CSSLoader;
}
