const express = require("express");
const app = express();

// Grant access to everything in the "public" folder
app.use(express.static("public"));

const PORT = 3000;
const listener = app.listen(PORT, () => {
    console.log("Listening on port " + listener.address().port)
});

const socketio = require("socket.io");
const io = socketio(listener);

io.sockets.on("connection", newConnection);

let clientsSearchingForMatch = [];

let matches = [];

const PAWN = 0;
const ROOK = 1;
const KNIGHT = 2;
const BISHOP = 3;
const KING = 4;
const QUEEN = 5;
const EMPTY = -1;

const BLACK_TEAM = 0;
const WHITE_TEAM = 1;

const BOARD_SIZE = 8;

function newConnection(socket) {
    console.log(socket.id + " connected!");

    socket.on("disconnect", onDisconnect);

    socket.on("find_random_match", findRandomMatch);

    socket.on("move_piece", onPieceMoved);

    function onDisconnect(reason) {
        // reason is determined by the socket.io API

        for (let i = 0; i < clientsSearchingForMatch.length; i++) {
            if (clientsSearchingForMatch[i].socket.id == socket.id) {
                clientsSearchingForMatch.splice(0, 1);
                return;
            }
        }

        // Check if they're in a match, and if so, the match is now over
        for (let i = 0; i < matches.length; i++) {
            if (arrayContainsPredicate(matches[i].socketIds, (x) => x == socket.id)) {
                // This match is the one this player is in
                if (!matches[i].ended) {
                    // Disconnected mid-match
                    io.to(matches[i].name).emit("opponent_dc");
                }
                // Regardless of whether or not the game properly ended, this match is no longer needed
                matches.splice(0, 1);
                break;
            }
        }
    }

    function findRandomMatch(username) {
        if (clientsSearchingForMatch.length > 0) {
            let opponent = clientsSearchingForMatch[0];
            // Remove this first element, as this client is no longer looking for a match
            clientsSearchingForMatch.splice(0, 1);
            let roomName = getMatchRoomName(socket.id, opponent.socket.id);
            socket.emit("found_match", {
                opponentId: opponent.socket.id, roomName: roomName, opponentName: opponent.username,
                flipped: false, currentTurn: WHITE_TEAM
            });
            opponent.socket.emit("found_match", {
                opponentId: socket.id, roomName: roomName, opponentName: username, flipped: true,
                currentTurn: WHITE_TEAM
            });
            socket.join(roomName);
            opponent.socket.join(roomName);

            let board = generateStartingBoard();
            let safeMoves = getSafeMoves(WHITE_TEAM, board);
            matches.push({
                name: roomName, board: board, teamWhoHasTurn: WHITE_TEAM, allowedMoves: safeMoves,
                socketIds: [socket.id, opponent.socket.id], ended: false, whiteTeamId: opponent.socket.id,
                blackTeamId: socket.id, drawTurnCounter: 0, totalTurnCounter: 0
            });

            io.to(roomName).emit("set_board", board);
            io.to(roomName).emit("send_safe_moves", safeMoves);
        } else {
            clientsSearchingForMatch.push({ socket: socket, username: username });
        }
    }

    function onPieceMoved(data) {
        //let matchIndex = getMatchIndexByRoom(data.roomId);
        let match = matches[getMatchIndexByRoom(data.roomId)];
        let board = match.board;
        // Verify that this is a legal move
        let allowedMoves = match.allowedMoves;
        let from = getPieceSpaceById(data.id, board);
        let fromTeam = board[from.row][from.col].team;
        if ((fromTeam == WHITE_TEAM && match.whiteTeamId != socket.id) ||
            (fromTeam == BLACK_TEAM && match.blackTeamId != socket.id)) {
            // The client is trying to move a piece that is not on their team
            return;
        }
        if (!arrayContainsPredicate(
            allowedMoves, x => x.from.row == from.row && x.from.col == from.col && x.to.row == data.row && x.to.col == data.col)) {
            // This is not an allowed move (piece cannot behave in that way)
            return;
        }

        io.to(data.roomId).emit("move_piece", { id: data.id, col: data.col, row: data.row });

        // Save the move to our personal board state
        let result = movePiece(data.roomId, board, data.id, { from: from, to: { row: data.row, col: data.col } });
        board = result.board;
        if (result.pieceTaken || board[from.row][from.col].type == PAWN) {
            match.drawTurnCounter = 0;
        } else {
            match.drawTurnCounter++;
        }
        match.totalTurnCounter++;

        // Check if the moved piece is a pawn that should be promoted
        let pieceToMove = board[data.row][data.col];
        if (pieceToMove.type == PAWN) {
            // White pawns are promoted when they reach row 7; black when they reach row 0
            if ((pieceToMove.team == WHITE_TEAM && data.row == 7) || (pieceToMove.team == BLACK_TEAM && data.row == 0)) {
                board[data.row][data.col].type = QUEEN;
                io.to(data.roomId).emit("change_piece_type", { id: data.id, type: QUEEN });
            }
        }

        let newTurn = 0;
        if (match.teamWhoHasTurn == WHITE_TEAM) {
            newTurn = BLACK_TEAM;
        } else {
            newTurn = WHITE_TEAM;
        }
        match.teamWhoHasTurn = newTurn;

        match.board = board;

        // Determine if there is a draw
        if (match.drawTurnCounter >= 50) {
            // Game ends in draw (50 turns without a pawn moving or a piece being captured)
            io.to(data.roomId).emit("draw");
            // match.ended = true;
            // Game has ended, so now must remove the match
            matches.splice(getMatchIndexByRoom(data.roomId), 1);
            console.log("draw");
            return; // Game ends, no need to do anything else
        }

        let safeMoves = getSafeMoves(newTurn, board);
        match.allowedMoves = safeMoves;
        console.log("found " + safeMoves.length + " safe moves");
        if (safeMoves.length <= 0) {
            // If no safe moves found, either a checkmate or stalemate has occurred
            // If the king's current space isn't targeted, then stalemate; otherwise, checkmate
            // The king's current space isn't targeted if our current board state is considered safe
            // match.ended = true;
            matches.splice(getMatchIndexByRoom(data.roomId), 1);
            if (isBoardStateSafe(board, newTurn)) {
                io.to(data.roomId).emit("stalemate", newTurn);
            } else {
                io.to(data.roomId).emit("checkmate", newTurn);
            }
            return;
        } else {
            // Send safe moves to the clients (both get a copy of them)
            io.to(data.roomId).emit("send_safe_moves", safeMoves);
            if (!isBoardStateSafe(board, newTurn)) {
                // This player is in check
                io.to(data.roomId).emit("check", newTurn);
            }
        }

        // Change turns after each client knows which moves are safe
        io.to(data.roomId).emit("change_turn", newTurn);

        matches[getMatchIndexByRoom(data.roomId)] = match;
    }
}

