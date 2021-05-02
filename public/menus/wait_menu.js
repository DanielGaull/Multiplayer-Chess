class WaitMenu extends Menu {
    constructor(onBackClick) {
        super(null);

        this.waitSpinnerId = 0;
        this.backButtonId = 1;

        this.elements.push(new LoadingSpinner(this.waitSpinnerId, windowWidth / 2, windowHeight / 2, 15, this.standardHeight, color(200)));

        this.elements.push(new Button(this.backButtonId, "Back", -1, windowHeight / 6 * 5,
            this.standardWidth, this.standardHeight, onBackClick));
    }

    draw() {
        super.draw();

        noStroke();
        fill(240);
        textSize(40);
        textFont("Arial");
        textAlign(CENTER, CENTER);
        text("Searching for match...", windowWidth / 2, windowHeight / 4 * 3);
    }

    onResize() {
        this.getElementById(this.backButtonId).bounds = { x: -1, y: windowHeight / 6 * 5, 
            width: this.standardWidth, height: this.standardHeight };
        this.getElementById(this.waitSpinnerId).bounds = { x: windowWidth / 2, y: windowHeight / 2, 
            width: this.standardHeight, height: this.standardHeight };
    }
}