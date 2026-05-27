import os
import jwt
from functools import wraps
from flask import request, jsonify, g

JWT_SECRET = os.environ.get('JWT_SECRET', 'tasktock_local_secret_2026')

def create_token(user_id):
    return jwt.encode({'userId': user_id, 'exp': __import__('datetime').datetime.utcnow() + __import__('datetime').timedelta(days=30)}, JWT_SECRET, algorithm='HS256')

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token.'}), 401
        try:
            payload = jwt.decode(header[7:], JWT_SECRET, algorithms=['HS256'])
            g.user_id = payload['userId']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired or invalid.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token expired or invalid.'}), 401
        return f(*args, **kwargs)
    return decorated
