from flask import Blueprint
from flask import request
from flask import jsonify

sensor_bp = Blueprint(
    "sensor",
    __name__
)


@sensor_bp.route(
    "/api/readings",
    methods=["POST"]
)
def receive_reading():

    data = request.get_json()

    print()

    print("==============================")

    print("Sensor Reading Received")

    print(data)

    print("==============================")

    return jsonify(
        {
            "status":"success",
            "message":"Reading received"
        }
    ),200