from flask import Flask, render_template, redirect, url_for, request, flash, jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Order
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def home():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists', 'danger')
            return redirect(url_for('register'))
        hashed_pw = generate_password_hash(password)
        new_user = User(username=username, password=hashed_pw)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid credentials', 'danger')
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.id.desc()).all()
    return render_template('dashboard.html', user=current_user, orders=orders)

@app.route('/create_order', methods=['POST'])
@login_required
def create_order():
    data = request.get_json()
    package = data.get('package')  # '4', '8', या '12'
    guild_id = data.get('guild_id')
    leader_id = data.get('leader_id')

    if package not in ['4', '8', '12']:
        return jsonify({'error': 'Invalid package'}), 400
    if not guild_id or not leader_id:
        return jsonify({'error': 'Guild ID and Leader ID required'}), 400

    # कीमत और ग्लोरी निर्धारित करें
    if package == '4':
        price = 350
        glory = 175000
    elif package == '8':
        price = 700
        glory = 350000
    else:  # package == '12'
        price = 800
        glory = 525000

    new_order = Order(
        user_id=current_user.id,
        package=package,
        price=price,
        glory=glory,
        guild_id=guild_id,
        leader_id=leader_id,
        transaction_id=None,
        status='pending'
    )
    db.session.add(new_order)
    db.session.commit()

    return jsonify({
        'order_id': new_order.id,
        'upi_id': 'dibyaranjanbro@fam',
        'price': price,
        'glory': glory
    })

@app.route('/submit_payment', methods=['POST'])
@login_required
def submit_payment():
    data = request.get_json()
    order_id = data.get('order_id')
    transaction_id = data.get('transaction_id')

    order = Order.query.filter_by(id=order_id, user_id=current_user.id, status='pending').first()
    if not order:
        return jsonify({'error': 'Order not found or already processed'}), 404

    if not transaction_id:
        return jsonify({'error': 'Transaction ID required'}), 400

    order.transaction_id = transaction_id
    order.status = 'completed'
    db.session.commit()

    return jsonify({'success': True, 'message': 'Payment submitted successfully! Bot will be added soon.'})

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))