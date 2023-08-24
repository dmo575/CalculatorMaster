import Button from './button.js';
import vec from './vec.js';
import { openMessage, closeMessage, openMessagePre } from './message.js';
import { printGridArray, printGridButton } from './debug.js';

// stores the button layout in the form of a 2D JS array
const arrayGrid = [];
// calculator button symbols
const buttonSymbols = [
    '6','3','2','5','8','9','/','*','-','+','=','0','.','1','4','7'
];
// const data for "Thank you 4 Playing" button layout
const thanksForPlaying = ['THANK', 'YOU', '4', 'PLAYING'];
const wordColors = ['red', 'green', 'blue', 'yellow'];

// elements (since this script is set to defer, we can safely get the html elements here)
const screenElement = document.querySelector('#screen');
const equationElement = document.querySelector('#equation')
const timerElement = document.querySelector('#timer');
const errorsElement = document.querySelector('#errors');
const levelElement = document.querySelector('#level');
const gridElement = document.querySelector('#buttons_container');
const countdownModalElement = document.querySelector('#countdown_modal');
const countdownContainer = document.querySelector('#countdown');

// forms
const nameForm = document.querySelector('#name_form');

// modal message boxes
const introModalElement = document.querySelector('#intro_modal');
const nameModalElement = document.querySelector('#name_modal');
const leaderboardModalElement = document.querySelector('#leaderboard');

// buttons
const introModalButtonElement = document.querySelector('#btn_start');

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
// how many users can the leaderboard display
const leaderboardCapacity = 30;
const pladeholderFlagImgSrc = '/static/images/world.png';


// ----------------------------------------------------------       EVENT LISTENERS

// start point
document.addEventListener('DOMContentLoaded', (event) => {

    // Opens the welcome/instructions message
    //openMessagePre(introModalElement, true);
    openMessagePre(nameModalElement, true);
});

// triggers each time the player presses a button on the calculator
document.addEventListener('click', (event) => {
    
    // if we clicked a button
    if(!event.target.classList.contains('button')) return;

    // get button's symbol
    let symbol = event.target.dataset.symbol;

    // add it to screen and upate it
    screen += symbol;
    screenElement.innerText = screen;

    // check if whats on the screen aligns with the current equation
    for(let i = 0; i < screen.length; i++) {

        if(screen[i] != equation[i]) {
            // if it doesnt, update errors and clear the screen
            updateErrors();
            clearScreen();
            break;
        }
    }

    // if the equation has been completed, go next level
    if(screen.length == equation.length) {
        next();
    }
});
// triggers when the player clicks 'Start' on the intro modal
introModalButtonElement.addEventListener('click', (event) => {
    
    // close intro message and start the countdown
    closeMessage(introModalElement, true, true)
    .then(() => {
        startCountDown();
    });
});

// prevents the user from closing any modal by pressing the Esc keyword
document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape') {
        event.preventDefault();
    }
});

// triggers when the user hits enter on the 'enter a username' window
nameForm.addEventListener('submit', (event) => {
    
    // prevent default, we will handle the request by fetch.
    event.preventDefault();

    nameForm.username.disabled = true;

    let username = nameForm.username.value;

    // client side data validation for the name
    let checkObject = checkUsername(username);

    // if name is invalid, send mesage to the user with reason.
    if(!checkObject.pass) {

        // open an error message and inform user of error
        openMessage(true, checkObject.errorArray, false, 'OK', (e) => {
            
            // on click, close the erro window
            closeMessage(e.target.parentNode)
            .then(() => {
                // enable input field again
                nameForm.username.disabled = false;
            });
        });

        return;
    }

    // close the 'insert name' message
    closeMessage(nameModalElement, false, false)
    .then(()=> {

        // then attempt to send the score
        sendScore(username, lvl)
        .then((scoreData)=> {

            // then if success, show leaderboard
            showLeaderboard(scoreData);
        })
        .catch((error) => {
            // handle errors on seinding the score

            console.log(error.message);
            // reopen the 'insert name' message to allow for a try again
            openMessagePre(nameModalElement, false)
            .then(() => {
                nameForm.username.disabled = false;
            });
        });
    });
});

