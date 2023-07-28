const buttonsData = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '0',
    '+',
    '-',
    '*',
    '/',
    '.',
    '='
];


document.addEventListener('DOMContentLoaded', (event) => {
    //
});

function getRandomCalculatorArray() {
    let buttons = buttonsData;
    let buttonsRandom = [];

    while(buttons.length > 0) {

        let next = getRandomNumber(0, buttons.length - 1);

        buttonsRandom.push(buttons[next]);

        buttons.splice(next, 1);
    }

    return buttonsRandom;
}

function getRandomNumber(min, max) {
    // get the range (max - min)
    // mult by random, meaning you can get from 0 to range max
    // add min to it, this makes it so that your number is min at minimun and
    // max - 1 at maximum (thats why we add the +1, so that min and max are inclusive)
    // floor it, this way we get an integer that is in range
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }