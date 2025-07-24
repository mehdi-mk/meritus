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

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_default_secret_key_for_development_only')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Email Configuration
app.config['MAIL_SERVER'] = 'localhost'
app.config['MAIL_PORT'] = 8025
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'your-dev-email@example.com'
app.config['MAIL_PASSWORD'] = None
app.config['MAIL_DEFAULT_SENDER'] = 'your-dev-email@example.com'

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
mail = Mail(app)
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(200))
    confirmed = db.Column(db.Boolean, nullable=False, default=False)
    experiences = db.relationship('Experience', backref='user', lazy=True, cascade="all, delete-orphan")
    certificates = db.relationship('Certificate', backref='user', lazy=True, cascade="all, delete-orphan")
    degrees = db.relationship('Degree', backref='user', lazy=True, cascade="all, delete-orphan")

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
            'employment_arrangement': self.employment_arrangement
        }

class Certificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    issuer = db.Column(db.String(150), nullable=False)
    issue_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=True)
    credential_id = db.Column(db.String(100))
    credential_url = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'issuer': self.issuer,
            'issue_date': self.issue_date.strftime('%B %Y'),
            'expiry_date': self.expiry_date.strftime('%B %Y') if self.expiry_date else None,
            'credential_id': self.credential_id,
            'credential_url': self.credential_url
        }

class Degree(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    degree = db.Column(db.String(150), nullable=False)
    field_of_study = db.Column(db.String(150), nullable=False)
    school = db.Column(db.String(150), nullable=False)
    country = db.Column(db.String(100))
    city = db.Column(db.String(100))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    gpa = db.Column(db.String(10))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'degree': self.degree,
            'field_of_study': self.field_of_study,
            'school': self.school,
            'country': self.country,
            'city': self.city,
            'start_date': self.start_date.strftime('%B %Y'),
            'end_date': self.end_date.strftime('%B %Y'),
            'gpa': self.gpa
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
            return redirect(url_for('signup'))
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(email=email, password=hashed_password, confirmed=False)
        try:
            db.session.add(new_user)
            db.session.flush()
            token = s.dumps(email, salt='email-confirm')
            msg = Message('Confirm Email', sender=app.config['MAIL_USERNAME'], recipients=[email])
            link = url_for('confirm_email', token=token, _external=True)
            msg.body = f'Your email confirmation link is {link}'
            mail.send(msg)
            db.session.commit()
            flash('A confirmation email has been sent. Please check your inbox.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            print(f"Error sending confirmation email: {e}")
            flash('There was a problem sending the confirmation email. Please try again.', 'danger')
            return redirect(url_for('signup'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password, password):
            flash('Please check your login details and try again.')
            return redirect(url_for('login'))
        login_user(user)
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/confirm_email/<token>')
def confirm_email(token):
    try:
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

# --- Helper for parsing dates ---
def parse_date(date_str):
    return datetime.strptime(date_str, '%Y-%m').date() if date_str else None

# --- API Endpoints for Experience ---
@app.route('/api/experiences', methods=['GET'])
@login_required
def get_experiences():
    exps = Experience.query.filter_by(user_id=current_user.id).order_by(Experience.is_present.desc(), Experience.end_date.desc(), Experience.start_date.desc()).all()
    return jsonify([exp.to_dict() for exp in exps])

@app.route('/api/experiences', methods=['POST'])
@login_required
def add_experience():
    data = request.get_json()
    new_experience = Experience(
        user_id=current_user.id,
        position_title=data['position_title'],
        employer=data['employer'],
        start_date=parse_date(data.get('start_date')),
        end_date=parse_date(data.get('end_date')),
        is_present=data.get('is_present', False),
        country=data.get('country'), city=data.get('city'),
        employment_type=data.get('employment_type'),
        employment_arrangement=data.get('employment_arrangement')
    )
    db.session.add(new_experience)
    db.session.commit()
    return jsonify(new_experience.to_dict()), 201

@app.route('/api/experiences/<int:id>', methods=['DELETE'])
@login_required
def delete_experience(id):
    exp = Experience.query.get_or_404(id)
    if exp.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(exp)
    db.session.commit()
    return jsonify({'message': 'Experience deleted successfully'}), 200

# --- API Endpoints for Certificate ---
@app.route('/api/certificates', methods=['GET'])
@login_required
def get_certificates():
    certs = Certificate.query.filter_by(user_id=current_user.id).order_by(Certificate.issue_date.desc()).all()
    return jsonify([cert.to_dict() for cert in certs])

@app.route('/api/certificates', methods=['POST'])
@login_required
def add_certificate():
    data = request.get_json()
    new_cert = Certificate(
        user_id=current_user.id,
        title=data['title'],
        issuer=data['issuer'],
        issue_date=parse_date(data.get('issue_date')),
        expiry_date=parse_date(data.get('expiry_date')),
        credential_id=data.get('credential_id'),
        credential_url=data.get('credential_url')
    )
    db.session.add(new_cert)
    db.session.commit()
    return jsonify(new_cert.to_dict()), 201

@app.route('/api/certificates/<int:id>', methods=['DELETE'])
@login_required
def delete_certificate(id):
    cert = Certificate.query.get_or_404(id)
    if cert.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(cert)
    db.session.commit()
    return jsonify({'message': 'Certificate deleted successfully'}), 200

# --- API Endpoints for Degree ---
@app.route('/api/degrees', methods=['GET'])
@login_required
def get_degrees():
    degrees = Degree.query.filter_by(user_id=current_user.id).order_by(Degree.end_date.desc()).all()
    return jsonify([degree.to_dict() for degree in degrees])

@app.route('/api/degrees', methods=['POST'])
@login_required
def add_degree():
    data = request.get_json()
    new_degree = Degree(
        user_id=current_user.id,
        degree=data['degree'],
        field_of_study=data['field_of_study'],
        school=data['school'],
        start_date=parse_date(data.get('start_date')),
        end_date=parse_date(data.get('end_date')),
        country=data.get('country'), city=data.get('city'),
        gpa=data.get('gpa')
    )
    db.session.add(new_degree)
    db.session.commit()
    return jsonify(new_degree.to_dict()), 201

@app.route('/api/degrees/<int:id>', methods=['DELETE'])
@login_required
def delete_degree(id):
    degree = Degree.query.get_or_404(id)
    if degree.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(degree)
    db.session.commit()
    return jsonify({'message': 'Degree deleted successfully'}), 200


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)