function getMatchRoomName(id1, id2) {
    if (id1 < id2) {
        return id1 + " v " + id2;
    }
    return id2 + " v " + id1;
}

function getMatchIndexByRoom(room) {
    for (let i = 0; i < matches.length; i++) {
        if (matches[i].name == room) {
            return i;
        }
    }
    return -1;
}
function movePiece(room, board, id, move) {
    // Find the piece we want to move, set its new position, and return the board state
    let space = getPieceSpaceById(id, board);
    if (space == null) return { board: board, pieceTaken: false };

    let result = executeMoveOnBoard(board, move);
    let pieceTaken = result.takenPiece != null;
    if (pieceTaken) {
        io.to(room).emit("take_piece", {
            id: result.takenPiece.id, team: result.takenPiece.team,
            type: result.takenPiece.type
        });
    }
    if (result.castleFrom != null && result.castleTo != null) {
        io.to(room).emit("castle", {
            from: result.castleFrom,
            to: result.castleTo
        });
    }

    return { board: board, pieceTaken: pieceTaken };
}

function getPieceSpaceById(id, board) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            if (board[i][j].id == id) {
                return { row: i, col: j };
            }
        }
    }
    return null;
}

function getPieceSpacesByType(type, team, board) {
    let spaces = [];
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            if (board[i][j].type == type && board[i][j].team == team) {
                spaces.push({ row: i, col: j });
            }
        }
    }
    return spaces;
}

function cloneBoard(board) {
    let tempBoard = [];
    for (let i = 0; i < board.length; i++) {
        tempBoard.push([]);
        for (let j = 0; j < board[i].length; j++) {
            tempBoard[i].push({ ...board[i][j] });
        }
    }
    return tempBoard;
}

