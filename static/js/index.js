import Button from './button.js';
import vec from './vec.js';
import { printGridArray, printGridButton } from './debug.js';


// this will hold a grid in the form of a JS array
const arrayGrid = [];
// calculator button symbols
const buttonSymbols = [
    '6','3','2','5','8','9','/','*','-','+','=','0','.','1','4','7'
];
const thanksForPlaying = ['THANK', 'YOU', '4', 'PLAYING'];
const wordColors = ['red', 'green', 'blue', 'yellow'];

// elements (since this script is set to defer, we can safely get the html elements here)
const screenElement = document.querySelector('#screen');
const equationElement = document.querySelector('#equation')
const timerElement = document.querySelector('#timer');
const errorsElement = document.querySelector('#errors');
const levelElement = document.querySelector('#level');
const gridElement = document.querySelector('#buttons_container');
const introModalElement = document.querySelector('#intro_modal');
const btnStartElement = document.querySelector('#btn_start');
const countdownModalElement = document.querySelector('#countdown_modal');
const countdownContainer = document.querySelector('#countdown');
const nameModal = document.querySelector('#name_modal');
const nameForm = document.querySelector('#name_form');
const backdropElement = document.querySelector('#backdrop');


// how often we will update the timer UI (miliseconds)
const timerInterval = 10;

// the current input on the calculator so far
var screen = '';
// the equation that needs to be inputed in the calculator
var equation = '';
// every how many levels should we increase the equation complexity
var equationMult = 4;
// time remaining in miliseconds
var currentTime = 99.99 * 1000;
// current level
var lvl = 0;
// counts the player's mistakes
var errorCount = 0;


// ----------------------------------------------------------       EVENT LISTENERS
document.addEventListener('DOMContentLoaded', (event) => {

    modalPop3(introModalElement, 1, 200, 100, 400, 200);
    
    setTimeout(() => {
        modalPop3(introModalElement,-1, 200, 100, 200);
    }, 2000);
    
    setTimeout(() => {
        
        modalPop2(introModalElement, 1, 200, 100);
    }, 4000);
    return;
});

// triggers each time the player presses a button on the calculator
document.addEventListener('click', (event) => {
    
    // if we clicked a button
    if(!event.target.classList.contains('button')) return;

    next();
    //printThankYou();
    return;

    // 1 - put button on the screen

    // get button's symbol
    let symbol = event.target.dataset.symbol;

    // add it to screen
    screen += symbol;

    // update screen
    screenElement.innerText = screen;

    // 2 - evaluate screen and proceed acordingly

    // check if screen matches equation
    for(let i = 0; i < screen.length; i++) {

        if(screen[i] != equation[i]) {
            updateErrors();
            clearScreen();
        }
    }

    // if the equation has been completed:
    if(screen.length == equation.length) {
        next();
    }
});

// starts the 3-0 countdown, closes intro modal
btnStartElement.addEventListener('click', (event) => {
    introModalElement.close();
    startCountDown();
});

// prevents the user from closing any modal by pressing the Esc keyword
document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape') {
        event.preventDefault();
    }
});

// this triggers when the suer hits enter after entering its name
nameForm.addEventListener('submit', (event) => {
    
    event.preventDefault();
    // check input, is it legal?
    // send it to server
    // ask for scores from server

    let name = checkUsername(nameForm.name.value);

    // if name is valid
    if(name) {
        // send to

        // then ask for the leaderboard and in the meantime provide feedback to the user
        // letting him know that you are loading the leaderboard
    }
    else {
        // show errorModal with name rules
    }
});

// ----------------------------------------------------------       MAIN FUNCTIONS

function startGame() {
    startGameTime();
    next();
}

