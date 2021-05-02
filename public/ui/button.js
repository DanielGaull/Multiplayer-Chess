class Button extends MenuElement {

    constructor(id, buttonText, x, y, width, height, onClick, bgColor = color(60), detailColor = color(240),
        highlightColor = color(75), clickColor = color(100), buttonTextSize = 35, buttonTextFont = "Arial") {
        super(id, onClick, { x: x, y: y, width: width, height: height });
        this.buttonText = buttonText;
        this.bgColor = bgColor;
        this.detailColor = detailColor;
        this.buttonTextSize = buttonTextSize;
        this.buttonTextFont = buttonTextFont;
        this.highlightColor = highlightColor;
        this.clickColor = clickColor;

        this.clickSound = Sounds.CLICK;
    }

    draw() {
        // Draw BG rectangle
        strokeWeight(1);
        stroke(this.detailColor);
        if (this.clicked) {
            fill(this.clickColor);
        } else if (this.highlighted) {
            fill(this.highlightColor);
        } else {
            fill(this.bgColor);
        }
        rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

        // Draw text
        fill(this.detailColor);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(this.buttonTextSize);
        textFont(this.buttonTextFont);
        text(this.buttonText, this.bounds.x + this.bounds.width / 2, this.bounds.y + this.bounds.height / 2);
    }
}