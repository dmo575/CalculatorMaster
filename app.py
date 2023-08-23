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
# returns message and score rank (the position of the score in the rankings):
# { message: "message", score_rank: string }
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

    # get the current time
    time = datetime.now().strftime("%f%S%M%H%d%m%Y")

    # Insert new score into table
    db.session.execute(text("INSERT INTO leaderboard (username, score, country_code, time) VALUES (:username, :score, :country_code, :time)"),
                    {"username": client_data["username"], "score": client_data["score"], "country_code": country_code, "time": time})
    
    db.session.commit()

    # using time and username we get the score_id for the score that we just entered
    id_result_cursor = db.session.execute(text("SELECT id FROM leaderboard WHERE time = :time AND username = :username"), 
                       {"time": time, "username": client_data["username"]})

    # score_result is a class with various methods for navigating the returned data.
    # One of those is fetchone(), it returns a touple with the column values of the next
    # row availible. We know we want the first (and only) row, and the first (and only)
    # column because we searched for that to happen
    id = id_result_cursor.fetchone()[0]

    id_result_cursor.close()

    # returns the ranking in the leaderboard of the row with the specified id
    score_cursor = db.session.execute(text(" SELECT COUNT (*) + 1 + (SELECT COUNT (*) FROM leaderboard WHERE score = (SELECT score FROM leaderboard WHERE id = :id) AND username < (SELECT username FROM leaderboard WHERE id = :id)) AS rank FROM leaderboard WHERE score > (SELECT score FROM leaderboard WHERE id = :id)"),
                                      {"id": id})
    
    score = score_cursor.fetchone()[0]

    
    return jsonify({"message": f"Score added to leaderboard, ranked {score}", "rank": str(score)}), 200


@app.route("/get_leaderboard", methods=["GET"])
def get_leaderboard():

    return "Need to fix the cursor and the close() stuff", 400

    amnt = request.args.get("amnt")

    if amnt is None:
        return "Ammount not found", 400
    else:
        print(amnt)

    # return the first X players, ordered by score then name
    result = db.session.execute(text("SELECT * FROM leaderboard ORDER BY score DESC, username ASC LIMIT :ammount"), {"ammount": amnt})
    data = result.fetchall()

    # for each element in data, create a dictionary with keys user/score/data and their
    # values, and make a list that contains all of those dictionaries:
    data_dic_list = [{"username": el[0], "score": el[1], "country_code": el[2]} for el in data]


    result.close()
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