from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
# we use this to get the IP address of the client so that we can turn that onto a flag
import requests
from datetime import datetime

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
# { username: string, score: integer }
# returns when 200:
# { message: "message" }
# { message: "message", rank: "rank", "countryCode": "countrycode" }
# returns when 400:
# { message: "message" }
@app.route("/send_score", methods=["POST"])
def send_score():

    # tries to jsonify the data, sends results to client
    try:
        client_data = request.get_json()

        if client_data["username"] is None or client_data["score"] is None:
            raise Exception()
        
    except Exception as ex:
        return jsonify({"message": "Not a valid json"}), 400
    
    # check if there is already a score  with that username and score values
    check_data_cursor = db.session.execute(text("SELECT * FROM leaderboard WHERE username = :username AND score = :score"), 
                                    {"username": client_data["username"], "score": client_data["score"]})

    duplicate = check_data_cursor.first()

    check_data_cursor.close()

    # if an identic score already exists, do not add it
    if(duplicate):
        return jsonify({"message": "duplicate"}), 200

    # get country code for direct client ip
    # country_code = get_country_code(request.remote_addr)
    country_code = get_country_code("4.106.55.210")


    # Insert new score into table
    db.session.execute(text("INSERT INTO leaderboard (username, score, country_code) VALUES (:username, :score, :country_code)"),
                    {"username": client_data["username"], "score": client_data["score"], "country_code": country_code})
    db.session.commit()
    

    # get the score's id
    id_cursor = db.session.execute(text("SELECT id FROM leaderboard WHERE score = :score AND username = :username"), 
                       {"username": client_data["username"], "score": client_data["score"]})

    # fetch the first row and item (we know theres only one row and item)
    id = id_cursor.fetchone()[0]
    id_cursor.close()

    # returns the ranking in the leaderboard for the row with the specified id
    rank_cursor = db.session.execute(text(" SELECT COUNT (*) + 1 + (SELECT COUNT (*) FROM leaderboard WHERE score = (SELECT score FROM leaderboard WHERE id = :id) AND username < (SELECT username FROM leaderboard WHERE id = :id)) AS rank FROM leaderboard WHERE score > (SELECT score FROM leaderboard WHERE id = :id)"),
                                      {"id": id})
    
    rank = rank_cursor.fetchone()[0]
    rank_cursor.close()
    
    return jsonify({"message": f"Score added to leaderboard, ranked {rank}", 
                    "scoreData": {
                        "id": str(id), 
                        "rank": str(rank), 
                        "score": str(client_data["score"]), 
                        "country_code": str(country_code),
                        "username": str(client_data["username"])}
                        }),200


@app.route("/get_score", methods=["GET"])
def get_score():

    id = request.args.get("id")

    if(id is None):
        return jsonify({"message": "id not found"}), 400
    
    score_cursor = db.session.execute(text("SELECT username, score, country_code FROM leaderboard WHERE id = :id"), {"id": id})
    score = score_cursor.fetchone()
    score_cursor.close()

    if(score is None):
        return jsonify({"message": "id is invalid"}), 400
    
    return jsonify({"message": "Score data found", "data": {"username:": score[0], "score": score[1], "country_code": score[2]}}), 200


@app.route("/get_leaderboard", methods=["GET"])
def get_leaderboard():

    scoreboard_length = request.args.get("length")

    if scoreboard_length is None:
        return jsonify({"message": "length not found"}), 400

    # return the first X players, ordered by score then name
    scoreboard_cursor = db.session.execute(text("SELECT username, score, country_code FROM leaderboard ORDER BY score DESC, username ASC LIMIT :length"), {"length": scoreboard_length})
    scoreboard = scoreboard_cursor.fetchall()
    scoreboard_cursor.close()

    # for each element in data, create a dictionary with keys user/score/data and their
    # values, and make a list that contains all of those dictionaries:
    scoreboard_list = [{"username": el[0], "score": el[1], "country_code": el[2]} for el in scoreboard]

    return jsonify(scoreboard_list), 200


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