// Checks if a move will allow the king to be taken
function isMoveSafe(board, move, team) {
    let returnVal = true;
    // Check if this move will allow the king to be taken
    // We do this by executing the move, then simply seeing if the king is now in danger

    let tempBoard = cloneBoard(board);
    executeMoveOnBoard(tempBoard, move);
    returnVal = isBoardStateSafe(tempBoard, team);

    return returnVal;
}
function isBoardStateSafe(board, team) {
    // The king is in danger if any enemy moveables include this king
    let kingSpace = null;
    let enemyMoveables = [];
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            if (board[i][j].type == KING && board[i][j].team == team) {
                kingSpace = { row: i, col: j };
            }

            if (board[i][j].team != team) {
                enemyMoveables.push(...getMoveableSpaces(board[i][j], i, j, board));
            }
        }
    }
    if (arrayContainsPredicate(enemyMoveables, (x) => x.row == kingSpace.row && x.col == kingSpace.col)) {
        return false;
    }
    return true;
}

function executeMoveOnBoard(board, move) {
    let temp = board[move.from.row][move.from.col];
    let takenPiece = null;
    // Check if taking an enemy piece
    if (board[move.to.row][move.to.col].id >= 0 && board[move.to.row][move.to.col].team != board[move.from.row][move.from.col].team) {
        takenPiece = board[move.to.row][move.to.col];
    }
    // Set space where the piece was originally to be empty
    board[move.from.row][move.from.col] = { id: EMPTY, type: EMPTY, team: EMPTY };

    // Check if able to do en passant
    // Can't do en passant if not a pawn, not moving diagonally, or if we're already taking a piece
    if (temp.type == PAWN && move.to.col != move.from.col && takenPiece == null) {
        if ((move.from.col + 1 < BOARD_SIZE) && board[move.from.row][move.from.col + 1].canPass) {
            takenPiece = { ...board[move.from.row][move.from.col + 1] };
            board[move.from.row][move.from.col + 1] = { id: EMPTY, type: EMPTY, team: EMPTY };
        } else if ((move.from.col - 1 >= 0) && board[move.from.row][move.from.col - 1].canPass) {
            takenPiece = { ...board[move.from.row][move.from.col - 1] };
            board[move.from.row][move.from.col + 1] = { id: EMPTY, type: EMPTY, team: EMPTY };
        }
    }

    // If this is a pawn moving 2 spaces, then it's valid for en passant for enemy team
    // Set all other pieces to be unpassable
    // Set this after checking for en passant above
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            board[i][j].canPass = false;
        }
    }

    if ((temp.type == PAWN) && (Math.abs(move.to.row - move.from.row) > 1)) {
        temp.canPass = true;
    }
    temp.didFirstMove = true;

    // If this is a king moving two spaces, then they are castling
    let castleFrom;
    let castleTo;
    if ((temp.type == KING) && Math.abs(move.to.col - move.from.col) > 1) {
        // King will be moved later. Here, we just need to move the rook
        let tempRook = null;
        let direction;
        if (move.to.col > move.from.col) {
            // Moving towards rook in max col
            tempRook = board[move.from.row][BOARD_SIZE - 1];
            castleFrom = { row: move.from.row, col: BOARD_SIZE - 1 };
            direction = -1;
        } else {
            // Moving towards rook in min col
            tempRook = board[move.from.row][0];
            castleFrom = { row: move.from.row, col: 0 };
            direction = 1;
        }
        board[castleFrom.row][castleFrom.col] = { id: EMPTY, team: EMPTY, type: EMPTY };
        castleTo = {row: move.from.row, col: move.to.col + direction};
        board[castleTo.row][castleTo.col] = tempRook;
    }

    // Move the piece to the target space
    board[move.to.row][move.to.col] = temp;

    // Use this castle from and castle to to tell the client so that they can execute the rook's move
    return { board: board, takenPiece: takenPiece, castleFrom: castleFrom, castleTo: castleTo };
}

