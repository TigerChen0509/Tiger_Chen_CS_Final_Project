import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from db import init_db
from routes.auth import auth_bp
from routes.tasks import tasks_bp
from routes.chat import chat_bp

app = Flask(__name__)
CORS(app)

init_db()

@app.route('/')
def index():
    return jsonify({'message': 'TaskTock API running', 'version': '1.0.0'})

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(tasks_bp, url_prefix='/tasks')
app.register_blueprint(chat_bp, url_prefix='/chat')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    print(f'\n  TaskTock API → http://localhost:{port}\n')
    app.run(host='0.0.0.0', port=port, debug=True)
