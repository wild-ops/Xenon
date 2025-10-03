// Chess pieces Unicode
const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

let initialBoard = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [ '', '', '', '', '', '', '', '' ],
  [ '', '', '', '', '', '', '', '' ],
  [ '', '', '', '', '', '', '', '' ],
  [ '', '', '', '', '', '', '', '' ],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR']
];

let board, selected, currentPlayer, gameOver;
let playmode = 'ai'; // 'ai' or 'pvp'

function cloneBoard(b) {
  return b.map(row => row.slice());
}

function resetGame() {
  board = cloneBoard(initialBoard);
  selected = null;
  currentPlayer = 'w';
  gameOver = false;
  updateInfo();
  renderBoard();
  if (playmode === 'ai' && currentPlayer === 'b') setTimeout(aiMove, 500);
}

document.getElementById('restart').onclick = resetGame;

document.getElementById('playmode').onchange = function() {
  playmode = this.value;
  resetGame();
};

function renderBoard() {
  const boardDiv = document.getElementById('chessboard');
  boardDiv.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'square ' + ((row+col)%2==0 ? 'white' : 'black');
      square.dataset.row = row;
      square.dataset.col = col;
      if (selected && selected.row === row && selected.col === col) {
        square.classList.add('selected');
      }
      const piece = board[row][col];
      if (piece) square.textContent = PIECES[piece];
      square.addEventListener('click', onSquareClick);
      boardDiv.appendChild(square);
    }
  }
}

function onSquareClick(e) {
  if (gameOver) return;
  if (playmode === 'ai' && currentPlayer === 'b') return; // Only AI moves
  const row = parseInt(e.currentTarget.dataset.row);
  const col = parseInt(e.currentTarget.dataset.col);
  const target = board[row][col];

  if (selected) {
    const fromPiece = board[selected.row][selected.col];
    if (fromPiece[0] !== currentPlayer) {
      selected = null;
      renderBoard();
      return;
    }
    if (selected.row === row && selected.col === col) {
      selected = null;
      renderBoard();
      return;
    }
    if (target && target[0] === currentPlayer) {
      selected = { row, col };
      renderBoard();
      return;
    }
    if (isValidMove(selected.row, selected.col, row, col, fromPiece)) {
      makeMove(selected.row, selected.col, row, col);
      selected = null;
      renderBoard();
      setTimeout(() => {
        checkGameEnd();
        if (!gameOver && playmode === 'ai' && currentPlayer === 'b') {
          aiMove();
        }
      }, 200);
    }
  } else {
    if (target && target[0] === currentPlayer) {
      selected = { row, col };
      renderBoard();
    }
  }
}

function makeMove(fromRow, fromCol, toRow, toCol) {
  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = '';
  currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
  updateInfo();
}

function isValidMove(fromRow, fromCol, toRow, toCol, piece, ignoreCheck=false) {
  // Only basic movement - no castling, en passant, promotion
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  switch (piece[1]) {
    case 'P':
      if (piece[0] === 'w') {
        if (dr === -1 && dc === 0 && board[toRow][toCol] === '') return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
        if (fromRow === 6 && dr === -2 && dc === 0 && board[toRow][toCol] === '' && board[fromRow-1][fromCol] === '') return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
        if (dr === -1 && Math.abs(dc) === 1 && board[toRow][toCol] && board[toRow][toCol][0] === 'b') return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
      } else {
        if (dr === 1 && dc === 0 && board[toRow][toCol] === '') return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
        if (fromRow === 1 && dr === 2 && dc === 0 && board[toRow][toCol] === '' && board[fromRow+1][fromCol] === '') return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
        if (dr === 1 && Math.abs(dc) === 1 && board[toRow][toCol] && board[toRow][toCol][0] === 'w') return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
      }
      break;
    case 'N':
      if ((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2)) {
        if (!board[toRow][toCol] || board[toRow][toCol][0] !== piece[0]) {
          return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
        }
      }
      break;
    case 'B':
      if (Math.abs(dr) === Math.abs(dc)) {
        if (!isBlocked(fromRow, fromCol, toRow, toCol)) {
          if (!board[toRow][toCol] || board[toRow][toCol][0] !== piece[0]) {
            return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
          }
        }
      }
      break;
    case 'R':
      if ((dr === 0 || dc === 0) && !(dr === 0 && dc === 0)) {
        if (!isBlocked(fromRow, fromCol, toRow, toCol)) {
          if (!board[toRow][toCol] || board[toRow][toCol][0] !== piece[0]) {
            return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
          }
        }
      }
      break;
    case 'Q':
      if ((Math.abs(dr) === Math.abs(dc) || dr === 0 || dc === 0) && !(dr === 0 && dc === 0)) {
        if (!isBlocked(fromRow, fromCol, toRow, toCol)) {
          if (!board[toRow][toCol] || board[toRow][toCol][0] !== piece[0]) {
            return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
          }
        }
      }
      break;
    case 'K':
      if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) {
        if (!board[toRow][toCol] || board[toRow][toCol][0] !== piece[0]) {
          // Prevent moving into check
          return !wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck);
        }
      }
      break;
  }
  return false;
}

