class MenuElement {

    // Format of onClick:
    // function(MenuElement sender)
    // Handles clicking inside of it
    constructor(id, onClick, bounds) {
        this.bounds = bounds;
        this.onClick = onClick;

        this.highlighted = false;
        this.clicked = false;

        this.mouseReleased = false;
        this.mousePressed = false;

        this.clickSound = null;

        this.id = id;
    }

    update() {
        this.updateClicking();
        this.updateBounds();
    }

    draw() {
    }

    updateClicking() {
        this.highlighted = (mouseX > this.bounds.x && mouseX < this.bounds.x + this.bounds.width &&
            mouseY > this.bounds.y && mouseY < this.bounds.y + this.bounds.height);
        this.clicked = this.highlighted && mouseIsPressed;

        // Use mouseReleased to check for a full click (which happens when mouse was previously down and is now released)
        if (mouseIsPressed && this.highlighted) {
            this.mouseReleased = false;
            this.mousePressed = true;
        } else {
            this.mouseReleased = true;
        }

        if (this.highlighted && this.mousePressed && this.mouseReleased && this.onClick != null) {
            this.mouseReleased = false;
            if (this.clickSound != null) {
                Sounds.play(this.clickSound);
            }
            this.onClick(this);
        }

        // Reset the mouse pressed at the end of the update cycle
        // This way, mousePressed and mouseReleased can only be true in the middle of the update cycle
        this.mousePressed = mouseIsPressed;
    }

    updateBounds() {
        // Putting a negative number for X or Y will center the elements on that axis
        if (this.bounds.x < 0) {
            this.bounds.x = windowWidth / 2 - this.bounds.width / 2;
        }
        if (this.bounds.y < 0) {
            this.bounds.y = windowHeight / 2 - this.bounds.height / 2;
        }
    }
}