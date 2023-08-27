# Flask
from flask import Flask, render_template, request, jsonify
# Allows us to useSQAlchemy on our Flask app (for SQLite queries)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
# Allows us to get the direct client's IP address
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

# --------------------------------------------- G E N E R A L   I N F O R M A T I O N
# when 200:
# { "message": string, "data": data }
# when 400:
# "send raw message so we can error.message everything"


@app.route("/")
def hello():
    return render_template("index.html")


# POST take-in:
#   { username: string, score: integer }
# About:
#   takes in a score to record and returns info about it on the data object:
#   id, username, score, rank, countryCode
#   if duplicate, returns "duplicate" in message
@app.route("/send_score", methods=["POST"])
def send_score():

    # tries to jsonify the data, sends results to client
    try:
        client_data = request.get_json()
        if client_data["username"] is None or client_data["score"] is None:
            raise Exception()
    except Exception as ex:
        return "Not a valid json, must be { username: string, score: integer }", 400
    
    # check if there is already a score  with that username and score values
    check_data_cursor = db.session.execute(text("SELECT * FROM leaderboard WHERE username = :username AND score = :score"), 
                                    {"username": client_data["username"], "score": client_data["score"]})
    duplicate = check_data_cursor.first()
    check_data_cursor.close()

    # if an identic score already exists, deny the request
    if(duplicate):
        return jsonify({"message": "duplicate"}), 200

    # get country code for direct client ip
    country_code = get_country_code(request.remote_addr)
    #country_code = get_country_code("4.106.55.210")


    # Insert new score into leaderboard table
    db.session.execute(text("INSERT INTO leaderboard (username, score, country_code) VALUES (:username, :score, :country_code)"),
                    {"username": client_data["username"], "score": client_data["score"], "country_code": country_code})
    db.session.commit()
    

    # get the score's id
    id_cursor = db.session.execute(text("SELECT id FROM leaderboard WHERE score = :score AND username = :username"), 
                       {"username": client_data["username"], "score": client_data["score"]})
    id = id_cursor.fetchone()[0]
    id_cursor.close()

    # get the ranking in the leaderboard for the sent score
    rank_cursor = db.session.execute(text(" SELECT COUNT (*) + 1 + (SELECT COUNT (*) FROM leaderboard WHERE score = (SELECT score FROM leaderboard WHERE id = :id) AND username < (SELECT username FROM leaderboard WHERE id = :id)) AS rank FROM leaderboard WHERE score > (SELECT score FROM leaderboard WHERE id = :id)"),
                                      {"id": id})
    rank = rank_cursor.fetchone()[0]
    rank_cursor.close()
    
    return jsonify({"message": f"Score added to leaderboard, ranked {rank}", 
                    "data": {
                        "id": str(id), 
                        "rank": str(rank), 
                        "score": str(client_data["score"]), 
                        "countryCode": str(country_code),
                        "username": str(client_data["username"])}
                        }),200


# GET take-in:
#   length (number): how many score items of the leaderboard you want back
# About:
#   takes in a length and returns a leaderboard with that many score items
#   [{username, score, countryCode}]
#   the rank is implicit in the order of the returned list
@app.route("/get_leaderboard", methods=["GET"])
def get_leaderboard():

    # GET data validation
    scoreboard_length = request.args.get("length")
    if scoreboard_length is None:
        return "length not found", 400

    # return the first 'scoreboard_length' players, ordered by score DESC then name ASC
    scoreboard_cursor = db.session.execute(text("SELECT username, score, country_code FROM leaderboard ORDER BY score DESC, username ASC LIMIT :length"), {"length": scoreboard_length})
    scoreboard = scoreboard_cursor.fetchall()
    scoreboard_cursor.close()

    # for each element in data, create a dictionary with keys username/score/countryCode and their
    # values, and make a list that contains all of those dictionaries:
    scoreboard_list = [{"username": el[0], "score": el[1], "countryCode": el[2]} for el in scoreboard]

    return jsonify({"message": "scoreboard list", "data": scoreboard_list})


# returns a string with the country code of the given IP
def get_country_code(ip):

    # make a request to ipinfo.io API
    api_response = requests.get(f"https://ipinfo.io/{ip}/json")

    # process response 
    if api_response.status_code == 200:
        data = api_response.json()
        country_code = data.get("country")
        return country_code
    else:
        return "Unknown"


if __name__ == "__main__":
    app.run(debug=True)