// starts the 3-0 countdown
function startCountDown() {

    // how often we will update this countdown interal (miliseconds)
    let updateRate = 10;
    // start time (seconds)
    let time = 4.0;
    let computedFontSize = window.getComputedStyle(countdownContainer).fontSize;
    // we substract 2 to remove the 'px' from the string
    let originalSize = parseInt(computedFontSize.slice(0, computedFontSize.length - 2));
    
    // set the initial value for the countdown text and show the modal
    countdownContainer.innerText = time;
    countdownModalElement.showModal();

    // every 'initialCountdownTI' miliseconds (10ms):
    let cd = setInterval(() => {

        // get current size (returns a string with px at the end)
        computedFontSize = window.getComputedStyle(countdownContainer).fontSize;

        // get the actual value from the size we got above
        let currSize = parseInt(computedFontSize.slice(0, computedFontSize.length - 2));

        // shrink the value by a bit (10 pixles)
        currSize = currSize > 0 ? currSize - 10: 0;

        // update time (seconds)
        time -= updateRate / 1000;

        // if a second has passed:
        if(parseInt(countdownContainer.innerText) > parseInt(time)) {

            // set the innerText to the new second value
            countdownContainer.innerText = parseInt(time);

            // set currSize to original size
            currSize = originalSize;
        }

        // update element's innerText size with computed size
        countdownContainer.style.fontSize = `${currSize}px`;

        // if time is less than 1.0
        if(time < 1) {
            countdownModalElement.close();
            startGame();
            clearInterval(cd);
        }

    }, updateRate);
}

// starts the game's countdown and executes code when it finishes
function startGameTime() {

    let timerObject = setInterval(() => {
        currentTime -= timerInterval;

        timerElement.innerText = (currentTime / 1000).toFixed(2);

        if(currentTime == 0) {
            endGame();
            clearInterval(timerObject);
        }

    }, timerInterval);
}

// goes to the next problem to solve
function next() {
    levelUp(); // update the lvl var and play lvl up UI animation
    clearScreen(); // clears the calculator screen
    makeCalculator(lvl); // generates a random calculator based on level
    makeEquation(lvl); // generates a random equation based on level
}

// clears the calculator screen
function clearScreen() {
    screen = '';
    screenElement.innerText = screen;
}

// makes a new calculator based on level
function makeCalculator(lv, sym=undefined, gridLen=32, searchMethod=arrayGridSearchSpiral) {
    
    initArrayGrid(gridLen);
    let symbols = sym == undefined ? getRanSymbols() : sym;
    let minLen = parseInt(1 + 10 / 100 * lv);
    let maxLen = parseInt(1 + 20 / 100 * lv);
    let minRound = parseInt(1 + 50 / 100 * lv);
    let maxRound = parseInt(1 + 200 / 100 * lv);
    maxRound = maxRound > 100 ? 100: maxRound;
    minRound = minRound > 30 ? 30 : minRound;

   // make buttons
   let buttons = [];
   symbols.forEach((el, index) => {
       let btn = new Button(el, getRanNumber(minLen, maxLen), getRanNumber(minLen, maxLen), getRanNumber(minRound, maxRound));
       // this will give the button a start position in the grid array
       btn.start = getStartPosOnArrayGrid(btn, searchMethod);
       buttons.push(btn);
   });

   // this will convert the 'array grid' start position of the buttons to a 
   // start position on the 'css grid'. Returns the css grid dimensions as a vec
   convertArrayGridPosToCSSGridPos(buttons);

   initCssGrid();

   // draw buttons
   buttons.forEach((el) => {
       drawButton(el, el.start, el.dir);
   });
}

// creates random equation based on level
function makeEquation(lv) {

    equation = '';
    let eqLen = Math.floor((lv / equationMult));
    
    for(let i = 0; i < eqLen + 1; i++) {
        
        let temp = getRanNumber(1,4);
        let operator = '';

        switch(temp) {
            case 1:
                operator = '+';
                break;
            case 2:
                operator = '-';
                break;
            case 3:
                operator = '*';
                break;
            default:
                operator = '/';
                break;
        }

        equation += getRanNumber(lv, 9 * lv) + ' ' + operator + ' ';
    }

    equation += getRanNumber(lv, 9 * (lv + 1)) + ' =';

    equationElement.innerText = equation;
    // we replace the blank spaces here because we want the equation variable
    // to only hold the characters that we will be using with the calculator.
    // this way we can easely check with whats on the screen.
    equation = equation.replace(new RegExp(' ', 'g'), '');
}

// called when the player makes a mistake
function updateErrors() {
    errorCount++;
    errorsElement.innerText = 'Err ' + errorCount;
    // TODO: animation
}

