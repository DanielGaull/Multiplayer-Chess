class CreditsMenu extends Menu {
    constructor(onBackClick) {
        super("CREDITS");

        this.backButtonId = 0;

        this.elements.push(new Button(this.backButtonId, "Back", 10, windowHeight - this.standardHeight - 10, 
            this.standardWidth, this.standardHeight, onBackClick));

        this.CREDITS = [
            "Click Sound - Created by bubaproducer (freesound.org)",
            "Various Chess Piece Sounds - Created by BiancaBothaPure (freesound.org)",
            "Victory Sound - Created by Killersmurf96 (freesound.org)",
            "Game Over Sound - Created by afleetingspeck (freesound.org)"
        ];
    }

    draw() {
        super.draw();

        fill(240);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(35);
        for (let i = 0; i < this.CREDITS.length; i++) {
            text(this.CREDITS[i], windowWidth / 2, (textAscent() + 5) * i + 150);
        }
    }

    onResize() {
        this.getElementById(this.backButtonId).bounds = { x: 10, y: windowHeight - this.standardHeight - 10, 
            width: this.standardWidth, height: this.standardHeight };
    }
}