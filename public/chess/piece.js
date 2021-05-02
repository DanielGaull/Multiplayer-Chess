class ChessPiece {
    constructor(id, pieceType, team, x, y, squareSize, imgSize) {
        this.outlineImg = loadImage("res/" + pieceType.name + ".png");
        this.fillImg = loadImage("res/" + pieceType.name + "_bg.png");

        this.team = team;
        this.id = id;
        this.type = pieceType;

        this.x = x;
        this.y = y;
        this.imgSize = imgSize;
        this.squareSize = squareSize;

        this.didFirstMove = false;

        this.selected = false;
    }

    draw() {
        let drawX = this.x + this.squareSize / 2 - this.imgSize / 2;
        let drawY = this.y + this.squareSize / 2 - this.imgSize / 2;

        if (this.team == ChessPiece.WHITE_TEAM) {
            tint(200);
        } else if (this.team == ChessPiece.BLACK_TEAM) {
            tint(100);
        }
        image(this.fillImg, drawX, drawY, this.imgSize, this.imgSize);
        if (this.team == ChessPiece.WHITE_TEAM) {
            tint(150);
        } else if (this.team == ChessPiece.BLACK_TEAM) {
            tint(55);
        }
        image(this.outlineImg, drawX, drawY, this.imgSize, this.imgSize);

        // fill(0);
        // noStroke();
        // textSize(20);
        // text(this.id, drawX, drawY);
    }

    trySelect() {
        this.selected = (mouseX > this.x && mouseX < this.x + this.squareSize &&
            mouseY > this.y && mouseY < this.y + this.squareSize);
        return this.selected;
    }

    changeType(type) {
        this.outlineImg = loadImage("res/" + type.name + ".png");
        this.fillImg = loadImage("res/" + type.name + "_bg.png");
        this.type = type;
    }

    static init() {
        ChessPiece.PIECES = Object.freeze({
            PAWN: {id: 0, name: "pawn"},
            ROOK: {id: 1, name: "rook"},
            KNIGHT: {id: 2, name: "knight"},
            BISHOP: {id: 3, name: "bishop"},
            KING: {id: 4, name: "king"},
            QUEEN: {id: 5, name: "queen"}
        });
    }
    static getPieceFromId(id) {
        for (let prop in ChessPiece.PIECES) {
            if (id == ChessPiece.PIECES[prop].id) {
                return ChessPiece.PIECES[prop];
            }
        }
        return null;
    }

    static get BLACK_TEAM() {
        return 0;
    }
    static get WHITE_TEAM() {
        return 1;
    }
}