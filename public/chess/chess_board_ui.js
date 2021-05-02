class ChessBoardUI extends Menu {
    constructor(onQuitClick, chessBoard) {
        super(null);

        this.quitButtonId = 0;
        this.quitButtonStartX = 15;

        this.elements.push(new Button(this.quitButtonId, "Quit", this.quitButtonStartX, windowHeight - this.standardHeight - 15,
            this.standardWidth / 2, this.standardHeight, onQuitClick));

        this.localPlayerName = "";
        this.enemyPlayerName = "";

        this.inCheck = false;

        this.chessBoard = chessBoard;

        this.showingTitle = false;
        this.titleText = "";
        this.titleGrowLerpFactor = 0;
        this.titleBorderColor = null;
        this.titleFillColor = null;
        this.isTitleMaxSize = false;
        this.TITLE_TEXT_SIZE = 65;
        this.TITLE_LERP_SPD = 0.2;

        this.slidingQuitButton = false;
        this.slideQuitButtonLerpFactor = 0;
        this.QUIT_BUTTON_LERP_SPD = 0.15;

        this.TAKEN_PIECE_SIZE = 40;
        this.MAX_TAKEN_PIECES_PER_ROW = 8;
        this.takenPieces = [];

        this.safeMoveCount = 0;
    }

    reset() {
        this.getElementById(this.quitButtonId).bounds.x = this.quitButtonStartX;
        this.showingTitle = false;
        this.slidingQuitButton = false;
        this.slideQuitButtonLerpFactor = 0;
        this.inCheck = false;
        this.takenPieces = [];
        this.safeMoveCount = 0;
    }

    update() {
        super.update();
        if (this.showingTitle && !this.isTitleMaxSize) {
            this.titleGrowLerpFactor += this.TITLE_LERP_SPD;
            if (this.titleGrowLerpFactor > 1) {
                this.titleGrowLerpFactor = 1;
                this.isTitleMaxSize = true;
            }
        }
        if (this.slidingQuitButton) {
            this.slideQuitButtonLerpFactor += this.QUIT_BUTTON_LERP_SPD;
            if (this.slideQuitButtonLerpFactor > 1) {
                this.slideQuitButtonLerpFactor = 1;
                this.slidingQuitButton = false;
            }

            this.getElementById(this.quitButtonId).bounds.x = lerp(this.quitButtonStartX, windowWidth / 2 - this.standardWidth / 4,
                this.slideQuitButtonLerpFactor);
        }
    }

    draw() {
        super.draw();

        noStroke();
        textSize(35);
        textFont("Arial");
        textAlign(RIGHT, CENTER);
        if (this.chessBoard.isTurn) {
            fill(100, 100, 255);
        } else {
            fill(240);
        }
        text(this.localPlayerName, windowWidth - 15, windowHeight - textAscent());
        textAlign(LEFT, CENTER);
        if (!this.chessBoard.isTurn) {
            fill(100, 100, 255);
        } else {
            fill(240);
        }
        text(this.enemyPlayerName, 15, textAscent());

        if (this.chessBoard.isTurn) {
            fill(240);
            textAlign(LEFT, BOTTOM);
            text("Safe Moves: " + this.safeMoveCount, 15, windowHeight - this.standardHeight - 30);
        }

        for (let i = 0; i < this.takenPieces.length; i++) {
            this.takenPieces[i].draw();
        }

        // Only show the "in check" indicator for the local player
        if (this.inCheck) {
            fill(255, 0, 0, 40);
            noStroke();
            rect(this.chessBoard.startX, this.chessBoard.startY, this.chessBoard.SIZE, this.chessBoard.SIZE);
        }

        if (this.showingTitle) {
            textAlign(CENTER, CENTER);
            stroke(this.titleBorderColor);
            strokeWeight(3);
            fill(this.titleFillColor);
            textSize(this.titleGrowLerpFactor * this.TITLE_TEXT_SIZE);
            text(this.titleText, windowWidth / 2, windowHeight / 2);
        }
    }

    addTakenPiece(id, type, team) {
        let piece = new ChessPiece(id, ChessPiece.getPieceFromId(type), team, 0, 0, this.TAKEN_PIECE_SIZE, this.TAKEN_PIECE_SIZE);
        let count = this.getTakenPieceCount(team);
        if (team == this.chessBoard.localTeam) {
            // The local player lost a piece, so show it at the top under their opponent's name
            piece.x = 15 + (count * this.TAKEN_PIECE_SIZE % this.MAX_TAKEN_PIECES_PER_ROW);
            piece.y = 55 + Math.floor(count / this.MAX_TAKEN_PIECES_PER_ROW) * (this.TAKEN_PIECE_SIZE + 5);
        } else {
            // The local player took a piece, so show it at the bottom
            piece.x = this.chessBoard.startX + this.chessBoard.SIZE + (count * this.TAKEN_PIECE_SIZE % this.MAX_TAKEN_PIECES_PER_ROW);
            piece.y = windowHeight - 100 - this.TAKEN_PIECE_SIZE +
                Math.floor(count / this.MAX_TAKEN_PIECES_PER_ROW) * (this.TAKEN_PIECE_SIZE + 5);
        }
        this.takenPieces.push(piece);
    }
    getTakenPieceCount(team) {
        let count = 0;
        for (let i = 0; i < this.takenPieces.length; i++) {
            if (this.takenPieces[i].team == team) {
                count++;
            }
        }
        return count;
    }

    showTitle(text, borderColor, fillColor) {
        this.showingTitle = true;
        this.isTitleMaxSize = false;
        this.titleText = text;
        this.titleBorderColor = borderColor;
        this.titleFillColor = fillColor;
        this.titleGrowLerpFactor = 0;
    }
    slideQuitButtonMid() {
        this.slidingQuitButton = true;
        this.slideQuitButtonLerpFactor = 0;
    }

    onResize() {
        // Reposition taken pieces
        let localCount = 0;
        let opponentCount = 0;
        for (let i = 0; i < this.takenPieces.length; i++) {
            if (this.takenPieces[i].team == this.chessBoard.localTeam) {
                this.takenPieces[i].x = 15 + (localCount * this.TAKEN_PIECE_SIZE % this.MAX_TAKEN_PIECES_PER_ROW);
                this.takenPieces[i].y = 55 + Math.floor(localCount / this.MAX_TAKEN_PIECES_PER_ROW) * (this.TAKEN_PIECE_SIZE + 5);
                localCount++;
            } else {
                this.takenPieces[i].x = this.chessBoard.startX + this.chessBoard.SIZE +
                    (opponentCount * this.TAKEN_PIECE_SIZE % this.MAX_TAKEN_PIECES_PER_ROW);
                this.takenPieces[i].y = windowHeight - 100 - this.TAKEN_PIECE_SIZE +
                    Math.floor(opponentCount / this.MAX_TAKEN_PIECES_PER_ROW) * (this.TAKEN_PIECE_SIZE + 5);
                opponentCount++;
            }
        }

        this.getElementById(this.quitButtonId).bounds.x = lerp(this.quitButtonStartX, windowWidth / 2 - this.standardWidth / 4,
            this.slideQuitButtonLerpFactor);
        this.getElementById(this.quitButtonId).bounds.y = windowHeight - this.standardHeight - 15;
    }
}