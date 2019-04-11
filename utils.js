const extend = require('util')._extend;
const optimist = require('optimist');
const fs = require('fs');
const path = require('path');
let cliArgv = optimist.default('logOnlyErrors', 0).argv;
const Autolinker = require( 'autolinker' );

let output = function(type, data){

	let coloring = true; //!cliArgv.daemon;


    if(!(data instanceof Array)){
        data = [data];
    }

    data.unshift((new Date).format("yyyy-mm-dd HH:MM:ss"));

    if(coloring) {
        let colors = {
            "error": '\x1b[31m',
            "info": '\x1b[35m',
            "warning": '\x1b[33m'
        };

        if (type in colors) {
            data.unshift(colors[type]);
            data.push('\x1b[0m');
        }
    }



    console.log.apply(null, data);
};

let _log = function(type, all) {

    let args = Array.from(all), messArr = [], raw, str, allStr = true;

    if (!type) type = "log";

    if(cliArgv.logOnlyErrors && type !== "error"){
    	return;
	}

    args.forEach(function(err){
        let s = err;

        if(typeof err === "object"){
            allStr = false;

            if(err instanceof Error){
                s = Utils.getExceptionStr(err);
            }

            if(err instanceof Array){

            }

        }
        messArr.push(s);
    });

    str = messArr.join("|");

    if(!allStr){
        output(type, args);
    }else{
        output(type, str);
    }


    //write to log file

};

log = function() {
    _log('log', arguments)
};

info = function() {
    _log('info', arguments)
};

error = function () {
    _log('error', arguments);
};

warning = function () {
    _log('warning', arguments);
};



let dateFormat = function () {
	let	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		let dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		let	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};

Object.defineProperty(String.prototype, 'replaceAll', {
    enumerable: false,
    value: function(search, replacement) {
        let target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    }
});

Object.defineProperty(Object.prototype, 'assignNotEmpty', {
    enumerable: false,
    value: function(obj) {
        for(let i in obj){
        	if(!obj[i]) delete obj[i];
		}

		return Object.assign(this, obj);
    }
});

Object.defineProperty(Array.prototype, 'shuffle', {
    enumerable: false,
    value: function(obj) {

        var j, x, i;
        for (i = this.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = this[i];
            this[i] = this[j];
            this[j] = x;
        }
        return this;

    }
});


Object.defineProperty(Array.prototype, 'unset', {
    enumerable: false,
    value: function(val) {
        var i = this.indexOf(val);
        if(i !== -1) this.splice(i, 1);
    }
});


Object.defineProperty(Object.prototype, 'isEmpty', {
    enumerable: false,
    configurable: false,
    value: function() {
        for(var key in this) {
            if(this.hasOwnProperty(key))
                return false;
        }
        return true;
    }
});


class Daemon{

	constructor(filename){

		this.pidDir = path.resolve(__dirname + "/../../pid");


		if(!fs.existsSync(this.pidDir)){
			fs.mkdirSync(this.pidDir, 0o755);
		}

		if(!fs.existsSync(this.pidDir)){
			throw new Error("pid dir error: " + this.pidDir);
		}


		this.pid = process.pid;
		this.pidFilename = filename.replaceAll(path.sep, "_").substring(1) + ".pid";
		this.pidPath = this.pidDir + path.sep + this.pidFilename;

		process.on('SIGUSR2', function(){
			log("i'm running");
		});

	}



	writePid(){
		fs.writeFileSync(this.pidPath, this.pid);
	}

	existsPid(){

		if(fs.existsSync(this.pidPath)){
			const pid = fs.readFileSync(this.pidPath).toString();

			if(pid){

				try {
                    process.kill(pid, 'SIGUSR2');
                    return pid;
                }catch (e){
					log("process not running");
				}
			}
        }

	}

	createOrFail(){
	    let pid = this.existsPid();
		if(!pid){
			this.writePid();
		}else{
			throw new Error(`process running pid ${pid}...exit`);
		}

	}

}

class Utils{

    static random(high, chars) {
        let res = "", ind = 0;
        while (res.length < high) {
            ind = Math.floor(Math.random() * chars.length);
            res += chars.substr(ind, 1);
        }
        return res;
    }

    static randomInt(high) {
        return this.random(high, '0123456789')
    }

    static randomString(high) {
        return this.random(high, '0123456789abcdefghijklmnopqrstuvwxyz')
    }

    static parseCookie(str) {
        let arr = str && str.length > 0 ? str.split(";") : [], res = {};
        arr.forEach(function(s){
            let pair = s.split("=");
            if(pair.length > 1) {
                res[pair[0].trim()] = pair[1].trim();
            }
        });

        return res;
    };

    static getExceptionStr(e){
        return  e.name + ": " + e.message;
    }

    static firstToUpper(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    static firstToLower(string) {
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    static clone(obj){
        return extend({}, obj);
    }

    static extend(obj, obj2){
        return extend(obj, obj2);
    }

    static findBy(array, n, v){
        let item;
        for(let i in array){
            item = array[i];
            if(typeof  item === "object" && n in item && item[n] === v){
                return item;
            }
        }
    }


    static round(v, p){
        let rounded = Math.round(v);
        if(v != rounded) {
            v = v.toFixed(2);
            var a = (v).toString().split('.');
            if (a.length > 1) {
                v = a[0] + "." + a[1].substring(0, p);
            }
        }else{
            v = rounded.toString();
        }

        return v;
    }

    static fts(v){
        return this.round(v, 2);
    }

    static bytes(bytes){

        let kb = 1024,
            mb = 1024 * kb,
            gb = 1024 * mb;

        if      (bytes>=gb) {bytes=this.fts(bytes/gb)+' GB';}
        else if (bytes>=mb)    {bytes=this.fts(bytes/mb)+' MB';}
        else if (bytes>=kb)       {bytes=this.fts(bytes/kb)+' KB';}
        else if (bytes>1)           {bytes=bytes+' b.';}
        else if (bytes==1)          {bytes=bytes+' b.';}
        else                        {bytes='0 b.';}


        return bytes;

    }

    static urlToLink(str, opt = {}){
    	return Autolinker.link(str, opt);
	}


    static rand(min, max){
        if(!max) max = 10;
        var rand = min - 0.5 + Math.random() * (max - min + 1)
        rand = Math.round(rand);
        return rand;

    }



}

module.exports = Utils;
module.exports.Daemon = Daemon;