function getSafeMoves(team, board) {
    let safeMoves = [];
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            if (board[i][j].team == team) {
                let moveables = getMoveableSpaces(board[i][j], i, j, board);

                let from = { row: i, col: j };
                for (let k = 0; k < moveables.length; k++) {
                    let to = moveables[k];
                    if (isMoveSafe(board, { from: from, to: to }, team)) {
                        safeMoves.push({ id: board[i][j].id, from: from, to: to });
                    }
                }
            }
        }
    }
    return safeMoves;
}
// This is used to verify on the server-side that moves are legal
function getMoveableSpaces(piece, row, col, board) {
    let spaces = [];
    let pieceSpace = { row: row, col: col };

    spaces = getInitialMoveableSpaces(piece.type, pieceSpace.row, pieceSpace.col, piece.team, piece.didFirstMove, board);

    // Validate spaces (make sure they are in bounds of the board)
    for (let i = 0; i < spaces.length; i++) {
        if (spaces[i].row < 0 || spaces[i].row >= BOARD_SIZE ||
            spaces[i].col < 0 || spaces[i].col >= BOARD_SIZE ||
            board[spaces[i].row][spaces[i].col].team == piece.team) {
            spaces.splice(i, 1);
            i--;
        }
    }

    return spaces;
}
function getInitialMoveableSpaces(pieceType, startRow, startCol, team, didFirstMove, board) {
    let spaces = [];
    let pieceSpace = { row: startRow, col: startCol };
    let row;
    let col;

    switch (pieceType) {
        case PAWN:
            // Can move 1 space forward
            if (team == WHITE_TEAM) {
                spaces.push({ row: pieceSpace.row + 1, col: pieceSpace.col });
            } else if (team == BLACK_TEAM) {
                spaces.push({ row: pieceSpace.row - 1, col: pieceSpace.col });
            }
            // Can also move 2 spaces if first turn hasn't happened
            // However, they can only do this if they are also able to move 1 space forward (the space in front of them is vacant)
            // So check for vacant space in piece in front of them before adding the space 2 spaces in front
            if (!didFirstMove) {
                if (team == WHITE_TEAM && pieceSpace.row + 1 < BOARD_SIZE &&
                    board[pieceSpace.row + 1][pieceSpace.col].id < 0) {
                    spaces.push({ row: pieceSpace.row + 2, col: pieceSpace.col });
                } else if (team == BLACK_TEAM && pieceSpace.row - 1 >= 0 &&
                    board[pieceSpace.row - 1][pieceSpace.col].id < 0) {
                    spaces.push({ row: pieceSpace.row - 2, col: pieceSpace.col });
                }
            }

            // Verify that the forward spaces are legal (we cannot move if enemy player in that space)
            for (let i = 0; i < spaces.length; i++) {
                if (spaces[i].row < 0 || spaces[i].col < 0 || spaces[i].row >= BOARD_SIZE || spaces[i].col >= BOARD_SIZE ||
                    board[spaces[i].row][spaces[i].col].id >= 0) {
                    spaces.splice(i, 1);
                    i--;
                }
            }

            // Now add attackable spaces
            let attackSpaces = [];
            let enemyTeam = -1;
            if (team == WHITE_TEAM) {
                attackSpaces = [{ row: pieceSpace.row + 1, col: pieceSpace.col + 1 },
                { row: pieceSpace.row + 1, col: pieceSpace.col - 1 }];
                enemyTeam = BLACK_TEAM;
            } else {
                attackSpaces = [{ row: pieceSpace.row - 1, col: pieceSpace.col + 1 },
                { row: pieceSpace.row - 1, col: pieceSpace.col - 1 }];
                enemyTeam = WHITE_TEAM;
            }

            for (let i = 0; i < attackSpaces.length; i++) {
                if (attackSpaces[i].row >= 0 && attackSpaces[i].col >= 0 && attackSpaces[i].row < BOARD_SIZE &&
                    attackSpaces[i].col < BOARD_SIZE &&
                    board[attackSpaces[i].row][attackSpaces[i].col].team != enemyTeam) {
                    // We can't attack here because there is not an enemy piece here
                    attackSpaces.splice(i, 1);
                    i--;
                }
            }
            if (attackSpaces.length > 0) {
                spaces.push(...attackSpaces);
            }

            // Add passable spaces (can only be pieces next to us)
            let passableSpaces = [];
            if ((pieceSpace.col + 1 < BOARD_SIZE) && board[pieceSpace.row][pieceSpace.col + 1].canPass) {
                if (team == WHITE_TEAM) {
                    passableSpaces.push({ row: pieceSpace.row + 1, col: pieceSpace.col + 1 });
                } else {
                    passableSpaces.push({ row: pieceSpace.row - 1, col: pieceSpace.col + 1 });
                }
            }
            if ((pieceSpace.col - 1 >= 0) && board[pieceSpace.row][pieceSpace.col - 1].canPass) {
                if (team == WHITE_TEAM) {
                    passableSpaces.push({ row: pieceSpace.row + 1, col: pieceSpace.col - 1 });
                } else {
                    passableSpaces.push({ row: pieceSpace.row - 1, col: pieceSpace.col - 1 });
                }
            }
            // Can only do en passant if the space we move to is unoccupied
            for (let i = 0; i < passableSpaces.length; i++) {
                if (board[passableSpaces[i].row][passableSpaces[i].col].id < 0) {
                    spaces.push(passableSpaces[i]);
                }
            }
            // console.log((pieceSpace.col + 1 < BOARD_SIZE) ? (board[pieceSpace.row][pieceSpace.col + 1].canPass) : "");
            // console.log((pieceSpace.col - 1 > 0) ? (board[pieceSpace.row][pieceSpace.col - 1].canPass) : "");

            break;
        case KNIGHT:
            // Also has 8 possible moves, just over 2 and over 1 perpedicularly
            spaces.push({ row: pieceSpace.row + 2, col: pieceSpace.col + 1 });
            spaces.push({ row: pieceSpace.row - 2, col: pieceSpace.col + 1 });
            spaces.push({ row: pieceSpace.row + 2, col: pieceSpace.col - 1 });
            spaces.push({ row: pieceSpace.row - 2, col: pieceSpace.col - 1 });
            spaces.push({ row: pieceSpace.row + 1, col: pieceSpace.col - 2 });
            spaces.push({ row: pieceSpace.row + 1, col: pieceSpace.col + 2 });
            spaces.push({ row: pieceSpace.row - 1, col: pieceSpace.col - 2 });
            spaces.push({ row: pieceSpace.row - 1, col: pieceSpace.col + 2 });
            break;
        case BISHOP:
            // Can move in 4 diagonal directions
            // Iterate through for each one, checking for pieces in the way and the bounds of the board
            // Search row + and col +
            row = pieceSpace.row + 1;
            col = pieceSpace.col + 1;
            while (row < BOARD_SIZE && col < BOARD_SIZE && board[row][col].team < 0) {
                spaces.push({ row: row, col: col });
                row++;
                col++;
            }
            spaces.push({ row: row, col: col });
            // Search row + and col -
            row = pieceSpace.row + 1;
            col = pieceSpace.col - 1;
            while (row < BOARD_SIZE && col >= 0 && board[row][col].team < 0) {
                spaces.push({ row: row, col: col });
                row++;
                col--;
            }
            spaces.push({ row: row, col: col });
            // Search row - and col +
            row = pieceSpace.row - 1;
            col = pieceSpace.col + 1;
            while (row >= 0 && col < BOARD_SIZE && board[row][col].team < 0) {
                spaces.push({ row: row, col: col });
                row--;
                col++;
            }
            spaces.push({ row: row, col: col });
            // Search row - and col -
            row = pieceSpace.row - 1;
            col = pieceSpace.col - 1;
            while (row >= 0 && col >= 0 && board[row][col].team < 0) {
                spaces.push({ row: row, col: col });
                row--;
                col--;
            }
            spaces.push({ row: row, col: col });
            break;
        case ROOK:
            // Can move in 4 straight directions
            // Iterate through for each one, checking for pieces in the way and the bounds of the board
            // Search down
            row = pieceSpace.row - 1;
            col = pieceSpace.col;
            while (row >= 0 && board[row][col].team < 0) {
                spaces.push({ row: row, col: col });
                row--;
            }
            spaces.push({ row: row, col: col });
            // Search up
            row = pieceSpace.row + 1;
            col = pieceSpace.col;
            while (row < BOARD_SIZE && board[row][col].team < 0) {
                spaces.push({ row: row, col: col });
                row++;
            }
            spaces.push({ row: row, col: col });
            // Search in negative column direction
            row = pieceSpace.row;
            col = pieceSpace.col - 1;
            while (col >= 0 && board[row][col].team < 0) {
                spaces.push({ row: row, col: col });
                col--;
            }
            spaces.push({ row: row, col: col });
            // Search in positive column direction
            row = pieceSpace.row;
            col = pieceSpace.col + 1;
            while (col < BOARD_SIZE && board[row][col].team < 0) {
                spaces.push({ row: row, col: col });
                col++;
            }
            spaces.push({ row: row, col: col });
            break;
        case QUEEN:
            // Basically just a rook and bishop combined
            spaces.push(...getInitialMoveableSpaces(ROOK, startRow, startCol, team, didFirstMove, board));
            spaces.push(...getInitialMoveableSpaces(BISHOP, startRow, startCol, team, didFirstMove, board));
            break;
        case KING:
            // Can just move in any direction once
            // Add all directions, the pruning later will remove invalid ones

            spaces.push({ row: pieceSpace.row + 1, col: pieceSpace.col });
            spaces.push({ row: pieceSpace.row - 1, col: pieceSpace.col });
            spaces.push({ row: pieceSpace.row, col: pieceSpace.col + 1 });
            spaces.push({ row: pieceSpace.row, col: pieceSpace.col - 1 });
            spaces.push({ row: pieceSpace.row + 1, col: pieceSpace.col + 1 });
            spaces.push({ row: pieceSpace.row + 1, col: pieceSpace.col - 1 });
            spaces.push({ row: pieceSpace.row - 1, col: pieceSpace.col + 1 });
            spaces.push({ row: pieceSpace.row - 1, col: pieceSpace.col - 1 });

            // Now check for castling
            // Conditions for castling:
            // King cannot be in check, move over a space that would put it into check, or castle into check
            // (Castling into check will be verified later)
            // Must be open spaces between king and rook
            // King and rook must not have moved at all yet

            // First make sure king hasn't moved at all, quickest to check so this runs fast
            if (!board[pieceSpace.row][pieceSpace.col].didFirstMove) {
                // Now check that both rooks haven't taken a turn yet
                let rookSpaces = getPieceSpacesByType(ROOK, team, board);

                // Still able to castle so far
                // Now verify if spaces between king and rooks are empty
                for (let i = 0; i < rookSpaces.length; i++) {
                    if (board[rookSpaces[i].row][rookSpaces[i].col].didFirstMove) {
                        continue;
                    }

                    let allSpacesOpen = true;
                    let predicate = x => x < rookSpaces[i].col;
                    let incrementFunc = x => x + 1;
                    let init = pieceSpace.col + 1;
                    let direction = 1;
                    if (rookSpaces[i].col < pieceSpace.col) {
                        predicate = x => x > rookSpaces[i].col;
                        incrementFunc = x => x - 1;
                        init = pieceSpace.col - 1;
                        direction = -1;
                    }
                    for (let j = init; predicate(j); j = incrementFunc(j)) {
                        if (board[pieceSpace.row][j].id >= 0) {
                            // This space is occupied, so there are not open spaces
                            allSpacesOpen = false;
                            // Cannot castle in this direction
                            break;
                        }
                    }

                    if (allSpacesOpen) {
                        // Still possible to castle, so lets now verify that the king is not in check, moving through check, 
                        // or moving into check

                        let midTestBoard = cloneBoard(board);
                        midTestBoard = executeMoveOnBoard(midTestBoard, {
                            from: pieceSpace,
                            to: { row: pieceSpace.row, col: pieceSpace.col + direction }
                        });
                        if (isBoardStateSafe(board, team) && isBoardStateSafe(midTestBoard, team)) {
                            // Able to castle unless the move overall isn't safe, in which case it will be caught later
                            spaces.push({ row: pieceSpace.row, col: pieceSpace.col + direction * 2 });
                        }
                    }
                }
            }

            break;
    }
    return spaces;
}

