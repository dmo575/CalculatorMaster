import Button from './button.js';
import vec from './vec.js';

var gridLen = 8;
const grid = [];
const buttonsData = [
    '1','2','3','4','5','6','7','8','9','0','+','-','*','/','.','='
];

// is the player allowed to use the calculator ?
var playerOnControl = false;
// is the game in progress ?
var gameOn = false;
// the current input on the calculator so far
var calcInput = '';
// the equation that needs to be inputed in the calculator, the problem to solve
var currEquation = '2+2';
// game timer in seconds
var timer = 60;
// the current level, each equation solved successfully grants a level up
var currLevel = -1;

// game loop:
/* load calculator + equation
if equal pressed: check equation and move
if incorrect item pressed, reset


page loaded
start game:
    timmer start
    game loop start
    next level:
        load equation: based on lvl
        load calculator: based on lvl
        load calc
        give controls to player
    while (timmer > 0)
        event: incorrect input
            erase screen
        event: equation completed
            next level
*/


function nextLevel() {

    currLevel++;

    let symbols = getRanCalculatorSymbolsArray();

    let buttons = [];
    symbols.forEach((el) => {
        buttons.push(new Button(el, getRandomNumber(1,1), getRandomNumber(1,1), getRandomNumber(7, 7)));
    });

    initGrid(gridLen);

    buttons.forEach((el) => {
        try {
            let info = getEmptyCellsOnGrid(el.width, el.height);
            drawButton(el, info.start, info.dir);
        }
        catch(error) {
            console.log('CATCH: ' + error);
        }
    });

    playerOnControl = true;
}


document.addEventListener('DOMContentLoaded', (event) => {

    nextLevel();
    return;
    // get an array with all the symbols that go onto the calculator in random order
    let ranSymbols = getRanCalculatorSymbolsArray();

    // get an array with random buttons (buttons contain: symbol, width, height)
    let ranButtons = [];
    ranSymbols.forEach((el) => {
        ranButtons.push(new Button(el, getRandomNumber(1, 1), getRandomNumber(1, 1), getRandomNumber(7, 40)));
    });

    // initialize the grid. This sets up both the grid data (grid) and the
    // css #calculator_grid properties as well as clears up any grid child from the
    // html document
    initGrid(gridLen);

    // for each button, we will get their cell position in the grid and then add it
    // to the page's grid
    ranButtons.forEach((el) => {

        try {

            let info = getEmptyCellsOnGrid(el.width, el.height);
            drawButton(el, info.start, info.dir);

        } catch(error) {
            console.log('CATCH: ' + error);
        }
    });

    // debug, console print of the grid array
    printGrid();
});

document.addEventListener('click', (event) => {

    if(!event.target.classList.contains('calc_button')) return;

    let symbol = event.target.dataset.symbol;
    calcInput += symbol;

    for(let i = 0; i < calcInput.length; i++) {

        if(calcInput[i] != currEquation[i]) {
            calcInput = '';
            console.log('ERASED');
        }
    }

    if(calcInput.length == currEquation.length) {
        console.log('NEXT');
    }

    console.log('target : ' + currEquation);
    console.log('current: ' + calcInput);
});

// returns an array with the calculator's symbols in random order
function getRanCalculatorSymbolsArray() {
    let buttons = buttonsData;
    let buttonsRandom = [];

    while(buttons.length > 0) {

        let next = getRandomNumber(0, buttons.length - 1);

        buttonsRandom.push(buttons[next]);

        buttons.splice(next, 1);
    }

    return buttonsRandom;
}

// returns a random number given a range (both extremes are inclusive)
function getRandomNumber(min, max) {
    // get the range (max - min)
    // mult by random, meaning you can get from 0 to range max
    // add min to it, this makes it so that your number is min at minimun and
    // max - 1 at maximum (thats why we add the +1, so that min and max are inclusive)
    // floor it, this way we get an integer that is also in range
    // (this algo I found it online but I made sure to understand it before using it ^)
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// this will scan the grid in a spiral pattern, looking for any empty cells.
// it will call growButtonCheck every time it finds an empty cell, will continue
// untill it either searches the whole grid or the growButtonCheck returns a direction
function getEmptyCellsOnGrid(w, h) {

    // make sure the grid can be zeroed out by 2
    if(gridLen % 2 != 0 || gridLen == 0) {

        throw new Error('table len must be > 0 and a par number');
    }

    // the cell we will start our spiral search from
    let base = new vec(gridLen / 2, gridLen / 2);

    // a 2*2 grid has 1 ring, a 4*4 has 2, etc...
    // its the outter walls of a 2D grid, if you peel them off like an
    // onion, how many times can you do that
    let ringCount = gridLen / 2;

    // for each ring (starting at the most inner one, as hinted by base)
    for(let ring = 0; ring < ringCount; ring++) {

        // defines a starting point on the ring (top right corner)
        // this var will always point out to the current cell we are looking at
        let currBase = new vec();
        currBase = currBase.add(new vec(base.x + ring * -1, base.y + ring * -1));

        // this contains the axis that we want to modify (marked with a one), the
        // operation type (sum or substract) as the polarity (+-) on the number and the ammount
        // as the value of the number (1)
        let modMult = new vec(1, 0);

        // how many cells per line of the ring
        let cellAmnt = 2 + (2 * ring);

        // for each line of the ring:
        for(let line = 0; line < 4; line++) {

            // for each cell on the ring (we start at sub since all lines share the
            // extremes, we omit the first extreme and check the last one for each line)
            for(let cell = 1; cell < cellAmnt; cell++) {

                // this is the current cell
                currBase = currBase.add(new vec(modMult.x, modMult.y));

                // check if this cell is taken (1 means taken 0 is empty)
                if(grid[currBase.x - 1][currBase.y - 1] != 0) continue;

                // if we can attach the button then we are good to go
                // we pass them inverted because in the array [y] goes first 
                // so to be easier to work with later we change that here
                let dir = growButtonCheck(new vec(currBase.x - 1, currBase.y - 1), w, h);
                if(dir) {
                    return {start: new vec(currBase.x - 1, currBase.y - 1),
                        dir: dir};
                }
            }

            // this let us circle around the whole ring clockwise
            line % 2 == 0 ? modMult.switch() : modMult.mirror();
        }
    }

    throw new Error('no grid space found');
}


// this takes a start and uses it as the initial cell to try and search around
// if there is enough space around that start for a button with w and h as specified
// then we occupy the space on te grid and return true for now
function growButtonCheck(start, w, h) {

    // get a horizontal line of empty points (from start to the right)
    let points = getEmptyLine(start, new vec(1, 0), w);
    let finalDir = new vec(1,1);

    // if not possible, get it from start to the left
    if(points.length == 0) {
        points = getEmptyLine(start, new vec(-1, 0), w);
        finalDir.x = -1;
    }

    // if not possible, start does not provide room for the button to grow so return false
    if(points.length == 0) {
        return false;
    }
    
    let pointsFinal = [];
    
    // for each cell on the line gro a vertical line upwards
    let suceed = points.every((el) => {

        let temp = getEmptyLine(el, new vec(0, 1), h);
        
        if(temp.length == 0) {
            return false;
        }
        
        pointsFinal = pointsFinal.concat(temp);
        return true;
    });

    
    // if not possible, grow one downwards
    if(!suceed) {
        
        pointsFinal = [];
        finalDir.y = -1;

        suceed = points.every((el) => {

            let temp = getEmptyLine(el, new vec(0, -1), h);
    
            if(temp.length == 0) {
                return false;
            }
    
            pointsFinal = pointsFinal.concat(temp);
            return true;
        });

        // if not possible, return false
        if(!suceed) return false;
    }

    pointsFinal.forEach((el) => {
        grid[el.x][el.y] = 1;
    });

    return finalDir;
}

// sets up the css grid
// sets up the grid data
function initGrid(len) {

    gridLen = len;

    let gridElement = document.querySelector('#calc_grid');

    // clears the grid from any elements
    while(gridElement.firstChild) {
        gridElement.removeChild(gridElement.firstChild);
    }

    // set up the css properties of #calculator_grid
    let gridTemplateString = '';
    for(let i = 0; i < gridLen; i++) {
        gridTemplateString += ` 1fr`;
    }

    gridElement.style['grid-template-rows'] = gridTemplateString;
    gridElement.style['grid-template-columns'] = gridTemplateString;

    // populate the grid data array with 0es
    for(let i = 0; i < len; i++) {
        grid.push([]);

        for(let x = 0; x < len; x++) {
            grid[grid.length - 1].push(0);
        }
    }
}

// debug function, prints the grid array using the 
// origin (+/+) as the top left corner
function printGrid() {

    let line = '   ';

    for(let i = 0; i < gridLen; i++) {
        line += i + ' ';
    }

    console.log(line);

    line = '';

    for(let y = 0; y < gridLen; y++) {
        
        for(let x = 0; x < gridLen; x++) {
        
            line += grid[x][y].toString() + ' ';
        }

        console.log(y + ': ' + line);
        line = '';
    }
}

// returns a line in a 2D grid, given a start pos on it, a direction and a length (amnt)
// returns an empty array if the line cannot be created
// it uses the grid array data, it tries to see if the line is possible
// assuming that a 1 in the grid data means that cell cannot be used and a 0 means
// that the cell can be used
// so if the line touches a 1, it will be assumed the line cannot be created
function getEmptyLine(start, dir, amnt) {

    let arr = [];

    for(let i = 0; i < amnt; i++) {

        let x = dir.x * i;
        let y = dir.y * i;

        if(grid[start.x + x] == undefined ||
            grid[start.x + x][start.y + y] == undefined ||
            grid[start.x + x][start.y + y] != 0)
        {
            return [];
        }

        arr.push(new vec(start.x + x, start.y + y));
    }

    return arr;
}

// given a button, a start position in a 0 based grid and a growth direction,
// this func will add the button to the page's css grid
function drawButton(btn, start, dir) {
    let gridElement = document.querySelector('#calc_grid');
    let buttonElement = document.createElement('div');

    buttonElement.classList.add('calc_button');

    // the +1 on these is because our grid array is 0 based but the css one is 1 based
    // the "(dir.x < 0 ? (btn.width - 1) * -1 : 0" means:
    // if the direction is negavite, I want to start at start - width/heignt - 1
    // that -1 is needed because we want to grow from the initial position, not move
    buttonElement.style['grid-column'] = `${(start.x + 1) + (dir.x < 0 ? (btn.width - 1) * -1 : 0)} / span ${btn.width}`;
    buttonElement.style['grid-row'] = `${(start.y + 1) + (dir.y < 0 ? (btn.height - 1) * -1: 0)} / span ${btn.height}`;
    buttonElement.innerText = btn.symbol;
    buttonElement.style['border-radius'] = `${btn.radius}%`;
    buttonElement.dataset.symbol = btn.symbol;

    gridElement.appendChild(buttonElement);
}