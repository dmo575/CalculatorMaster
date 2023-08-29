import Button from './button.js';
import vec from './vec.js';
import { openMessage, closeMessage, openMessagePre } from './message.js';
//import { printGridArray, printGridButton } from './debug.js';

// stores the button layout in the form of a 2D JS array
const arrayGrid = [];
// keeps track of instant animation intervals that can be cut short at any time
const instantAnimations = [];
// calculator button symbols
const buttonSymbols = [
    '6','3','2','5','8','9','/','*','-','+','=','0','.','1','4','7'
];
// const data for "Thank you 4 Playing" button layout
const thanksForPlaying = ['THANK', 'YOU', '4', 'PLAYING'];
const wordColors = ['black', 'grey', 'white', 'black'];

// elements (since this script is set to defer, we can safely get the html elements here)
const screenElement = document.querySelector('#screen_container');
const equationElement = document.querySelector('#equation_container')
const timerElement = document.querySelector('#timer_container');
const errorsElement = document.querySelector('#errors');
const levelElement = document.querySelector('#level');
const gridElement = document.querySelector('#buttons');
const countdownTextElement = document.querySelector('#countdown_text');
const buttonsElement = document.querySelector('#buttons');
// forms
const usernameForm = document.querySelector('#username_form');
// modals
const introModal = document.querySelector('#modal_intro');
const countdownModal = document.querySelector('#modal_countdown');
const usernameModal = document.querySelector('#modal_username');
const leaderboardModal = document.querySelector('#modal_leaderboard');
// buttons
const introButton = document.querySelector('#intro_message_button');

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
// keeps track of wether the user is allowed to press the calculator buttons or not
var allowInput = true;
// how many users can the leaderboard display
const leaderboardCapacity = 50;
const pladeholderFlagImgSrc = '/static/images/world.png';


// ----------------------------------------------------------       EVENT LISTENERS

// start point
document.addEventListener('DOMContentLoaded', (event) => {

    openMessagePre(introModal, true);
});