// ----------------------------------------------------------       MAIN FUNCTIONS

// starts the game
// called once the initial countdown is over
function startGame() {
    // start the countdown of the game
    startGameTime();
    // loads the next calculator and equation
    next();
}

// starts the 3 second countdown countdown, calls startGame() after countdown
function startCountDown() {

    // how often we will update this countdown interval (miliseconds)
    let updateRate = 10;
    // start time (seconds)
    let time = 4.0;
    let computedFontSize = window.getComputedStyle(countdownContainer).fontSize;
    // original size of the text in pixles
    // we substract 2 to remove the 'px' from the string we are parsing
    let originalSize = parseInt(computedFontSize.slice(0, computedFontSize.length - 2));
    
    // set the initial value for the countdown text and show the modal
    countdownContainer.innerText = time;
    countdownModalElement.showModal();

    // every tick:
    let cd = setInterval(() => {

        // get current size (returns a string with px at the end)
        computedFontSize = window.getComputedStyle(countdownContainer).fontSize;

        // parse the size into an int
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

// starts the game's countdown and executes endGame() when it finishes
function startGameTime() {

    let timerObject = setInterval(() => {
        currentTime -= timerInterval;

        timerElement.innerText = (currentTime / 1000).toFixed(2);

        if(currentTime == 0) {
            // ends the game
            endGame();
            clearInterval(timerObject);
        }

    }, timerInterval);
}

// loads the new level
function next() {
    levelUp(); // updates the lvl
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
    
    // initializes an array with a given length
    initArrayGrid(gridLen);
    // set max and min for button properties based on current level
    let symbols = sym == undefined ? getRanSymbols() : sym;
    let btnMinLen = parseInt(1 + 10 / 100 * lv);
    let btnMaxLen = parseInt(1 + 20 / 100 * lv);
    let btnMinRound = parseInt(1 + 50 / 100 * lv);
    let btnMaxRound = parseInt(1 + 200 / 100 * lv);
    btnMaxRound = btnMaxRound > 100 ? 100: btnMaxRound;
    btnMinRound = btnMinRound > 30 ? 30 : btnMinRound;

   // make buttons
   let buttons = [];
   symbols.forEach((el) => {
       let btn = new Button(el, getRanNumber(btnMinLen, btnMaxLen),
       getRanNumber(btnMinLen, btnMaxLen), getRanNumber(btnMinRound, btnMaxRound));

       // give the button a start position in the array grid
       btn.start = getStartPosOnArrayGrid(btn, searchMethod);
       buttons.push(btn);
   });

   // convert the 'array grid' start position of the buttons to a 
   // start position on the 'css grid'
   convertArrayGridPosToCSSGridPos(buttons);

   initCssGrid();

   // draw buttons
   buttons.forEach((el) => {
       drawButton(el, el.start);
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

// sends score to the server
// returns a promise, resolve returns data about the sent score
function sendScore(username, score) {
    
    // this is the data object we will send as a json
    const userData = {
        username: username,
        score: score,
    };

    // http request's data
    const requestObject = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(userData)
    };

    const promise = new Promise((resolve, reject) => {

        // open a loading msg
        openMessage(false, ['Sending your score to the server', '. . . '])
        .then((loadingMsg) => {

            // then start a fetch request
            fetch('/send_score', requestObject)
            .then((response) => {

                // then process the response
                // if response was 200 OK
                if(response.status == 200) {

                    // return the json() promise so we can .then() it below
                    return response.json();
                }
                else {
                    // if response not 200 OK, throw an error and pass the message
                    throw new Error(response.message);
                }
            })
            .then(responseJson => {
                // process responseJson (json())

                // if data is duplicate
                if(responseJson.message === 'duplicate') {

                    // close the loading message
                    closeMessage(loadingMsg)
                    .then(()=> {

                        // then open msg telling user to use different name
                        openMessage(false, ['There is already a record with this username and score', 'Please select another username'], false, 'Ok', (e) => {

                            // on message's button click:
                            // close message
                            closeMessage(e.target.parentNode)
                            .then(() => {

                                // then reject
                                reject(new Error(responseJson.message));
                            });
                        });
                    })
                }
                else {

                    // if request was accepted:
                    // close loading message
                    closeMessage(loadingMsg)
                    .then(() => {
                        
                        // then resolve
                        resolve(responseJson.data);
                    });
                }

            })
            .catch((error) => {
                // handle any fetch errors

                console.log(error.message);

                //close the loading message
                closeMessage(loadingMsg)
                .then(() => {

                    // then open an error message with the option to try again
                    openMessage(true, ['Oops !', 'An error acurred while sending the score to the server'],false, 'Try again',  (e) => {
                        
                        // on click 'try again':
                        // close error message
                        closeMessage(e.target.parentNode)
                        .then(() => {

                            // then call sendScore recursively
                            sendScore(username, score)
                            .then((scoreData) => {

                                // then once the recursive sendScore has been solved, resolve this one
                                resolve(scoreData);
                            });
                        });
                    });
                });
            });
        });
    });

    return promise;
}


// handles the loading and displaying of the leaderboard
function showLeaderboard(userData) {

    // to be resolved once leaderboard is displayed
    const promise = new Promise ((resolve, reject) => {

        // open loading message
        openMessage(false, ['Loading global rankins', '. . .'])
        .then((loadingMsg) => {

            // then fetch for leaderboard data
            fetch(`/get_leaderboard?length=${leaderboardCapacity}`)
            .then((response) => {
                // handle response
                
                if(response.status == 200) {

                    return response.json();
                }
                else {
                    throw new Error('Error while retrieving leaderboard data');
                }
            })
            .then((leaderboardDataJson) => {
                // if response ok, then handle data

                // create an array with all the country codes from the leaderboard
                let countryCodes = [];

                leaderboardDataJson.data.forEach((el) => {
                    let contains = countryCodes.includes(el.countryCode);

                    if(!contains) {
                        countryCodes.push(el.countryCode);
                    }
                });

                // add the user's score country code data to the countryCodes array
                if(!countryCodes.includes(userData.countryCode)) {
                    countryCodes.push(userData.countryCode);
                }

                // load all flag images we need once
                loadFlagImages(countryCodes)
                .then(flags => {

                    // then populate the leaderboard with the aquired data
                    updateLeaderboard(leaderboardDataJson.data, flags, userData);

                    // close loading message
                    closeMessage(loadingMsg)
                    .then(()=> {

                        // then open the leaderboard window
                        openMessagePre(leaderboardModalElement)
                        .then(()=> {
                            resolve();
                        });
                    });
                });
            })
            .catch(error => {
                // handle any errors that might have bubbled up during the fetch process

                console.log(error.message);

                // close loading message
                closeMessage(loadingMsg)
                .then(() => {

                    // then open an error message with a 'Try again' option
                    openMessage(true, ['Error while retrieving leaderboard.'], false, 'Try again', (e) => {
                    
                        // on 'Try again' click: close the error message
                        closeMessage(e.target.parentNode)
                        .then(() => {

                            // then recursively call showLeaderboard
                            showLeaderboard(userData)
                            .then(() => {

                                // then (once leaderboard is displayed), resolve
                                resolve();
                            });
                        });
                    });
                });
            });
        });
    });

    return promise;
}

// given an array of country codes, creates an array of
// { countryCode: string, img: Image }. this array contains one object per unique
// country code
function loadFlagImages(countryCodes) {
    
    let flags = [];

    countryCodes.forEach(el => {
        flags.push({countryCode: el, img: new Image()});
    });

    let promise = new Promise((resolve, reject) => {
        
        // get a dictionary with flaf images
        let flagPromises = [];

        // for each element, create a promise that resolves once the Image
        // of that  element has fully loaded. Add promise to flagPromises
        flags.forEach((element) => {
            let imgLoadPromise = new Promise((imgLoadResolve, imgLoadReject) => {
                
                element.img.src = `https://flagsapi.com/${element.countryCode}/shiny/32.png`;
                // if the image loaded, resolve
                element.img.onload = ()=> {imgLoadResolve(element);};
                // if the image could not load, set source to our flag placeholder
                // (this is recursive since this basically starts a new load)
                element.img.onerror = (event)=>{
                    console.log('Error loading flag image. Placeholder provided.');
                    // this will trigger the onload event again once done so we dont
                    // have to call imgLoadResolve prematurely here
                    event.target.src = pladeholderFlagImgSrc;
                };
            })
            .catch((error) => {
                // we catch all errors related to image loading here.
                console.error('Uknown error while loading the flag: ' + error.message);
            });

            flagPromises.push(imgLoadPromise);
        });


        // once all images have finished the loading attempt
        Promise.allSettled(flagPromises)
        .then((results) => {
            console.log('All images resolved');
            resolve(flags);
        });
    });

    return promise;
}

// given the neccessary data, populates the leaderboard element
function updateLeaderboard(leaderboardData, flags, userData) {

    const leaderboardItemCont = leaderboardModalElement.querySelector('#leaderboard_item_container');
    const userScoreContainerElement =  leaderboardModalElement.querySelector('#user_score_container');

    // for each leaderboard item element:
    leaderboardData.forEach((element, index)=> {

        // identify the image source for its flag
        let flagImgSrc = '';
        for(let i = 0; i < flags.length; i++) {
            if(flags[i].countryCode == element.countryCode) {
                flagImgSrc = flags[i].img.src;
                break;
            }
        }

        // create an item with the given data
        let item = createLeaderboardItem(element.username, element.score, index + 1, flagImgSrc);
        
        // add it to the leaderboard element
        leaderboardItemCont.appendChild(item);
    });

    // identify the image source for the user's flag
    let userFlagImgSrc = '';
    flags.forEach(el => {

        if(el.countryCode == userData.countryCode) {
            userFlagImgSrc = el.img.src;
        }
    });

    // create the user score item
    let userScoreItem = createLeaderboardItem(userData.username, userData.score, userData.rank, userFlagImgSrc);
    
    // and add it to its place in the leaderboard
    userScoreContainerElement.appendChild(userScoreItem);
}

// creates a leaderboard item element with given values and returns it
function createLeaderboardItem(username, level, rank, flagImgSrc) {

    // create elements
    let item = document.createElement('div');
    let itemContainer = document.createElement('div');
    let name = document.createElement('p');
    let score = document.createElement('p');
    let flag = document.createElement('img');
    
    // assign values to elements
    name.innerText = `${rank} - ${username}`;
    score.innerText = level;
    flag.src = flagImgSrc;
    
    // assign them their css classes
    item.classList.add('leaderboard_item');
    itemContainer.classList.add('item_container');
    name.classList.add('item_component');
    score.classList.add('item_component');
    flag.classList.add('item_component', 'leaderboard_item_image');
    
    // append item component elements to item element
    itemContainer.appendChild(name);
    itemContainer.appendChild(score);
    itemContainer.appendChild(flag);
    item.appendChild(itemContainer);

    return item;
}

// ----------------------------------------------------------       ARRAY GRID SEARCH

// this will scan the array grid in a spiral pattern, looking for any empty cells.
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

    // get the lowest and highest X and Y values among all the buttons' positions
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
function drawButton(btn, start) {
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
    return Math.floor(Math.random() * (max - min + 1)) + min;
    // (^ this algo I found it online but I made sure to understand it before using it ^)
}

// checks given username, returns object with results
function checkUsername(username) {

    let returnObject = {
        pass: true,
        errorArray: ''
    };

    let forbiddenCharacters = [' ', '?', ',', '=', '(', ')', '+', '-', '*', '%', '.'];

    let nameClear = forbiddenCharacters.every((element) => {
        return !username.includes(element);
    });

    // if the provided name contains any of the forbidden characters
    if(!nameClear) {

        returnObject.pass = false;
        returnObject.errorArray = ['You cannot use these characters:', `${forbiddenCharacters.join(' ')}`];
        return returnObject;
    }

    // if the name length is invalid
    if(username.length < 3 || username.length > 20) {

        returnObject.pass = false;
        returnObject.errorArray = ['The name length must be between 3 and 20 characters'];
        return returnObject;
    }

    return returnObject;
}

// ----------------------------------------------------------       DEBUG

window.addEventListener('resize', (event) => {

    console.clear();
    console.log(window.innerWidth / window.innerHeight);
});