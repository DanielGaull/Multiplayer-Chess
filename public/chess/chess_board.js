class ChessBoard {
    constructor(onMovePiece) {
        this.SIZE = windowHeight;

        this.BOARD_SIZE = 8;
        this.SQUARE_SIZE = this.SIZE / this.BOARD_SIZE;

        this.flipped = false;
        this.isTurn = false;
        this.localTeam = null;
        this.userCanInteract = true;

        this.onMovePiece = onMovePiece;

        this.boardState = [];
        this.pieces = [];
        this.safeMoves = [];

        this.selectedSquares = [];
        this.selectedPieceSquare = null;

        this.movingPiece = false;
        this.pieceToMove = null;
        this.movePieceLerpFactor = 0;
        this.movePieceStart = null;
        this.movePieceEnd = null;
        this.PIECE_LERP_SPD = 0.3;
        this.pieceIdToRemoveAfterMove = -1;
        this.pieceIdToChangeAfterMove = -1;
        this.pieceTypeToBeAfterMove = -1;
        this.onPieceMoveComplete = null;
    }

    get x() {
        return width / 2 - this.SIZE / 2;
    }
    get y() {
        return 0;
    }

    setBoardState(board) {
        this.boardState = board;

        this.pieces = [];

        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board[i].length; j++) {
                if (board[i][j].id >= 0) {
                    let bounds = this.getSquareBounds(i, j);
                    this.addPiece(board[i][j], bounds.x, bounds.y);
                }
            }
        }
    }

    addPiece(squareInfo, x, y) {
        let pieceType = ChessPiece.getPieceFromId(squareInfo.type);
        this.pieces.push(new ChessPiece(squareInfo.id, pieceType, squareInfo.team, x, y, this.SQUARE_SIZE, this.SQUARE_SIZE * 5 / 6));
    }

    movePiece(id, newRow, newCol) {
        if (id < 0) return;

        // If we try to move a piece while in the middle of animating another one, then need to immediately finish moving that other one
        if (this.movingPiece) {
            this.finishMoveAnimation();
        }

        // Set values for the animation
        let piece = this.getPieceById(id);
        let pieceSpace = this.getPieceSpace(id);

        this.movingPiece = true;
        this.pieceToMove = piece;
        this.movePieceLerpFactor = 0;
        this.movePieceStart = { row: pieceSpace.row, col: pieceSpace.col };
        this.movePieceEnd = { row: newRow, col: newCol };
        // Modify the board state
        let currentSpace = this.getPieceSpace(id);
        this.boardState[currentSpace.row][currentSpace.col] = { id: -1, team: -1, type: -1 };
        this.boardState[newRow][newCol] = { id: piece.id, type: piece.type.id, team: piece.team };

        // Reset the selected squares
        this.selectedSquares = [];
        this.selectedPieceSquare = null;
    }

    finishMoveAnimation() {
        this.movingPiece = false;
        let bounds = this.getSquareBounds(this.movePieceEnd.row, this.movePieceEnd.col);
        this.pieceToMove.x = bounds.x;
        this.pieceToMove.y = bounds.y;

        if (this.onPieceMoveComplete != null) {
            this.onPieceMoveComplete();
        }

        if (this.pieceIdToRemoveAfterMove >= 0) {
            let index = this.getPieceIndexById(this.pieceIdToRemoveAfterMove);
            if (index >= 0) {
                this.pieces.splice(index, 1);
                this.pieceIdToRemoveAfterMove = -1;
            }
            Sounds.play(Sounds.PIECE_ATTACK);
        } else {
            Sounds.play(Sounds.PIECE_SLIDE);
        }

        if (this.pieceIdToChangeAfterMove >= 0) {
            let piece = this.getPieceById(this.pieceIdToChangeAfterMove);
            if (piece != null) {
                let space = this.getPieceSpace(this.pieceIdToChangeAfterMove);
                this.boardState[space.row][space.col].type = this.pieceTypeToBeAfterMove;
                piece.changeType(ChessPiece.getPieceFromId(this.pieceTypeToBeAfterMove));

                this.pieceIdToChangeAfterMove = -1;
                this.pieceTypeToBeAfterMove = -1;
            }
        }
    }

    mouseClicked() {
        // While pieces are moving (or user interactions disabled), we're not updating here
        if (this.movingPiece || !this.userCanInteract) return;

        // Check if the player is trying to move a piece
        for (let i = 0; i < this.selectedSquares.length; i++) {
            let bounds = this.getSquareBounds(this.selectedSquares[i].row, this.selectedSquares[i].col);
            if (mouseX > bounds.x && mouseY > bounds.y && mouseX < bounds.x + bounds.width && mouseY < bounds.y + bounds.height) {
                // Moving a piece
                this.onMovePiece(this.selectedPiece.id, this.selectedSquares[i].row, this.selectedSquares[i].col);
                return;
            }
        }

        // If we clicked on one of our pieces, then select it
        let anySelected = false;
        if (this.isTurn) {
            for (let i = 0; i < this.pieces.length; i++) {
                if (this.pieces[i].trySelect() && this.pieces[i].team == this.localTeam) {
                    // Piece was successfully selected, set our selected squares variable

                    // We will use the server-provided safe moves, unless they haven't given any, in which case we default to the client's
                    // decision. In normal circumstances, the server should always have given us what we need, but if the save moves
                    // aren't provided, the board is capable of determining it's own moves
                    if (this.safeMoves.length > 0) {
                        this.selectedSquares = [];
                        for (let j = 0; j < this.safeMoves.length; j++) {
                            if (this.safeMoves[j].id == this.pieces[i].id) {
                                this.selectedSquares.push(this.safeMoves[j].to);
                            }
                        }
                    }
                    this.selectedPieceSquare = this.getPieceSpace(this.pieces[i].id);
                    anySelected = true;
                }
            }
        }

        if (!anySelected) {
            this.selectedSquares = [];
            this.selectedPieceSquare = null;
        }
    }

    update() {
        if (this.movingPiece) {
            this.movePieceLerpFactor += this.PIECE_LERP_SPD;

            if (this.movePieceLerpFactor >= 1) {
                this.finishMoveAnimation();
            } else {
                let startBounds = this.getSquareBounds(this.movePieceStart.row, this.movePieceStart.col);
                let endBounds = this.getSquareBounds(this.movePieceEnd.row, this.movePieceEnd.col);
                this.pieceToMove.x = lerp(startBounds.x, endBounds.x, this.movePieceLerpFactor);
                this.pieceToMove.y = lerp(startBounds.y, endBounds.y, this.movePieceLerpFactor);
            }
        }
    }

    draw() {
        noStroke();

        for (let i = 0; i < this.BOARD_SIZE; i++) {
            for (let j = 0; j < this.BOARD_SIZE; j++) {
                if ((i + j) % 2 == 0) {
                    fill(232, 218, 183);
                } else {
                    fill(82, 69, 38);
                }
                let bounds = this.getSquareBounds(i, j);
                rect(bounds.x, bounds.y, bounds.width, bounds.height);

                // fill(255);
                // textSize(15);
                // text("(r " + j + ", c " + i + ")", this.startX + i * this.SQUARE_SIZE + 10, this.startY + j * this.SQUARE_SIZE + 5);
            }
        }

        fill(0, 255, 0, 100);
        for (let i = 0; i < this.selectedSquares.length; i++) {
            let bounds = this.getSquareBounds(this.selectedSquares[i].row, this.selectedSquares[i].col);
            rect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
        fill(0, 0, 255, 175);
        if (this.selectedPieceSquare != null) {
            let bounds = this.getSquareBounds(this.selectedPieceSquare.row, this.selectedPieceSquare.col);
            rect(bounds.x, bounds.y, bounds.width, bounds.height);
        }

        for (let i = 0; i < this.pieces.length; i++) {
            this.pieces[i].draw();
        }
    }

    takePiece(id) {
        this.pieceIdToRemoveAfterMove = id;
    }

    get selectedPiece() {
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].selected) {
                return this.pieces[i];
            }
        }
        return null;
    }
    getPieceById(id) {
        return this.pieces[this.getPieceIndexById(id)];
    }
    getPieceIndexById(id) {
        for (let i = 0; i < this.pieces.length; i++) {
            if (this.pieces[i].id == id) {
                return i;
            }
        }
        return -1;
    }

    getSquareBounds(row, col) {
        if (this.flipped) {
            return {
                x: this.startX + (this.BOARD_SIZE - col - 1) * this.SQUARE_SIZE,
                y: height - (row + 1) * this.SQUARE_SIZE, width: this.SQUARE_SIZE, height: this.SQUARE_SIZE
            };
        } else {
            return {
                x: this.startX + col * this.SQUARE_SIZE,
                y: row * this.SQUARE_SIZE, width: this.SQUARE_SIZE, height: this.SQUARE_SIZE
            };
        }
    }

    get startX() {
        return width / 2 - this.SIZE / 2;
    }
    get startY() {
        return 0;
    }

    getPieceSpace(pieceId) {
        for (let i = 0; i < this.boardState.length; i++) {
            for (let j = 0; j < this.boardState[i].length; j++) {
                if (this.boardState[i][j].id == pieceId) {
                    return { row: i, col: j };
                }
            }
        }
        return null;
    }

    changePieceType(id, type) {
        this.pieceIdToChangeAfterMove = id;
        this.pieceTypeToBeAfterMove = type;
    }

    onResize() {
        // Need to reposition pieces
        for (let i = 0; i < this.pieces.length; i++) {
            // Don't do anything to moving piece since its position is updated every frame anyway
            if (!this.movingPiece || this.pieceToMove.id != this.pieces[i].id) {
                let space = this.getPieceSpace(this.pieces[i].id);
                let bounds = this.getSquareBounds(space.row, space.col);
                this.pieces[i].x = bounds.x;
                this.pieces[i].y = bounds.y;
            }
        }
    }
}