// called when the player levels up
function levelUp() {
    lvl++;
    levelElement.innerText = 'Lvl ' + lvl;
    // TODO: animation
}

// creates a custom calculator that displays a 'Thank you" message
function printThankYou() {

    makeCalculator(1, undefined, 4, arrayGridSearchLinear);

    let children = Array.from(gridElement.children);

    let btn = 0;

    for(let w = 0; w < thanksForPlaying.length; w++) {

        let word = thanksForPlaying[w];

        for(let sub = 0; sub <  word.length; sub++) {

            children[btn].innerText = word[sub];
            children[btn].style.color = wordColors[w];
            btn++;
        }
    }
}

// ----------------------------------------------------------       ARRAY GRID SEARCH

// this will scan the grid in a spiral pattern, looking for any empty cells.
// it will call growButtonCheck every time it finds an empty cell, will continue
// untill it either searches the whole grid or the growButtonCheck returns a position
function arrayGridSearchSpiral(w, h) {

    let gridLen = arrayGrid.length;
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
                if(arrayGrid[currBase.x - 1][currBase.y - 1] != 0) continue;

                // if we can attach the button then we are good to go
                // we pass them inverted because in the array [y] goes first 
                // so to be easier to work with later we change that here
                let start = growButtonCheck(new vec(currBase.x - 1, currBase.y - 1), w, h);
                if(start) {
                    return start;
                }
            }

            // this let us circle around the whole ring clockwise
            line % 2 == 0 ? modMult.switch() : modMult.mirror();
        }
    }

    throw new Error('no grid space found');
}

// searches for empty cells on the array grid linearly
function arrayGridSearchLinear(w, h) {

    let gridLen = arrayGrid.length;

    // make sure the grid can be zeroed out by 2
    if(gridLen % 2 != 0 || gridLen == 0) {

        throw new Error('table len must be > 0 and a par number');
    }

    for(let x = 0; x < gridLen; x++) {

        for(let y = 0; y < gridLen; y++) {

            if(arrayGrid[y][x] != 0) continue;

            let start = growButtonCheck(new vec(y, x), w, h);
            if(start) {
                return start;
            }
        }
    }

    throw new Error('no grid space found');
}

// ----------------------------------------------------------       ARRAY GRID

// clears the arrayGrid and repopulates it with desired len filled with 0es
function initArrayGrid(gridLen) {

    while(arrayGrid.length > 0) {
        arrayGrid.pop();
    }

    // populate the array grid with 0es
    for(let i = 0; i < gridLen; i++) {
        arrayGrid.push([]);

        for(let x = 0; x < gridLen; x++) {
            arrayGrid[arrayGrid.length - 1].push(0);
        }
    }
}

// given a start position in the array grid, it calculates if a button with
// specified h and w can grow from there or its proximity, if so, it returns the position
// on the array grid the button can positively grow from
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

    let finalStart = start;
    pointsFinal.forEach((el) => {
        arrayGrid[el.x][el.y] = 1;

        finalStart = el.x + el.y < finalStart.x + finalStart.y ? new vec(el.x, el.y) : finalStart;
    });

    return finalStart;
}

// given a start position, direction and length, it returns a line on the
// arrayGrid, assuming that line is vacant on the arrayList (0).
// If not vacant, returns an empty array.
function getEmptyLine(start, dir, amnt) {

    let arr = [];

    for(let i = 0; i < amnt; i++) {

        let x = dir.x * i;
        let y = dir.y * i;

        if(arrayGrid[start.x + x] == undefined ||
            arrayGrid[start.x + x][start.y + y] == undefined ||
            arrayGrid[start.x + x][start.y + y] != 0)
        {
            return [];
        }

        arr.push(new vec(start.x + x, start.y + y));
    }

    return arr;
}

// given a button and a grid search method, returns a position on the arrayGrid
// that given button can you to grow from
function getStartPosOnArrayGrid(btn, searchMethod=arrayGridSearchSpiral) {

    let start = new vec(arrayGrid.length / 2,arrayGrid.length / 2);

    try {

        start = searchMethod(btn.width, btn.height);

    } catch(error) {

        console.error('CATCH: ' + error);
        return new vec(arrayGrid.length / 2,arrayGrid.length / 2);
    }

    return start;
}

// ----------------------------------------------------------       CSS GRID

