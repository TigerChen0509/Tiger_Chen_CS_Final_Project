from flask import Blueprint, request, jsonify
import bcrypt
from db import get_db
from auth import create_token, auth_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name = (data.get('name') or '').strip()

    if not email or not password or not name:
        return jsonify({'error': 'Name, email, and password are required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        db.close()
        return jsonify({'error': 'An account with this email already exists.'}), 409

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    cur = db.execute('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', (email, pw_hash, name))
    db.commit()
    user_id = cur.lastrowid
    db.close()

    token = create_token(user_id)
    return jsonify({'token': token, 'user': {'id': user_id, 'email': email, 'name': name}})

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    db.close()

    if not user:
        return jsonify({'error': 'No account found with this email.'}), 401
    if not bcrypt.checkpw(password.encode(), user['password'].encode()):
        return jsonify({'error': 'Incorrect password.'}), 401

    token = create_token(user['id'])
    return jsonify({'token': token, 'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}})

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    new_password = data.get('newPassword') or ''

    if not email or not new_password:
        return jsonify({'error': 'Email and new password are required.'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    db = get_db()
    user = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if not user:
        db.close()
        return jsonify({'error': 'No account found with this email.'}), 404

    pw_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db.execute('UPDATE users SET password = ? WHERE id = ?', (pw_hash, user['id']))
    db.commit()
    db.close()
    return jsonify({'message': 'Password reset successfully.'})

@auth_bp.route('/me', methods=['GET'])
@auth_required
def me():
    from flask import g
    db = get_db()
    user = db.execute('SELECT id, email, name, created_at FROM users WHERE id = ?', (g.user_id,)).fetchone()
    db.close()
    if not user:
        return jsonify({'error': 'User not found.'}), 404
    return jsonify({'user': {'id': user['id'], 'email': user['email'], 'name': user['name'], 'created_at': user['created_at']}})