function generateStartingBoard() {
    // Row, column
    let board = [];
    let id = 0;
    for (let row = 0; row < 8; row++) {
        board.push([]);
        for (let col = 0; col < 8; col++) {
            if (row == 1) {
                // 2nd row, which is all pawns
                board[row].push({ id: id++, type: PAWN, team: WHITE_TEAM });
            } else if (row == 6) {
                // 2nd-to-last row, which is all pawns
                board[row].push({ id: id++, type: PAWN, team: BLACK_TEAM });
            } else if (row == 0 || row == 7) {
                // 1st or last row, which is the other pieces
                let team = (row == 0) ? WHITE_TEAM : BLACK_TEAM;
                if (col == 0 || col == 7) {
                    board[row].push({ id: id++, type: ROOK, team: team });
                } else if (col == 1 || col == 6) {
                    board[row].push({ id: id++, type: KNIGHT, team: team });
                } else if (col == 2 || col == 5) {
                    board[row].push({ id: id++, type: BISHOP, team: team });
                } else if ((row == 0 && col == 3) || (row == 7 && col == 3)) {
                    board[row].push({ id: id++, type: KING, team: team });
                } else if ((row == 0 && col == 4) || (row == 7 && col == 4)) {
                    board[row].push({ id: id++, type: QUEEN, team: team });
                }
            } else {
                board[row].push({ id: EMPTY, type: EMPTY, team: EMPTY });
            }
        }
    }

    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            board[i][j].didFirstMove = false;
            board[i][j].canPass = false;
        }
    }
    return board;
}

function arrayContainsPredicate(array, predicate) {
    return (indexOfPredicate(array, predicate) >= 0);
}
function indexOfPredicate(array, predicate) {
    for (let i = 0; i < array.length; i++) {
        if (predicate(array[i])) {
            return i;
        }
    }
    return -1;
}