// examines the buttons' start position and identifies the length the css
// grid should have, also converts those buttons' positions to fit on that css grid
function convertArrayGridPosToCSSGridPos(buttons) {

    let minVals = new vec(arrayGrid.length, arrayGrid.length);
    let maxVals = new vec();

    // get the lowest and highest X and Y values among all th buttons' positions
    buttons.forEach((el) => {
        minVals.x = minVals.x < el.start.x ? minVals.x : el.start.x;
        minVals.y = minVals.y < el.start.y ? minVals.y : el.start.y;

        maxVals.x = maxVals.x > el.start.x + el.width - 1 ? maxVals.x : el.start.x + el.width - 1;
        maxVals.y = maxVals.y > el.start.y + el.height - 1 ? maxVals.y : el.start.y + el.height - 1;
    });

    // calculate the dimensions the css grid needs to host the buttons
    let cssGridLen = new vec(
        (maxVals.x - minVals.x) + 1,
        (maxVals.y - minVals.y) + 1
    );

    // convert the button position to properly fit on a css grid of length cssGridLen
    buttons.forEach((el) => {
        el.start.x -= (minVals.x - 1);
        el.start.y -= (minVals.y - 1);
    });

    // return the dimensions the css grid needs
    return cssGridLen;
}

// given a button, a start position in a 1 based grid and a positive width and height,
// this func will add the button to the page's css grid
function drawButton(btn, start, dir) {
    let buttonElement = document.createElement('div');

    buttonElement.classList.add('button');

    buttonElement.style['grid-column'] = `${start.x} / span ${btn.width}`;
    buttonElement.style['grid-row'] = `${start.y} / span ${btn.height}`;
    buttonElement.innerText = btn.symbol;
    buttonElement.style['border-radius'] = `${btn.radius}%`;
    buttonElement.dataset.symbol = btn.symbol;

    gridElement.appendChild(buttonElement);
}

// clears out the css grid children
function initCssGrid() {
    let gridElement = document.querySelector('#buttons_container');
    
    while(gridElement.lastChild) {
        gridElement.removeChild(gridElement.lastChild);
    }
}

// ----------------------------------------------------------       GENERAL

// returns an array with the calculator's symbols in random order
function getRanSymbols() {

    // the reason we call Array.from is because we need a deep copy as we will
    // destructively edit the buttons variable
    let buttons = Array.from(buttonSymbols);
    let buttonsRandom = [];

    while(buttons.length > 0) {

        let next = getRanNumber(0, buttons.length - 1);

        buttonsRandom.push(buttons[next]);

        buttons.splice(next, 1);
    }

    return buttonsRandom;
}

