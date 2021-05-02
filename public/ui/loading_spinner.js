class LoadingSpinner extends MenuElement {
    constructor(id, centerX, centerY, dotDiameter, size, dotColor) {
        super(id, null, {x: centerX, y: centerY, width: size, height: size});

        this.dotDiameter = dotDiameter;
        this.dotColor = dotColor;

        this.numDots = 10;
        this.angles = [];
        this.rotateSpd = Math.PI / 100;
        for (let i = 0; i < this.numDots; i++) {
            this.angles.push(i * Math.PI * 2 / this.numDots);
        }
    }

    update() {
        for (let i = 0; i < this.numDots; i++) {
            this.angles[i] = (this.angles[i] + this.rotateSpd) % (Math.PI * 2);
        }
    }

    draw() {
        stroke(this.dotColor);
        strokeWeight(this.dotDiameter);
        for (let i = 0; i < this.numDots; i++) {
            point(this.bounds.x + Math.cos(this.angles[i]) * this.bounds.width, this.bounds.y + Math.sin(this.angles[i]) * this.bounds.width);
        }
    }
}