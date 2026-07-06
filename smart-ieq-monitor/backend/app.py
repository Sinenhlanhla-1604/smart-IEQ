from flask import Flask

from routes.sensor_routes import sensor_bp

from config import Config

app = Flask(__name__)

app.register_blueprint(sensor_bp)


if __name__ == "__main__":

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=True
    )