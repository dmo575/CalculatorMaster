from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
# we use this to get the IP address of the client so that we can turn that onto a flag
import requests

app = Flask(__name__)

# SQLAlchemy requires me to save the path to my database on this key in the flask's
# config dictionary
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:////home/dmo/projects/calculator/database/database.db"

# set up line for SQLAlchemy. Links your flask app with the module and returns the db class
db = SQLAlchemy(app)

# makes sure that flask will use the latest version of the template
# this lets us modify the html and flask will use that new version on the next page
# refresh
app.config["TEMPLATES_AUTO_RELOAD"] = True

@app.route("/")
def hello():
    return render_template("index.html")


# takes in a json:
# { user: string, score: integer }
@app.route("/update", methods=["POST"])
def update():

    # tries to jsonify the data, sends results to client
    try:
        client_data = request.get_json()
        #return jsonify({"message": "200 OKE", "data": client_data}), 200
    
    except Exception as ex:
        return jsonify({"message": "NOT 200 OKE DIS BAD MAN THIS SO BAD WE FKED", "data": str(ex)}), 400
    
    # get country code
    # country = get_country_code(request.remote_addr)
    country = get_country_code("4.106.55.210")

    # insert 
    db.session.execute(text("INSERT INTO data (user, score, loc) VALUES (:user, :score, :loc)"),
                    {"user": client_data["user"], "score": client_data["score"], "loc": country})
    
    db.session.commit()

    return jsonify({"message": "200 OKE", "data": client_data}), 200


@app.route("/get_leaderboard", methods=["GET"])
def get_leaderboard():
    # return the first X players, ordered by score then name
    result = db.session.execute(text("SELECT * FROM data ORDER BY score DESC"))
    data = result.fetchall()

    # for each element in data, create a dictionary with keys user/score/data and their
    # values, and make a list that contains all of those dictionaries:
    data_dic_list = [{"user": el[0], "score": el[1], "loc": el[2]} for el in data]


    print(data_dic_list)

    return jsonify(data_dic_list)


# returns a string with the country code of an IP
def get_country_code(ip):

    api_response = requests.get(f"https://ipinfo.io/{ip}/json")

    if api_response.status_code == 200:
        data = api_response.json()
        country_code = data.get("country")
        return country_code
    else:
        return "Unknown"


if __name__ == "__main__":
    app.run(debug=True)