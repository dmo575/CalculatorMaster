export default class Button {
    constructor(symbol, w, h, r) {
        this.symbol = symbol;
        this.height = h;
        this.width = w;
        this.radius = r;
    }

    addInfo(start, dir) {
        this.start = start;
        this.dir = dir;
    }
}