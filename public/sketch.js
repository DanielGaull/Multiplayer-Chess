let socket;
let connectedToServer = false;
let opponentId;
let roomId;

const START_MENU = 0;
const WAITING_FOR_GAME = 1;
const PLAYING_MATCH = 2;
const CREDITS = 3;
let gameState = START_MENU;

let startMenu;
let waitMenu;
let creditsMenu;

let chessBoard;
let nextMove;
let boardUi;
let gameOver = false;

function preload() {
    Sounds.init();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  Textbox.init();
  ChessPiece.init();

  startMenu = new StartMenu(startButtonClicked, creditsButtonClicked);
  waitMenu = new WaitMenu(backButtonClicked);
  creditsMenu = new CreditsMenu(creditsBackButtonClicked);

  nextMove = null;

  chessBoard = new ChessBoard(onLocalPieceMoved);
  chessBoard.onPieceMoveComplete = onPieceMoveComplete;
  boardUi = new ChessBoardUI(onQuitClicked, chessBoard);
}
  
function draw() {
  background(50);

  switch (gameState) {
      case START_MENU:
        startMenu.update();
        startMenu.draw();
        break;
    case WAITING_FOR_GAME:
        waitMenu.update();
        waitMenu.draw();
        break;
    case PLAYING_MATCH:
        chessBoard.update();
        chessBoard.draw();
        boardUi.update();
        boardUi.draw();
        break;
    case CREDITS:
        creditsMenu.update();
        creditsMenu.draw();
        break;
  }

//   fill(200);
//   textSize(20);
//   noStroke();
//   text("(" + mouseX + ", " + mouseY + ")", mouseX, mouseY);
}

function startButtonClicked() {
    connectedToServer = true;
    socket = io.connect();
    gameState = WAITING_FOR_GAME;
    setupSocket();
    socket.emit("find_random_match", startMenu.username);
}
function backButtonClicked() {
    connectedToServer = false;
    socket.disconnect();
    gameState = START_MENU;
}
function creditsBackButtonClicked() {
    gameState = START_MENU;
}
function creditsButtonClicked() {
    gameState = CREDITS;
}
function onQuitClicked() {
    connectedToServer = false;
    socket.disconnect();
    gameState = START_MENU;
    boardUi.reset();
}

function onOpponentDisconnect(data) {
    boardUi.showTitle("Your opponent left the game", color(50, 50, 50), color(200, 200, 200));
    gameOver = true;
    chessBoard.userCanInteract = false;
    boardUi.slideQuitButtonMid();
}

function keyPressed() {
    for (let i = 0; i < Textbox.all.length; i++) {
        Textbox.all[i].keyPressed(keyCode);
    }
}
function mouseClicked() {
    if (gameState == PLAYING_MATCH) {
        chessBoard.mouseClicked();
    }
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);

    startMenu.onResize();
    waitMenu.onResize();
    creditsMenu.onResize();
    chessBoard.onResize();
    boardUi.onResize();
}

function setupSocket() {
    socket.on("found_match", onMatchFound);
    socket.on("opponent_dc", onOpponentDisconnect);
    socket.on("set_board", setBoard);
    socket.on("move_piece", onServerPieceMoved);
    socket.on("change_turn", onTurnChange);
    socket.on("take_piece", onPieceTaken);
    socket.on("change_piece_type", onPieceTypeChanged);
    socket.on("send_safe_moves", onSafeMovesSent);
    socket.on("checkmate", onCheckmate);
    socket.on("stalemate", onStalemate);
    socket.on("check", onCheck);
    socket.on("draw", onDraw);
    socket.on("castle", onCastle);
}

function setBoard(board) {
    chessBoard.setBoardState(board);
}
function onMatchFound(data) {
    gameState = PLAYING_MATCH;
    opponentId = data.opponentId;
    roomId = data.roomName;

    boardUi.localPlayerName = startMenu.username;
    boardUi.enemyPlayerName = data.opponentName;

    chessBoard.flipped = data.flipped;
    chessBoard.localTeam = data.flipped ? ChessPiece.WHITE_TEAM : ChessPiece.BLACK_TEAM;
    chessBoard.isTurn = (chessBoard.localTeam == data.currentTurn);

    gameOver = false;
    chessBoard.userCanInteract = true;
}

function onLocalPieceMoved(id, newRow, newCol) {
    socket.emit("move_piece", { id: id, row: newRow, col: newCol, roomId: roomId });
}
function onServerPieceMoved(data) {
    chessBoard.movePiece(data.id, data.row, data.col);
    nextMove = null;
}
function onCastle(data) {
    nextMove = data;
}
function onPieceMoveComplete() {
    if (nextMove != null) {
        chessBoard.movePiece(chessBoard.boardState[nextMove.from.row][nextMove.from.col].id, nextMove.to.row, nextMove.to.col);
    }
}

function onTurnChange(teamWhoHasTurn) {
    chessBoard.isTurn = (chessBoard.localTeam == teamWhoHasTurn);
}
function onPieceTaken(data) {
    chessBoard.takePiece(data.id);
    boardUi.addTakenPiece(data.id, data.type, data.team);
}
function onSafeMovesSent(moves) {
    boardUi.inCheck = false;
    boardUi.safeMoveCount = moves.length;
    chessBoard.safeMoves = moves;
}
function onPieceTypeChanged(data) {
    chessBoard.changePieceType(data.id, data.type);
}

function onCheck(team) {
    if (team == chessBoard.localTeam) {
        boardUi.inCheck = true;
    }
}

function onCheckmate(team) {
    endGame("CHECKMATE", team);
    if (team == chessBoard.localTeam) {
        Sounds.play(Sounds.LOSS);
    } else {
        Sounds.play(Sounds.WIN);
    }
}
function onStalemate(team) {
    endGame("STALEMATE", team);
    Sounds.play(Sounds.WIN);
}
function onDraw() {
    endGame("DRAW", chessBoard.localTeam);
    Sounds.play(Sounds.LOSS);
}
function endGame(text, teamForText) {
    if (teamForText == ChessPiece.WHITE_TEAM) {
        boardUi.showTitle(text, color(200, 200, 200), color(50, 50, 50));
    } else {
        boardUi.showTitle(text, color(50, 50, 50), color(200, 200, 200));
    }
    gameOver = true;
    chessBoard.userCanInteract = false;
    boardUi.slideQuitButtonMid();
}