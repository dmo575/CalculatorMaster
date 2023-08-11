export default function vec(x=0,y=0) {
    this.x = x;
    this.y = y;
}

vec.prototype.add = function(other) {
    if(other instanceof vec) {
        return new vec(this.x + other.x, this.y + other.y);
    }
    else {
        throw new Error('Attempting to sum a vec to a non vec');
    }
};

// will switch the x and y values
vec.prototype.switch = function() {
    let tempY = this.y;
    this.y = this.x;
    this.x = tempY;
    return this;
};

// will switch the x and y values AND their polarity
vec.prototype.mirror = function() {
    let tempY = this.y;
    this.y = this.x * -1;
    this.x = tempY * -1;
    return this;
};

vec.prototype.toString = function() {
    return `${'[' + this.x + ', ' + this.y + ']'}`;
};