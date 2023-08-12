from flask import Flask, render_template, request

app = Flask(__name__)

# makes sure that flask will use the latest version of the template
# this lets us modify the html and flask will use that new version on the next page
# refresh
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route("/")
def hello():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)