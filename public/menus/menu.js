class Menu {
    constructor(title, titleFont = "Arial", titleSize = 70, titleColor = color(240)) {
        this.elements = [];

        this.title = title;
        this.titleFont = titleFont;
        this.titleSize = titleSize;
        this.titleColor = titleColor;

        this.standardWidth = 300;
        this.standardHeight = 75;
    }

    update() {
        for (let i = 0; i < this.elements.length; i++) {
            this.elements[i].update();
        }
    }

    draw() {
        if (this.title != null && this.title.length > 0) {
            textFont(this.titleFont);
            fill(this.titleColor);
            noStroke();
            textSize(this.titleSize);
            textAlign(CENTER, CENTER);
            text(this.title, windowWidth / 2, textAscent() * 1.5);
        }

        for (let i = 0; i < this.elements.length; i++) {
            this.elements[i].draw();
        }
    }

    getElementById(id) {
        for (let i = 0; i < this.elements.length; i++) {
            if (this.elements[i].id == id) {
                return this.elements[i];
            }
        }
    }

    onResize() {

    }
}