class StartMenu extends Menu {
    constructor(onStartClick, onCreditsClick) {
        super("CHESS");

        this.onStart = onStartClick;

        this.startButtonId = 0;
        this.usernameBoxId = 1;
        this.creditsButtonId = 2;

        this.elements.push(new Textbox(this.usernameBoxId, "Player", -1, windowHeight / 4, this.standardWidth * 2,
            this.standardHeight, 15));
        this.elements.push(new Button(this.startButtonId, "Find Match", -1, windowHeight / 4 + this.standardHeight * 1.25, 
            this.standardWidth, this.standardHeight, () => this.whenStartClicked(this.username, this.onStart)));
        this.elements.push(new Button(this.creditsButtonId, "Credits", windowWidth - this.standardWidth - 10, 
            windowHeight - this.standardHeight - 10, this.standardWidth, this.standardHeight, onCreditsClick));
    }

    get username() {
        return this.getElementById(this.usernameBoxId).boxText;
    }

    whenStartClicked(username, onStart) {
        if (username.length > 0) {
            onStart();
        }
    }

    onResize() {
        this.getElementById(this.startButtonId).bounds = { x: -1, y: windowHeight / 4, 
            width: this.standardWidth * 2, height: this.standardHeight };
        this.getElementById(this.usernameBoxId).bounds = { x: -1, y: windowHeight / 4 + this.standardHeight * 1.25, 
            width: this.standardWidth, height: this.standardHeight };
        this.getElementById(this.creditsButtonId).bounds = { x: windowWidth - this.standardWidth - 10, y: 
            windowHeight - this.standardHeight - 10, width: this.standardWidth, height: this.standardHeight };
    }
}