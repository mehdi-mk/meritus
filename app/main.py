from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuration from Environment Variables for Production
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_default_secret_key_for_development_only')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Email Configuration from Environment Variables
app.config['MAIL_SERVER'] = 'localhost'
app.config['MAIL_PORT'] = 8025
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'your-dev-email@example.com'
app.config['MAIL_PASSWORD'] = None
app.config['MAIL_DEFAULT_SENDER'] = 'your-dev-email@example.com'

# app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'pro.turbo-smtp.com')
# app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 465))
# app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'false').lower() in ['true', 'on', '1']
# app.config['MAIL_USE_SSL'] = os.environ.get('MAIL_USE_SSL', 'true').lower() in ['true', 'on', '1']
# app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
# app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
mail = Mail(app)
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(200))  # Increased length for hashed password
    confirmed = db.Column(db.Boolean, nullable=False, default=False)
    experiences = db.relationship('Experience', backref='user', lazy=True, cascade="all, delete-orphan")


class Experience(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    position_title = db.Column(db.String(150), nullable=False)
    employer = db.Column(db.String(150), nullable=False)
    country = db.Column(db.String(100))
    city = db.Column(db.String(100))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    is_present = db.Column(db.Boolean, default=False)
    employment_type = db.Column(db.String(50))
    employment_arrangement = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'position_title': self.position_title,
            'employer': self.employer,
            'country': self.country,
            'city': self.city,
            'start_date': self.start_date.strftime('%B %Y'),
            'end_date': self.end_date.strftime('%B %Y') if self.end_date else None,
            'is_present': self.is_present,
            'employment_type': self.employment_type,
            'employment_arrangement': self.employment_arrangement,
        }

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email address already exists')
            flash(user.email + ' is already registered.')
            return redirect(url_for('signup'))

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(email=email, password=hashed_password, confirmed=False)

        try:
            db.session.add(new_user)
            db.session.flush()  # Move user to pending state before trying to send email

            token = s.dumps(email, salt='email-confirm')
            msg = Message('Confirm Email', sender=app.config['MAIL_USERNAME'], recipients=[email])
            link = url_for('confirm_email', token=token, _external=True)
            msg.body = f'Your email confirmation link is {link}'

            mail.send(msg)

            db.session.commit()  # Only commit if email sends successfully

            flash('A confirmation email has been sent. Please check your inbox.', 'success')
            return redirect(url_for('login'))

        except Exception as e:
            db.session.rollback()  # Roll back the transaction if email sending fails
            print(f"Error sending confirmation email: {e}")  # This will print the error to your terminal
            flash('There was a problem sending the confirmation email. Please check your settings and try again later.',
                  'danger')
            return redirect(url_for('signup'))

    return render_template('signup.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()

        # Check if the user exists and the password hash matches.
        if not user or not check_password_hash(user.password, password):
            flash('Please check your login details and try again.')
            return redirect(url_for('login'))

        # if not user.confirmed:
        #     flash('Please confirm your email address first.')
        #     return redirect(url_for('login'))

        login_user(user)
        return redirect(url_for('dashboard'))

    return render_template('login.html')


@app.route('/confirm_email/<token>')
def confirm_email(token):
    try:
        # Token expires after 1 hour (3600 seconds)
        email = s.loads(token, salt='email-confirm', max_age=3600)
    except SignatureExpired:
        return '<h1>The confirmation link is expired or invalid!</h1>'

    user = User.query.filter_by(email=email).first_or_404()
    if user.confirmed:
        flash('Account already confirmed. Please login.', 'success')
    else:
        user.confirmed = True
        db.session.commit()
        flash('Email confirmed successfully! You can now login.', 'success')
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))


# --- New API Endpoints for Experience ---

@app.route('/api/experiences', methods=['POST'])
@login_required
def add_experience():
    data = request.get_json()
    is_present = data.get('is_present', False)

    # Convert date strings to date objects
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m').date()
        end_date = None
        if not is_present and data.get('end_date'):
            end_date = datetime.strptime(data['end_date'], '%Y-%m').date()
    except (ValueError, KeyError) as e:
        return jsonify({'error': f'Invalid date format: {e}'}), 400

    new_experience = Experience(
        position_title=data['position_title'],
        employer=data['employer'],
        country=data.get('country'),
        city=data.get('city'),
        start_date=start_date,
        end_date=end_date,
        is_present=is_present,
        employment_type=data.get('employment_type'),
        employment_arrangement=data.get('employment_arrangement'),
        user_id=current_user.id
    )
    db.session.add(new_experience)
    db.session.commit()

    return jsonify(new_experience.to_dict()), 201


@app.route('/api/experiences', methods=['GET'])
@login_required
def get_experiences():
    experiences = Experience.query.filter_by(user_id=current_user.id).order_by(
        Experience.is_present.desc(),
        Experience.end_date.desc(),
        Experience.start_date.desc()
    ).all()
    return jsonify([exp.to_dict() for exp in experiences])


@app.route('/api/experiences/<int:experience_id>', methods=['DELETE'])
@login_required
def delete_experience(experience_id):
    experience = Experience.query.get_or_404(experience_id)

    # Verify that the experience belongs to the current user to prevent unauthorized deletion
    if experience.user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403

    db.session.delete(experience)
    db.session.commit()

    return jsonify({'message': 'Experience deleted successfully'}), 200


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
