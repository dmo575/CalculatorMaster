// prints a 2D grid array on the console
function printGridArray(gridArray) {

    let lenY = gridArray.length;
    let lenX = gridArray[0].length;
    let line = '    ';

    for(let i = 0; i < lenX; i++) {
        i < 10 ? line += '0' + i + ' ' : line += i + ' ';
    }

    console.log(line);

    line = '';

    for(let y = 0; y < lenY; y++) {
        
        for(let x = 0; x < lenX; x++) {
        
            line += gridArray[y][x].toString() + '  ';
        }

        y < 10 ? console.log('0'+ y + ': ' + line) : console.log(y + ': ' + line);
        line = '';
    }
}

function printGridButton(buttons, gridLen) {
    let arr = [];

    for(let i = 0; i < gridLen.y; i++) {
        arr.push([]);

        for(let x = 0; x < gridLen.x; x++) {
            arr[arr.length - 1].push(0);
        }
    }

    buttons.forEach((el) => {
        for(let x = 0; x < el.width; x++) {
            for(let y = 0; y < el.height; y++) {
                arr[el.start.y + y - 1][el.start.x + x - 1] = 1;
            }
        }
    });

    printGridArray(arr);
}

export { printGridButton, printGridArray };