// returns a random number given a range (both extremes are inclusive)
function getRanNumber(min, max) {
    // get the range (max - min)
    // mult by random, meaning you can get from 0 to range max
    // add min to it, this makes it so that your number is min at minimun and
    // max - 1 at maximum (thats why we add the +1, so that min and max are inclusive)
    // floor it, this way we get an integer that is also in range
    // (^ this algo I found it online but I made sure to understand it before using it ^)
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function checkUsername(name) {

    let finalName = name.replace(new RegExp(' ', 'g'), '');

    if(finalName.length == 0) return false;

    return finalName;
}

// ----------------------------------------------------------       ANIMATIONS
// modal must contain the width and height
// ideally, children w:h should be relative to modal's w:h, not absolute
// arguments:
// dir: 1 to grow from nothing, 0 to shrink onto nothing
// time: how long will the griw/shrink take (miliseconds)
// fadeinStart: at what point in the grow/shrink you want the children to start the dafe in/out (miliseconds)
// 
function modalPop(modalElement, dir, time, fadeInStart=70) {

    // TODO: disable input

    // animation tick
    let timeInterval = 10;
    // keeps track of the sizing progress (%)
    let sizingProgress = 0;
    // element's children
    let children = Array.from(modalElement.children);
    // gets computed size of the element pre-opening it, meaning its in %
    let temp = window.getComputedStyle(modalElement).width;
    let modalInitWidth = parseInt(temp.slice(0, temp.length - 1));
    temp = window.getComputedStyle(modalElement).height;
    let modalInitHeight = parseInt(temp.slice(0, temp.length - 1));
    // will store the current size of the element
    let modalCurrWidth = 0;
    let modalCurrHeight = 0;
    // how much should the size change by each tick
    let widthIncrement = modalInitWidth / time * timeInterval;
    let heightIncrement = modalInitHeight / time * timeInterval;

    // set children opacity to start value based on dir
    let targetOpacity = [];
    children.forEach((element) => {
        targetOpacity.push(window.getComputedStyle(element).opacity);
        element.style.opacity = 0;
    });
    
    modalElement.showModal();

    let interval = setInterval(()=>{

        // modal pop up
        modalCurrWidth += widthIncrement;
        modalCurrHeight += heightIncrement;

        modalElement.style.width = `${modalCurrWidth}%`;
        //modalElement.style.height = `${modalCurrHeight}%`;
        modalElement.style.height = `${modalInitHeight}%`;

        // update progress percentage
        sizingProgress = modalCurrHeight / (modalInitHeight / 100);


        // if the modal is at least 'fadeInStart'% done resizing
        if(sizingProgress >= fadeInStart) {
            
            children.forEach((element, index) => {
                // replace 1.0 for target opacity value
                let opacityIncrement = targetOpacity[index] / (100 - fadeInStart);
                // the value this elemen's opacity should be at right now
                let newOpVal = opacityIncrement * (sizingProgress - fadeInStart);
                element.style.opacity = newOpVal;
            });
        }


        if(modalCurrWidth >= modalInitWidth) {

            modalElement.style.width = `${modalInitWidth}%`;
            modalElement.style.height = `${modalInitHeight}%`;
            clearInterval(interval);
        }

    }, timeInterval);
}

// open/close modal animation
// modal has w:h anc background color
// takes care of children
function modalPop2(modalElement, dir, popTime, fadeTime) {

    // just in case
    dir = dir > 0 ? 1 : -1;

    if(dir > 0) {
        // if we meant to open the modal we first set opacity to  so that we dont
        // see it full dimensions for a tick or two
        modalElement.style.opacity = 0;
    }

    // get all interactible children and disable them. Add any other element to the list below
    let interactibles = Array.from(modalElement.querySelectorAll('button, textarea, input'));

    // prevents the scrollbar to show while the pop animation happens.
    modalElement.style.overflow = 'hidden';

    interactibles.forEach((element) => {
        element.disabled = true;
    });

    // we then call open on it. If we meant to open it this is the step and it not
    // its already openened so it doesnt matter.
    // we need to always first open it so that the computed values come out int pixel
    // units. This will allow us to open and close it multiple times without the 
    // modal breaking due to computed values using two measures (% and px).
    // he reason for this is that a modal that has not been opened before will
    // stick to returning properties with the units the way we specified them
    // in css, but after they have been opened once they will stick to pixels
    modalElement.showModal();

    // animation tick
    let timeInterval = 10;
    // element's children
    let children = Array.from(modalElement.children);
    // gets computed size of the element, since its been opened already, units will be px
    let temp = window.getComputedStyle(modalElement).width;
    let modalOriginalWidth = parseInt(temp.slice(0, temp.length - 2));
    temp = window.getComputedStyle(modalElement).height;
    let modalOriginalHeight = parseInt(temp.slice(0, temp.length - 2));

    let modalCurrWidth = dir == 1 ? 0 : modalOriginalWidth;
    let modalCurrHeight = dir == 1 ? 0 : modalOriginalHeight;
    let modalTargetWidth = dir == 1 ? modalOriginalWidth : 0;
    let modalTargetHeight = dir == 1 ? modalOriginalHeight : 0;

    // how much should the size change by each tick
    let widthIncrement = modalOriginalWidth / popTime * timeInterval;
    let heightIncrement = modalOriginalHeight / popTime * timeInterval;

    // save children original opacity and set its start and target values
    let targetOpacity = [];
    let originalOpacity = [];
    children.forEach((element) => {

        originalOpacity.push(window.getComputedStyle(element).opacity);

        if(dir > 0) {

            targetOpacity.push(parseFloat(originalOpacity[originalOpacity.length - 1]));
            element.style.opacity = 0;
            return;
        }
        targetOpacity.push(0);
    });
    
    // timeout for pop, happens first if opening, second if closing
    setTimeout(() => {

        // children fade in/out animation
        let fadeAnimation = setInterval(() => {

            children.forEach((element, index) => {

                let opacityIncrement = originalOpacity[index] / fadeTime * timeInterval;

                element.style.opacity = parseFloat(window.getComputedStyle(element).opacity) + (opacityIncrement * dir);
            });

            let complete = children.every((element, index) => {
                // im really proud of this one below rhere: look at it boi look at it
                return (targetOpacity[index] + (parseFloat(element.style.opacity) * -dir) <= 0);
            });

            if(complete) {

                // enable all interactible elements back
                interactibles.forEach((element) => {
                    element.disabled = false;
                });

                // note on not deleting in-line style values for the children:
                // in this case we dont do that because its just avalue from 0
                // to 1, there is no conflict like % and px as with the modal.
                // So even if we resize the screen and trigger @media queries
                // all will be fine

                clearTimeout(fadeAnimation);
            }

        }, timeInterval);

    }, dir > 0 ? popTime : 0);

    // timeout for face, happens first if closing, second if opening
    setTimeout(() => {

        
        // modal pop in/out animation
        let popAnimation = setInterval(()=>{
            
            modalCurrWidth += widthIncrement * dir;
            modalCurrHeight += heightIncrement * dir;
            
            modalElement.style.width = `${modalCurrWidth}px`;
            modalElement.style.height = `${modalCurrHeight}px`;

            // we set this here to avoid seen it full dimensions for a tick or two
            modalElement.style.opacity = 1;
            
            // im really proud of this one below rhere: look at it boi look at it
            if(modalTargetWidth + (modalCurrWidth * -dir) <= 0) {

                modalElement.style.width = `${modalTargetWidth}px`;
                modalElement.style.height = `${modalTargetHeight}px`;
                
                // if we meant to close the modal:
                if(dir < 0) {
                    modalElement.close();
                    
                    modalElement.style.height = `${modalOriginalHeight}px`;
                    modalElement.style.width = `${modalOriginalWidth}px`;
                    
                    
                    children.forEach((element, index) => {
                        element.style.opacity = originalOpacity[index];
                    });
                }

                // we let css values take over again to avoid a display conflict if
                // the user changes the aspect ratio (% and px)
                modalElement.removeAttribute('style');

                clearInterval(popAnimation);
            }

        }, timeInterval);

    }, dir > 0 ? 0 : fadeTime);
}

function backdropFade(dir, duration) {

    // update tick
    let timeInterval = 10;
    let opacityIncrement = 1.0 / duration * timeInterval;

    console.log(opacityIncrement);

    let opacityTarget = backdropElement.style.opacity == 0 ? 1.0 : 0.0;

    let fadeAnimation = setInterval(() => {

        // every tick, we mod the opaciy
        backdropElement.style.opacity = parseFloat(window.getComputedStyle(backdropElement).opacity) + (opacityIncrement * dir);

        duration -= timeInterval;

        if(duration <= 0) {

            backdropElement.style.opacity = opacityTarget * dir;
            clearInterval(fadeAnimation);
        }
        
    }, timeInterval);
}

// same as modalPop2 but accepts backdropTime:
// >= 0: time it takes for the backdrop to fade in/out
// < 0: leave backdrop as it is
// behaivour:
// if opening modal: backdrop fades in, then modal opens
// if closing modal: modal closes, then backdrop fades out
// 0 or negative backdropTime will just leave the backdrop as it is
// use inBetTime to leave some time between the backdrop fade and the modal pop
function modalPop3(modalElement, dir, popTime, fadeTime, backdropTime=0, inBetTime=0) {

    // modal
    setTimeout(() => {

        modalPop2(modalElement, dir, popTime, fadeTime);

    }, dir > 0 ? backdropTime + inBetTime : 0);

    if(backdropTime <= 0) return;

    // backdrop
    setTimeout(() => {

        backdropFade(dir, backdropTime);

    }, dir > 0 ? 0 : popTime + fadeTime);

}


// ----------------------------------------------------------       DEBUG

window.addEventListener('resize', (event) => {

    console.clear();
    console.log(window.innerWidth / window.innerHeight);
});