// triggers each time the player presses a button on the calculator
document.addEventListener('click', (event) => {
    
    // if we clicked a button
    if(!event.target.classList.contains('button_container') && allowInput) return;


    // if we are pressing a button and we are allowed to do that
    if(event.target.classList.contains('button_container') && allowInput) {

        // get button's symbol
        let symbol = event.target.dataset.symbol;
    
        clickAnimation(event.target, 90, 2);
    
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
    }

});
// triggers when the player clicks 'Start' on the intro modal
introButton.addEventListener('click', (event) => {
    
    // close intro message and start the countdown
    closeMessage(introModal, true, true)
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
usernameForm.addEventListener('submit', (event) => {
    
    // prevent default, we will handle the request by fetch.
    event.preventDefault();

    usernameForm.username.disabled = true;

    let username = usernameForm.username.value;

    // client side data validation for the name
    let checkObject = checkUsername(username);

    // if name is invalid, send mesage to the user with reason.
    if(!checkObject.pass) {

        // button object
        let wrongUsernameButton = {
            text: 'OK',
            callback: (e) => {
                closeMessage(e.target.parentNode.parentNode)
                .then(() => {
                    // enable input field again
                    usernameForm.username.disabled = false;
                });
            }
        };
        
        // open an error message and inform user of error
        openMessage(checkObject.errorArray, wrongUsernameButton, true);

        return;
    }

    // close the 'insert name' message
    closeMessage(usernameModal, false, false)
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
            openMessagePre(usernameModal, false)
            .then(() => {
                usernameForm.username.disabled = false;
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

    countdownTextElement.style.opacity = 0;
    countdownModal.showModal();

    let tick = 10;
    let countdownVal = 3;
    let currTime = 3.2;

    let interval = setInterval(() => {

        currTime -= tick / 1000;

        if(parseInt(currTime) < countdownVal) {

            countdownTextElement.innerText = countdownVal;
            countdownVal--;

            countDownAnimation(countdownTextElement, 40, 0.8);
        }

        if(currTime < 0) {
            countdownModal.close();
            startGame();
            clearInterval(interval);
        }

    }, tick);
}

// starts the game's countdown and executes endGame() when it finishes
function startGameTime() {

    let currCountdown = 10;

    let timerObject = setInterval(() => {
        currentTime -= timerInterval;

        timerElement.innerText = (currentTime / 1000).toFixed(2);

        if(currentTime == 0) {
            // ends the game
            endGame();
            clearInterval(timerObject);
        }
        else if(parseInt(currentTime / 1000) < currCountdown) {
            pingAnimation(timerElement, 10);
            timerElement.style.color = 'red';
            currCountdown--;
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
    
    return new Promise((resolve, reject) => {
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
        let buttonsData = [];
        symbols.forEach((el) => {
            let btn = new Button(el, getRanNumber(btnMinLen, btnMaxLen),
            getRanNumber(btnMinLen, btnMaxLen), getRanNumber(btnMinRound, btnMaxRound));

            // give the button a start position in the array grid
            btn.start = getStartPosOnArrayGrid(btn, searchMethod);
            buttonsData.push(btn);
        });

        // convert the 'array grid' start position of the buttons to a 
        // start position on the 'css grid'
        convertArrayGridPosToCSSGridPos(buttonsData);

        initCssGrid();

        // we add all the buttons onto the css grid and store them in cssButtons
        let cssButtons = [];
        buttonsData.forEach((el) => {
            cssButtons.push(spawnButton(el, el.start));
        });

        // button pop in animation, we resolve after its done to signal that the calculator
        // has been created
        buttonPop(cssButtons, 0, () => {resolve()});
    });
}

// an animation pop to liven up the calculator
// calls callback once all the buttons are done spawning
function buttonPop(cssButtons, currIndex, callback=undefined) {

    // how much of the button size we increment per tick (in percentage)
    let increment = 10;

    return new Promise((resolve, reject) => {
        
        // if we gout outside of the boundaries of the array, reject (stop)
        if(currIndex == cssButtons.length - 1) {
            reject('finished');
        }

        // get the button we will be working with
        let btn = cssButtons[currIndex];
        // keeps track of wether the next button in the array has been called for
        // this function or not
        let nextCalled = false;

        // starting values for each button (we match the opacity with the w:h percentages
        // to avoid overcomplicating things)
        btn.style.width = '30%';
        btn.style.height = '30%';
        btn.style.opacity = '0.3';

        // set the interval for the button and resolve() on completion
        let popInterval = setInterval(()=> {

            // we get the current percentage value
            let curr = parseInt(btn.style.width.substring(0, btn.style.width.length - 1));

            // we calculate the new percentage value
            let percentage = (curr + increment) > 100 ? '100%' : (curr + increment).toString() + '%';

            // set the new values
            btn.style.width = percentage;
            btn.style.height = percentage;
            btn.style.opacity = parseFloat(btn.style.opacity) + increment / 100.0;

            // if the percentage is 100%, we are done imcrementing, we can clear the interval
            if(percentage === '100%') {
                // we resolve to get the next button to start popping now
                clearInterval(popInterval);
            }
            // if the current percentage we are at (50) is enough for us to want to call this function
            // onto the next button, we do so.
            if(!nextCalled && (curr + increment) > 50) {
                nextCalled = true;
                resolve();
            }
        }, 8);
    })
    .then(() => {
        // recursively call this on the next button in the array
        currIndex++;
        buttonPop(cssButtons, currIndex, callback);
    })
    .catch(err => {
        // this means we are done calling the buttonPop on all the buttons
        if(err == 'finished' && callback) {
            callback();
        }
        else {
            console.log(err);
        }
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
    pingAnimation(errorsElement, 20);
}

// called when the player levels up
function levelUp() {
    lvl++;
    levelElement.innerText = 'Lvl ' + lvl;
    pingAnimation(levelElement, 20);
}

function endGame() {

    // restrict input to the calculator
    allowInput = false;

    // print thank you
    printThankYou()
    .then(() => {

        // then wait for a second and open the username modal
        setTimeout(()=> {
            openMessagePre(usernameModal, true);
        }, 800);
    });
}

// creates a custom calculator that displays a 'Thank you" message
function printThankYou() {

    // resolves once the "ThankYou4Playing" calculator is made
    return new Promise((resolve, reject) => {
        
        makeCalculator(1, undefined, 4, arrayGridSearchLinear)
        .then(() => {
            resolve();
        });

        let children = Array.from(gridElement.querySelectorAll('.button_container'));
    
        let btn = 0;
    
        for(let w = 0; w < thanksForPlaying.length; w++) {
    
            let word = thanksForPlaying[w];
    
            for(let sub = 0; sub <  word.length; sub++) {
    
                children[btn].innerText = word[sub];
                children[btn].style.color = wordColors[w];
                btn++;
            }
        }
    });
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
        openMessage(['Sending your score to the server', '. . . '])
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

                        // button object
                        let usernameTakenButton = {
                            text: 'OK',
                            callback: (e) => {
                                closeMessage(e.target.parentNode.parentNode)
                                .then(() => {
    
                                    // then reject

                                    console.log('ererere');
                                    reject(new Error(responseJson.message));
                                });                                
                            }
                        };

                        // then open msg telling user to use different name
                        openMessage(['There is already a record with this username and score', 'Please select another username'], usernameTakenButton, true);
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

                    // buton object to be used with the error message we will open next
                    let unknownErrorButton = {
                        text: 'OK',
                        callback: (e) => {
                            closeMessage(e.target.parentNode.parentNode)
                            .then(() => {
    
                                // then call sendScore recursively
                                sendScore(username, score)
                                .then((scoreData) => {
    
                                    // then once the recursive sendScore has been solved, resolve this one
                                    resolve(scoreData);
                                })
                                .catch(err => {
                                    reject(new Error(err.message));
                                });
                            });                            
                        }
                    };

                    // then open an error message with the option to try again
                    openMessage(['Oops !', 'An error acurred while sending the score to the server'], unknownErrorButton, true);
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
        openMessage(['Loading global rankins', '. . .'])
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
                        openMessagePre(leaderboardModal)
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

                    // button object
                    let leaderboardErrorButton = {
                        text: 'Try again',
                        callback: (e) => {
                            // on 'Try again' click: close the error message
                            closeMessage(e.target.parentNode.parentNode)
                            .then(() => {

                                // then recursively call showLeaderboard
                                showLeaderboard(userData)
                                .then(() => {

                                    // then (once leaderboard is displayed), resolve
                                    resolve();
                                });
                            });
                        }
                    };

                    // then open an error message with a 'Try again' option
                    openMessage(['Error while retrieving leaderboard.'], leaderboardErrorButton, true);
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

    const leaderboardItemCont = leaderboardModal.querySelector('#leaderboard_item_container');
    const userScoreContainerElement =  leaderboardModal.querySelector('#user_score_container');

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
function spawnButton(btn, start) {
    let button = document.createElement('div');
    let buttonContainer = document.createElement('div');

    button.classList.add('button');
    buttonContainer.classList.add('button_container');


    button.style['grid-column'] = `${start.x} / span ${btn.width}`;
    button.style['grid-row'] = `${start.y} / span ${btn.height}`;
    buttonContainer.innerText = btn.symbol;
    buttonContainer.style['border-radius'] = `${btn.radius}%`;
    buttonContainer.dataset.symbol = btn.symbol;

    buttonContainer.style.width = '0%';
    buttonContainer.style.height = '0%';
    buttonContainer.style.opacity = '0';

    button.appendChild(buttonContainer)

    gridElement.appendChild(button);
    
    return buttonContainer;
}

// clears out the css grid children
function initCssGrid() {

    while(buttonsElement.lastChild) {
        buttonsElement.removeChild(gridElement.lastChild);
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

// ----------------------------------------------------------       ANIMATIONS

// plays the ping animation
// since this animation can be spammed over and over instantly (when making errors
// in fast sucession, we need to keep track of all the currently playing ping animations)
function pingAnimation(element, maxRot, loops=3, startDir=1) {

    // the direction we start the rotation at, also serves to keep track of current dir
    startDir = startDir >= 0 ? 1 : -1;
    // the time of a tick in miliseconds
    let tick = 10;
    // stores the current rotation value
    let rotVal = 0;
    // the velocity in degrees at wich we rotate the element each tick
    let vel = 4;

    // reset value to start value, in case this element was in the midst of a ping
    element.style.transform = `rotate(0deg)`;

    // each tick:
    let interval = setInterval(() => {

        // we set the rotation value to be current plus the velocity times the direction
        rotVal += vel * startDir;
        element.style.transform = `rotate(${rotVal}deg)`;

        // here we check if the current rotation  value has reached the max rotation
        // we want. If the direction is positive, we check if the value is higher
        // than the positive max rotation, else we check if the value is lowe than
        // then negative max rotation
        if((startDir == 1 ? (rotVal >= maxRot) : (rotVal <= -maxRot))) {

            // a loop means reaching the max rotation once
            if(loops > 0) {

                loops--;
                // if we ran out of loops (0), then all that is left is to go to the
                // start rotation, else we just continue as usual
                maxRot = loops == 0 ? 0 : maxRot;

                startDir = startDir * -1;
            }
            else {
                // this runs when we have no more loops left and we have reached or
                // gotten as close as possible to 0deg, so we set the value to 0deg
                // exactly and call clearPingAnimation to handle the interval clearance
                element.style.transform = `rotate(0deg)`;
                clearInstantAnimation(element);
            }
        }
    }, tick);

    // this manages instant animations, allows us to call a ping animation on the same
    // object multiple times safely. It lets us just reset the animation properly and
    // gets rid of any previous intervals
    addInstantAnimation(element, interval);
}

function clickAnimation(element, shrinkPercentage, tickIncrement) {

    let tick = 10;
    let currPercentage = 100;
    let dir = 1;

    let interval = setInterval(() => {

        //  percentage
        currPercentage -= tickIncrement * dir;
        element.style.width = `${currPercentage}%`
        element.style.height = `${currPercentage}%`

        
        if((dir == 1 ? (currPercentage <= shrinkPercentage) : (currPercentage >= 100))) {
            
            dir = dir * -1;

            if(dir == 1) {
                clearInstantAnimation(element);
            }
        }

    }, tick);

    addInstantAnimation(element, interval);
}

function countDownAnimation(element, startSizeRem, timeToZeroSize) {

    let tick = 10;
    element.style.fontSize = `${startSizeRem}rem`;
    element.style.opacity = 1;

    let decrementPerTick = startSizeRem / (timeToZeroSize / (tick / 1000));

    let interval = setInterval(() => {

        startSizeRem -= decrementPerTick;

        element.style.fontSize = `${startSizeRem}rem`;

        if(startSizeRem <= 0) {

            element.style.opacity = 0;
            clearInstantAnimation(element);
        }

    }, tick);

    addInstantAnimation(element, interval);
}

// links an interval to an element and keeps track of it
function addInstantAnimation(element, interval) {

    let added = false;
    // for each ping object
    for(let i = 0; i < instantAnimations.length; i++) {
        
        // if the ping subject matches
        if(instantAnimations[i].subject == element) {
            // UPDATING
            // clear current interval and set the interval var to the new interval
            clearInterval(instantAnimations[i].interval);
            instantAnimations[i].interval = interval;
            added = true;
            break;
        }
    }

    // if the element was not found already, then we need to add it as a new one
    if(!added) {
        // ADDING
        instantAnimations.push({subject: element, interval: interval});
    }
}

// given an element, clears the interval linked to it
function clearInstantAnimation(element) {

    for(let i = 0; i < instantAnimations.length; i++) {

        if(instantAnimations[i].subject == element) {

            // CLEARING
            clearInterval(instantAnimations[i].interval);
            instantAnimations.splice(i, 1);
            return;
        }
    }
}