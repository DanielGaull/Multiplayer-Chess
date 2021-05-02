class Textbox extends MenuElement {
    constructor(id, defaultText, x, y, width, height, maxLength, bgColor = color(60), detailColor = color(240),
        highlightColor = color(75), boxTextSize = 35, boxTextFont = "Arial") {
        super(id, null, { x: x, y: y, width: width, height: height });
        this.onClick = this.whenClicked;

        this.defaultText = defaultText;
        this.boxText = defaultText;
        this.maxLength = maxLength;

        this.bgColor = bgColor;
        this.detailColor = detailColor;
        this.boxTextSize = boxTextSize;
        this.boxTextFont = boxTextFont;
        this.highlightColor = highlightColor;

        this.selected = false;

        this.cursorTimer = 0;
        this.CURSOR_TIME = 500;
        this.CURSOR_HEIGHT = height - 40;
        this.showCursor = false;

        Textbox.all.push(this);
    }

    static init() {
        Textbox.all = [];
    }

    update() {
        if (mouseIsPressed) {
            // Will set to false, and only reset to true if the click detection detects a that the click is in here
            this.selected = false;

            this.cursorTimer = 0;
            this.showCursor = false;
        }

        super.updateClicking();
        super.updateBounds();

        if (this.selected) {
            // Update cursor blinking
            if (millis() - this.cursorTimer >= this.CURSOR_TIME) {
                this.cursorTimer = millis();
                this.showCursor = !this.showCursor;
            }
        }
    }

    draw() {
        if (this.selected) {
            fill(this.highlightColor);
        } else {
            fill(this.bgColor);
        }
        stroke(this.detailColor);
        strokeWeight(1);
        rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

        textAlign(CENTER, CENTER);
        textSize(this.boxTextSize);
        textFont(this.boxTextFont);

        if (this.selected) {
            // Draw cursor
            if (this.showCursor) {
                let cursorX = this.bounds.x + this.bounds.width / 2 + textWidth(this.boxText) / 2 + 5;
                line(cursorX, this.bounds.y + (this.bounds.height - this.CURSOR_HEIGHT) / 2, 
                    cursorX, this.bounds.y + this.bounds.height - (this.bounds.height - this.CURSOR_HEIGHT) / 2);
            }
        }

        // Draw the text
        fill(this.detailColor);
        noStroke();
        text(this.boxText, this.bounds.x + this.bounds.width / 2, this.bounds.y + this.bounds.height / 2);
    }

    whenClicked() {
        this.selected = true;
    }

    keyPressed(key) {
        if (this.selected) {
            // 16 is the shift key
            let keyString = this.getStringForKeyCode(key, keyIsDown(16));
            if (keyString != null && this.boxText.length + keyString.length < this.maxLength) {
                this.boxText += keyString;
            }
            if (key == 8) { // Backspace
                if (this.boxText.length > 1) {
                    this.boxText = this.boxText.slice(0, -1);
                } else {
                    this.boxText = "";
                }
            }
        }
    }

    getStringForKeyCode(code, isShift) {
        switch (code) {
            case 65: return isShift ? "A" : "a";
            case 66: return isShift ? "B" : "b";
            case 67: return isShift ? "C" : "c";
            case 68: return isShift ? "D" : "d";
            case 69: return isShift ? "E" : "e";
            case 70: return isShift ? "F" : "f";
            case 71: return isShift ? "G" : "g";
            case 72: return isShift ? "H" : "h";
            case 73: return isShift ? "I" : "i";
            case 74: return isShift ? "J" : "j";
            case 75: return isShift ? "K" : "k";
            case 76: return isShift ? "L" : "l";
            case 77: return isShift ? "M" : "m";
            case 78: return isShift ? "N" : "n";
            case 79: return isShift ? "O" : "o";
            case 80: return isShift ? "P" : "p";
            case 81: return isShift ? "Q" : "q";
            case 82: return isShift ? "R" : "r";
            case 83: return isShift ? "S" : "s";
            case 84: return isShift ? "T" : "t";
            case 85: return isShift ? "U" : "u";
            case 86: return isShift ? "V" : "v";
            case 87: return isShift ? "W" : "w";
            case 88: return isShift ? "X" : "x";
            case 89: return isShift ? "Y" : "y";
            case 90: return isShift ? "Z" : "z";
            case 32: return " ";
            case 48: return isShift ? ")" : "0";
            case 49: return isShift ? "!" : "1";
            case 50: return isShift ? "@" : "2";
            case 51: return isShift ? "#" : "3";
            case 52: return isShift ? "$" : "4";
            case 53: return isShift ? "%" : "5";
            case 54: return isShift ? "^" : "6";
            case 55: return isShift ? "&" : "7";
            case 56: return isShift ? "*" : "8";
            case 57: return isShift ? "(" : "9";
            case 96: return "0";
            case 97: return "1";
            case 98: return "2";
            case 99: return "3";
            case 100: return "4";
            case 101: return "5";
            case 102: return "6";
            case 103: return "7";
            case 104: return "8";
            case 105: return "9";
            case 106: return "*";
            case 107: return "+";
            case 109: return "-";
            case 110: return ".";
            case 111: return "/";
            case 192: return isShift ? "~" : "`";
            case 189: return isShift ? "_" : "-";
            case 187: return isShift ? "+" : "=";
            case 219: return isShift ? "{" : "[";
            case 221: return isShift ? "}" : "]";
            case 220: return isShift ? "|" : "\\";
            case 186: return isShift ? ";" : ":";
            case 222: return isShift ? "'" : "\"";
            case 188: return isShift ? "<" : ",";
            case 190: return isShift ? ">" : ".";
            case 191: return isShift ? "?" : "/";
        }
        return null;
    }
}