function isBlocked(fromRow, fromCol, toRow, toCol) {
  let dr = Math.sign(toRow - fromRow);
  let dc = Math.sign(toCol - fromCol);
  let r = fromRow + dr, c = fromCol + dc;
  while (r !== toRow || c !== toCol) {
    if (board[r][c] !== '') return true;
    r += dr; c += dc;
  }
  return false;
}

// Prevent moving into check
function wouldSelfCheck(fromRow, fromCol, toRow, toCol, piece, ignoreCheck=false) {
  if (ignoreCheck) return false;
  const saved = board[toRow][toCol];
  board[toRow][toCol] = board[fromRow][fromCol];
  board[fromRow][fromCol] = '';
  const kingSafe = !isKingInCheck(piece[0]);
  board[fromRow][fromCol] = board[toRow][toCol];
  board[toRow][toCol] = saved;
  return !kingSafe;
}

// Find king position
function findKing(color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === color+'K') return {row:r, col:c};
  return null;
}

// Is color's king in check?
function isKingInCheck(color) {
  const kingPos = findKing(color);
  if (!kingPos) return false;
  const opponent = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p[0] === opponent) {
        if (isValidMove(r, c, kingPos.row, kingPos.col, p, true)) {
          return true;
        }
      }
    }
  }
  return false;
}

// All legal moves for color
function allLegalMoves(color) {
  let moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p[0] === color) {
        for (let rr = 0; rr < 8; rr++) {
          for (let cc = 0; cc < 8; cc++) {
            if (isValidMove(r, c, rr, cc, p)) {
              moves.push({from:{row:r,col:c},to:{row:rr,col:cc}});
            }
          }
        }
      }
    }
  }
  return moves;
}

function updateInfo() {
  if (gameOver) return;
  let infoText = "";
  if (playmode === "ai") {
    infoText = (currentPlayer === 'w' ? 'Your move (White)' : 'AI move (Black)');
  } else {
    infoText = (currentPlayer === 'w' ? "White's move" : "Black's move");
  }
  document.getElementById('info').textContent = infoText;
}

// Basic checkmate/stalemate detection
function checkGameEnd() {
  const color = currentPlayer;
  const opponent = color === 'w' ? 'b' : 'w';
  const legal = allLegalMoves(color);
  if (legal.length === 0) {
    if (isKingInCheck(color)) {
      document.getElementById('info').textContent = (playmode === 'ai' ?
        (color === 'w' ? "You are checkmated! AI wins!" : "Checkmate! You win!") :
        (color === 'w' ? "White is checkmated! Black wins!" : "Black is checkmated! White wins!")
      );
    } else {
      document.getElementById('info').textContent = "Stalemate! It's a draw.";
    }
    gameOver = true;
    return true;
  }
  if (!findKing('w')) {
    document.getElementById('info').textContent = (playmode === 'ai' ? "AI wins!" : "Black wins!");
    gameOver = true;
    return true;
  }
  if (!findKing('b')) {
    document.getElementById('info').textContent = (playmode === 'ai' ? "You win!" : "White wins!");
    gameOver = true;
    return true;
  }
  return false;
}

// Simple AI: Random move
function aiMove() {
  if (gameOver) return;
  let moves = allLegalMoves('b');
  if (moves.length === 0) {
    checkGameEnd();
    return;
  }
  let choice = moves[Math.floor(Math.random() * moves.length)];
  makeMove(choice.from.row, choice.from.col, choice.to.row, choice.to.col);
  renderBoard();
  setTimeout(() => {
    checkGameEnd();
  }, 150);
}

resetGame();

function mute() {
  const bgMusic = document.getElementById("bg-music");
  bgMusic.muted = !bgMusic.muted;
  alert(bgMusic.muted ? "Audio Muted" : "Audio Unmuted");
}