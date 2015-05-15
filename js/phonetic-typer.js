
// TODO : add full map as a table
// TODO : what if we replace a non-changing final letter by a changing final like peh
// TODO : add support for double-letter insertion (ex: j-->g')

MAP = {
    "a":["א","ע"],
    "b":"ב",
    "c":["כ","ק","ח"],
    "d":"ד",
    "e":["ע","א"],
    "f":"פ",
    "g":"ג",
    "h":["ה","כ","ח"],
    "i":["י","א","ע"],
	"j": ["ג","י"],
	"k":["ח","ק","כ"],
    "l":"ל",
    "m":"מ",
    "n":"נ",
    "o":["ו", "א","ע"],
	"p":"פ",
	"q":["ק","כ","ח"],
	"r":"ר",
	"s":["ש","ס"],
	"t":["ת","ט", "צ"],
	"u":["ו","א"],
	"v":["ו","ב"],
	"w":["ב","ו"],
	"x":"ק",
	"y":"י",
	"z":["ז","צ"]
};

FINALS_MAP = {
	"נ":"ן",
	"מ":"ם",
	"פ":"ף",
	"צ":"ץ",
	"כ":"ך"
};

punctuationCodes = [13,32,33,44,46,58,59,63];
// for browser compatibility
ignoreOnKeyPress = [37,38,39,40,8];

// get caret offset in textarea (http://stackoverflow.com/questions/1891444/)
(function ($, undefined) {
    $.fn.getCursorPosition = function() {
        var el = $(this).get(0);
        var pos = 0;
        if('selectionStart' in el) {
            pos = el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }
})(jQuery);

// set caret position in textarea
function setCaretPosition(elemId, caretPos) {
    var elem = document.getElementById(elemId);

    if(elem != null) {
        if(elem.createTextRange) {
            var range = elem.createTextRange();
            range.move('character', caretPos);
            range.select();
        }
        else {
            if(elem.selectionStart) {
                elem.focus();
                elem.setSelectionRange(caretPos, caretPos);
            }
            else
                elem.focus();
        }
    }
}

// string manipulation
String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}

String.prototype.insertAt=function(index, string) {
	if (index > 0)
		return this.substring(0, index) + string + this.substring(index, this.length);
	else
		return string + this;
}

String.prototype.removeAt=function(start, stop) {
	if (start >= 0) {
		var complement = stop < this.length ? this.substring(stop+1, this.length) : "";
		return this.substring(0, start) + complement;
	} else return this;
}

// fix modulo on negative numbers
Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

$(document).ready(function() {

    var body = $('body');
    var popup = $('<div>', {class:'suggestions btn-group'});
    popup.hide();
    body.append(popup);

    var txt = $('#txt');
	var selectedIndex = null;
	var lastInput = null;
	var lastPosition = null;
        

	txt.keydown(function(e) {
		// close popup if backspace or arrows are pressed
		if (ignoreOnKeyPress.indexOf(e.which || e.keyCode) != -1){
			selectedIndex = null;
			popup.hide();
		}
		return;
	});

    txt.keypress(function(e) {
	
		// for browsers that trigger "keypress" on arrows or other non-char keys
		if (ignoreOnKeyPress.indexOf(e.which || e.keyCode) != -1 
			|| e.ctrlKey || e.altKey || e.metaKey) {
			return;
		}

		// e.which is the most reliable attribute across browsers
		var letter = String.fromCharCode(e.which).toLowerCase();
        var content = txt.val();
		var mapping = MAP[letter];
		var position = txt.getCursorPosition();
		
		// if some text is selected in the textarea, remove it
		if (window.getSelection.toString() != "") {
			var start = txt[0].selectionStart;
			var end = txt[0].selectionEnd;
			if (start > end) {
				var temp = start;
				start = end;
				end = temp;
			}
			content = content.removeAt(start, end-1); 
			if (position > start) {
				position = position - (end-start);
			}
		} 
		
		if (selectedIndex != null) {
			// a popup is active
			if (lastPosition +1 != position) {
				// if the caret has jumped, close popup
				selectedIndex = null;
				popup.hide();
			} else if (lastInput != letter) {
				// if we press a new key, close popup
				selectedIndex = null;
				popup.hide();
				if (e.which == 13) {
					// hit Enter => accept current letter
					setCaretPosition("txt",position);
					return false;
				}
			} else {
				// if we press the same key, switch to next mapping
				var children = popup.children();
				$(children[selectedIndex]).removeClass("selected");
				var nbChildren = children.length;
				selectedIndex = (selectedIndex-1).mod(nbChildren);
				var active = $(children[selectedIndex]);
				active.addClass("selected");
				txt.val(content.replaceAt(position-1, active.text()));
				setCaretPosition("txt",position);
				return false;
			}
		}
		
		if (mapping === undefined) {
			// no mapping found (punctuation, etc.)
			selectedIndex = null;
			if (punctuationCodes.indexOf(e.which) != -1) {
				// transform final letter of a word if needed
				var lastLetter = content[position-1];
				txt.val(content.replaceAt(position-1, 
					FINALS_MAP[lastLetter] || lastLetter).insertAt(position, letter));
				setCaretPosition("txt",position+1);
				return false;
			} else {
				setCaretPosition("txt",position+1);
				return true;
			}
		} else if (mapping.constructor == Array) {
			// multiple mapping; display popup
			popup.empty();
			for (var i=mapping.length-1 ; i >= 0 ; i--) {
				popup.append($("<button>", {text: mapping[i], class: "btn btn-default letter"}));
			}
			var selected = popup.children().last();
			selected.addClass("selected");
			selectedIndex = mapping.length-1;
			lastInput = letter;
			lastPosition = position;
			
			txt.val(content.insertAt(position, mapping[0]));
			
			var coordinates = getCaretCoordinates(this, this.selectionEnd);
			popup.css('top', txt.offset().top + coordinates.top + "px");
			popup.css('left', txt.offset().left + coordinates.left - popup.width() - 5 + "px");
			popup.show();			
		} else if (mapping.constructor == String) {
			// unique mapping
			txt.val(content.insertAt(position, mapping));		
		}
		setCaretPosition("txt",position+1);
		return false;
    });

	// fill modal dialog with map
	var modal = $(".modal-body");
	var table = $("<table>", { class: "table-striped table-map"});
	table.append($("<thead>").append($("<tr>").append($("<th>", {text: "Roman"}), $("<th>", {text: "Hebrew"}))));
	var tbody = $("<tbody>");
	for (key in MAP) {
		var mapping = MAP[key];
		var tr = $("<tr>");
		if (mapping.constructor == String) {
			tr.append($("<td>", {text: key}), $("<td>", {text: mapping}));
		} else if (mapping.constructor == Array) {
			tr.append($("<td>", {text: key}), $("<td>", {text: mapping.join(", ")}));
		}
		tbody.append(tr);
	}
	modal.append(table.append(tbody));
	
	
	txt.focus();
	
	var name = "zhfeedback";
	var domain = "gmail.com";
	$("form").after($("<a>", { text: "Contact", href: "mailto:"+name+"@"+domain}));
});